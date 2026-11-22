// GENKAKU: Agent Routes — shareable specialist cards.
//
// A card is one specialist, portable between machines. The one thing that
// cannot travel is the model: `gk.w1.llama3` names a worker that exists on the
// sender's board and nowhere else. So a card carries a *hint* — "a local
// agent-capable model", "the fastest local one", "any DeepSeek model" — and the
// receiving machine resolves it against its own catalog at install time. The
// panel shows the resolved model before the card is added, so nothing is
// silently pointed at a model the user does not have.
//
// A card also cannot carry `enabled`, `main`, or the delegation limits: those
// are the user's own decisions, and a file someone else wrote must not be able
// to turn the feature on or widen its bounds.
//
// The library (`cards.json`) is an inbox, not the live team. `team.json` stays
// the single source of truth for what runs; importing a card appends to the
// team only after the panel has shown the preview.

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { gunzipSync, gzipSync } from 'node:zlib'

import {
  MAX_TEAM_AGENTS,
  sanitizeRoute,
  type TeamAgent,
  type TeamCatalog,
  type TeamRoute,
} from './team.ts'

/** Format tag so a future reader can tell a card from anything else. */
export const CARD_FORMAT = 'agent-card/1'
export const PACK_FORMAT = 'agent-pack/1'

/** Share codes look like the pairing codes the worker panel already uses. */
export const SHARE_PREFIX = 'gkcard1.'

/** A pack of four cards is ~2 KB encoded; 8 KB leaves room and caps abuse. */
export const MAX_SHARE_BYTES = 8_192

/** How many imported cards the library keeps. */
export const MAX_LIBRARY_CARDS = 64

export const CARD_LIBRARY_FILE = 'cards.json'

/**
 * Where a card wants to run. `exact` is for a card that is not really portable
 * (a backup of your own team); `local` and `cloud` are the ones meant to travel.
 */
export type CardRouteHint =
  | {
    kind: 'local'
    tier?: 'chat' | 'agent'
    prefer?: 'cheapest' | 'fastest' | 'largest'
  }
  | { kind: 'cloud'; provider?: string; model?: string }
  | { kind: 'exact'; provider: string; model: string }

/** One specialist, as it travels. */
export type AgentCard = {
  genkaku: typeof CARD_FORMAT
  /**
   * Optional ascii id the author chose (`translator`). A Chinese name would
   * otherwise slug to nothing, and the delegate tool's enum has to be ascii:
   * the specialist id also becomes a child-agent name in the harness.
   */
  id?: string
  name: string
  /** The language the prose is written in. Informational; never translated. */
  lang: string
  tags: string[]
  author?: { name?: string; wallet?: string }
  /** Why this split, in the author's words. Shown in the preview. */
  notes?: string
  agent: {
    whenToUse: string
    whenNotToUse: string
    examples: string[]
    systemPrompt: string
    maxTokens: number
    routeHint: CardRouteHint
  }
}

/** Several cards plus an optional shared orchestration note. */
export type AgentPack = {
  genkaku: typeof PACK_FORMAT
  name: string
  description?: string
  lang?: string
  cards: AgentCard[]
  policy?: string
}

/** One row in the local library: the card plus where it came from. */
export type CardLibraryRow = {
  id: string
  card: AgentCard
  importedAt: number
  /** `paste`, `file`, `link`, `registry:<id>`, `own` */
  source: string
}

export type CardLibrary = {
  version: 1
  cards: CardLibraryRow[]
}

/** What an install would do, shown before the card joins the team. */
export type CardResolution = {
  card: AgentCard
  agent: TeamAgent
  route: TeamRoute
  /** True when the hint did not survive the catalog and a fallback was used. */
  adjusted: boolean
  reason?: string
}

// ── reading ──────────────────────────────────────────────────────────────────

/**
 * The single authority for a card read from a file, a link or a paste. It
 * clamps every string and number the same way `sanitizeTeamConfig` does, so a
 * hostile card cannot smuggle an oversized prompt or an unknown field into the
 * team.
 */
export function sanitizeCard(value: unknown): AgentCard | null {
  const raw = value as Partial<AgentCard> | null
  if (raw == null || typeof raw !== 'object') return null

  const agent = raw.agent as Partial<AgentCard['agent']> | null
  if (agent == null || typeof agent !== 'object') return null

  const name = text(raw.name, 80)
  const whenToUse = text(agent.whenToUse, 2_000)
  if (name === '' || whenToUse === '') return null

  const hint = sanitizeHint(agent.routeHint)
  const credit = author(raw.author)
  const notes = text(raw.notes, 1_000)
  const id = asciiId(raw.id)

  return {
    genkaku: CARD_FORMAT,
    ...(id === '' ? {} : { id }),
    name,
    lang: text(raw.lang, 16),
    tags: tags(raw.tags),
    ...(credit == null ? {} : { author: credit }),
    ...(notes === '' ? {} : { notes }),
    agent: {
      whenToUse,
      whenNotToUse: text(agent.whenNotToUse, 1_000),
      examples: examples(agent.examples),
      systemPrompt: text(agent.systemPrompt, 8_000),
      maxTokens: clampInt(agent.maxTokens, 128, 32_000, 2_000),
      routeHint: hint,
    },
  }
}

export function sanitizePack(value: unknown): AgentPack | null {
  const raw = value as Partial<AgentPack> | null
  if (raw == null || typeof raw !== 'object' || !Array.isArray(raw.cards)) return null
  const cards: AgentCard[] = []
  for (const candidate of raw.cards) {
    const card = sanitizeCard(candidate)
    if (card == null) continue
    cards.push(card)
    if (cards.length >= MAX_TEAM_AGENTS) break
  }
  if (cards.length === 0) return null
  const name = text(raw.name, 80) || cards[0]!.name
  return {
    genkaku: PACK_FORMAT,
    name,
    ...(text(raw.description, 500) === '' ? {} : { description: text(raw.description, 500) }),
    ...(text(raw.lang, 16) === '' ? {} : { lang: text(raw.lang, 16) }),
    cards,
    ...(text(raw.policy, 2_000) === '' ? {} : { policy: text(raw.policy, 2_000) }),
  }
}

/** Accept a card, a pack, or a bare object with `cards`/`agent` at the top. */
export function readAnyCardDocument(value: unknown): { cards: AgentCard[]; pack?: AgentPack } {
  const raw = value as { genkaku?: unknown; cards?: unknown; agent?: unknown } | null
  if (raw == null || typeof raw !== 'object') return { cards: [] }

  if (raw.genkaku === PACK_FORMAT || (Array.isArray(raw.cards) && raw.genkaku !== CARD_FORMAT)) {
    const pack = sanitizePack(value)
    return pack == null ? { cards: [] } : { cards: pack.cards, pack }
  }

  // A card file may be the card itself or `{ "card": { ... } }`.
  const direct = sanitizeCard(value)
  if (direct != null) return { cards: [direct] }
  const nested = sanitizeCard((raw as { card?: unknown }).card)
  return nested == null ? { cards: [] } : { cards: [nested] }
}

// ── writing ──────────────────────────────────────────────────────────────────

/**
 * Turn a live specialist into a portable card. The route becomes a hint:
 * an empty local model stays "any local worker", a specific worker becomes
 * `exact` (only useful for your own backup), and a cloud route names the
 * provider plus the model it prefers.
 */
export function cardFromAgent(
  agent: TeamAgent,
  meta: { lang?: string; tags?: string[]; author?: AgentCard['author']; notes?: string } = {},
): AgentCard {
  const credit = author(meta.author)
  return {
    genkaku: CARD_FORMAT,
    id: agent.id,
    name: agent.name,
    lang: meta.lang ?? '',
    tags: tags(meta.tags),
    ...(credit == null ? {} : { author: credit }),
    ...(meta.notes == null || meta.notes.trim() === '' ? {} : { notes: text(meta.notes, 1_000) }),
    agent: {
      whenToUse: agent.whenToUse,
      whenNotToUse: agent.whenNotToUse,
      examples: examples(agent.examples),
      systemPrompt: agent.systemPrompt,
      maxTokens: agent.maxTokens,
      routeHint: hintFromRoute(agent.route),
    },
  }
}

export function hintFromRoute(route: TeamRoute): CardRouteHint {
  if (route.provider === 'genkaku') {
    if (route.model === '') {
      return { kind: 'local', ...(route.prefer == null ? {} : { prefer: route.prefer }) }
    }
    return { kind: 'exact', provider: 'genkaku', model: route.model }
  }
  return {
    kind: 'cloud',
    provider: route.provider,
    ...(route.model === '' ? {} : { model: route.model }),
  }
}

// ── resolving ────────────────────────────────────────────────────────────────

/**
 * Turn a hint into a route this machine can actually call.
 *
 * A local hint with no live worker resolves to `genkaku` with an empty model,
 * which the adapter re-resolves at call time — that is the honest answer, and
 * it keeps working when a worker comes back.
 */
export function resolveHint(
  hint: CardRouteHint,
  catalog: TeamCatalog,
): { route: TeamRoute; adjusted: boolean; reason?: string } {
  if (hint.kind === 'exact') {
    if (hasRoute(catalog, hint.provider, hint.model)) {
      return { route: { provider: hint.provider, model: hint.model }, adjusted: false }
    }
    // An exact local worker almost never exists on the receiving machine.
    if (hint.provider === 'genkaku') {
      return {
        route: { provider: 'genkaku', model: '' },
        adjusted: true,
        reason: 'the worker named in the card is not on this machine',
      }
    }
    const cloud = firstCloudModel(catalog, hint.provider, hint.model)
    if (cloud != null) {
      return { route: cloud, adjusted: true, reason: 'that model is not in your list' }
    }
    return { route: { provider: 'genkaku', model: '' }, adjusted: true, reason: 'that model is not in your list' }
  }

  if (hint.kind === 'cloud') {
    // A named provider that is not configured here is a different case from a
    // model that moved: the first is "you do not have this", the second is
    // "the provider is here, the model is not". Both adjust, but only the
    // second keeps the provider.
    const named = hint.provider == null || hint.provider === ''
      ? undefined
      : catalog.providers.find(entry => entry.id === hint.provider)
        ?? catalog.providers.find(entry => entry.name.toLowerCase() === hint.provider!.toLowerCase())

    if (hint.provider != null && hint.provider !== '' && named == null) {
      const any = firstCloudModel(catalog, undefined, undefined)
      if (any != null) {
        return { route: any, adjusted: true, reason: 'that provider is not configured here' }
      }
      return { route: { provider: 'genkaku', model: '' }, adjusted: true, reason: 'no cloud provider is configured' }
    }

    const cloud = firstCloudModel(catalog, named?.id, hint.model)
    if (cloud != null) {
      const exact = hint.model != null && hint.model !== '' && cloud.model === hint.model
      return {
        route: cloud,
        adjusted: !exact && hint.model != null && hint.model !== '',
        ...(exact || hint.model == null || hint.model === ''
          ? {}
          : { reason: 'that model is not in your list; the provider’s first model is used' }),
      }
    }
    return { route: { provider: 'genkaku', model: '' }, adjusted: true, reason: 'no cloud model is available' }
  }

  const local = pickLocal(catalog, hint)
  if (local == null) {
    return {
      route: { provider: 'genkaku', model: '', ...(hint.prefer == null ? {} : { prefer: hint.prefer }) },
      adjusted: false,
    }
  }
  return { route: { provider: 'genkaku', model: local.id }, adjusted: false }
}

/**
 * The install preview: the card's fields plus the route this machine would
 * use, plus a unique id for the team it is about to join.
 */
export function resolveCard(card: AgentCard, catalog: TeamCatalog, id: string): CardResolution {
  const resolved = resolveHint(card.agent.routeHint, catalog)
  return {
    card,
    route: resolved.route,
    adjusted: resolved.adjusted,
    ...(resolved.reason == null ? {} : { reason: resolved.reason }),
    agent: {
      id,
      name: card.name,
      whenToUse: card.agent.whenToUse,
      whenNotToUse: card.agent.whenNotToUse,
      examples: [...card.agent.examples],
      route: resolved.route,
      systemPrompt: card.agent.systemPrompt,
      maxTokens: card.agent.maxTokens,
    },
  }
}

function pickLocal(
  catalog: TeamCatalog,
  hint: Extract<CardRouteHint, { kind: 'local' }>,
): TeamCatalog['local'][number] | null {
  const rows = catalog.local.filter(row => row.id !== 'team')
  if (rows.length === 0) return null

  const tiered = hint.tier == null ? rows : rows.filter(row => row.tier === hint.tier)
  const pool = tiered.length > 0 ? tiered : rows

  if (hint.prefer == null) {
    // Default: an agent-capable worker, because a specialist may need tools.
    return pool.find(row => row.tier === 'agent') ?? pool[0]!
  }

  const sorted = [...pool].sort((a, b) => compare(a, b, hint.prefer!))
  return sorted[0]!
}

function compare(
  a: TeamCatalog['local'][number],
  b: TeamCatalog['local'][number],
  prefer: 'cheapest' | 'fastest' | 'largest',
): number {
  if (prefer === 'cheapest') return micro(a.pricePerHour) - micro(b.pricePerHour)
  if (prefer === 'fastest') return (a.latencyMs ?? Number.MAX_SAFE_INTEGER) - (b.latencyMs ?? Number.MAX_SAFE_INTEGER)
  return sizeOf(b.parameterSize) - sizeOf(a.parameterSize)
}

function micro(value: string | undefined): number {
  const parsed = Number(value ?? '0')
  return Number.isFinite(parsed) ? parsed : 0
}

/** `7B` → 7, `1.5b` → 1.5, anything unknown → 0 so it sorts last. */
function sizeOf(value: string | undefined): number {
  const match = /^(\d+(?:\.\d+)?)\s*([bm])$/i.exec((value ?? '').trim())
  if (match == null) return 0
  const amount = Number(match[1])
  if (!Number.isFinite(amount)) return 0
  return match[2]!.toLowerCase() === 'b' ? amount : amount / 1_000
}

function hasRoute(catalog: TeamCatalog, provider: string, model: string): boolean {
  if (provider === 'genkaku') return catalog.local.some(row => row.id === model)
  return catalog.providers.some(
    entry => entry.id === provider && entry.models.some(candidate => candidate.id === model),
  )
}

function firstCloudModel(
  catalog: TeamCatalog,
  provider: string | undefined,
  model: string | undefined,
): TeamRoute | null {
  const providerMatch = provider == null || provider === ''
    ? undefined
    : catalog.providers.find(entry => entry.id === provider)
      ?? catalog.providers.find(entry => entry.name.toLowerCase() === provider.toLowerCase())

  const pools = providerMatch == null ? catalog.providers : [providerMatch]
  for (const entry of pools) {
    if (model != null && model !== '') {
      const exact = entry.models.find(candidate => candidate.id === model)
      if (exact != null) return { provider: entry.id, model: exact.id }
    }
  }
  for (const entry of pools) {
    const first = entry.models[0]
    if (first != null) return { provider: entry.id, model: first.id }
  }
  return null
}

// ── share codes ──────────────────────────────────────────────────────────────

/**
 * `gkcard1.` + base64url(gzip(json)).
 *
 * Gzip rather than raw base64 because a card is mostly repeated prose: a
 * four-card pack drops from ~6 KB to under 2 KB, which is the difference
 * between a link someone can send and one their chat client truncates.
 */
export function encodeShare(value: AgentCard | AgentPack): string {
  const json = JSON.stringify(value)
  const code = gzipSync(Buffer.from(json, 'utf8'), { level: 9 }).toString('base64url')
  const encoded = `${SHARE_PREFIX}${code}`
  if (encoded.length > MAX_SHARE_BYTES) {
    throw new Error(`share code is ${encoded.length} characters, over the ${MAX_SHARE_BYTES} limit`)
  }
  return encoded
}

/** Decode a share code. Returns null for anything that is not one. */
export function decodeShare(input: string): { cards: AgentCard[]; pack?: AgentPack } | null {
  const code = input.trim().replace(/\s+/g, '')
  if (!code.startsWith(SHARE_PREFIX)) return null
  const payload = code.slice(SHARE_PREFIX.length)
  if (payload === '' || payload.length > MAX_SHARE_BYTES) return null
  try {
    const raw = gunzipSync(Buffer.from(payload, 'base64url'), { maxOutputLength: 64 * 1024 })
    return readAnyCardDocument(JSON.parse(raw.toString('utf8')))
  } catch {
    return null
  }
}

/**
 * The link the website renders. The payload lives in the fragment, so the
 * server never receives it — the page is a viewer, not a host.
 */
export function shareUrl(code: string, origin = 'https://genkaku.app'): string {
  return `${origin.replace(/\/$/, '')}/c/#${encodeURIComponent(code)}`
}

// ── library ──────────────────────────────────────────────────────────────────

export function cardLibraryPath(keyDir: string): string {
  return join(keyDir, CARD_LIBRARY_FILE)
}

/** A stable id from the card's content, so importing the same card twice is a no-op. */
export function cardId(card: AgentCard): string {
  return createHash('sha256').update(JSON.stringify(card)).digest('hex').slice(0, 12)
}

/**
 * The id this card would take in a team that already uses `taken`.
 *
 * Order: the author's `id`, then an ascii slug of the name, then `agent`. A
 * Chinese name with no id slugs to nothing, which is why the advisor is asked
 * for an id and why the panel keeps the field editable.
 */
export function previewAgentId(card: AgentCard, taken: Set<string>): string {
  const base = asciiId(card.id) || asciiId(card.name) || 'agent'
  let id = /^[a-z]/.test(base) ? base : `agent-${base}`.replace(/-+$/g, '')
  if (id === 'lead') id = 'lead-agent'
  const root = id
  let suffix = 2
  while (taken.has(id)) {
    const tail = `-${suffix++}`
    id = `${root.slice(0, 32 - tail.length)}${tail}`
  }
  return id
}

/** Lower-case ascii, digits and single hyphens; empty when nothing survives. */
export function asciiId(value: unknown): string {
  const raw = typeof value === 'string' ? value : ''
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32)
}

export function emptyCardLibrary(): CardLibrary {
  return { version: 1, cards: [] }
}

export function readCardLibrary(keyDir: string): CardLibrary {
  try {
    const path = cardLibraryPath(keyDir)
    if (!existsSync(path)) return emptyCardLibrary()
    const value = JSON.parse(readFileSync(path, 'utf8')) as Partial<CardLibrary> | null
    if (value == null || !Array.isArray(value.cards)) return emptyCardLibrary()
    const rows: CardLibraryRow[] = []
    for (const candidate of value.cards) {
      const row = candidate as Partial<CardLibraryRow> | null
      const card = sanitizeCard(row?.card)
      if (card == null) continue
      rows.push({
        id: typeof row?.id === 'string' && row.id !== '' ? row.id.slice(0, 32) : cardId(card),
        card,
        importedAt: typeof row?.importedAt === 'number' ? row.importedAt : 0,
        source: text(row?.source, 80) || 'unknown',
      })
      if (rows.length >= MAX_LIBRARY_CARDS) break
    }
    return { version: 1, cards: rows }
  } catch {
    return emptyCardLibrary()
  }
}

export function writeCardLibrary(keyDir: string, library: CardLibrary): CardLibrary {
  const rows = library.cards.slice(0, MAX_LIBRARY_CARDS)
  const next: CardLibrary = { version: 1, cards: rows }
  mkdirSync(keyDir, { recursive: true, mode: 0o700 })
  const path = cardLibraryPath(keyDir)
  const tmp = `${path}.tmp`
  writeFileSync(tmp, `${JSON.stringify(next, undefined, 2)}\n`, { mode: 0o600 })
  renameSync(tmp, path)
  return next
}

/** Add cards to the library, newest first, replacing an identical card. */
export function addCards(
  keyDir: string,
  cards: AgentCard[],
  source: string,
): { library: CardLibrary; added: CardLibraryRow[] } {
  const current = readCardLibrary(keyDir)
  const byId = new Map(current.cards.map(row => [row.id, row]))
  const added: CardLibraryRow[] = []
  for (const card of cards) {
    const row: CardLibraryRow = {
      id: cardId(card),
      card,
      importedAt: Date.now(),
      source: text(source, 80) || 'paste',
    }
    byId.set(row.id, row)
    added.push(row)
  }
  const rows = [...byId.values()]
    .sort((a, b) => b.importedAt - a.importedAt)
    .slice(0, MAX_LIBRARY_CARDS)
  return { library: writeCardLibrary(keyDir, { version: 1, cards: rows }), added }
}

export function removeCard(keyDir: string, id: string): CardLibrary {
  const current = readCardLibrary(keyDir)
  return writeCardLibrary(keyDir, {
    version: 1,
    cards: current.cards.filter(row => row.id !== id),
  })
}

// ── helpers ──────────────────────────────────────────────────────────────────

function sanitizeHint(value: unknown): CardRouteHint {
  const raw = value as (Partial<CardRouteHint> & { kind?: string }) | null | undefined
  const kind = raw?.kind

  if (kind === 'exact') {
    const provider = text((raw as { provider?: unknown }).provider, 64)
    const model = text((raw as { model?: unknown }).model, 200)
    if (provider !== '' && model !== '') return { kind: 'exact', provider, model }
    return { kind: 'local' }
  }

  if (kind === 'cloud') {
    const provider = text((raw as { provider?: unknown }).provider, 64)
    const model = text((raw as { model?: unknown }).model, 200)
    return {
      kind: 'cloud',
      ...(provider === '' ? {} : { provider }),
      ...(model === '' ? {} : { model }),
    }
  }

  const loose = raw as { tier?: unknown; prefer?: unknown } | null | undefined
  const tier = loose?.tier
  const prefer = loose?.prefer
  return {
    kind: 'local',
    ...(tier === 'chat' || tier === 'agent' ? { tier } : {}),
    ...(prefer === 'cheapest' || prefer === 'fastest' || prefer === 'largest' ? { prefer } : {}),
  }
}

function text(value: unknown, limit: number): string {
  return typeof value === 'string' ? value.trim().slice(0, limit) : ''
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

function author(value: unknown): AgentCard['author'] | null {
  const raw = value as { name?: unknown; wallet?: unknown } | null
  const name = text(raw?.name, 80)
  const wallet = text(raw?.wallet, 64)
  if (name === '' && wallet === '') return null
  return { ...(name === '' ? {} : { name }), ...(wallet === '' ? {} : { wallet }) }
}

function examples(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const out: string[] = []
  for (const item of value) {
    const example = text(item, 200)
    if (example === '' || out.includes(example)) continue
    out.push(example)
    if (out.length >= 6) break
  }
  return out
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, Math.round(value)))
}
