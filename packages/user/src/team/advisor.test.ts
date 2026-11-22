// The advisor's one model call, tested without a model.
//
// This is the path I could not exercise in a real DSH install: the panel asks
// the bridge, the bridge calls the user plugin, and the plugin calls
// `ctx.llm.stream`. Everything around it is covered elsewhere, so the stub here
// is deliberately narrow — it asserts what the plugin sends and what it does
// with what comes back, which is exactly the part that cannot be unit-tested
// from the protocol side.

import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { Context } from '@deepseek-ai/cordis'
import type { GenerateOptions } from '@deepseek-ai/dsh-llm'
import type { AdviceInput, TeamCatalog, TeamConfig } from '@genkaku/protocol'

import { createTeamAdvisor } from './advisor.ts'

const catalog: TeamCatalog = {
  providers: [{ id: 'deepseek', name: 'DeepSeek', models: [{ id: 'chat', name: 'Chat' }] }],
  local: [{ id: 'gk.w2.agent', name: 'w2 · agent', tier: 'agent', latencyMs: 400 }],
}

function config(overrides: Partial<TeamConfig> = {}): TeamConfig {
  return {
    version: 1,
    enabled: true,
    mode: 'model-decides',
    mainSupportsTools: true,
    main: { provider: 'deepseek', model: 'chat' },
    advisor: null,
    policy: '',
    agents: [],
    maxDelegations: 6,
    maxConcurrent: 3,
    updatedAt: 0,
    ...overrides,
  }
}

function input(overrides: Partial<AdviceInput> = {}): AdviceInput {
  return {
    mode: 'advise',
    question: 'I translate patents',
    locale: 'zh',
    config: config(),
    catalog,
    history: [],
    ...overrides,
  }
}

/** A harness whose LLM yields the given text and records the request. */
function fakeCtx(
  chunks: string[] | (() => never),
  seen: GenerateOptions[] = [],
): Context {
  return {
    llm: {
      stream(options: GenerateOptions) {
        seen.push(options)
        if (typeof chunks === 'function') return chunks()
        return (async function* () {
          for (const text of chunks) yield { type: 'text-delta' as const, index: 0, text }
          yield { type: 'block-end' as const, index: 0, blockType: 'text' as const }
        })()
      },
    },
  } as unknown as Context
}

const reply = [
  'Two people is enough.',
  '',
  '```json',
  JSON.stringify({
    cards: [{
      id: 'translator',
      name: '翻譯',
      whenToUse: 'translate a passage',
      whenNotToUse: 'research',
      examples: ['a', 'b', 'c'],
      systemPrompt: 'you translate',
      maxTokens: 2000,
      route: { provider: 'genkaku', model: '' },
    }],
  }),
  '```',
].join('\n')

test('the advisor sends the prompt to the main model and parses the answer', async () => {
  const seen: GenerateOptions[] = []
  const advisor = createTeamAdvisor({
    ctx: fakeCtx([reply.slice(0, 40), reply.slice(40)], seen),
    log: () => undefined,
    localModels: async () => [],
  })

  const out = await advisor(input())
  assert.equal(out.error, undefined)
  assert.equal(out.reply, 'Two people is enough.')
  assert.equal(out.cards.length, 1)
  assert.equal(out.cards[0]!.name, '翻譯')
  assert.deepEqual(out.model, { provider: 'deepseek', model: 'chat' })

  // The request is a one-shot: a system prompt plus one user turn, no tools.
  assert.equal(seen.length, 1)
  const options = seen[0]!
  assert.equal(options.provider, 'deepseek')
  assert.equal(options.model, 'chat')
  assert.match(options.system ?? '', /setup advisor/)
  assert.match(options.system ?? '', /gk\.w2\.agent/)
  assert.equal(options.messages.length, 1)
  assert.equal(options.messages[0]!.role, 'user')
  assert.equal(options.tools, undefined)
})

test('an explicit advisor model wins over the main model', async () => {
  const seen: GenerateOptions[] = []
  const advisor = createTeamAdvisor({
    ctx: fakeCtx([reply], seen),
    log: () => undefined,
    localModels: async () => [],
  })

  await advisor(input({ config: config({ advisor: { provider: 'deepseek', model: 'chat' } }) }))
  assert.equal(seen[0]!.model, 'chat')
})

test('without any model the advisor says what to do instead of calling one', async () => {
  const seen: GenerateOptions[] = []
  const advisor = createTeamAdvisor({
    ctx: fakeCtx([reply], seen),
    log: () => undefined,
    localModels: async () => [],
  })

  const out = await advisor(input({ config: config({ main: null, advisor: null }) }))
  assert.match(out.error ?? '', /advisor model/)
  assert.equal(seen.length, 0)
})

test('the team model cannot advise on the team', async () => {
  const seen: GenerateOptions[] = []
  const advisor = createTeamAdvisor({
    ctx: fakeCtx([reply], seen),
    log: () => undefined,
    localModels: async () => [],
  })

  const out = await advisor(input({
    config: config({ advisor: { provider: 'genkaku', model: 'team' } }),
  }))
  assert.match(out.error ?? '', /cannot advise on itself/)
  assert.equal(seen.length, 0)
})

test('an auto local advisor resolves to a live worker at call time', async () => {
  const seen: GenerateOptions[] = []
  const advisor = createTeamAdvisor({
    ctx: fakeCtx([reply], seen),
    log: () => undefined,
    localModels: async () => [
      { id: 'gk.w1.chat', name: 'w1 · chat', tier: 'chat' },
      { id: 'gk.w2.agent', name: 'w2 · agent', tier: 'agent' },
    ],
  })

  const out = await advisor(input({ config: config({ main: { provider: 'genkaku', model: '' } }) }))
  assert.deepEqual(out.model, { provider: 'genkaku', model: 'gk.w2.agent' })
  assert.equal(seen[0]!.model, 'gk.w2.agent')
})

test('an auto local advisor with no worker online fails honestly', async () => {
  const seen: GenerateOptions[] = []
  const advisor = createTeamAdvisor({
    ctx: fakeCtx([reply], seen),
    log: () => undefined,
    localModels: async () => [],
  })

  const out = await advisor(input({ config: config({ main: { provider: 'genkaku', model: '' } }) }))
  assert.match(out.error ?? '', /No model is available/)
  assert.equal(seen.length, 0)
})

test('an empty answer is an error the panel can show', async () => {
  const advisor = createTeamAdvisor({
    ctx: fakeCtx([]),
    log: () => undefined,
    localModels: async () => [],
  })

  const out = await advisor(input())
  assert.match(out.error ?? '', /empty answer/)
  assert.equal(out.reply, '')
})

test('a failing call reports the message and does not throw', async () => {
  const advisor = createTeamAdvisor({
    ctx: fakeCtx(() => { throw new Error('bridge went away') }),
    log: () => undefined,
    localModels: async () => [],
  })

  const out = await advisor(input())
  assert.match(out.error ?? '', /bridge went away/)
  assert.deepEqual(out.model, { provider: 'deepseek', model: 'chat' })
})

test('the abort signal reaches the model call', async () => {
  const seen: GenerateOptions[] = []
  const advisor = createTeamAdvisor({
    ctx: fakeCtx([reply], seen),
    log: () => undefined,
    localModels: async () => [],
  })

  const controller = new AbortController()
  await advisor(input({ signal: controller.signal }))
  assert.equal(seen[0]!.signal, controller.signal)
})
