import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { test } from 'node:test'

import {
  DEFAULT_REGISTRY_URL,
  REGISTRY_TTL_MS,
  clearRegistryCache,
  fetchRegistry,
  fetchRegistryCard,
  filterRegistry,
  registryCardUrl,
  registryTags,
  sanitizeRegistryIndex,
  type RegistryEntry,
} from './teamRegistry.ts'

const indexDoc = {
  version: 1,
  updatedAt: '2026-11-22T00:00:00Z',
  cards: [
    {
      id: 'translator-zh',
      name: '翻譯',
      lang: 'zh',
      tags: ['translation', 'writing'],
      author: { name: 'GenKaKu' },
      summary: 'translate a passage',
      url: 'translator-zh.json',
      sha256: 'a'.repeat(64),
      size: 100,
    },
    {
      id: 'researcher-en',
      name: 'Researcher',
      lang: 'en',
      tags: ['research'],
      summary: 'find and cite',
      url: 'https://cdn.example/researcher.json',
      sha256: '',
    },
  ],
}

function cardFile(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    genkaku: 'agent-card/1',
    id: 'translator-zh',
    name: '翻譯',
    lang: 'zh',
    tags: [],
    agent: {
      whenToUse: 'translate',
      whenNotToUse: '',
      examples: [],
      systemPrompt: 'you translate',
      maxTokens: 2000,
      routeHint: { kind: 'local' },
    },
    ...overrides,
  })
}

/** A fetch stub, restored by the caller. */
function stubFetch(handler: (url: string) => { status?: number; body: string }): () => void {
  const original = globalThis.fetch
  let calls = 0
  globalThis.fetch = (async (input: string | URL | Request) => {
    calls += 1
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    const { status = 200, body } = handler(url)
    return new Response(body, { status })
  }) as typeof fetch
  ;(globalThis as { __fetchCalls?: () => number }).__fetchCalls = () => calls
  return () => { globalThis.fetch = original }
}

test('a broken index reads as empty instead of throwing', () => {
  assert.deepEqual(sanitizeRegistryIndex(null).cards, [])
  assert.deepEqual(sanitizeRegistryIndex({ cards: 'nope' }).cards, [])
  assert.deepEqual(sanitizeRegistryIndex({ cards: [null, 4, {}] }).cards, [])
})

test('an entry needs an id, a url and a name, and ids are unique', () => {
  const index = sanitizeRegistryIndex({
    cards: [
      { id: 'ok', name: 'A', url: 'a.json' },
      { id: 'ok', name: 'B', url: 'b.json' },
      { id: 'no-url', name: 'C' },
      { id: 'no-name', url: 'd.json' },
      { id: '../etc/passwd', name: 'E', url: 'e.json' },
    ],
  })
  assert.deepEqual(index.cards.map(card => card.id), ['ok', 'etc-passwd'])
})

test('index fields are clamped, and the hash is normalised', () => {
  const index = sanitizeRegistryIndex({
    updatedAt: 'x'.repeat(100),
    cards: [{
      id: 'a',
      name: 'n'.repeat(200),
      url: 'a.json',
      sha256: 'ABCDEF'.repeat(20),
      tags: ['A', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'],
      summary: 's'.repeat(400),
      size: -5,
    }],
  })
  const entry = index.cards[0]!
  assert.equal(entry.name.length, 80)
  assert.equal(entry.summary.length, 200)
  assert.equal(entry.sha256.length, 64)
  assert.equal(entry.sha256, entry.sha256.toLowerCase())
  assert.deepEqual(entry.tags, ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'])
  assert.equal(index.updatedAt.length, 40)
})

test('filtering matches name, summary, author, tags and language', () => {
  const index = sanitizeRegistryIndex(indexDoc)
  assert.equal(filterRegistry(index, { q: '翻譯' }).length, 1)
  assert.equal(filterRegistry(index, { q: 'genkaku' }).length, 1)
  assert.equal(filterRegistry(index, { q: 'RESEARCH' }).length, 1)
  assert.equal(filterRegistry(index, { tag: 'writing' }).length, 1)
  assert.equal(filterRegistry(index, { lang: 'zh' }).length, 1)
  assert.equal(filterRegistry(index, { q: 'nothing' }).length, 0)
  assert.equal(filterRegistry(index, {}).length, 2)
})

test('tags are counted and ordered', () => {
  const index = sanitizeRegistryIndex({
    cards: [
      { id: 'a', name: 'A', url: 'a.json', tags: ['x', 'y'] },
      { id: 'b', name: 'B', url: 'b.json', tags: ['y'] },
      { id: 'c', name: 'C', url: 'c.json', tags: ['y', 'z'] },
    ],
  })
  assert.deepEqual(registryTags(index), [
    { tag: 'y', count: 3 },
    { tag: 'x', count: 1 },
    { tag: 'z', count: 1 },
  ])
})

test('a relative card url resolves against the index, an absolute one survives', () => {
  assert.equal(
    registryCardUrl('https://seed.example/cards/v1/index.json', { url: 'a.json' } as RegistryEntry),
    'https://seed.example/cards/v1/a.json',
  )
  assert.equal(
    registryCardUrl('https://seed.example/cards/v1/index.json', { url: 'https://cdn.example/b.json' } as RegistryEntry),
    'https://cdn.example/b.json',
  )
})

test('the index is fetched once and cached for the ttl', async () => {
  clearRegistryCache()
  const restore = stubFetch(() => ({ body: JSON.stringify(indexDoc) }))
  try {
    const first = await fetchRegistry('https://seed.test/index.json')
    assert.equal(first.offline, false)
    assert.equal(first.index.cards.length, 2)

    const second = await fetchRegistry('https://seed.test/index.json')
    assert.equal(second.fetchedAt, first.fetchedAt)
    assert.equal((globalThis as { __fetchCalls?: () => number }).__fetchCalls?.(), 1)

    await fetchRegistry('https://seed.test/index.json', { fresh: true })
    assert.equal((globalThis as { __fetchCalls?: () => number }).__fetchCalls?.(), 2)

    // A different url is a different cache entry.
    await fetchRegistry('https://other.test/index.json')
    assert.equal((globalThis as { __fetchCalls?: () => number }).__fetchCalls?.(), 3)
    assert.ok(REGISTRY_TTL_MS >= 60_000)
  } finally {
    restore()
    clearRegistryCache()
  }
})

test('an unreachable or broken index is offline, not fatal', async () => {
  clearRegistryCache()
  let restore = stubFetch(() => ({ status: 503, body: 'down' }))
  try {
    const down = await fetchRegistry('https://seed.test/index.json')
    assert.equal(down.offline, true)
    assert.match(down.error ?? '', /503/)
    assert.deepEqual(down.index.cards, [])
  } finally {
    restore()
  }

  clearRegistryCache()
  restore = stubFetch(() => ({ body: '{not json' }))
  try {
    const broken = await fetchRegistry('https://seed.test/index.json')
    assert.equal(broken.offline, true)
  } finally {
    restore()
    clearRegistryCache()
  }
})

test('a card is accepted only when its bytes match the index', async () => {
  clearRegistryCache()
  const text = cardFile()
  const sha256 = createHash('sha256').update(text).digest('hex')
  const entry: RegistryEntry = {
    id: 'translator-zh',
    name: '翻譯',
    lang: 'zh',
    tags: [],
    summary: '',
    url: 'translator-zh.json',
    sha256,
    size: text.length,
  }

  let restore = stubFetch(() => ({ body: text }))
  try {
    const good = await fetchRegistryCard('https://seed.test/index.json', entry)
    assert.ok('card' in good)
    assert.equal(good.card.name, '翻譯')
  } finally {
    restore()
  }

  restore = stubFetch(() => ({ body: `${text} ` }))
  try {
    const tampered = await fetchRegistryCard('https://seed.test/index.json', entry)
    assert.ok('error' in tampered)
    assert.match(tampered.error, /hash|size/)
  } finally {
    restore()
    clearRegistryCache()
  }
})

test('a card that is not a card is refused', async () => {
  clearRegistryCache()
  const entry: RegistryEntry = {
    id: 'x',
    name: 'X',
    lang: '',
    tags: [],
    summary: '',
    url: 'x.json',
    sha256: '',
  }
  const restore = stubFetch(() => ({ body: JSON.stringify({ nope: true }) }))
  try {
    const out = await fetchRegistryCard('https://seed.test/index.json', entry)
    assert.ok('error' in out)
    assert.match(out.error, /not a specialist card/)
  } finally {
    restore()
    clearRegistryCache()
  }
})

test('the shipped default points at the seed host', () => {
  assert.match(DEFAULT_REGISTRY_URL, /^https:\/\/seed\.genkaku\.app\/cards\/v\d+\/index\.json$/)
})
