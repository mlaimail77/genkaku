// GENKAKU: the ad catalog feed (0.3).
//
// The bridge holds one of these. It keeps the catalog warm so a turn never waits
// on the network, and it degrades to "no ads" rather than to an error: the
// panel must keep working when the ads service is down, because the ads service
// is an optional revenue line and inference is the product.
//
// Two clocks, deliberately different:
//   ttlMs   — how long a fetched catalog is considered fresh (1 min default).
//             Short because a self-serve campaign's budget can run out, and a
//             catalogue that keeps offering it would be promising money the
//             campaign no longer has.
//   staleMs — how long the last good copy may still be served after failures
//             (24 h default). After that the network is treated as unsponsored,
//             which is the fallback the operator asked for: no ads, free
//             workers only.
//
// The catalog is untrusted bytes from the internet. `parseAdCatalog` is the only
// thing that turns them into a value, and it never throws.

import { EMPTY_CATALOG, parseAdCatalog, type AdCatalog, type AdImpression, type AdMode } from './ads.ts'

export const AD_TTL_MS = 60_000
export const AD_STALE_MS = 24 * 60 * 60_000
export const AD_FETCH_TIMEOUT_MS = 5_000

export type AdFeedOptions = {
  /** base URL, e.g. https://seed.genkaku.app/ads/v1 */
  baseUrl: string
  ttlMs?: number
  staleMs?: number
  timeoutMs?: number
  /** injection seam for tests */
  fetcher?: typeof fetch
  now?: () => number
  log?: (line: string) => void
}

export type AdFeed = {
  /** The best catalog we have right now; refreshes in the background when stale. */
  catalog: () => Promise<AdCatalog>
  /** What the panel and the health check read. */
  mode: () => Promise<AdMode>
  /** The same, without touching the network: safe on a 5-second status poll. */
  snapshot: () => AdMode
  /** Report one impression. Never throws, never blocks a turn. */
  record: (impression: AdImpression) => Promise<void>
  /** The URL this feed reads, for the admin/status surfaces. */
  endpoint: string
}

function trimSlash(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url
}

/**
 * Turn our own relative asset paths into absolute ones.
 *
 * The catalog is served from the ads host and describes images as
 * `/ads/v1/asset?id=…`. The dock is a different origin (the app's), so a
 * relative path there resolves to nothing. The bridge is the only place that
 * knows both, so it rewrites them once on the way in.
 */
export function absolutizeAssets(catalog: AdCatalog, baseUrl: string): AdCatalog {
  let origin: string

  try {
    origin = new URL(baseUrl).origin
  } catch {
    return catalog
  }

  return {
    ...catalog,
    creatives: catalog.creatives.map((creative) => {
      const imageUrl = creative.image?.url
      const ctaUrl = creative.cta?.url
      const image = imageUrl == null || !imageUrl.startsWith('/')
        ? creative.image
        : { ...creative.image!, url: `${origin}${imageUrl}` }
      const cta = ctaUrl == null || !ctaUrl.startsWith('/')
        ? creative.cta
        : { ...creative.cta!, url: `${origin}${ctaUrl}` }

      if (image === creative.image && cta === creative.cta) return creative

      return {
        ...creative,
        ...(image == null ? {} : { image }),
        ...(cta == null ? {} : { cta }),
      }
    }),
  }
}

export function createAdFeed(options: AdFeedOptions): AdFeed {
  const base = trimSlash(options.baseUrl)
  const ttlMs = options.ttlMs ?? AD_TTL_MS
  const staleMs = options.staleMs ?? AD_STALE_MS
  const timeoutMs = options.timeoutMs ?? AD_FETCH_TIMEOUT_MS
  const doFetch = options.fetcher ?? fetch
  const now = options.now ?? Date.now
  const log = options.log ?? (() => {})

  let cached: AdCatalog = EMPTY_CATALOG
  let fetchedAt = 0
  let inflight: Promise<AdCatalog> | null = null

  async function refresh(): Promise<AdCatalog> {
    try {
      const res = await doFetch(`${base}/catalog`, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(timeoutMs),
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const doc: unknown = await res.json()
      const parsed = absolutizeAssets(parseAdCatalog(doc), base)
      cached = parsed
      fetchedAt = now()
      log(`ads: catalog ${parsed.revision || '(no revision)'} ${parsed.mode} (${parsed.creatives.length} creatives)`)

      return cached
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const age = fetchedAt === 0 ? Number.POSITIVE_INFINITY : now() - fetchedAt

      if (fetchedAt !== 0 && age <= staleMs) {
        log(`ads: catalog refresh failed (${message}); serving the copy from ${Math.round(age / 60_000)} min ago`)
      } else {
        log(`ads: catalog unavailable (${message}); serving nothing`)
        cached = EMPTY_CATALOG
      }

      return cached
    }
  }

  async function catalog(): Promise<AdCatalog> {
    const fresh = fetchedAt !== 0 && now() - fetchedAt < ttlMs
    if (fresh) return cached
    if (inflight != null) return await inflight

    inflight = refresh().finally(() => { inflight = null })

    return await inflight
  }

  async function mode(): Promise<AdMode> {
    const doc = await catalog()
    const age = fetchedAt === 0 ? Number.POSITIVE_INFINITY : now() - fetchedAt

    return {
      mode: doc.mode,
      revision: doc.revision,
      fetchedAt,
      stale: fetchedAt !== 0 && age > ttlMs,
    }
  }

  function snapshot(): AdMode {
    const age = fetchedAt === 0 ? Number.POSITIVE_INFINITY : now() - fetchedAt

    return {
      mode: cached.mode,
      revision: cached.revision,
      fetchedAt,
      stale: fetchedAt !== 0 && age > ttlMs,
    }
  }

  async function record(impression: AdImpression): Promise<void> {
    try {
      await doFetch(`${base}/impression`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(impression),
        signal: AbortSignal.timeout(timeoutMs),
      })
    } catch (error) {
      // Impressions are counted, not guaranteed. A failed report must never
      // surface in the conversation.
      log(`ads: impression not reported (${error instanceof Error ? error.message : String(error)})`)
    }
  }

  return { endpoint: `${base}/catalog`, catalog, mode, snapshot, record }
}
