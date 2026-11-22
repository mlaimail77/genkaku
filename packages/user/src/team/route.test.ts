import assert from 'node:assert/strict'
import { test } from 'node:test'

import { resolveRoute, routeAgent, scoreAgent, tokenize, type TeamLocalModel } from './route.ts'
import type { TeamAgent } from '@genkaku/protocol'

function agent(overrides: Partial<TeamAgent> = {}): TeamAgent {
  return {
    id: 'writer',
    name: 'Writer',
    whenToUse: '',
    whenNotToUse: '',
    examples: [],
    route: { provider: 'genkaku', model: '' },
    systemPrompt: '',
    maxTokens: 2_000,
    ...overrides,
  }
}

function local(overrides: Partial<TeamLocalModel> = {}): TeamLocalModel {
  return { id: 'gk.w1.llama3', name: 'w1 · llama3', ...overrides }
}

test('a cloud route needs an explicit model', () => {
  assert.equal(resolveRoute({ provider: 'openai', model: '' }, []), null)
  assert.deepEqual(resolveRoute({ provider: 'openai', model: 'gpt' }, []), {
    provider: 'openai',
    model: 'gpt',
    auto: false,
  })
})

test('an explicit local model is used even when it is offline right now', () => {
  assert.deepEqual(resolveRoute({ provider: 'genkaku', model: 'gk.w9.x' }, []), {
    provider: 'genkaku',
    model: 'gk.w9.x',
    auto: false,
  })
})

test('an auto local route picks an agent-capable worker and skips the team row', () => {
  const rows = [
    local({ id: 'team', tier: 'chat' }),
    local({ id: 'gk.w1.chat', tier: 'chat' }),
    local({ id: 'gk.w2.agent', tier: 'agent' }),
  ]
  assert.equal(resolveRoute({ provider: 'genkaku', model: '' }, rows)?.model, 'gk.w2.agent')
})

test('auto preferences pick cheapest, fastest and largest', () => {
  const rows = [
    local({ id: 'pricey', pricePerHour: '9000000', latencyMs: 10, parameterSize: '7B' }),
    local({ id: 'cheap', pricePerHour: '1000', latencyMs: 900, parameterSize: '3B' }),
    local({ id: 'big', pricePerHour: '500000', latencyMs: 400, parameterSize: '70B' }),
  ]
  assert.equal(resolveRoute({ provider: 'genkaku', model: '', prefer: 'cheapest' }, rows)?.model, 'cheap')
  assert.equal(resolveRoute({ provider: 'genkaku', model: '', prefer: 'fastest' }, rows)?.model, 'pricey')
  assert.equal(resolveRoute({ provider: 'genkaku', model: '', prefer: 'largest' }, rows)?.model, 'big')
})

test('an empty board resolves to nothing, not to a broken route', () => {
  assert.equal(resolveRoute({ provider: 'genkaku', model: '' }, []), null)
})

test('tokenize drops stop words and bigrams CJK runs', () => {
  assert.deepEqual(tokenize('Please summarize the contract'), ['summarize', 'contract'])
  assert.deepEqual(tokenize('幫我翻譯合約'), ['幫我', '我翻', '翻譯', '譯合', '合約'])
})

test('a matching description outranks a non-matching one', () => {
  const writer = agent({ id: 'writer', whenToUse: 'draft and edit prose copy' })
  const coder = agent({ id: 'coder', whenToUse: 'debug python typescript tests' })

  assert.equal(routeAgent([writer, coder], 'please draft some copy for the landing page'), 'writer')
  assert.equal(routeAgent([writer, coder], 'debug this python traceback'), 'coder')
})

test('examples count, and an exclusion can veto a match', () => {
  const translator = agent({
    id: 'translator',
    whenToUse: 'translate text',
    examples: ['translate this README into Japanese'],
    whenNotToUse: 'writing original marketing copy',
  })

  assert.ok(scoreAgent(translator, tokenize('translate the changelog')) > 0)
  assert.ok(scoreAgent(translator, tokenize('write original marketing copy')) < 0)
})

test('no clear match means no delegation', () => {
  assert.equal(routeAgent([agent()], 'hello there'), null)
  assert.equal(routeAgent([], 'draft copy'), null)
})
