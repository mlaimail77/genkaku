/**
 * GenKaKu as a first-class DeepSeek Harness model provider.
 *
 * The harness asks an adapter for StreamChunks in its own vocabulary; the
 * network speaks OpenAI chat-completions over the plugin's local bridge. This
 * adapter is the whole translation and the only place that knows both dialects.
 *
 * All traffic goes through the bridge (127.0.0.1:<port>/v1) instead of dialing a
 * worker directly, so escrow opening, per-minute billing and settlement stay in
 * one implementation.
 */

import type {
  ContentBlock,
  FinishReason,
  GenerateOptions,
  LlmModelInfo,
  RequestMessage,
  StreamChunk,
  TokenUsage,
  ToolCallId,
} from '@deepseek-ai/dsh-llm'
import { LlmAdapter, createSystemMessage } from '@deepseek-ai/dsh-llm'

import { TEAM_MODEL_ID, type TeamConfig } from '@genkaku/protocol'

import { resolveRoute, type ResolvedRoute, type TeamLocalModel } from './team/route.ts'
import type { TeamHost, TeamRunResult } from './team/runtime.ts'

type BridgeModel = {
  id: string
  genkaku?: {
    tier?: 'agent' | 'light' | 'chat'
    capabilities?: string[]
    parameterSize?: string
    /** the worker's display name (personal name, ID or nickname) */
    workerName?: string
    workerWallet?: string
    /** 6-decimal USDC per hour, as a decimal string */
    pricePerHour?: string
    sessionsServed?: number
    visibility?: 'public' | 'private'
    latencyMs?: number
    /** the raw Ollama model name; `id` is the (worker, model) key */
    model?: string
  }
}

type OpenAiToolCall = {
  index?: number
  id?: string
  function?: { name?: string; arguments?: string }
}

type OpenAiChunk = {
  choices?: Array<{
    delta?: { content?: string | null; tool_calls?: OpenAiToolCall[] }
    finish_reason?: string | null
  }>
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
}

/** Ports the plugin may bind, in preference order (see the panel). */
export const CANDIDATE_PORTS = [47821, 47822, 47823, 47824, 47825, 47826] as const

export type GenkakuAdapterOptions = {
  /**
   * Port the plugin was CONFIGURED with. It is only a hint: installing the
   * worker plugin next to this one makes both halves compete for it, and the
   * bridge then binds the next free port — so the real one is discovered.
   */
  port: () => number
  log?: (line: string) => void
}

function textOf(blocks: readonly ContentBlock[]): string {
  return blocks.map(block => (block.type === 'text' ? block.text : '')).join('')
}

function toolCallsOf(blocks: readonly ContentBlock[]) {
  return blocks
    .filter((block): block is Extract<ContentBlock, { type: 'tool-call' }> => block.type === 'tool-call')
    .map(block => ({
      id: block.id,
      type: 'function' as const,
      function: { name: block.name, arguments: block.arguments },
    }))
}

/**
 * Project harness messages onto the OpenAI chat shape the bridge accepts.
 *
 * `developer` messages carry tool additions and removals, which the loop already
 * expresses through GenerateOptions.tools; they are skipped rather than sent as
 * empty turns.
 */
export function toOpenAiMessages(options: GenerateOptions): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = []
  if (options.system != null && options.system !== '') out.push({ role: 'system', content: options.system })
  for (const message of options.messages as readonly RequestMessage[]) {
    if (message.role === 'developer') continue
    if (message.role === 'tool') {
      out.push({ role: 'tool', tool_call_id: message.toolCallId, content: textOf(message.content) })
      continue
    }
    if (message.role === 'assistant') {
      const calls = toolCallsOf(message.content)
      out.push({
        role: 'assistant',
        content: textOf(message.content),
        ...(calls.length === 0 ? {} : { tool_calls: calls }),
      })
      continue
    }
    out.push({ role: message.role, content: textOf(message.content) })
  }
  return out
}

export function finishOf(reason: string | null | undefined, sawToolCall: boolean): FinishReason {
  if (sawToolCall || reason === 'tool_calls') return { kind: 'tool-calls' }
  if (reason === 'length') return { kind: 'max-tokens' }
  return { kind: 'stop' }
}

export class GenkakuAdapter extends LlmAdapter {
  /**
   * Resolved bridge origin. Kept until a request proves it dead: the bridge
   * only moves when its half restarts, and a restart is exactly when a request
   * starts failing to connect.
   */
  private origin: string | null = null

  /** Set once the user plugin has wired the Agent Routes runtime. */
  private team: TeamHost | null = null

  constructor(private readonly options: GenkakuAdapterOptions) {
    super()
  }

  /** The runtime is created after the adapter because it needs this bridge. */
  setTeam(team: TeamHost | null): void {
    this.team = team
  }

  /**
   * Locate the plugin's own bridge.
   *
   * The configured port is not authoritative. A machine that also installs the
   * worker plugin runs a worker status server on the same port range, so the
   * bridge lands on the next free port and every request sent to the configured
   * one hits the wrong service — which surfaced as an empty model list and a
   * missing GenKaKu group in the picker. Each candidate is identified by
   * /genkaku/status reporting `role: "user"`, exactly as the panel does.
   */
  private async baseUrl(): Promise<string> {
    if (this.origin != null) return this.origin

    const configured = this.options.port()
    const order = [configured, ...CANDIDATE_PORTS.filter(port => port !== configured)]

    for (const port of order) {
      const origin = `http://127.0.0.1:${port}`
      try {
        const res = await fetch(`${origin}/genkaku/status`, {
          cache: 'no-store',
          signal: AbortSignal.timeout(1500),
        })
        if (!res.ok) continue
        const doc = (await res.json()) as { role?: string }
        if (doc.role !== 'user') continue
        this.origin = `${origin}/v1`

        return this.origin
      } catch {
        // try the next port
      }
    }

    // Nothing answered. Name the configured port so the harness error points
    // somewhere useful instead of at an unexplained refusal.
    return `http://127.0.0.1:${configured}/v1`
  }

  /** Forget a resolved origin after a connection-level failure. */
  private forget(): void {
    this.origin = null
  }

  override providerInfo(provider: string) {
    return { id: provider, name: 'GenKaKu Network' }
  }

  /**
   * The live marketplace board. A chat-only model is still listed: it is usable,
   * it just cannot drive an agent loop, so it carries a warning badge instead of
   * being hidden.
   */
  override async listModels(provider: string): Promise<readonly LlmModelInfo[]> {
    let rows: BridgeModel[] = []
    try {
      rows = await this.bridgeModelRows()
    } catch (error) {
      // An unreachable bridge hides the network rows, but Agent Routes can
      // still have a cloud main model, so keep building the list below.
      this.options.log?.(`genkaku adapter: model listing failed (${String(error)})`)
    }

    const models: LlmModelInfo[] = rows.map((model) => {
      const facts = model.genkaku ?? {}
      const tier = facts.tier ?? 'chat'
      const size = facts.parameterSize
      const modelName = facts.model ?? model.id
      // The picker shows "worker · model": the same Ollama model from two
      // workers is two rows, and the worker's name is what the user sorts by.
      const display = facts.workerName == null || facts.workerName === ''
        ? modelName
        : `${facts.workerName} · ${modelName}`
      const price = Number(facts.pricePerHour)
      const priceLabel = Number.isFinite(price)
        ? price === 0 ? 'free' : `${(price / 1e6).toFixed(2)} USDC/h`
        : undefined
      const bits = [
        size,
        tier === 'agent' ? 'agent-ready' : undefined,
        priceLabel,
        facts.sessionsServed == null ? undefined : `${facts.sessionsServed} sessions`,
      ].filter(Boolean)
      return {
        provider,
        id: model.id,
        name: display,
        ...(bits.length === 0 ? {} : { description: bits.join(' · ') }),
        ...(tier === 'chat'
          ? { badge: { text: { en: 'not for agents', zh: '不適用於 agent' }, tone: 'warning' as const } }
          : {}),
      }
    })

    const team = this.team?.config()
    if (team?.enabled === true) {
      models.unshift({
        provider,
        id: TEAM_MODEL_ID,
        name: 'GenKaKu · Agent Routes',
        description: teamDescription(team),
      })
    }

    return models
  }

  /** The raw local board rows, shared by the picker and the auto router. */
  private async bridgeModelRows(): Promise<BridgeModel[]> {
    const res = await fetch(`${await this.baseUrl()}/models`)
    if (!res.ok) return []
    const body = (await res.json()) as { data?: BridgeModel[] }
    return body.data ?? []
  }

  /** One row per live (worker, model), enough for an auto local route. */
  async bridgeModels(): Promise<TeamLocalModel[]> {
    try {
      return (await this.bridgeModelRows()).map((model) => {
        const facts = model.genkaku ?? {}
        const modelName = facts.model ?? model.id
        return {
          id: model.id,
          name: facts.workerName == null || facts.workerName === ''
            ? modelName
            : `${facts.workerName} · ${modelName}`,
          ...(facts.tier == null ? {} : { tier: facts.tier }),
          ...(facts.latencyMs == null ? {} : { latencyMs: facts.latencyMs }),
          ...(facts.pricePerHour == null ? {} : { pricePerHour: facts.pricePerHour }),
          ...(facts.parameterSize == null ? {} : { parameterSize: facts.parameterSize }),
        }
      })
    } catch {
      return []
    }
  }

  /**
   * One entry point for both a normal network model and the synthetic team
   * model. The team model never reaches the bridge's normal chat path: it
   * resolves a main route and then re-enters either the bridge or the harness
   * llm runtime with that route.
   */
  override async *stream(options: GenerateOptions): AsyncIterable<StreamChunk> {
    if (options.model === TEAM_MODEL_ID) {
      yield* this.streamTeam(options)
      return
    }
    yield* this.streamDirect(options)
  }

  /**
   * Agent Routes main turn.
   *
   * In model-decides mode the main model receives the delegate tool, which the
   * harness only admits for this exact model id. In router-decides mode (or
   * when the main model is a known chat-only local model) the specialist is
   * chosen and run here, before the main call, and its answer travels as a
   * system addendum. That is the fallback that lets a weak model still use a
   * team.
   */
  private async *streamTeam(options: GenerateOptions): AsyncIterable<StreamChunk> {
    const team = this.team
    const config = team?.config()
    if (team == null || config == null || !config.enabled) {
      throw new Error('GenKaKu Agent Routes is off. Turn it on in the panel and pick this model again.')
    }
    if (config.main == null) {
      throw new Error('GenKaKu Agent Routes has no main model. Choose one in the panel.')
    }

    const local = await this.bridgeModels()
    const route = resolveRoute(config.main, local)
    if (route == null) {
      throw new Error('GenKaKu Agent Routes: no model is available for the main route (is a worker online?).')
    }

    // An auxiliary call — compaction, a title, a summary — is not a
    // conversation turn: it must run on the main model with its own prompt and
    // without a team policy, a router or a delegation.
    if (options.purpose != null) {
      if (route.provider === 'genkaku') {
        yield* this.streamDirect({ ...options, provider: 'genkaku', model: route.model })
        return
      }
      yield* team.stream({ ...options, provider: route.provider, model: route.model })
      return
    }

    let prompt = withSystemAddendum(options, teamPolicy(config))
    const localTier = route.provider === 'genkaku'
      ? local.find(model => model.id === route.model)?.tier
      : undefined
    const routerMode = config.mode === 'router-decides'
      || !config.mainSupportsTools
      || localTier === 'chat'

    if (routerMode) {
      const task = lastUserText(prompt.messages)
      const agentId = task === '' ? null : team.route(task)
      if (agentId != null) {
        const signal = options.signal ?? new AbortController().signal
        let result: TeamRunResult | null = null
        try {
          result = await team.runForSession(agentId, task, options.sessionId, signal)
        } catch (error) {
          this.options.log?.(`genkaku adapter: router delegation failed (${String(error)})`)
        }
        if (result != null && result.ok && result.output.trim() !== '') {
          prompt = withSystemAddendum({ ...options, ...prompt }, routerNote(result))
        }
      }
    }

    const routed = { ...options, ...prompt }
    if (route.provider === 'genkaku') {
      yield* this.streamDirect({ ...routed, provider: 'genkaku', model: route.model })
      return
    }

    yield* team.stream({ ...routed, provider: route.provider, model: route.model })
  }

  /** Stream one completion from the network. */
  private async *streamDirect(options: GenerateOptions): AsyncIterable<StreamChunk> {
    const body: Record<string, unknown> = {
      model: options.model,
      stream: true,
      messages: toOpenAiMessages(options),
      ...(options.maxTokens === undefined ? {} : { max_tokens: options.maxTokens }),
      ...(options.temperature === undefined ? {} : { temperature: options.temperature }),
      ...(options.tools === undefined || options.tools.length === 0
        ? {}
        : {
            tools: options.tools.map(tool => ({
              type: 'function',
              function: { name: tool.name, description: tool.description, parameters: tool.parameters },
            })),
          }),
    }

    const send = async (): Promise<Response> => {
      // A JSON body is replayable, but the retry below is intentionally limited
      // to connection failures: a bridge that answered (even with an error) may
      // already have opened an escrow, and charging twice is worse than failing.
      return await fetch(`${await this.baseUrl()}/chat/completions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        ...(options.signal === undefined ? {} : { signal: options.signal }),
      })
    }

    let res: Response
    try {
      res = await send()
    } catch (error) {
      this.forget()
      try {
        res = await send()
      } catch {
        throw error
      }
    }
    if (!res.ok || res.body == null) {
      const detail = await res.text().catch(() => '')
      throw new Error(`genkaku: bridge refused (${res.status}) ${detail.slice(0, 200)}`)
    }

    const pending: StreamChunk[] = []
    let nextIndex = 0
    let textIndex: number | null = null
    let text = ''
    const tools = new Map<number, { index: number; id: ToolCallId; name: string; args: string }>()
    let usage: TokenUsage | null = null
    let sawToolCall = false

    const closeText = (): void => {
      if (textIndex == null) return
      pending.push({ type: 'block-end', index: textIndex, block: { type: 'text', text } })
      textIndex = null
      text = ''
    }

    const handle = (raw: string): void => {
      let chunk: OpenAiChunk
      try {
        chunk = JSON.parse(raw) as OpenAiChunk
      } catch {
        return
      }
      const choice = chunk.choices?.[0]
      const content = choice?.delta?.content
      if (typeof content === 'string' && content !== '') {
        if (textIndex == null) {
          textIndex = nextIndex++
          pending.push({ type: 'block-start', index: textIndex, blockType: 'text' })
        }
        text += content
        pending.push({ type: 'text-delta', index: textIndex, text: content })
      }
      for (const call of choice?.delta?.tool_calls ?? []) {
        const slot = call.index ?? 0
        let entry = tools.get(slot)
        if (entry == null) {
          sawToolCall = true
          closeText()
          entry = { index: nextIndex++, id: (call.id ?? `call_${slot}`) as ToolCallId, name: call.function?.name ?? '', args: '' }
          tools.set(slot, entry)
          pending.push({ type: 'block-start', index: entry.index, blockType: 'tool-call' })
          pending.push({ type: 'tool-call-delta', index: entry.index, id: entry.id, name: entry.name, argumentsDelta: '' })
        }
        const argsDelta = call.function?.arguments ?? ''
        if (argsDelta !== '') {
          entry.args += argsDelta
          pending.push({ type: 'tool-call-delta', index: entry.index, id: entry.id, argumentsDelta: argsDelta })
        }
      }
      if (chunk.usage != null) {
        usage = {
          inputTokens: chunk.usage.prompt_tokens ?? 0,
          outputTokens: chunk.usage.completion_tokens ?? 0,
        }
      }
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      let nl = buffer.indexOf('\n')
      while (nl >= 0) {
        const line = buffer.slice(0, nl).trim()
        buffer = buffer.slice(nl + 1)
        nl = buffer.indexOf('\n')
        if (!line.startsWith('data:')) {
          for (const chunk of pending.splice(0)) yield chunk
          continue
        }
        const payload = line.slice(5).trim()
        if (payload !== "") handle(payload)
        for (const chunk of pending.splice(0)) yield chunk
      }
    }
    closeText()
    for (const chunk of pending.splice(0)) yield chunk
    for (const entry of [...tools.values()].sort((a, b) => a.index - b.index)) {
      yield {
        type: 'block-end',
        index: entry.index,
        block: { type: 'tool-call', id: entry.id, name: entry.name, arguments: entry.args },
      }
    }
    if (usage != null) yield { type: 'usage', usage }
    yield { type: 'finish', reason: finishOf(undefined, sawToolCall) }
  }
}

/**
 * The orchestration paragraph added to the main model's system prompt.
 *
 * The specialist list itself is not repeated here: the delegate tool's own
 * description carries it, so a model that cannot call tools never pays for
 * text it cannot act on. In router-decides mode the note explains the
 * specialist answer it may find below.
 */
function teamPolicy(config: TeamConfig): string {
  const lines = [config.policy.trim()]
  if (config.mode === 'model-decides' && config.mainSupportsTools) {
    lines.push(
      `You may delegate at most ${config.maxDelegations} task(s) per turn with the delegate tool.`,
    )
  } else {
    lines.push(
      'A specialist may have already been consulted for this turn; treat its answer as '
      + 'helpful work from a colleague and verify anything that looks uncertain.',
    )
  }
  return lines.filter(line => line !== '').join('\n')
}

/** Picker subtitle: enough to see what the row will do before selecting it. */function teamDescription(config: TeamConfig): string {
  const main = config.main == null
    ? 'no main'
    : config.main.provider === 'genkaku' && config.main.model === ''
      ? 'auto local main'
      : `${config.main.provider}/${config.main.model}`
  const count = config.agents.length
  return `${count} specialist${count === 1 ? '' : 's'} · `
    + `${config.mode === 'router-decides' ? 'router decides' : 'model decides'} · ${main}`
}

/**
 * Add a paragraph to the system prompt without replacing its identity.
 *
 * Three shapes exist in practice: a loop-built request carries the prompt as
 * messages[0]; a hand-built one-shot sets `system`; and a bare one-shot has
 * neither, which is the only case that mints a message.
 */
export function withSystemAddendum(
  options: GenerateOptions,
  addendum: string,
): { messages: RequestMessage[]; system?: string } {
  const text = addendum.trim()
  if (text === '') {
    return {
      messages: options.messages,
      ...(options.system === undefined ? {} : { system: options.system }),
    }
  }

  if (options.system != null && options.system.trim() !== '') {
    return { messages: options.messages, system: `${options.system.trim()}\n\n${text}` }
  }

  const first = options.messages[0]
  if (first != null && first.role === 'system') {
    const head = textOf(first.content).trim()
    return {
      messages: [
        { ...first, content: [{ type: 'text', text: head === '' ? text : `${head}\n\n${text}` }] },
        ...options.messages.slice(1),
      ],
      ...(options.system === undefined ? {} : { system: options.system }),
    }
  }

  return {
    messages: [createSystemMessage(text), ...options.messages],
    ...(options.system === undefined ? {} : { system: options.system }),
  }
}

/** The last user turn, which is what a router can actually reason about. */
export function lastUserText(messages: readonly RequestMessage[]): string {
  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index]!
    if (message.role === 'user') return textOf(message.content).trim()
  }
  return ''
}

/** What a router-decides main model is told before it writes the answer. */
function routerNote(result: TeamRunResult): string {
  return [
    `A team specialist (${result.agent}) was consulted for the latest request and returned:`,
    '',
    result.output,
    '',
    'Use this work to answer the user. Do not expose the delegation machinery unless it matters.',
  ].join('\n')
}
