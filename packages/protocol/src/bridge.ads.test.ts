// GENKAKU 0.3: the bridge's ad and tip surfaces.
//
// These are HTTP-level tests on purpose. The placement handshake has three
// parts that must agree — the chat route decides, GET /genkaku/ad reports, the
// dock renders — and a unit test of `matchAd` would prove none of them. The same
// goes for a tip: the only thing worth asserting is that the amount the panel
// sends is the amount the wallet callback signs.

import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import { Keypair } from '@solana/web3.js'

import { createAdFeed } from './adFeed.ts'
import { startOpenAiBridge, type BridgeOptions } from './bridge.ts'
import { ModeManager } from './modeManager.ts'

const catalog = {
  revision: 'r1',
  mode: 'active',
  categories: ['devtools'],
  creatives: [
    {
      id: 'a1',
      category: 'devtools',
      sponsor: 'Acme',
      title: 'A faster editor',
      body: '',
      keywords: ['refactor', 'typescript'],
      weight: 1,
    },
  ],
}

type Harness = {
  root: string
  keyDir: string
  close: () => Promise<void>
}

async function start(overrides: Partial<BridgeOptions> = {}): Promise<Harness> {
  const keyDir = mkdtempSync(join(tmpdir(), 'genkaku-ads-'))
  const key = Keypair.generate()
  const bridge = await startOpenAiBridge({
    workers: [],
    port: 0,
    env: 'solana-devnet',
    modeManager: new ModeManager(),
    // Nothing in these tests dials a peer; a node that refuses proves it.
    getNode: () => Promise.reject(new Error('no libp2p node in this test')),
    userKey: () => key,
    log: () => undefined,
    keyDir,
    ...overrides,
  })

  return {
    root: bridge.url.replace(/\/v1$/, ''),
    keyDir,
    close: bridge.close,
  }
}

function post(root: string, path: string, body: unknown): Promise<Response> {
  return fetch(`${root}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

test('a paused feed serves nothing and answers the panel honestly', async () => {
  const feed = createAdFeed({
    baseUrl: 'https://ads.test/ads/v1',
    fetcher: async () => new Response(JSON.stringify({ ...catalog, mode: 'paused' })),
  })
  const h = await start({ ads: feed })

  try {
    const mode = await (await fetch(`${h.root}/genkaku/ads`)).json() as { mode: string }
    // No catalog has been fetched yet, so the safe default is what answers.
    assert.equal(mode.mode, 'paused')

    const match = await (await post(h.root, '/genkaku/ad', { text: 'please refactor this' })).json() as {
      ad: unknown
      mode: string
    }
    assert.equal(match.ad, null)
    assert.equal(match.mode, 'paused')

    const live = await (await fetch(`${h.root}/genkaku/ad`)).json() as { ad: unknown; mode: string }
    assert.equal(live.ad, null)
    assert.equal(live.mode, 'paused')
  } finally {
    await h.close()
  }
})

test('an active feed matches locally and the placement follows the second turn', async () => {
  const feed = createAdFeed({
    baseUrl: 'https://ads.test/ads/v1',
    fetcher: async () => new Response(JSON.stringify(catalog)),
  })
  const h = await start({ ads: feed })

  try {
    const reply = await (await post(h.root, '/genkaku/ad', { text: 'typescript refactor' })).json() as {
      ad: { id: string } | null
      hits: number
      endpoint: string
    }
    assert.equal(reply.ad?.id, 'a1')
    assert.equal(reply.hits, 2)
    assert.equal(reply.endpoint, 'https://ads.test/ads/v1/catalog')

    // The chat route is what decides a placement on a real turn. There is no
    // worker here, so the request fails — but the decision happens first.
    const turn = async (text: string): Promise<void> => {
      await post(h.root, '/v1/chat/completions', {
        model: 'worker/model',
        messages: [{ role: 'user', content: text }],
      })
      // offerPlacement is deliberately not awaited by the chat path.
      await new Promise(resolve => setTimeout(resolve, 30))
    }

    await turn('hello there')
    const first = await (await fetch(`${h.root}/genkaku/ad`)).json() as { ad: unknown }
    assert.equal(first.ad, null, 'the first exchange is never sponsored')

    await turn('now refactor this module')
    const second = await (await fetch(`${h.root}/genkaku/ad`)).json() as {
      ad: { id: string } | null
      turn: number
    }
    assert.equal(second.ad?.id, 'a1')
    assert.equal(second.turn, 2)

    // A later turn without a keyword ends the placement: the card belongs to
    // the answer that selected it, not to every answer after it.
    await turn('what is a monad')
    const stale = await (await fetch(`${h.root}/genkaku/ad`)).json() as { ad: unknown }
    assert.equal(stale.ad, null, 'a new prompt drops the previous placement')

    // The five-minute gate still refuses a fresh one straight away.
    await turn('refactor again please')
    const gated = await (await fetch(`${h.root}/genkaku/ad`)).json() as { ad: unknown }
    assert.equal(gated.ad, null, 'a placement repeats no sooner than five minutes')
  } finally {
    await h.close()
  }
})

test('an impression is written locally and forwarded without any prompt text', async () => {
  const posted: unknown[] = []
  const feed = createAdFeed({
    baseUrl: 'https://ads.test/ads/v1',
    fetcher: async (_url, init) => {
      if (init?.method === 'POST') posted.push(JSON.parse(String(init.body)))

      return new Response(JSON.stringify(catalog))
    },
  })
  const h = await start({ ads: feed })

  try {
    const res = await post(h.root, '/genkaku/ad/impression', {
      creativeId: 'a1',
      category: 'devtools',
      turnsSince: 3,
      // Anything the panel does not send is dropped; a stray prompt field
      // must never be forwarded.
      text: 'secret prompt',
    })
    assert.equal(res.status, 200)

    await new Promise(resolve => setTimeout(resolve, 30))
    assert.equal(posted.length, 1)
    const forwarded = posted[0] as Record<string, unknown>
    assert.equal(forwarded.creativeId, 'a1')
    assert.equal('text' in forwarded, false)
    assert.equal('worker' in forwarded, false, 'no dial happened, so no wallet may be claimed')
    // The session id is the bridge's own random value, not anything the panel
    // sent: it exists to dedupe a re-report, not to identify a conversation.
    assert.match(String(forwarded.session), /^[0-9a-f]{16}$/)

    const lines = readFileSync(join(h.keyDir, 'ads.jsonl'), 'utf8')
    const recorded = JSON.parse(lines.trim()) as Record<string, unknown>
    assert.equal(recorded.creativeId, 'a1')
    assert.equal('text' in recorded, false, 'the local record must not keep the prompt either')
  } finally {
    await h.close()
  }
})

test('a tip calls the wallet callback with exactly the amount sent', async () => {
  const tipped: Array<{ to: string; micro: bigint }> = []
  const h = await start({
    tip: async ({ to, micro }) => {
      tipped.push({ to, micro })

      return 'SIGNATURE'
    },
  })

  try {
    const res = await post(h.root, '/genkaku/tip', { worker: 'WorkerWallet111', micro: '1500000' })
    assert.equal(res.status, 200)
    const doc = await res.json() as { signature: string; micro: string }
    assert.equal(doc.signature, 'SIGNATURE')
    assert.deepEqual(tipped, [{ to: 'WorkerWallet111', micro: 1_500_000n }])

    const tooMuch = await post(h.root, '/genkaku/tip', { worker: 'WorkerWallet111', micro: '999999999' })
    assert.equal(tooMuch.status, 400)
    assert.equal(tipped.length, 1, 'an over-ceiling tip must not reach the wallet')

    const zero = await post(h.root, '/genkaku/tip', { worker: 'WorkerWallet111', micro: '0' })
    assert.equal(zero.status, 400)
  } finally {
    await h.close()
  }
})

test('a bridge without ads or tips says so instead of pretending', async () => {
  const h = await start()

  try {
    const mode = await (await fetch(`${h.root}/genkaku/ads`)).json() as { mode: string; endpoint: unknown }
    assert.equal(mode.mode, 'paused')
    assert.equal(mode.endpoint, null)

    const tip = await post(h.root, '/genkaku/tip', { worker: 'W', micro: '1000000' })
    assert.equal(tip.status, 501)
  } finally {
    await h.close()
  }
})
