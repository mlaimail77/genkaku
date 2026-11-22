// GENKAKU: the bridge's Agent Routes card and advisor surfaces.
//
// HTTP-level, like the ads tests: the interesting contract is what the panel
// receives, and three things have to agree — the library on disk, the preview
// the panel renders, and the code the site decodes.

import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import { Keypair } from '@solana/web3.js'

import { startOpenAiBridge, type BridgeOptions } from './bridge.ts'
import { ModeManager } from './modeManager.ts'
import { decodeShare, type AgentCard } from './teamCards.ts'
import type { TeamCatalog } from './team.ts'

const catalog: TeamCatalog['providers'] = [
  { id: 'deepseek', name: 'DeepSeek', models: [{ id: 'chat', name: 'Chat' }] },
]

const card: AgentCard = {
  genkaku: 'agent-card/1',
  id: 'translator',
  name: 'Translator',
  lang: 'zh',
  tags: ['translation'],
  agent: {
    whenToUse: 'translate a passage',
    whenNotToUse: 'research',
    examples: ['translate this'],
    systemPrompt: 'you translate',
    maxTokens: 2_000,
    routeHint: { kind: 'local' },
  },
}

type Harness = {
  root: string
  keyDir: string
  close: () => Promise<void>
}

async function start(overrides: Partial<BridgeOptions> = {}): Promise<Harness> {
  const keyDir = mkdtempSync(join(tmpdir(), 'genkaku-team-'))
  const bridge = await startOpenAiBridge({
    workers: [],
    port: 0,
    env: 'solana-devnet',
    modeManager: new ModeManager(),
    getNode: () => Promise.reject(new Error('no libp2p node in this test')),
    userKey: () => Keypair.generate(),
    log: () => undefined,
    keyDir,
    teamCatalog: async () => ({ providers: catalog }),
    ...overrides,
  })
  return { root: bridge.url.replace(/\/v1$/, ''), keyDir, close: bridge.close }
}

function post(root: string, path: string, body: unknown): Promise<Response> {
  return fetch(`${root}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function json(res: Response): Promise<Record<string, unknown>> {
  return await res.json() as Record<string, unknown>
}

test('the team document carries the catalog and the usage summary', async () => {
  const h = await start()
  try {
    const doc = await json(await fetch(`${h.root}/genkaku/team`))
    assert.equal(doc.ok, true)
    assert.equal((doc.config as { enabled: boolean }).enabled, false)
    assert.deepEqual((doc.catalog as TeamCatalog).providers, catalog)
    assert.deepEqual(doc.usage, { total: 0, byAgent: [], unused: [] })
  } finally {
    await h.close()
  }
})

test('importing a card stores it and returns an install preview', async () => {
  const h = await start()
  try {
    const doc = await json(await post(h.root, '/genkaku/team/cards', { card, source: 'paste' }))
    assert.equal(doc.ok, true)
    assert.equal(doc.saved, true)

    const library = doc.library as { cards: Array<{ id: string; source: string }> }
    assert.equal(library.cards.length, 1)
    assert.equal(library.cards[0]!.source, 'paste')

    const previews = doc.previews as Array<{ agent: { id: string }; route: { provider: string; model: string } }>
    assert.equal(previews.length, 1)
    assert.equal(previews[0]!.agent.id, 'translator')
    // No worker is online in this test, so the honest answer is "any worker".
    assert.deepEqual(previews[0]!.route, { provider: 'genkaku', model: '' })

    // The library survives a second read, because it is a file.
    const again = await json(await fetch(`${h.root}/genkaku/team/cards`))
    assert.equal((again.library as { cards: unknown[] }).cards.length, 1)
  } finally {
    await h.close()
  }
})

test('a preview does not write to the library', async () => {
  const h = await start()
  try {
    const doc = await json(await post(h.root, '/genkaku/team/cards', { card, save: false }))
    assert.equal(doc.saved, false)
    assert.equal((doc.library as { cards: unknown[] }).cards.length, 0)
    assert.equal((doc.previews as unknown[]).length, 1)
  } finally {
    await h.close()
  }
})

test('a share code round-trips through the bridge and the site link', async () => {
  const h = await start()
  try {
    const doc = await json(await post(h.root, '/genkaku/team/cards/share', { card }))
    assert.equal(doc.ok, true)
    const code = String(doc.code)
    assert.ok(code.startsWith('gkcard1.'))
    assert.ok(String(doc.url).includes('#gkcard1.'))
    assert.equal(decodeShare(code)?.cards[0]?.name, 'Translator')

    // And the same code imports.
    const imported = await json(await post(h.root, '/genkaku/team/cards', { code }))
    assert.equal((imported.library as { cards: unknown[] }).cards.length, 1)
  } finally {
    await h.close()
  }
})

test('junk codes are refused with a message the panel can show', async () => {
  const h = await start()
  try {
    const res = await post(h.root, '/genkaku/team/cards', { code: 'gkcard1.nope' })
    assert.equal(res.status, 400)
    const doc = await json(res)
    assert.match(String((doc.error as { message?: string }).message), /card code/)
  } finally {
    await h.close()
  }
})

test('removing a card leaves the rest of the library alone', async () => {
  const h = await start()
  try {
    await post(h.root, '/genkaku/team/cards', { card })
    const first = await json(await fetch(`${h.root}/genkaku/team/cards`))
    const id = (first.library as { cards: Array<{ id: string }> }).cards[0]!.id

    const doc = await json(await post(h.root, '/genkaku/team/cards', { remove: id }))
    assert.equal((doc.library as { cards: unknown[] }).cards.length, 0)
  } finally {
    await h.close()
  }
})

test('the advisor is asked with the real catalog and its answer is recorded', async () => {
  const h = await start({
    teamAdvisor: async (input) => {
      assert.deepEqual(input.catalog.providers, catalog)
      return {
        reply: 'Two people is enough.',
        cards: [card],
        model: { provider: 'deepseek', model: 'chat' },
        ms: 12,
      }
    },
  })
  try {
    const doc = await json(await post(h.root, '/genkaku/team/advice', {
      mode: 'advise',
      question: 'I translate patents',
      locale: 'zh',
    }))
    assert.equal(doc.ok, true)
    assert.equal(doc.reply, 'Two people is enough.')
    assert.equal((doc.previews as unknown[]).length, 1)

    const thread = doc.thread as { messages: Array<{ role: string; text: string }> }
    assert.equal(thread.messages.length, 2)
    assert.equal(thread.messages[0]!.role, 'user')
    assert.equal(thread.messages[1]!.role, 'advisor')

    // A reload still has the question and the answer.
    const reloaded = await json(await fetch(`${h.root}/genkaku/team/advice`))
    assert.equal((reloaded.thread as { messages: unknown[] }).messages.length, 2)
    assert.equal((reloaded.previews as unknown[]).length, 1)
  } finally {
    await h.close()
  }
})

test('the thread is cleared on request', async () => {
  const h = await start({
    teamAdvisor: async () => ({ reply: 'ok', cards: [], model: null, ms: 1 }),
  })
  try {
    await post(h.root, '/genkaku/team/advice', { mode: 'advise', question: 'hi' })
    const doc = await json(await post(h.root, '/genkaku/team/advice/clear', {}))
    assert.deepEqual((doc.thread as { messages: unknown[] }).messages, [])
  } finally {
    await h.close()
  }
})

test('without an advisor the endpoint says so instead of hanging', async () => {
  const h = await start()
  try {
    const res = await post(h.root, '/genkaku/team/advice', { mode: 'advise', question: 'hi' })
    assert.equal(res.status, 503)
  } finally {
    await h.close()
  }
})

test('a failing advisor keeps the question and records the error', async () => {
  const h = await start({
    teamAdvisor: async () => ({
      reply: '',
      cards: [],
      model: null,
      ms: 3,
      error: 'no model is available',
    }),
  })
  try {
    const res = await post(h.root, '/genkaku/team/advice', { mode: 'advise', question: 'hi' })
    assert.equal(res.status, 502)

    // The question is still on disk, so the panel does not lose the user's text.
    const raw = JSON.parse(readFileSync(join(h.keyDir, 'team-advice.json'), 'utf8')) as {
      messages: Array<{ role: string; text: string }>
    }
    assert.equal(raw.messages[0]!.text, 'hi')
    assert.match(raw.messages[1]!.text, /no model is available/)
  } finally {
    await h.close()
  }
})

test('a rewrite is recorded as a replacement, not a new specialist', async () => {
  const h = await start({
    teamAdvisor: async (input) => {
      assert.equal(input.mode, 'rewrite')
      assert.equal(input.agentId, 'translator')
      return {
        reply: 'Tighter.',
        cards: [card],
        model: { provider: 'deepseek', model: 'chat' },
        ms: 5,
      }
    },
  })
  try {
    const doc = await json(await post(h.root, '/genkaku/team/advice', {
      mode: 'rewrite',
      question: 'make it shorter',
      agentId: 'translator',
      locale: 'en',
    }))
    const thread = doc.thread as { messages: Array<{ role: string; mode?: string; agentId?: string }> }
    assert.equal(thread.messages.at(-1)!.mode, 'rewrite')
    assert.equal(thread.messages.at(-1)!.agentId, 'translator')
  } finally {
    await h.close()
  }
})
