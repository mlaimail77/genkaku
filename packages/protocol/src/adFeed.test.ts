import assert from 'node:assert/strict'
import { test } from 'node:test'

import { absolutizeAssets, createAdFeed } from './adFeed.ts'

const goodCatalog = {
  revision: 'r1',
  mode: 'active',
  categories: ['devtools'],
  creatives: [{ id: 'a1', category: 'devtools', title: 'T', keywords: ['k'] }],
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

test('the catalog is cached for the ttl and refreshed afterwards', async () => {
  let calls = 0
  let now = 1_000
  const feed = createAdFeed({
    baseUrl: 'https://ads.test/ads/v1/',
    ttlMs: 100,
    fetcher: async () => {
      calls += 1

      return jsonResponse(goodCatalog)
    },
    now: () => now,
  })

  await feed.catalog()
  await feed.catalog()
  assert.equal(calls, 1, 'a fresh catalog must not be re-fetched')

  now += 101
  await feed.catalog()
  assert.equal(calls, 2)
})

test('a failed refresh keeps serving the last good copy, and says it is stale', async () => {
  let now = 1_000
  let fail = false
  const feed = createAdFeed({
    baseUrl: 'https://ads.test/ads/v1',
    ttlMs: 100,
    staleMs: 10_000,
    fetcher: async () => {
      if (fail) throw new Error('offline')

      return jsonResponse(goodCatalog)
    },
    now: () => now,
  })

  assert.equal((await feed.catalog()).revision, 'r1')
  fail = true
  now += 101

  const catalog = await feed.catalog()
  assert.equal(catalog.revision, 'r1', 'the stale copy is still served inside staleMs')
  assert.equal((await feed.mode()).stale, true)
})

test('after staleMs a dead service serves nothing, which is the unsponsored fallback', async () => {
  let now = 1_000
  let fail = false
  const feed = createAdFeed({
    baseUrl: 'https://ads.test/ads/v1',
    ttlMs: 100,
    staleMs: 1_000,
    fetcher: async () => {
      if (fail) throw new Error('offline')

      return jsonResponse(goodCatalog)
    },
    now: () => now,
  })

  await feed.catalog()
  fail = true
  now += 2_000

  const catalog = await feed.catalog()
  assert.equal(catalog.mode, 'paused')
  assert.equal(catalog.creatives.length, 0)
  assert.equal((await feed.mode()).mode, 'paused')
})

test('a bad document is treated as no ads, not as an error', async () => {
  const feed = createAdFeed({
    baseUrl: 'https://ads.test/ads/v1',
    fetcher: async () => jsonResponse({ mode: 'active', creatives: 'nope' }),
  })

  assert.equal((await feed.catalog()).creatives.length, 0)
})

test('a failed impression report never rejects', async () => {
  const feed = createAdFeed({
    baseUrl: 'https://ads.test/ads/v1',
    fetcher: async () => { throw new Error('down') },
  })

  await feed.record({ at: 1, creativeId: 'a1', category: 'devtools' })
})

test('impressions are posted as JSON with no prompt text', async () => {
  const bodies: string[] = []
  const feed = createAdFeed({
    baseUrl: 'https://ads.test/ads/v1',
    fetcher: async (_url, init) => {
      if (init?.method === 'POST') bodies.push(String(init.body))

      return jsonResponse(goodCatalog)
    },
  })

  await feed.record({ at: 5, creativeId: 'a1', category: 'devtools', session: 'h', turnsSince: 3 })
  assert.equal(bodies.length, 1)
  assert.deepEqual(JSON.parse(bodies[0]!), {
    at: 5,
    creativeId: 'a1',
    category: 'devtools',
    session: 'h',
    turnsSince: 3,
  })
})

test('a stored image and the click proxy both become absolute against the ads host', () => {
  const catalog = {
    revision: 'r1',
    mode: 'active' as const,
    categories: ['devtools'],
    creatives: [{
      id: 'a1',
      category: 'devtools',
      sponsor: 'Acme',
      title: 'T',
      body: '',
      keywords: ['k'],
      image: { url: '/ads/v1/asset?id=abc', alt: 'x' },
      cta: { label: 'Go', url: '/ads/v1/click?id=a1' },
    }],
  }

  const out = absolutizeAssets(catalog, 'https://seed.genkaku.app/ads/v1')
  assert.equal(out.creatives[0]?.image?.url, 'https://seed.genkaku.app/ads/v1/asset?id=abc')
  assert.equal(out.creatives[0]?.cta?.url, 'https://seed.genkaku.app/ads/v1/click?id=a1')
})
