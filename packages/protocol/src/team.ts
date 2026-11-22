// GENKAKU: Agent Routes — the user's own team of models.
//
// The panel lets a user pick one main model, pick up to eight specialist
// models, and describe what each specialist is for. None of that changes the
// chat until the user turns Agent Routes on and picks the `team` model; every
// other model in the picker behaves exactly as before.
//
// The file lives in the key directory next to `user.json` because it is the
// user's preference, not chain state and not a worker announcement. It holds no
// key material: only provider/model ids and prose.
//
// `sanitizeTeamConfig` is the single reader-side authority. The panel is not
// trusted to cap the team at eight specialists, to dedupe ids, or to keep an
// empty model out of a route, and a hand-edited file is not either.

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/** The synthetic model id the harness routes to this adapter. */
export const TEAM_MODEL_ID = 'team'

/** The one tool a model-decides main agent gets, instead of N specialist tools. */
export const TEAM_DELEGATE_TOOL = 'delegate'

/** The chat picker caps a team at eight specialists: a menu, not a company. */
export const MAX_TEAM_AGENTS = 8

/** One model call per delegation is honest; more than six per turn is a loop. */
export const MAX_TEAM_DELEGATIONS = 6

/** How many recent routing decisions the panel keeps. */
export const MAX_TEAM_DECISIONS = 20

export const TEAM_CONFIG_FILE = 'team.json'
export const TEAM_DECISIONS_FILE = 'team-decisions.json'

/** Where a route lives. `genkaku` with an empty model means "any local worker". */
export type TeamRoute = {
  provider: string
  model: string
  /** Only meaningful for a local (`genkaku`) route with an empty model. */
  prefer?: 'cheapest' | 'fastest' | 'largest'
}

/** One specialist the main model may delegate to. */
export type TeamAgent = {
  /** Lower-kebab id, unique inside the team; what the delegate tool accepts. */
  id: string
  /** Human name shown in the panel and in the tool description. */
  name: string
  /** When the main model should hand a task to this specialist. */
  whenToUse: string
  /** When it should not. Kept separate so a small model can tell the edges. */
  whenNotToUse: string
  /** Example tasks. These become the semantic router's utterances later. */
  examples: string[]
  /** Resolved at call time; an empty local model survives a worker going away. */
  route: TeamRoute
  /** Extra role instructions prepended to the delegated task. */
  systemPrompt: string
  /** Output cap for this specialist. */
  maxTokens: number
}

export type TeamMode = 'model-decides' | 'router-decides'

/** Everything the panel edits and the adapter reads. */
export type TeamConfig = {
  version: 1
  /**
   * Off means Agent Routes is invisible: `team` is not listed and the delegate
   * tool refuses. On means `GenKaKu · Agent Routes` appears in the picker.
   */
  enabled: boolean
  /**
   * Who picks the specialist. `model-decides` exposes the delegate tool to the
   * main model. `router-decides` picks a specialist before the main call, which
   * is the fallback for a main model that cannot call tools.
   */
  mode: TeamMode
  /**
   * The panel's claim that the main model can call tools. A local chat-only
   * model sets this false, and the adapter then routes per turn instead of
   * exposing a tool the model cannot use.
   */
  mainSupportsTools: boolean
  /** The model that answers the user and (normally) does the delegating. */
  main: TeamRoute | null
  /** Extra orchestration instructions, appended to the built-in policy. */
  policy: string
  agents: TeamAgent[]
  maxDelegations: number
  maxConcurrent: number
  updatedAt: number
}

/** One routing decision, shown in the panel so delegation is never a mystery. */
export type TeamDecision = {
  at: number
  /** `tool` when the main model asked; `router` when the plugin chose. */
  via: 'tool' | 'router'
  agent: string
  provider: string
  model: string
  ms: number
  ok: boolean
  /** Truncated task text; enough to recognise the turn, not the whole prompt. */
  task?: string
  error?: string
}

/** What the panel shows in the "available LLM" lists. */
export type TeamCatalog = {
  /** Cloud/other providers already configured in the harness. */
  providers: Array<{
    id: string
    name: string
    models: Array<{ id: string; name: string }>
  }>
  /** Local GenKaKu offers, one row per (worker, model), already de-duplicated. */
  local: Array<{
    id: string
    name: string
    worker?: string
    workerWallet?: string
    tier?: string
    pricePerHour?: string
    latencyMs?: number
  }>
}

export const DEFAULT_TEAM_POLICY = [
  'You are the main agent of a small team. Answer simple questions yourself.',
  'Delegate only when a specialist description clearly matches the task, and send a complete, self-contained task with the context the specialist needs.',
  'Never delegate greetings, acknowledgements, or a task you already know how to finish.',
  'When a delegated result comes back, use it to answer the user; do not repeat the delegation verbatim.',
].join(' ')

export function teamConfigPath(keyDir: string): string {
  return join(keyDir, TEAM_CONFIG_FILE)
}

export function emptyTeamConfig(): TeamConfig {
  return {
    version: 1,
    enabled: false,
    mode: 'model-decides',
    mainSupportsTools: true,
    main: null,
    policy: DEFAULT_TEAM_POLICY,
    agents: [],
    maxDelegations: MAX_TEAM_DELEGATIONS,
    maxConcurrent: 3,
    updatedAt: 0,
  }
}

/**
 * The host that knows which cloud providers the harness has configured. It is
 * a module-level registration because the bridge and the user plugin live in
 * the same Node process: the plugin sets it on start, the bridge asks on GET.
 * It returns route ids only, never a key or a credential.
 */
export type TeamCatalogProvider = () => Promise<{ providers: TeamCatalog['providers'] }>

let catalogProvider: TeamCatalogProvider | null = null

export function setTeamCatalogProvider(value: TeamCatalogProvider | null): void {
  catalogProvider = value
}

export function teamCatalogProvider(): TeamCatalogProvider | null {
  return catalogProvider
}

export function readTeamConfig(keyDir: string): TeamConfig {
  try {
    if (!existsSync(teamConfigPath(keyDir))) return emptyTeamConfig()
    return sanitizeTeamConfig(JSON.parse(readFileSync(teamConfigPath(keyDir), 'utf8')))
  } catch {
    return emptyTeamConfig()
  }
}

/**
 * Persist one complete config and notify in-process listeners. The bridge and
 * the adapter live in the same Node process, so a save is visible without a
 * restart; the listener re-registers the delegate tool with a fresh description.
 */
export function writeTeamConfig(keyDir: string, value: unknown): TeamConfig {
  const config = sanitizeTeamConfig(value)
  mkdirSync(keyDir, { recursive: true, mode: 0o700 })
  const path = teamConfigPath(keyDir)
  const tmp = `${path}.tmp`
  writeFileSync(tmp, `${JSON.stringify(config, undefined, 2)}\n`, { mode: 0o600 })
  renameSync(tmp, path)
  for (const listener of listeners) {
    try {
      listener()
    } catch {
      // A listener is a convenience. It must never make the save fail.
    }
  }
  return config
}

const listeners = new Set<() => void>()

/** Observe saves made through {@link writeTeamConfig} in this process. */
export function watchTeamConfig(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export function readTeamDecisions(keyDir: string): TeamDecision[] {
  try {
    const path = join(keyDir, TEAM_DECISIONS_FILE)
    if (!existsSync(path)) return []
    const value = JSON.parse(readFileSync(path, 'utf8'))
    if (!Array.isArray(value)) return []
    return value.filter(isDecision).slice(-MAX_TEAM_DECISIONS)
  } catch {
    return []
  }
}

/** Append one decision, keeping the file small enough to render in the panel. */
export function appendTeamDecision(keyDir: string, decision: TeamDecision): void {
  try {
    const next = [...readTeamDecisions(keyDir), decision].slice(-MAX_TEAM_DECISIONS)
    mkdirSync(keyDir, { recursive: true, mode: 0o700 })
    writeFileSync(
      join(keyDir, TEAM_DECISIONS_FILE),
      `${JSON.stringify(next, undefined, 2)}\n`,
      { mode: 0o600 },
    )
  } catch {
    // Diagnostics are best effort; a failed log must not fail the delegation.
  }
}

/** Never let a hand-edited file or an HTTP client widen the team past its caps. */
export function sanitizeTeamConfig(value: unknown): TeamConfig {
  const raw = value as Partial<TeamConfig> | null
  const base = emptyTeamConfig()
  const agents: TeamAgent[] = []
  const seen = new Set<string>()

  if (Array.isArray(raw?.agents)) {
    for (const candidate of raw.agents) {
      if (agents.length >= MAX_TEAM_AGENTS) break
      if (candidate == null || typeof candidate !== 'object') continue
      const agent = candidate as Partial<TeamAgent>
      const id = agentId(agent.id, seen)
      if (id === '') continue
      const route = sanitizeRoute(agent.route)
      if (route == null) continue
      seen.add(id)
      agents.push({
        id,
        name: text(agent.name, 80) || id,
        whenToUse: text(agent.whenToUse, 2_000),
        whenNotToUse: text(agent.whenNotToUse, 1_000),
        examples: examples(agent.examples),
        route,
        systemPrompt: text(agent.systemPrompt, 8_000),
        maxTokens: clampInt(agent.maxTokens, 128, 32_000, 2_000),
      })
    }
  }

  const main = sanitizeRoute(raw?.main)
  const enabled = raw?.enabled === true && main != null && agents.length > 0

  return {
    version: 1,
    enabled,
    mode: raw?.mode === 'router-decides' ? 'router-decides' : 'model-decides',
    mainSupportsTools: raw?.mainSupportsTools !== false,
    main,
    policy: text(raw?.policy, 4_000) || DEFAULT_TEAM_POLICY,
    agents,
    maxDelegations: clampInt(raw?.maxDelegations, 1, 16, base.maxDelegations),
    maxConcurrent: clampInt(raw?.maxConcurrent, 1, 4, base.maxConcurrent),
    updatedAt: typeof raw?.updatedAt === 'number' && Number.isFinite(raw.updatedAt)
      ? raw.updatedAt
      : Date.now(),
  }
}

/** A route the adapter can actually call. An empty local model is deliberate. */
export function sanitizeRoute(value: unknown): TeamRoute | null {
  const route = value as Partial<TeamRoute> | null
  const provider = text(route?.provider, 64)
  if (provider === '') return null
  const model = text(route?.model, 200)
  const prefer = route?.prefer === 'cheapest' || route?.prefer === 'fastest' || route?.prefer === 'largest'
    ? route.prefer
    : undefined
  return {
    provider,
    model,
    ...(prefer == null ? {} : { prefer }),
  }
}

function agentId(value: unknown, seen: Set<string>): string {
  const raw = typeof value === 'string' ? value : ''
  let id = raw.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32)
  if (id === '' || /^\d/.test(id)) id = `agent-${id}`.replace(/-+$/g, '')
  if (id === 'lead') id = 'lead-agent'
  while (seen.has(id)) id = `${id.slice(0, 29)}-x`
  return id
}

function text(value: unknown, limit: number): string {
  return typeof value === 'string' ? value.trim().slice(0, limit) : ''
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
  const rounded = Math.round(value)
  return Math.min(max, Math.max(min, rounded))
}

function isDecision(value: unknown): value is TeamDecision {
  const row = value as Partial<TeamDecision> | null
  return row != null
    && typeof row.at === 'number'
    && (row.via === 'tool' || row.via === 'router')
    && typeof row.agent === 'string'
    && typeof row.provider === 'string'
    && typeof row.model === 'string'
    && typeof row.ms === 'number'
    && typeof row.ok === 'boolean'
}
