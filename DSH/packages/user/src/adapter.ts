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
import { LlmAdapter } from '@deepseek-ai/dsh-llm'

type BridgeModel = {
  id: string
  genkaku?: { tier?: 'agent' | 'light' | 'chat'; capabilities?: string[]; parameterSize?: string }
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

  constructor(private readonly options: GenkakuAdapterOptions) {
    super()
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
    try {
      const res = await fetch(`${await this.baseUrl()}/models`)
      if (!res.ok) return []
      const body = (await res.json()) as { data?: BridgeModel[] }
      return (body.data ?? []).map((model) => {
        const tier = model.genkaku?.tier ?? 'chat'
        const size = model.genkaku?.parameterSize
        const bits = [size, tier === 'agent' ? 'agent-ready' : undefined].filter(Boolean)
        return {
          provider,
          id: model.id,
          name: model.id,
          ...(bits.length === 0 ? {} : { description: bits.join(' · ') }),
          ...(tier === 'chat'
            ? { badge: { text: { en: 'not for agents', zh: '不適用於 agent' }, tone: 'warning' as const } }
            : {}),
        }
      })
    } catch (error) {
      this.options.log?.(`genkaku adapter: model listing failed (${String(error)})`)
      return []
    }
  }

  /** Stream one completion from the network. */
  override async *stream(options: GenerateOptions): AsyncIterable<StreamChunk> {
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
