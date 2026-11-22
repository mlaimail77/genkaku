// GENKAKU: Agent Routes — the setup advisor.
//
// The hard part of Agent Routes is not routing, it is that most people do not
// have words for how their work divides. So the panel offers to ask the main
// model: describe your work in three sentences, and it proposes the split.
//
// This module owns the prompt and the reply parser, and nothing else. It has no
// LLM dependency: the user plugin makes the call and the bridge stores the
// thread, which keeps `protocol` free of a model runtime and makes the prompt
// testable without a model.
//
// Two things keep the advice honest:
//
//   * the prompt carries the user's real route list, so a card cannot name a
//     model that is not installed; anything that slips through is re-resolved
//     against the catalog by `teamCards.resolveHint` and shown as adjusted.
//   * the prompt carries the engine's real limits (400-character tool
//     descriptions, what the router actually reads), so the advice matches the
//     code instead of a generic article about agents.

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import type { AgentCard, CardRouteHint } from './teamCards.ts'
import { sanitizeCard } from './teamCards.ts'
import {
  MAX_TEAM_AGENTS,
  type TeamCatalog,
  type TeamConfig,
  type TeamDecision,
} from './team.ts'

export const ADVICE_FILE = 'team-advice.json'

/** How many turns of the advice conversation are kept. */
export const MAX_ADVICE_MESSAGES = 12

/** At most four specialists per suggestion. More is unusable, not thorough. */
export const MAX_ADVICE_CARDS = 4

export type AdviceMode = 'advise' | 'review' | 'rewrite'

export type AdviceMessage = {
  role: 'user' | 'advisor'
  at: number
  text: string
  cards?: AgentCard[]
  model?: { provider: string; model: string }
  /**
   * Which question produced this answer. Kept on the message so a reloaded
   * panel still knows that a card is a *rewrite of an existing specialist*
   * rather than a new one — otherwise applying it would duplicate the agent.
   */
  mode?: AdviceMode
  /** For a rewrite: the specialist it replaces. */
  agentId?: string
}

export type AdviceThread = {
  version: 1
  messages: AdviceMessage[]
  updatedAt: number
}

/** What the host (the user plugin) is asked to run. */
export type AdviceInput = {
  mode: AdviceMode
  /** The user's description of their work, or the review question. */
  question: string
  /** For `rewrite`: which specialist. */
  agentId?: string
  /** UI language id, so the advice comes back in the language being read. */
  locale: string
  config: TeamConfig
  catalog: TeamCatalog
  /** Earlier turns, oldest first, so the advice can build on itself. */
  history: Array<{ role: 'user' | 'advisor'; text: string }>
  /** Cancelled when the panel closes the request. */
  signal?: AbortSignal
}

export type AdviceOutput = {
  reply: string
  cards: AgentCard[]
  model: { provider: string; model: string } | null
  ms: number
  error?: string
}

export type TeamAdvisor = (input: AdviceInput) => Promise<AdviceOutput>

// Module-level, same reason as the catalog provider: the bridge and the user
// plugin share one process, and the bridge must not depend on the plugin's
// module graph to reach the harness LLM.
let advisor: TeamAdvisor | null = null

export function setTeamAdvisor(value: TeamAdvisor | null): void {
  advisor = value
}

export function teamAdvisor(): TeamAdvisor | null {
  return advisor
}

// ── prompt ───────────────────────────────────────────────────────────────────

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  zh: 'Simplified Chinese',
  'zh-Hant': 'Traditional Chinese',
  ja: 'Japanese',
  ko: 'Korean',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  ru: 'Russian',
  pt: 'Portuguese',
}

export function languageName(locale: string): string {
  return LANGUAGE_NAMES[locale] ?? LANGUAGE_NAMES[locale.split('-')[0]!] ?? 'English'
}

/**
 * The engine facts the advisor must respect. Kept next to the prompt (not in
 * the docs) because these are the numbers the code actually enforces: a
 * `whenToUse` longer than 400 characters is cut before the main model sees it,
 * and the router only reads the prose fields.
 */
export function describeEngine(): string[] {
  return [
    `The team has one main model plus at most ${MAX_TEAM_AGENTS} specialists.`,
    'The main model sees each specialist as: id, name, whenToUse (first 400 characters only), and whenNotToUse (first 400 characters).',
    'In model-decides mode the main model calls one tool, `delegate({agent, task})`; the task must be self-contained because the specialist cannot see the conversation.',
    'In router-decides mode a token-overlap heuristic picks the specialist before the main call. It only reads whenToUse, examples and whenNotToUse, so examples must be written the way the user would actually type the request.',
    'A specialist is a full agent: it can read files and call tools, but it cannot delegate further.',
    'A local model whose tier is `chat` cannot drive a tool loop. Do not send file-reading or multi-step work to it.',
    'Every delegation costs one round trip; a specialist that is nearly the main model is a wasted turn.',
  ]
}

/** The user's own routes, compact enough to fit in a system prompt. */
export function describeCatalog(catalog: TeamCatalog): string {
  const lines: string[] = []

  const cloud: string[] = []
  for (const provider of catalog.providers.slice(0, 8)) {
    for (const model of provider.models.slice(0, 6)) {
      cloud.push(`${provider.id}/${model.id} (${model.name})`)
    }
  }
  if (cloud.length > 0) {
    lines.push('Cloud routes (provider/model):')
    for (const entry of cloud) lines.push(`- ${entry}`)
  } else {
    lines.push('Cloud routes: none configured.')
  }

  const local = catalog.local.filter(row => row.id !== 'team').slice(0, 24)
  if (local.length > 0) {
    lines.push('Local routes on the GenKaKu network (provider is `genkaku`; model is the row id):')
    for (const row of local) {
      const facts = [
        row.tier ?? 'unknown tier',
        row.pricePerHour == null ? null : `${row.pricePerHour} micro-USDC/h`,
        row.latencyMs == null ? null : `${row.latencyMs} ms`,
        row.parameterSize ?? null,
      ].filter((value): value is string => value != null)
      lines.push(`- genkaku/${row.id} (${row.name}; ${facts.join(', ')})`)
    }
    lines.push('- genkaku/ with an empty model means "any local worker", resolved at call time.')
  } else {
    lines.push('Local routes: none online right now.')
  }

  return lines.join('\n')
}

export function describeTeam(config: TeamConfig): string {
  if (config.agents.length === 0) return 'The team is empty; this is a first setup.'

  const lines = [
    `Mode: ${config.mode}. Main model: ${routeLabel(config.main)}.`,
  ]
  for (const agent of config.agents) {
    lines.push(
      `- ${agent.id} (${agent.name}) on ${agent.route.provider}/${agent.route.model || '(auto)'}: `
      + `${clip(agent.whenToUse, 300)}`,
    )
  }
  if (config.policy.trim() !== '') lines.push(`Orchestration note: ${clip(config.policy, 400)}`)
  return lines.join('\n')
}

const OUTPUT_CONTRACT = `## Output

Answer in {language}.

1. Two to four short paragraphs: how you would divide this work, and one thing
   the user should NOT delegate. Be concrete about the trade-off (speed, tools,
   cost). No preamble, no "as an AI".
2. Then exactly one fenced json block, and nothing after it:

\`\`\`json
{"cards":[{"name":"Translator","whenToUse":"...","whenNotToUse":"...","examples":["...","...","..."],"systemPrompt":"...","maxTokens":2000,"route":{"provider":"genkaku","model":""}}],"notes":"one sentence on why this split"}
\`\`\`

Rules for the cards:
- At most {maxCards}. Fewer is better. A two-person team that is used beats an
  eight-person team that is not.
- \`id\`: short lower-case ascii, unique in the team, e.g. \`translator\`,
  \`researcher\`, \`editor\`. The name may be in the user's language; the id may not.
- \`name\`: short, in the user's language, a job title not a model name.
- \`whenToUse\`: 1–2 sentences starting with a verb. Describe the shape of the
  task, not the topic. Under 400 characters.
- \`whenNotToUse\`: the nearest thing that looks similar but belongs elsewhere.
  Never empty — this is what stops over-delegation.
- \`examples\`: exactly 3, written as the user would actually type them, in the
  user's language.
- \`systemPrompt\`: role, output contract, one anti-pattern. Under 800 characters.
- \`route\`: provider/model copied exactly from the list above, or
  \`{"provider":"genkaku","model":""}\` when unsure. Never invent a model id.
- \`maxTokens\`: 1000–4000 is right for most specialists.`

export function buildAdvicePrompt(input: AdviceInput): { system: string; user: string } {
  const language = languageName(input.locale)
  const common = [
    'You are the setup advisor inside GenKaKu Agent Routes, a feature of the DSH chat client.',
    'The user is configuring a small team: one main model plus specialists it may delegate to.',
    'Your job is to design the division of labour, not to do the work itself.',
    '',
    '## How the feature actually works (do not contradict this)',
    ...describeEngine().map(line => `- ${line}`),
    '',
    '## Routes this user can pick (use these ids exactly)',
    describeCatalog(input.catalog),
    '',
    '## The team as it stands',
    describeTeam(input.config),
    '',
    OUTPUT_CONTRACT
      .replaceAll('{language}', language)
      .replaceAll('{maxCards}', String(MAX_ADVICE_CARDS)),
  ].join('\n')

  const history = input.history
    .slice(-6)
    .map(turn => `${turn.role === 'user' ? 'User' : 'You'}: ${clip(turn.text, 1_200)}`)
    .join('\n')

  if (input.mode === 'review') {
    return {
      system: common,
      user: [
        'Review the team above.',
        '',
        'Diagnose before prescribing: overlapping specialists, a whenToUse that is too broad,',
        'a chat-tier local model given tool work, a specialist that is really the main model,',
        'a missing "when not to use", a maxTokens that will truncate the output.',
        'Then, only if the fix is a change of specialists, return the corrected cards',
        '(all of them, not a diff). If the team is fine, return an empty cards array and say so.',
        '',
        input.question.trim() === '' ? '' : `The user adds: ${input.question.trim()}`,
        history === '' ? '' : `\nEarlier turns:\n${history}`,
      ].filter(line => line !== '').join('\n'),
    }
  }

  if (input.mode === 'rewrite') {
    const agent = input.config.agents.find(candidate => candidate.id === input.agentId)
    return {
      system: common,
      user: [
        agent == null
          ? 'The user asked to rewrite a specialist that no longer exists. Return no cards and say so.'
          : [
            `Rewrite this specialist: ${agent.name} (${agent.id}).`,
            `whenToUse: ${agent.whenToUse}`,
            `whenNotToUse: ${agent.whenNotToUse}`,
            `examples: ${agent.examples.join(' | ')}`,
            `systemPrompt: ${agent.systemPrompt}`,
            `maxTokens: ${agent.maxTokens}`,
            `route: ${agent.route.provider}/${agent.route.model || '(auto)'}`,
          ].join('\n'),
        '',
        'Return exactly one card: the rewritten version. Keep the same job unless the',
        'user asks for a different one. Explain in one paragraph what you changed and why.',
        input.question.trim() === '' ? '' : `\nThe user adds: ${input.question.trim()}`,
        history === '' ? '' : `\nEarlier turns:\n${history}`,
      ].filter(line => line !== '').join('\n'),
    }
  }

  return {
    system: common,
    user: [
      'The user describes their work below. Propose the smallest team that covers it.',
      '',
      input.question.trim() === ''
        ? 'They did not describe anything yet. Ask two or three short questions that would let you propose a team, and return an empty cards array.'
        : input.question.trim(),
      history === '' ? '' : `\nEarlier turns:\n${history}`,
    ].filter(line => line !== '').join('\n'),
  }
}

// ── reply ────────────────────────────────────────────────────────────────────

/**
 * Split a model reply into prose and cards.
 *
 * Models are unreliable at JSON, so a failure here is not an error: the prose
 * is still worth reading and the user can copy it. Only a reply with no text at
 * all is treated as a failure.
 */
export function parseAdviceReply(
  text: string,
  catalog: TeamCatalog,
): { reply: string; cards: AgentCard[]; notes?: string } {
  const trimmed = text.trim()
  if (trimmed === '') return { reply: '', cards: [] }

  const block = extractJsonBlock(trimmed)
  if (block == null) return { reply: cleanup(trimmed), cards: [] }

  const cards: AgentCard[] = []
  for (const candidate of block.value.cards ?? []) {
    const card = cardFromDraft(candidate, catalog)
    if (card == null) continue
    cards.push(card)
    if (cards.length >= MAX_ADVICE_CARDS) break
  }

  return {
    reply: cleanup(block.prose),
    cards,
    ...(typeof block.value.notes === 'string' && block.value.notes.trim() !== ''
      ? { notes: block.value.notes.trim().slice(0, 500) }
      : {}),
  }
}

type DraftBlock = { cards?: unknown[]; notes?: unknown }

function extractJsonBlock(text: string): { prose: string; value: DraftBlock } | null {
  // A fenced block first: that is what the prompt asks for.
  const fence = /```(?:json)?\s*\n([\s\S]*?)```/i.exec(text)
  const candidates: Array<{ body: string; prose: string }> = []
  if (fence != null) {
    candidates.push({
      body: fence[1]!,
      prose: `${text.slice(0, fence.index)}${text.slice(fence.index + fence[0].length)}`,
    })
  }

  // A bare object, in case the model ignored the fence.
  const first = text.indexOf('{')
  const last = text.lastIndexOf('}')
  if (first >= 0 && last > first) {
    candidates.push({ body: text.slice(first, last + 1), prose: `${text.slice(0, first)}${text.slice(last + 1)}` })
  }

  for (const candidate of candidates) {
    try {
      const value = JSON.parse(candidate.body) as DraftBlock
      if (value == null || typeof value !== 'object') continue
      if (!Array.isArray(value.cards) && typeof value.notes !== 'string') continue
      return { prose: candidate.prose, value }
    } catch {
      // Try the next shape.
    }
  }
  return null
}

/**
 * A draft card from the advisor is not a full card: it has no format tag, no
 * lang, and its route is `{provider, model}` rather than a hint. Convert it
 * here so the rest of the system only ever sees `AgentCard`.
 */
function cardFromDraft(value: unknown, catalog: TeamCatalog): AgentCard | null {
  const raw = value as {
    id?: unknown
    name?: unknown
    whenToUse?: unknown
    whenNotToUse?: unknown
    examples?: unknown
    systemPrompt?: unknown
    maxTokens?: unknown
    route?: { provider?: unknown; model?: unknown }
    tags?: unknown
  } | null
  if (raw == null || typeof raw !== 'object') return null

  const route = raw.route ?? {}
  const provider = typeof route.provider === 'string' ? route.provider.trim() : ''
  const model = typeof route.model === 'string' ? route.model.trim() : ''

  return sanitizeCard({
    genkaku: 'agent-card/1',
    id: raw.id,
    name: raw.name,
    lang: '',
    tags: raw.tags,
    agent: {
      whenToUse: raw.whenToUse,
      whenNotToUse: raw.whenNotToUse,
      examples: raw.examples,
      systemPrompt: raw.systemPrompt,
      maxTokens: raw.maxTokens,
      routeHint: draftHint(provider, model, catalog),
    },
  })
}

function draftHint(provider: string, model: string, catalog: TeamCatalog): CardRouteHint {
  if (provider === '' || provider === 'genkaku') {
    if (model === '' || model === 'auto') return { kind: 'local' }
    const row = catalog.local.find(candidate => candidate.id === model)
    if (row == null) return { kind: 'local' }
    return { kind: 'exact', provider: 'genkaku', model: row.id }
  }
  const known = catalog.providers.find(entry => entry.id === provider)
  if (known == null) return { kind: 'cloud', provider }
  return { kind: 'cloud', provider: known.id, ...(model === '' ? {} : { model }) }
}

function cleanup(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// ── usage ────────────────────────────────────────────────────────────────────

/**
 * What the delegation log says about the team. Cheap, local, and the only place
 * a user can see that a specialist has never been used — which is usually the
 * real answer to "why is this team not helping".
 */
export function teamUsage(
  config: TeamConfig,
  decisions: TeamDecision[],
): {
  total: number
  byAgent: Array<{ id: string; name: string; count: number; lastAt: number | null }>
  unused: string[]
} {
  const byAgent = config.agents.map(agent => {
    const rows = decisions.filter(decision => decision.agent === agent.id)
    const last = rows.reduce<number | null>(
      (at, row) => at == null || row.at > at ? row.at : at,
      null,
    )
    return { id: agent.id, name: agent.name, count: rows.length, lastAt: last }
  })

  return {
    total: decisions.length,
    byAgent,
    unused: byAgent.filter(row => row.count === 0).map(row => row.id),
  }
}

// ── thread ───────────────────────────────────────────────────────────────────

export function advicePath(keyDir: string): string {
  return join(keyDir, ADVICE_FILE)
}

export function emptyAdviceThread(): AdviceThread {
  return { version: 1, messages: [], updatedAt: 0 }
}

export function readAdviceThread(keyDir: string): AdviceThread {
  try {
    const path = advicePath(keyDir)
    if (!existsSync(path)) return emptyAdviceThread()
    const value = JSON.parse(readFileSync(path, 'utf8')) as Partial<AdviceThread> | null
    if (value == null || !Array.isArray(value.messages)) return emptyAdviceThread()
    const messages: AdviceMessage[] = []
    for (const candidate of value.messages) {
      const row = candidate as Partial<AdviceMessage> | null
      if (row == null || (row.role !== 'user' && row.role !== 'advisor')) continue
      if (typeof row.text !== 'string') continue
      const cards: AgentCard[] = []
      if (Array.isArray(row.cards)) {
        for (const entry of row.cards) {
          const card = sanitizeCard(entry)
          if (card != null) cards.push(card)
        }
      }
      messages.push({
        role: row.role,
        at: typeof row.at === 'number' ? row.at : 0,
        text: row.text.slice(0, 20_000),
        ...(cards.length === 0 ? {} : { cards }),
        ...(row.model == null ? {} : { model: row.model }),
        ...(row.mode === 'advise' || row.mode === 'review' || row.mode === 'rewrite'
          ? { mode: row.mode }
          : {}),
        ...(typeof row.agentId === 'string' && row.agentId !== ''
          ? { agentId: row.agentId.slice(0, 32) }
          : {}),
      })
    }
    return {
      version: 1,
      messages: messages.slice(-MAX_ADVICE_MESSAGES),
      updatedAt: typeof value.updatedAt === 'number' ? value.updatedAt : 0,
    }
  } catch {
    return emptyAdviceThread()
  }
}

export function appendAdviceMessage(keyDir: string, message: AdviceMessage): AdviceThread {
  const current = readAdviceThread(keyDir)
  const next: AdviceThread = {
    version: 1,
    messages: [...current.messages, message].slice(-MAX_ADVICE_MESSAGES),
    updatedAt: Date.now(),
  }
  writeThread(keyDir, next)
  return next
}

export function clearAdviceThread(keyDir: string): AdviceThread {
  const next = emptyAdviceThread()
  writeThread(keyDir, next)
  return next
}

function writeThread(keyDir: string, thread: AdviceThread): void {
  try {
    mkdirSync(keyDir, { recursive: true, mode: 0o700 })
    const path = advicePath(keyDir)
    const tmp = `${path}.tmp`
    writeFileSync(tmp, `${JSON.stringify(thread, undefined, 2)}\n`, { mode: 0o600 })
    renameSync(tmp, path)
  } catch {
    // The thread is a convenience; losing it must not fail the advice.
  }
}

// ── helpers ──────────────────────────────────────────────────────────────────

function routeLabel(route: TeamConfig['main']): string {
  if (route == null) return '(none)'
  return `${route.provider}/${route.model || '(auto)'}`
}

function clip(value: string, limit: number): string {
  const text = value.trim()
  return text.length <= limit ? text : `${text.slice(0, limit - 1)}…`
}
