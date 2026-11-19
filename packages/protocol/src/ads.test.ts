import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  AD_MIN_GAP_MS,
  AD_MIN_TURNS,
  adRotationDue,
  catalogServes,
  matchAd,
  parseAdCatalog,
  type AdCatalog,
} from './ads.ts'
import { absolutizeAssets } from './adFeed.ts'

const catalog: AdCatalog = {
  revision: 'r1',
  mode: 'active',
  categories: ['devtools', 'hosting'],
  creatives: [
    {
      id: 'a1',
      category: 'devtools',
      sponsor: 'Acme IDE',
      title: 'A faster editor',
      body: 'Local first, ships with a debugger.',
      keywords: ['typescript', 'refactor'],
      weight: 1,
    },
    {
      id: 'a2',
      category: 'devtools',
      sponsor: 'Byte Co',
      title: 'CI in one command',
      body: '',
      keywords: ['ci', 'pipeline'],
      weight: 2,
    },
    {
      id: 'a3',
      category: 'hosting',
      sponsor: 'Edge Host',
      title: 'Ship at the edge',
      body: '',
      keywords: ['deploy', 'hosting'],
      weight: 0,
    },
  ],
}

test('a paused catalog serves nothing even when it is well formed', () => {
  assert.equal(matchAd({ ...catalog, mode: 'paused' }, 'help me refactor this'), null)
  assert.equal(catalogServes({ ...catalog, mode: 'paused' }), false)
})

test('a creative in an unlisted category is dropped by the parser', () => {
  const parsed = parseAdCatalog({
    revision: 'r',
    mode: 'active',
    categories: ['devtools'],
    creatives: catalog.creatives,
  })
  assert.deepEqual(parsed.creatives.map(c => c.id), ['a1', 'a2'])
})

test('a creative without keywords is refused: it would match every turn', () => {
  const parsed = parseAdCatalog({
    revision: 'r',
    mode: 'active',
    categories: ['devtools'],
    creatives: [{ id: 'x', category: 'devtools', title: 'Ubiquitous', keywords: [] }],
  })
  assert.equal(parsed.creatives.length, 0)
})

test('latin keywords match whole words only', () => {
  // "ci" must not fire inside "special" or "decision".
  assert.equal(matchAd(catalog, 'this is a special decision'), null)
  assert.equal(matchAd(catalog, 'fix the ci pipeline')?.creative.id, 'a2')
})

test('the turn text is matched case-insensitively', () => {
  assert.equal(matchAd(catalog, 'Refactor this module')?.creative.id, 'a1')
})

test('more keyword hits beat a higher weight', () => {
  // a1 hits twice (typescript + refactor), a2 hits once (ci).
  assert.equal(matchAd(catalog, 'typescript refactor for the ci job')?.creative.id, 'a1')
})

test('equal hits fall back to weight', () => {
  const tie: AdCatalog = {
    ...catalog,
    creatives: [
      { ...catalog.creatives[0]!, keywords: ['docker'], weight: 0 },
      { ...catalog.creatives[1]!, keywords: ['docker'], weight: 5 },
    ],
  }
  assert.equal(matchAd(tie, 'a docker question')?.creative.id, 'a2')
})

test('the last creative shown only loses a tie', () => {
  const tie: AdCatalog = {
    ...catalog,
    creatives: [
      { ...catalog.creatives[0]!, keywords: ['docker'], weight: 1 },
      { ...catalog.creatives[1]!, keywords: ['docker'], weight: 1 },
    ],
  }
  assert.equal(matchAd(tie, 'a docker question', 'a1')?.creative.id, 'a2')
  assert.equal(matchAd(tie, 'a docker question', 'a2')?.creative.id, 'a1')
  // A better match still wins over rotation.
  assert.equal(matchAd(catalog, 'typescript refactor and a ci job', 'a1')?.creative.id, 'a1')
})

test('cjk keywords match as substrings, because those words are not spaced', () => {
  const cjk = parseAdCatalog({
    revision: 'r',
    mode: 'active',
    categories: ['devtools'],
    creatives: [{
      id: 'z1',
      category: 'devtools',
      title: '本地部署',
      keywords: ['部署'],
    }],
  })
  assert.equal(matchAd(cjk, '幫我部署到伺服器')?.creative.id, 'z1')
})

test('an empty turn never matches', () => {
  assert.equal(matchAd(catalog, '   '), null)
})

test('a malformed document parses to the empty catalog instead of throwing', () => {
  assert.equal(parseAdCatalog(null).mode, 'paused')
  assert.equal(parseAdCatalog('nonsense').creatives.length, 0)
  assert.equal(parseAdCatalog({ mode: 'active' }).creatives.length, 0)
  assert.equal(catalogServes(parseAdCatalog({ mode: 'active' })), false)
})

test('non-http links are dropped rather than rendered', () => {
  const parsed = parseAdCatalog({
    revision: 'r',
    mode: 'active',
    categories: ['devtools'],
    creatives: [{
      id: 'x',
      category: 'devtools',
      title: 'T',
      keywords: ['k'],
      url: 'javascript:alert(1)',
    }],
  })
  assert.equal(parsed.creatives[0]?.url, undefined)
})

test('a cta needs both a label and a link', () => {
  const base = {
    revision: 'r',
    mode: 'active',
    categories: ['devtools'],
    creatives: [{ id: 'c1', category: 'devtools', title: 'T', keywords: ['k'] }],
  }

  const withCta = parseAdCatalog({
    ...base,
    creatives: [{ ...base.creatives[0]!, cta: { label: 'Learn more', url: 'https://example.com' } }],
  })
  assert.deepEqual(withCta.creatives[0]?.cta, { label: 'Learn more', url: 'https://example.com/' })

  const dead = parseAdCatalog({
    ...base,
    creatives: [{ ...base.creatives[0]!, cta: { label: 'Learn more' } }],
  })
  assert.equal(dead.creatives[0]?.cta, undefined)

  const unsafe = parseAdCatalog({
    ...base,
    creatives: [{ ...base.creatives[0]!, cta: { label: 'Go', url: 'javascript:alert(1)' } }],
  })
  assert.equal(unsafe.creatives[0]?.cta, undefined)

  // Our click proxy is root-relative; the bridge absolutizes it against the
  // ads host, the same way it does an image asset.
  const proxied = parseAdCatalog({
    ...base,
    creatives: [{ ...base.creatives[0]!, cta: { label: 'Go', url: '/ads/v1/click?id=c1' } }],
  })
  assert.deepEqual(proxied.creatives[0]?.cta, { label: 'Go', url: '/ads/v1/click?id=c1' })
})

test('an image needs url and alt, and a relative asset path survives parsing', () => {
  const base = {
    revision: 'r',
    mode: 'active',
    categories: ['devtools'],
    creatives: [{ id: 'c1', category: 'devtools', title: 'T', keywords: ['k'] }],
  }

  const ok = parseAdCatalog({
    ...base,
    creatives: [{ ...base.creatives[0]!, image: { url: '/ads/v1/asset?id=abc', alt: 'A dashboard' } }],
  })
  assert.deepEqual(ok.creatives[0]?.image, { url: '/ads/v1/asset?id=abc', alt: 'A dashboard' })

  const noAlt = parseAdCatalog({
    ...base,
    creatives: [{ ...base.creatives[0]!, image: { url: '/ads/v1/asset?id=abc' } }],
  })
  assert.equal(noAlt.creatives[0]?.image, undefined)
})

test('relative asset paths are absolutized against the ads host', () => {
  const catalog = parseAdCatalog({
    revision: 'r',
    mode: 'active',
    categories: ['devtools'],
    creatives: [{
      id: 'c1', category: 'devtools', title: 'T', keywords: ['k'],
      image: { url: '/ads/v1/asset?id=abc', alt: 'x' },
    }],
  })

  const out = absolutizeAssets(catalog, 'https://seed.genkaku.app/ads/v1')
  assert.equal(out.creatives[0]?.image?.url, 'https://seed.genkaku.app/ads/v1/asset?id=abc')
  // An absolute image is left exactly as the advertiser wrote it.
  const absolute = absolutizeAssets(
    { ...catalog, creatives: [{ ...catalog.creatives[0]!, image: { url: 'https://cdn.example/a.png', alt: 'x' } }] },
    'https://seed.genkaku.app/ads/v1',
  )
  assert.equal(absolute.creatives[0]?.image?.url, 'https://cdn.example/a.png')
})

test('rotation needs both a turn count and a wall-clock gap', () => {
  const turn = AD_MIN_TURNS
  const gap = AD_MIN_GAP_MS

  assert.equal(adRotationDue({ turnsSince: turn - 1, msSince: gap * 2 }), false)
  assert.equal(adRotationDue({ turnsSince: turn, msSince: gap - 1 }), false)
  assert.equal(adRotationDue({ turnsSince: turn, msSince: gap }), true)
})
