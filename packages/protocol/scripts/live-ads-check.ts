// Reads the deployed 0.3 catalog and matches a few turns against it.
//
//   npx tsx packages/protocol/scripts/live-ads-check.ts
//
// This is a smoke test of the ONE thing the client depends on a remote service
// for: that https://seed.genkaku.app/ads/v1/catalog parses into a catalog and
// that matching still behaves. It reports one impression, so the console's
// counter is also proven to move.

import { createAdFeed } from '../src/adFeed.ts'
import { matchAd } from '../src/ads.ts'

async function main(): Promise<void> {
  const feed = createAdFeed({
    baseUrl: process.env.GENKAKU_ADS_URL ?? 'https://seed.genkaku.app/ads/v1',
    log: line => console.log('  log:', line),
  })

  const catalog = await feed.catalog()
  console.log('mode      ', catalog.mode)
  console.log('revision  ', catalog.revision)
  console.log('categories', catalog.categories.join(', ') || '(none)')
  console.log('creatives ', catalog.creatives.map(c => c.id).join(', ') || '(none)')

  const turns = [
    'how do I install genkaku on macOS',
    'refactor this typescript module',
    '我想了解算力市場的定價',
  ]

  for (const text of turns) {
    const hit = matchAd(catalog, text)
    console.log(`  ${JSON.stringify(text)} → ${hit == null ? 'no ad' : `${hit.creative.id} (${hit.hits} hits)`}`)
  }

  const first = catalog.creatives[0]
  if (first != null) {
    await feed.record({ at: Date.now(), creativeId: first.id, category: first.category })
    console.log('impression reported for', first.id)
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
