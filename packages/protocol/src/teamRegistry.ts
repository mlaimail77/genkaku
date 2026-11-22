// GENKAKU: the curated Agent Routes card index.
//
// A registry is a static JSON index plus one file per card. It is served by the
// seed host — the same door the ad catalog uses — because that host is the
// network's data endpoint, while `genkaku.app` is the marketing site and may be
// rebuilt or retired.
//
// Everything here is deliberately boring: an index that cannot be parsed reads
// as empty, an unreachable registry reads as offline, and a card whose hash does
// not match is dropped. The panel keeps working with the local library in every
// one of those cases, which is the whole point of shipping the registry after
// the library rather than before it.
//
// There is no upload endpoint and no rating. Publishing is a pull request or a
// prefilled issue, and the list is curated by hand: the moment a registry has
// accounts and counters it becomes a marketplace, and a marketplace needs
// moderation the operator did not ask for.

import { createHash } from 'node:crypto'

import { sanitizeCard, type AgentCard } from './teamCards.ts'

export const REGISTRY_VERSION = 1

/** Where the shipped plugin looks. Overridable in the plugin settings. */
export const DEFAULT_REGISTRY_URL = 'https://seed.genkaku.app/cards/v1/index.json'

/** A card edited upstream shows up within ten minutes without a restart. */
export const REGISTRY_TTL_MS = 10 * 60_000

/** The list is curated; more than this is a browsing problem, not a feature. */
export const MAX_REGISTRY_CARDS = 200

/** An index is a few kilobytes. Anything larger is not an index. */
export const MAX_REGISTRY_BYTES = 128 * 1024

/** One row the panel lists. `url` may be relative to the index. */
export type RegistryEntry = {
  id: string
  name: string
  lang: string
  tags: string[]
  author?: { name?: string; wallet?: string }
  /** One line, so the list is scannable without opening each card. */
  summary: string
  url: string
  /** Hex sha256 of the card file, verified before the card is used. */
  sha256: string
  size?: number
}

export type RegistryIndex = {
  version: 1
  updatedAt: string
  cards: RegistryEntry[]
}

export type RegistryResult = {
  index: RegistryIndex
  /** True when the fetch failed and this is an empty index, not an empty registry. */
  offline: boolean
  /** Why it is offline, for the panel to show. */
  error?: string
  fetchedAt: number
}

type Cache = { url: string; result: RegistryResult }

let cache: Cache | null = null

/** Tests and the panel's Reload button both want this. */
export function clearRegistryCache(): void {
  cache = null
}

/**
 * Fetch and validate the index, with a ten-minute in-process cache.
 *
 * A failed fetch is not an error the panel has to handle: it returns an empty
 * index marked `offline`, so the local library and the import box stay usable.
 */
export async function fetchRegistry(
  indexUrl: string = DEFAULT_REGISTRY_URL,
  options: { signal?: AbortSignal; fresh?: boolean } = {},
): Promise<RegistryResult> {
  const url = indexUrl.trim() === '' ? DEFAULT_REGISTRY_URL : indexUrl.trim()

  if (!options.fresh && cache != null && cache.url === url && Date.now() - cache.result.fetchedAt < REGISTRY_TTL_MS) {
    return cache.result
  }

  const fail = (error: string): RegistryResult => {
    const result: RegistryResult = {
      index: { version: REGISTRY_VERSION, updatedAt: '', cards: [] },
      offline: true,
      error,
      fetchedAt: Date.now(),
    }
    cache = { url, result }
    return result
  }

  try {
    const response = await fetch(url, {
      headers: { accept: 'application/json' },
      signal: options.signal ?? AbortSignal.timeout(8_000),
    })
    if (!response.ok) return fail(`the card index answered HTTP ${response.status}`)
    const text = await response.text()
    if (text.length > MAX_REGISTRY_BYTES) return fail('the card index is too large')
    const result: RegistryResult = {
      index: sanitizeRegistryIndex(JSON.parse(text)),
      offline: false,
      fetchedAt: Date.now(),
    }
    cache = { url, result }
    return result
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error))
  }
}

/** Never trust the index: it is a file on someone else's disk. */
export function sanitizeRegistryIndex(value: unknown): RegistryIndex {
  const raw = value as Partial<RegistryIndex> | null
  const cards: RegistryEntry[] = []
  const seen = new Set<string>()

  if (Array.isArray(raw?.cards)) {
    for (const candidate of raw.cards) {
      if (cards.length >= MAX_REGISTRY_CARDS) break
      const row = candidate as Partial<RegistryEntry> | null
      if (row == null || typeof row !== 'object') continue

      const id = slug(row.id)
      const url = text(row.url, 300)
      const name = text(row.name, 80)
      if (id === '' || url === '' || name === '' || seen.has(id)) continue
      seen.add(id)

      const author = row.author as { name?: unknown; wallet?: unknown } | null
      const authorName = text(author?.name, 80)
      const authorWallet = text(author?.wallet, 64)

      cards.push({
        id,
        name,
        lang: text(row.lang, 16),
        tags: tags(row.tags),
        ...(authorName === '' && authorWallet === ''
          ? {}
          : { author: { ...(authorName === '' ? {} : { name: authorName }), ...(authorWallet === '' ? {} : { wallet: authorWallet }) } }),
        summary: text(row.summary, 200),
        url,
        sha256: text(row.sha256, 64).toLowerCase(),
        ...(typeof row.size === 'number' && Number.isFinite(row.size) ? { size: Math.max(0, Math.round(row.size)) } : {}),
      })
    }
  }

  return {
    version: REGISTRY_VERSION,
    updatedAt: text(raw?.updatedAt, 40),
    cards,
  }
}

/** Resolve a relative card url against the index url, the way a browser would. */
export function registryCardUrl(indexUrl: string, entry: RegistryEntry): string {
  try {
    return new URL(entry.url, indexUrl).toString()
  } catch {
    return entry.url
  }
}

/**
 * Fetch one card and verify it against the index.
 *
 * The hash check is what makes a curated list meaningful: if a card file is
 * replaced without the index being rebuilt, this refuses it rather than running
 * instructions the maintainers never saw.
 */
export async function fetchRegistryCard(
  indexUrl: string,
  entry: RegistryEntry,
  options: { signal?: AbortSignal } = {},
): Promise<{ card: AgentCard } | { error: string }> {
  const url = registryCardUrl(indexUrl, entry)
  let text: string
  try {
    const response = await fetch(url, {
      headers: { accept: 'application/json' },
      signal: options.signal ?? AbortSignal.timeout(8_000),
    })
    if (!response.ok) return { error: `the card answered HTTP ${response.status}` }
    text = await response.text()
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) }
  }

  if (entry.size != null && entry.size > 0 && Math.abs(text.length - entry.size) > 64) {
    return { error: 'the card file does not match the size in the index' }
  }
  if (entry.sha256 !== '') {
    const digest = createHash('sha256').update(text).digest('hex')
    if (digest !== entry.sha256) {
      return { error: 'the card file does not match the hash in the index' }
    }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { error: 'the card file is not JSON' }
  }

  const card = sanitizeCard(parsed)
  return card == null ? { error: 'the card file is not a specialist card' } : { card }
}

/** Case-insensitive match over name, summary, tags, author and language. */
export function filterRegistry(
  index: RegistryIndex,
  query: { q?: string; tag?: string; lang?: string } = {},
): RegistryEntry[] {
  const q = (query.q ?? '').trim().toLowerCase()
  const tag = (query.tag ?? '').trim().toLowerCase()
  const lang = (query.lang ?? '').trim().toLowerCase()

  return index.cards.filter((entry) => {
    if (tag !== '' && !entry.tags.includes(tag)) return false
    if (lang !== '' && !entry.lang.toLowerCase().startsWith(lang)) return false
    if (q === '') return true
    const haystack = [
      entry.name,
      entry.summary,
      entry.author?.name ?? '',
      entry.lang,
      ...entry.tags,
    ].join(' ').toLowerCase()
    return haystack.includes(q)
  })
}

/** Every tag in the index, most common first, for the filter chips. */
export function registryTags(index: RegistryIndex): Array<{ tag: string; count: number }> {
  const counts = new Map<string, number>()
  for (const entry of index.cards) {
    for (const tag of entry.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
}

function text(value: unknown, limit: number): string {
  return typeof value === 'string' ? value.trim().slice(0, limit) : ''
}

function slug(value: unknown): string {
  return text(value, 64)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
}

function tags(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const out: string[] = []
  for (const item of value) {
    const tag = text(item, 24).toLowerCase()
    if (tag === '' || out.includes(tag)) continue
    out.push(tag)
    if (out.length >= 8) break
  }
  return out
}
