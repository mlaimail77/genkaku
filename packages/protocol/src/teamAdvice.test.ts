import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import {
  MAX_ADVICE_CARDS,
  MAX_ADVICE_MESSAGES,
  appendAdviceMessage,
  buildAdvicePrompt,
  clearAdviceThread,
  parseAdviceReply,
  readAdviceThread,
  teamUsage,
  type AdviceInput,
} from './teamAdvice.ts'
import { emptyTeamConfig, type TeamAgent, type TeamCatalog, type TeamConfig, type TeamDecision } from './team.ts'

const catalog: TeamCatalog = {
  providers: [
    { id: 'deepseek', name: 'DeepSeek', models: [{ id: 'chat', name: 'Chat' }] },
  ],
  local: [
    { id: 'gk.w2.agent', name: 'w2 · agent', tier: 'agent', pricePerHour: '5000', latencyMs: 400 },
  ],
}

function agent(overrides: Partial<TeamAgent> = {}): TeamAgent {
  return {
    id: 'translator',
    name: 'Translator',
    whenToUse: 'translate a passage',
    whenNotToUse: '',
    examples: ['translate this'],
    route: { provider: 'genkaku', model: '' },
    systemPrompt: 'you translate',
    maxTokens: 2_000,
    ...overrides,
  }
}

function config(overrides: Partial<TeamConfig> = {}): TeamConfig {
  return {
    ...emptyTeamConfig(),
    enabled: true,
    main: { provider: 'deepseek', model: 'chat' },
    agents: [agent()],
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

test('the prompt carries the real routes, so a card cannot name a missing model', () => {
  const { system, user } = buildAdvicePrompt(input())
  assert.match(system, /genkaku\/gk\.w2\.agent/)
  assert.match(system, /deepseek\/chat/)
  assert.match(system, /Simplified Chinese/)
  assert.match(user, /I translate patents/)
})

test('the prompt states the limits the code actually enforces', () => {
  const { system } = buildAdvicePrompt(input())
  // The tool description really is cut at 400 characters.
  assert.match(system, /first 400 characters/)
  // The router really only reads the prose fields.
  assert.match(system, /token-overlap/)
  assert.match(system, /At most 4/)
})

test('an empty team is described as a first setup, not as an error', () => {
  const { system } = buildAdvicePrompt(input({ config: config({ agents: [], main: null }) }))
  assert.match(system, /first setup/)
})

test('review mode asks for a diagnosis and allows an empty card list', () => {
  const { user } = buildAdvicePrompt(input({ mode: 'review', question: '' }))
  assert.match(user, /Review the team above/)
  assert.match(user, /empty cards array/)
})

test('rewrite mode names the specialist it is rewriting', () => {
  const { user } = buildAdvicePrompt(input({ mode: 'rewrite', agentId: 'translator', question: '' }))
  assert.match(user, /Rewrite this specialist: Translator/)
  assert.match(user, /exactly one card/)
})

test('a fenced json block becomes cards and the prose stays prose', () => {
  const reply = [
    'Split the work in two.',
    '',
    '```json',
    JSON.stringify({
      cards: [
        { id: 'translator', name: '翻譯', whenToUse: 'translate', examples: ['a', 'b', 'c'], maxTokens: 2000, route: { provider: 'genkaku', model: '' } },
        { id: 'researcher', name: '研究', whenToUse: 'look up', route: { provider: 'genkaku', model: 'gk.w2.agent' } },
      ],
      notes: 'two people is enough',
    }),
    '```',
  ].join('\n')

  const parsed = parseAdviceReply(reply, catalog)
  assert.equal(parsed.reply, 'Split the work in two.')
  assert.equal(parsed.cards.length, 2)
  assert.equal(parsed.cards[0]!.name, '翻譯')
  assert.equal(parsed.cards[0]!.id, 'translator')
  assert.deepEqual(parsed.cards[0]!.agent.routeHint, { kind: 'local' })
  assert.deepEqual(parsed.cards[1]!.agent.routeHint, {
    kind: 'exact',
    provider: 'genkaku',
    model: 'gk.w2.agent',
  })
  assert.equal(parsed.notes, 'two people is enough')
})

test('a bare object without a fence still parses', () => {
  const reply = `Here you go.\n{"cards":[{"name":"Editor","whenToUse":"tighten prose"}]}`
  const parsed = parseAdviceReply(reply, catalog)
  assert.equal(parsed.reply, 'Here you go.')
  assert.equal(parsed.cards.length, 1)
  assert.equal(parsed.cards[0]!.name, 'Editor')
})

test('prose with no json is still an answer, not an error', () => {
  const parsed = parseAdviceReply('You should not delegate greetings. Ask me again with more detail.', catalog)
  assert.match(parsed.reply, /greetings/)
  assert.deepEqual(parsed.cards, [])
})

test('broken json degrades to prose instead of throwing', () => {
  const parsed = parseAdviceReply('Two teams.\n```json\n{"cards": [ oops }\n```', catalog)
  assert.match(parsed.reply, /Two teams/)
  assert.deepEqual(parsed.cards, [])
})

test('the suggestion is capped, and junk cards are dropped', () => {
  const cards = Array.from({ length: 9 }, (_, index) => ({
    name: `Agent ${index}`,
    whenToUse: 'do a thing',
  }))
  cards.push({ name: '', whenToUse: '' } as never)
  const parsed = parseAdviceReply(`ok\n{"cards":${JSON.stringify(cards)}}`, catalog)
  assert.equal(parsed.cards.length, MAX_ADVICE_CARDS)
})

test('a draft route maps onto a hint the installer understands', () => {
  const parsed = parseAdviceReply(
    'ok\n{"cards":[{"name":"A","whenToUse":"x","route":{"provider":"deepseek","model":"chat"}}]}',
    catalog,
  )
  assert.deepEqual(parsed.cards[0]!.agent.routeHint, { kind: 'cloud', provider: 'deepseek', model: 'chat' })

  const unknown = parseAdviceReply(
    'ok\n{"cards":[{"name":"B","whenToUse":"x","route":{"provider":"anthropic","model":"x"}}]}',
    catalog,
  )
  assert.deepEqual(unknown.cards[0]!.agent.routeHint, { kind: 'cloud', provider: 'anthropic' })
})

test('usage counts per specialist and names the ones never used', () => {
  const decisions: TeamDecision[] = [
    { at: 1, via: 'tool', agent: 'translator', provider: 'genkaku', model: 'm', ms: 1, ok: true },
    { at: 5, via: 'router', agent: 'translator', provider: 'genkaku', model: 'm', ms: 1, ok: true },
  ]
  const usage = teamUsage(config({ agents: [agent(), agent({ id: 'editor', name: 'Editor' })] }), decisions)
  assert.equal(usage.total, 2)
  assert.equal(usage.byAgent[0]!.count, 2)
  assert.equal(usage.byAgent[0]!.lastAt, 5)
  assert.deepEqual(usage.unused, ['editor'])
})

test('the advice thread is capped and clearable', () => {
  const dir = mkdtempSync(join(tmpdir(), 'genkaku-advice-'))
  try {
    for (let index = 0; index < MAX_ADVICE_MESSAGES + 4; index++) {
      appendAdviceMessage(dir, { role: index % 2 === 0 ? 'user' : 'advisor', at: index, text: `m${index}` })
    }
    const thread = readAdviceThread(dir)
    assert.equal(thread.messages.length, MAX_ADVICE_MESSAGES)
    assert.equal(thread.messages.at(-1)!.text, `m${MAX_ADVICE_MESSAGES + 3}`)

    assert.deepEqual(clearAdviceThread(dir).messages, [])
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
