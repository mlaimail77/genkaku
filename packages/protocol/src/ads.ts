// GENKAKU: sponsored placements (0.3).
//
// Two things live here, and nothing else may: the shape of the catalog the ads
// service publishes, and the matching that decides whether one creative is
// relevant to the turn the user just sent.
//
// The matching runs on the user's own machine. The prompt never leaves it: the
// bridge fetches the catalog (creative text plus keywords), matches locally, and
// reports only "category + creative id" back as an impression. That is the
// whole privacy argument for advertising inside a local-first client, so it is
// also the reason this module has no network code in it at all.
//
// Failure policy is "no ad": anything malformed, oversized or unexpected is
// dropped by the parser, and an empty catalog renders nothing. An ad system that
// cannot fail silently would be worse than no ad system.

/** One creative, as the operator typed it into the admin console. */
export type AdCreative = {
  /** stable id; the impression record names this, never the prompt */
  id: string
  /** one of the allowlisted categories; matching is scoped to it */
  category: string
  /** advertiser's display name — shown as "Sponsored by …" */
  sponsor: string
  title: string
  body: string
  /** destination for a click; absent = brand impression only */
  url?: string
  /** the button, when the creative wants one. `url` is our click proxy, not the
   *  advertiser's: the redirect is what makes a click countable and keeps the
   *  user's request off the advertiser's host. */
  cta?: { label: string; url: string }
  /** a creative image; alt is mandatory so the card degrades to text safely */
  image?: { url: string; alt: string }
  /** lowercase terms matched against the user's turn */
  keywords: string[]
  /** tie-break inside a category; higher wins */
  weight?: number
}

export type AdCatalog = {
  /** changes when the operator edits anything; the bridge re-fetches on change */
  revision: string
  /** `paused` is the safe default and the launch state */
  mode: 'active' | 'paused'
  /** categories the operator allows. Empty = nothing may be served. */
  categories: string[]
  creatives: AdCreative[]
}

export const EMPTY_CATALOG: AdCatalog = {
  revision: '',
  mode: 'paused',
  categories: [],
  creatives: [],
}

/** Longest field we will carry. The catalog is untrusted JSON. */
const MAX_ID = 64
const MAX_CATEGORY = 32
const MAX_SPONSOR = 60
const MAX_TITLE = 90
const MAX_BODY = 220
const MAX_URL = 300
const MAX_CTA = 24
const MAX_KEYWORDS = 24
const MAX_KEYWORD = 40

/** How often a placement may repeat in one conversation. */
export const AD_MIN_TURNS = 3
/** …and at least this long between two placements, in ms. */
export const AD_MIN_GAP_MS = 5 * 60_000

function text(value: unknown, max: number): string {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()

  return trimmed.length > max ? trimmed.slice(0, max) : trimmed
}

function categoryOf(value: unknown): string {
  return text(value, MAX_CATEGORY).toLowerCase()
}

/** A URL is only carried when it is http(s); anything else is dropped rather
 *  than rendered as a link. */
function urlOf(value: unknown): string | undefined {
  const raw = text(value, MAX_URL)
  if (raw === '') return undefined
  try {
    const url = new URL(raw)

    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : undefined
  } catch {
    return undefined
  }
}

function creativeOf(raw: unknown): AdCreative | null {
  if (typeof raw !== 'object' || raw === null) return null
  const row = raw as Record<string, unknown>
  const id = text(row.id, MAX_ID)
  const category = categoryOf(row.category)
  const title = text(row.title, MAX_TITLE)

  // A creative without an id, a category or a title cannot be shown or
  // attributed, so it is not a creative.
  if (id === '' || category === '' || title === '') return null

  const keywords: string[] = []
  if (Array.isArray(row.keywords)) {
    for (const entry of row.keywords) {
      const word = text(entry, MAX_KEYWORD).toLowerCase()
      if (word !== '' && !keywords.includes(word)) keywords.push(word)
      if (keywords.length >= MAX_KEYWORDS) break
    }
  }

  // No keywords would make the creative match every turn, which is a way to
  // buy ubiquity by accident. Refuse it.
  if (keywords.length === 0) return null

  const weight = typeof row.weight === 'number' && Number.isFinite(row.weight) ? row.weight : 0
  const url = urlOf(row.url)
  const cta = ctaOf(row.cta)
  const image = imageOf(row.image)

  return {
    id,
    category,
    sponsor: text(row.sponsor, MAX_SPONSOR) || 'GenKaKu',
    title,
    body: text(row.body, MAX_BODY),
    keywords,
    weight,
    ...(url == null ? {} : { url }),
    ...(cta == null ? {} : { cta }),
    ...(image == null ? {} : { image }),
  }
}

/** An image is a URL plus alt text. Either alone is dropped: an image without
 *  alt is unusable for a screen reader, and alt without a URL renders nothing. */
function imageOf(raw: unknown): { url: string; alt: string } | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined
  const row = raw as Record<string, unknown>
  const rawUrl = text(row.url, MAX_URL)
  // Our own asset path is root-relative (`/ads/v1/asset?id=…`); the bridge makes
  // it absolute against the ads host before the panel sees it. Everything else
  // must be an absolute http(s) URL.
  const url = rawUrl.startsWith('/') && !rawUrl.startsWith('//') ? rawUrl : urlOf(rawUrl)
  const alt = text(row.alt, 120)

  if (url == null || alt === '') return undefined

  return { url, alt }
}

/** A CTA is a label plus a link, both required. A label without a link is a
 *  dead button, so it is dropped rather than rendered. Our click proxy is
 *  root-relative (`/ads/v1/click?id=…`) and is made absolute — like an image
 *  asset — against the ads host in `absolutizeAssets`. */
function ctaOf(raw: unknown): { label: string; url: string } | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined
  const row = raw as Record<string, unknown>
  const label = text(row.label, MAX_CTA)
  const rawUrl = text(row.url, MAX_URL)
  const url = rawUrl.startsWith('/') && !rawUrl.startsWith('//') ? rawUrl : urlOf(rawUrl)

  if (label === '' || url == null) return undefined

  return { label, url }
}

/**
 * Parse whatever the ads service returned into a catalog this client can use.
 *
 * Never throws: a bad document is an empty catalog, which serves nothing.
 */
export function parseAdCatalog(raw: unknown): AdCatalog {
  if (typeof raw !== 'object' || raw === null) return EMPTY_CATALOG
  const doc = raw as Record<string, unknown>

  const mode = doc.mode === 'active' ? 'active' : 'paused'

  const categories: string[] = []
  if (Array.isArray(doc.categories)) {
    for (const entry of doc.categories) {
      const category = categoryOf(entry)
      if (category !== '' && !categories.includes(category)) categories.push(category)
    }
  }

  const creatives: AdCreative[] = []
  const seen = new Set<string>()
  if (Array.isArray(doc.creatives)) {
    for (const entry of doc.creatives) {
      const creative = creativeOf(entry)
      if (creative == null || seen.has(creative.id)) continue
      // A creative in an unlisted category is inert. Filtering here means the
      // bridge never has to remember the rule.
      if (!categories.includes(creative.category)) continue
      seen.add(creative.id)
      creatives.push(creative)
    }
  }

  return {
    revision: text(doc.revision, MAX_ID),
    mode,
    categories,
    creatives,
  }
}

/** True when this catalog may serve anything at all. */
export function catalogServes(catalog: AdCatalog | null | undefined): boolean {
  return catalog != null
    && catalog.mode === 'active'
    && catalog.categories.length > 0
    && catalog.creatives.length > 0
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Latin/digit terms match as whole words; a term containing anything else
 *  (CJK, punctuation-free scripts) matches as a substring, because those
 *  languages do not put spaces between words. */
function matches(haystack: string, needle: string): boolean {
  if (needle === '') return false
  if (/^[a-z0-9][a-z0-9 ._+-]*$/.test(needle)) {
    const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegExp(needle)}([^a-z0-9]|$)`, 'i')

    return pattern.test(haystack)
  }

  return haystack.includes(needle)
}

export type AdMatch = {
  creative: AdCreative
  /** how many of its keywords the turn hit */
  hits: number
}

/**
 * Pick the creative whose keywords the turn mentions most.
 *
 * `avoid` is the last creative shown in this conversation: it only loses a tie,
 * so a conversation that keeps mentioning the same thing is not hammered with
 * the same card, while a genuinely better match still wins.
 */
export function matchAd(
  catalog: AdCatalog | null | undefined,
  turnText: string,
  avoid?: string,
): AdMatch | null {
  if (!catalogServes(catalog)) return null
  const text = turnText.toLowerCase()
  if (text.trim() === '') return null

  let best: AdMatch | null = null

  for (const creative of catalog!.creatives) {
    let hits = 0
    for (const keyword of creative.keywords) {
      if (matches(text, keyword)) hits += 1
    }
    if (hits === 0) continue

    if (best == null) {
      best = { creative, hits }
      continue
    }

    const weight = creative.weight ?? 0
    const bestWeight = best.creative.weight ?? 0
    const better = hits > best.hits
      || (hits === best.hits && weight > bestWeight)
      || (hits === best.hits && weight === bestWeight && avoid != null && best.creative.id === avoid)

    if (better) best = { creative, hits }
  }

  return best
}

export type AdRotation = {
  /** turns since the last placement in this conversation */
  turnsSince: number
  /** wall-clock ms since the last placement */
  msSince: number
}

/**
 * Whether a placement is due.
 *
 * Both gates matter: a fast conversation should not show a card every turn, and
 * a slow one should not go unserved for hours. Either gate alone is exploitable
 * by the shape of the traffic.
 */
export function adRotationDue(rotation: AdRotation): boolean {
  return rotation.turnsSince >= AD_MIN_TURNS && rotation.msSince >= AD_MIN_GAP_MS
}

/** The category of an impression. Recorded; the turn text is not. */
export type AdImpression = {
  at: number
  creativeId: string
  category: string
  /** random per bridge run: how the service dedupes a re-reported impression
   *  without being able to link it to a person */
  session?: string
  /** the wallet that served the turn — what one sponsored minute is paid to */
  worker?: string
  /** how many turns had passed since the previous placement */
  turnsSince?: number
}

export type AdMode = {
  mode: 'active' | 'paused'
  revision: string
  /** when the bridge last refreshed the catalog, ms since epoch */
  fetchedAt: number
  /** true when the catalog could not be refreshed and this is the stale copy */
  stale: boolean
}
