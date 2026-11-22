// GENKAKU: Agent Routes routing.
//
// Two small, deterministic decisions live here:
//
//   * `resolveRoute` turns a saved route into one callable (provider, model).
//     A local route saved with an empty model means "any worker offering a
//     usable model", so the worker can disappear without breaking the team.
//   * `routeAgent` is the v1 router: a token overlap between the task and each
//     specialist's "when to use" / examples. It is deliberately not a model
//     call — the adapter may be running because the main model is weak, and a
//     router that needs another model call is the wrong shape.
//
// The semantic router (embeddings, a learned classifier) is Phase 5. This file
// stays small enough that the heuristic can be read and argued about.

import { TEAM_MODEL_ID, type TeamAgent, type TeamRoute } from '@genkaku/protocol'

/** The minimum a local (worker, model) row has to expose for routing. */
export type TeamLocalModel = {
  /** The bridge's (worker, model) key. */
  id: string
  /** Display name, for logs and the decision panel. */
  name?: string
  tier?: string
  latencyMs?: number
  /** 6-decimal USDC per hour, as the bridge sends it. */
  pricePerHour?: string
  parameterSize?: string
}

export type ResolvedRoute = {
  provider: string
  model: string
  /** True when the model was chosen from the live local board, not saved. */
  auto: boolean
}

/**
 * Pick one concrete route. Returns null when nothing can be called: a cloud
 * route with no model, or a local auto route with no worker online.
 */
export function resolveRoute(
  route: TeamRoute,
  local: readonly TeamLocalModel[],
): ResolvedRoute | null {
  if (route.provider !== 'genkaku') {
    if (route.model === '') return null
    return { provider: route.provider, model: route.model, auto: false }
  }

  if (route.model !== '') {
    // An explicit local model may be offline right now; the call will say so.
    return { provider: 'genkaku', model: route.model, auto: false }
  }

  const candidates = local.filter(model => model.id !== TEAM_MODEL_ID && model.id !== '')
  if (candidates.length === 0) return null
  return { provider: 'genkaku', model: chooseLocal(candidates, route.prefer).id, auto: true }
}

function chooseLocal(
  local: readonly TeamLocalModel[],
  prefer: TeamRoute['prefer'],
): TeamLocalModel {
  if (prefer === 'cheapest') {
    return minBy(local, model => Number(model.pricePerHour ?? Number.POSITIVE_INFINITY))
  }
  if (prefer === 'fastest') {
    return minBy(local, model => model.latencyMs ?? Number.POSITIVE_INFINITY)
  }
  if (prefer === 'largest') {
    return local.reduce((best, model) =>
      parametersOf(model) > parametersOf(best) ? model : best)
  }
  // No preference: an agent-capable model first, then the board's own order.
  const agent = local.find(model => model.tier === 'agent')
  return agent ?? local[0]!
}

function minBy(
  local: readonly TeamLocalModel[],
  value: (model: TeamLocalModel) => number,
): TeamLocalModel {
  return local.reduce((best, model) => value(model) < value(best) ? model : best)
}

/** Parse Ollama's `parameter_size` ('7B', '1.5B', '70B') into billions. */
function parametersOf(model: TeamLocalModel): number {
  const raw = model.parameterSize ?? ''
  const match = /([\d.]+)\s*([bm])/i.exec(raw)
  if (match == null) return 0
  const value = Number(match[1])
  if (!Number.isFinite(value)) return 0
  return match[2]!.toLowerCase() === 'b' ? value : value / 1000
}

const LATIN_STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'how', 'i',
  'in', 'is', 'it', 'me', 'my', 'of', 'on', 'or', 'please', 'that', 'the',
  'this', 'to', 'what', 'when', 'where', 'which', 'who', 'why', 'with', 'you',
  'can', 'could', 'would', 'should', 'do', 'does', 'did', 'help', 'want', 'need',
  '幫我', '請問', '可以', '一下', '這個', '那個', '然後', '以及', '還有',
])

/**
 * Split a task into comparable pieces. Latin words are lower-cased and
 * stop-worded; CJK runs become bigrams, because CJK prose has no spaces and a
 * whole sentence as one token would never match a description.
 */
export function tokenize(text: string): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  const push = (token: string): void => {
    if (token === '' || seen.has(token)) return
    seen.add(token)
    out.push(token)
  }

  const lower = text.toLowerCase()
  for (const word of lower.match(/[a-z0-9_]+/g) ?? []) {
    if (word.length < 2 || LATIN_STOPWORDS.has(word)) continue
    push(word)
  }

  for (const run of lower.match(/[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]+/g) ?? []) {
    if (run.length === 1) {
      push(run)
      continue
    }
    for (let index = 0; index + 1 < run.length; index++) push(run.slice(index, index + 2))
  }

  return out
}

/** How strongly one specialist's description matches the task tokens. */
export function scoreAgent(agent: TeamAgent, tokens: readonly string[]): number {
  if (tokens.length === 0) return 0

  const when = new Set(tokenize(agent.whenToUse))
  const name = new Set(tokenize(`${agent.name} ${agent.id}`))
  const examples = agent.examples.map(example => new Set(tokenize(example)))
  const avoid = new Set(tokenize(agent.whenNotToUse))

  let score = 0
  for (const token of tokens) {
    if (when.has(token)) score += 3
    if (name.has(token)) score += 2
    if (examples.some(example => example.has(token))) score += 1
    if (avoid.has(token)) score -= 3
  }
  return score
}

/**
 * The v1 router. `null` means "no specialist is clearly better than the main
 * model", which is the safe answer: a wrong delegation is worse than none.
 */
export function routeAgent(
  agents: readonly TeamAgent[],
  task: string,
): string | null {
  const tokens = tokenize(task)
  if (tokens.length === 0) return null

  let bestId: string | null = null
  let bestScore = 0
  for (const agent of agents) {
    const score = scoreAgent(agent, tokens)
    if (score > bestScore) {
      bestScore = score
      bestId = agent.id
    }
  }
  return bestId
}
