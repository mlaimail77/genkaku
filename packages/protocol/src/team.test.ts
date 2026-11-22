import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import {
  MAX_TEAM_AGENTS,
  MAX_TEAM_DECISIONS,
  appendTeamDecision,
  emptyTeamConfig,
  readTeamConfig,
  readTeamDecisions,
  sanitizeTeamConfig,
  watchTeamConfig,
  writeTeamConfig,
  type TeamAgent,
} from './team.ts'

function agent(overrides: Partial<TeamAgent> = {}): TeamAgent {
  return {
    id: 'writer',
    name: 'Writer',
    whenToUse: 'draft prose',
    whenNotToUse: '',
    examples: [],
    route: { provider: 'genkaku', model: '' },
    systemPrompt: '',
    maxTokens: 2_000,
    ...overrides,
  }
}

function tempDir(): string {
  return mkdtempSync(join(tmpdir(), 'genkaku-team-'))
}

test('an empty config is off and has no team', () => {
  const config = emptyTeamConfig()
  assert.equal(config.enabled, false)
  assert.equal(config.mode, 'model-decides')
  assert.deepEqual(config.agents, [])
  assert.equal(config.main, null)
})

test('the team is capped at eight and ids are made unique and safe', () => {
  const agents = Array.from({ length: 12 }, (_, index) => agent({
    id: index === 0 ? 'Lead Agent!' : index === 1 ? 'writer' : `agent ${index}`,
  }))
  const config = sanitizeTeamConfig({
    enabled: true,
    main: { provider: 'genkaku', model: 'm' },
    agents,
  })

  assert.equal(config.agents.length, MAX_TEAM_AGENTS)
  const ids = config.agents.map(row => row.id)
  assert.equal(new Set(ids).size, ids.length)
  assert.ok(!ids.includes('lead'))
  for (const id of ids) assert.match(id, /^[a-z][a-z0-9-]*$/)
})

test('a route with no provider is dropped, and an empty local model survives', () => {
  const config = sanitizeTeamConfig({
    main: { provider: '', model: 'm' },
    agents: [
      agent({ id: 'a', route: { provider: '', model: 'x' } }),
      agent({ id: 'b', route: { provider: 'genkaku', model: '' } }),
      agent({ id: 'c', route: { provider: 'openai', model: 'gpt' } }),
    ],
  })

  assert.equal(config.main, null)
  assert.deepEqual(config.agents.map(row => row.id), ['b', 'c'])
  assert.equal(config.agents[0]!.route.model, '')
})

test('enabling without a main model or without specialists stays off', () => {
  assert.equal(sanitizeTeamConfig({ enabled: true, agents: [agent()] }).enabled, false)
  assert.equal(sanitizeTeamConfig({
    enabled: true,
    main: { provider: 'genkaku', model: 'm' },
  }).enabled, false)
})

test('numbers and prose are clamped, not trusted', () => {
  const config = sanitizeTeamConfig({
    maxDelegations: 999,
    maxConcurrent: -4,
    policy: 'x'.repeat(9_000),
    agents: [agent({ maxTokens: 10_000_000, examples: ['a', 'a', 'b'] })],
  })

  assert.equal(config.maxDelegations, 16)
  assert.equal(config.maxConcurrent, 1)
  assert.equal(config.policy.length, 4_000)
  assert.equal(config.agents[0]!.maxTokens, 32_000)
  assert.deepEqual(config.agents[0]!.examples, ['a', 'b'])
})

test('a missing or broken file reads as the empty config', () => {
  const dir = tempDir()
  try {
    assert.equal(readTeamConfig(dir).enabled, false)
    writeFileSync(join(dir, 'team.json'), '{not json')
    assert.equal(readTeamConfig(dir).enabled, false)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('a save is sanitized, persisted, and announced to listeners', () => {
  const dir = tempDir()
  let calls = 0
  const unwatch = watchTeamConfig(() => { calls += 1 })
  try {
    const saved = writeTeamConfig(dir, {
      enabled: true,
      main: { provider: 'genkaku', model: '' },
      agents: [agent()],
    })
    assert.equal(saved.enabled, true)
    assert.equal(calls, 1)

    const reread = readTeamConfig(dir)
    assert.deepEqual(reread.agents, saved.agents)
    assert.equal(reread.enabled, true)

    unwatch()
    writeTeamConfig(dir, saved)
    assert.equal(calls, 1)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('decisions are appended, capped, and ignore junk rows', () => {
  const dir = tempDir()
  try {
    for (let index = 0; index < MAX_TEAM_DECISIONS + 5; index++) {
      appendTeamDecision(dir, {
        at: index,
        via: 'tool',
        agent: 'writer',
        provider: 'genkaku',
        model: `m${index}`,
        ms: 1,
        ok: true,
      })
    }

    const rows = readTeamDecisions(dir)
    assert.equal(rows.length, MAX_TEAM_DECISIONS)
    assert.equal(rows[rows.length - 1]!.model, `m${MAX_TEAM_DECISIONS + 4}`)

    writeFileSync(join(dir, 'team-decisions.json'), JSON.stringify([
      { at: 1, via: 'tool', agent: 'a', provider: 'p', model: 'm', ms: 1, ok: true },
      { nope: true },
    ]))
    assert.equal(readTeamDecisions(dir).length, 1)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
