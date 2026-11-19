// GENKAKU: local LLM bridge (worker mode).
// Translates an in-flight libp2p worker stream into the machine's local Ollama
// API (127.0.0.1:11434 — same source the upstream agent uses via
// agent/agent_init_ollama.py), streaming tokens out and reporting metering.
//
// Deviation from P2 §6 note: the LLM-side transport is *local HTTP*, not the
// Python relay — the sidecar stays a thin, testable layer; a future variant can
// point it at a hermes gateway's internal completion API instead (the interface
// below is the seam: LocalCompletionSource).

import { profileOf, type ModelProfile, type OllamaModelFacts } from './capabilities.ts'

export type CompletionRequest = {
  model: string
  prompt: string
  system?: string
  maxTokens?: number
}

export type LocalCompletionSource = {
  /** stream tokens; resolves when the source is exhausted */
  stream(
    req: CompletionRequest,
    onDelta: (text: string) => void,
    signal?: AbortSignal,
  ): Promise<{ promptTokens: number; completionTokens: number; model: string }>
}

// GENKAKU: Ollama model administration (worker-side onboarding, P4.3).
// Workers download models from the Ollama registry and pick what to serve —
// the desktop engine is PURE Ollama (user decision 2026-11-06: no embedded
// Strata relaying on the desktop side; Strata stays the VM-side worker).

export type ModelInfo = {
  name: string
  sizeBytes?: number | undefined
  family?: string | undefined
  quantization?: string | undefined
}

export type PullProgress = { status: string; percent?: number | undefined }

export function ollamaAdmin(host: string = process.env.GENKAKU_OLLAMA_HOST ?? DEFAULT_HOST) {
  async function readNdjson(res: Response, onFrame: (f: Record<string, unknown>) => void): Promise<void> {
    if (!res.ok || !res.body) {
      throw new Error(`[genkaku:ollama] ${new URL(res.url).pathname} refused (${res.status})`)
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buf = ''

    while (true) {
      const { value, done } = await reader.read()

      if (done) {break}
      buf += decoder.decode(value, { stream: true })
      let nl: number

      while ((nl = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nl).trim()
        buf = buf.slice(nl + 1)

        if (!line) {continue}

        try { onFrame(JSON.parse(line) as Record<string, unknown>) } catch { /* tolerate */ }
      }
    }
  }

  return {
    /** locally installed models (what the worker may choose to publish) */
    async list(): Promise<ModelInfo[]> {
      const res = await fetch(new URL('/api/tags', host), { method: 'GET' })

      if (!res.ok) {
        throw new Error(`[genkaku:ollama] /api/tags refused (${res.status}) — is Ollama running?`)
      }

      const body = (await res.json()) as {
        models?: Array<{ name: string; size?: number; details?: { family?: string; quantization_level?: string } }>
      }

      return (body.models ?? []).map(m => ({
        name: m.name,
        sizeBytes: m.size,
        family: m.details?.family,
        quantization: m.details?.quantization_level,
      }))
    },

    /** download a model from the Ollama registry (registry name like "llama3:8b") */
    async pull(model: string, onProgress?: (p: PullProgress) => void, signal?: AbortSignal): Promise<{ status: string }> {
      const res = await fetch(new URL('/api/pull', host), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ model, stream: true }),
        ...(signal === undefined ? {} : { signal }),
      })

      let status = 'unknown'

      await readNdjson(res, (f) => {
        const total = typeof f.total === 'number' ? f.total : undefined
        const completed = typeof f.completed === 'number' ? f.completed : undefined
        let percent: number | undefined

        if (total != null && completed != null && total > 0) {percent = Math.min(100, Math.round((completed / total) * 100))}
        const frame = { status: String(f.status ?? ''), percent }
        status = frame.status
        onProgress?.(frame)
      })

      return { status }
    },
  }
}


const DEFAULT_HOST = 'http://127.0.0.1:11434'

/**
 * Ask Ollama what a model can do.
 *
 * `/api/show` is the authoritative answer for capabilities; the parameter size
 * lives in `/api/tags` under `details.parameter_size`. Both are needed for the
 * tier, so callers usually want {@link probeModels}.
 *
 * @param model - model name as Ollama knows it.
 * @param host - Ollama base URL.
 */
export async function probeModel(
  model: string,
  host: string = process.env.GENKAKU_OLLAMA_HOST ?? DEFAULT_HOST,
): Promise<OllamaModelFacts> {
  const res = await fetch(new URL('/api/show', host), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model }),
  })
  if (!res.ok) {
    throw new Error(`[genkaku:ollama] /api/show refused for ${model} (${res.status})`)
  }
  const body = (await res.json()) as {
    capabilities?: string[]
    details?: { parameter_size?: string }
  }
  return {
    ...(Array.isArray(body.capabilities) ? { capabilities: body.capabilities } : {}),
    ...(body.details?.parameter_size === undefined ? {} : { parameterSize: body.details.parameter_size }),
  }
}

/**
 * Profile every model Ollama has locally: capabilities from `/api/show`,
 * size from `/api/tags`.
 *
 * A model whose probe fails is reported with no capabilities, which lands it in
 * the `chat` tier. That is the safe direction: an unreadable model is never
 * advertised as agent-capable.
 *
 * @param host - Ollama base URL.
 */
export async function probeModels(
  host: string = process.env.GENKAKU_OLLAMA_HOST ?? DEFAULT_HOST,
): Promise<ModelProfile[]> {
  const res = await fetch(new URL('/api/tags', host), { method: 'GET' })
  if (!res.ok) {
    throw new Error(`[genkaku:ollama] /api/tags refused (${res.status}) — is Ollama running?`)
  }
  const body = (await res.json()) as {
    models?: Array<{ name: string; details?: { parameter_size?: string } }>
  }
  const rows = body.models ?? []
  return Promise.all(rows.map(async (row) => {
    let capabilities: string[] | undefined
    try {
      capabilities = (await probeModel(row.name, host)).capabilities
    } catch {
      capabilities = undefined
    }
    return profileOf(row.name, {
      ...(capabilities === undefined ? {} : { capabilities }),
      ...(row.details?.parameter_size === undefined ? {} : { parameterSize: row.details.parameter_size }),
    })
  }))
}

export function createOllamaSource(host: string = process.env.GENKAKU_OLLAMA_HOST ?? DEFAULT_HOST): LocalCompletionSource {
  return {
    async stream(req, onDelta, signal) {
      const res = await fetch(new URL('/api/generate', host), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model: req.model,
          prompt: req.prompt,
          system: req.system,
          stream: true,
          options: {
            num_ctx: Number(process.env.GENKAKU_OLLAMA_NUM_CTX ?? 8192),
            ...(req.maxTokens ? { num_predict: req.maxTokens } : {}),
          },
        }),
        ...(signal === undefined ? {} : { signal }),
      })

      if (!res.ok || !res.body) {
        throw new Error(`[genkaku:ollama] local source refused (${res.status}) — is Ollama running?`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let completionChars = 0
      let done = false
      let evalCount = 0
      let promptTokens = 0
      // LP-JSON over the ollama ndjson
      let buf = ''

      while (!done) {
        const { value, done: rDone } = await reader.read()

        if (rDone) {break}
        buf += decoder.decode(value, { stream: true })
        let nl: number

        while ((nl = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, nl).trim()
          buf = buf.slice(nl + 1)

          if (!line) {continue}

          try {
            const parsed = JSON.parse(line) as { response?: string; done?: boolean; prompt_eval_count?: number; eval_count?: number }

            if (parsed.response) {
              completionChars += parsed.response.length
              onDelta(parsed.response)
            }

            if (parsed.prompt_eval_count != null) {promptTokens = parsed.prompt_eval_count}

            if (parsed.eval_count != null) {evalCount = parsed.eval_count}

            if (parsed.done) { done = true

              break }
          } catch {
            // tolerate partial frames (ollama does not truncate mid-line)
          }
        }
      }

      return {
        promptTokens,
        // prefer ollama's own count; fall back to the ~4-chars-per-token estimate
        completionTokens: evalCount || Math.ceil(completionChars / 4),
        model: req.model,
      }
    },
  }
}

/** One chat turn as the network carries it. */
export type ChatMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  /** assistant turns only: calls the model already made */
  tool_calls?: unknown[]
  /** tool turns only: which call this answers */
  tool_call_id?: string
}

/** Incremental output of one chat completion. */
export type ChatEvent =
  | { type: 'text'; text: string }
  | { type: 'tool-call'; index: number; id?: string; name?: string; argumentsDelta: string }

/** A worker-side source that can serve a chat with tool schemas. */
export type LocalChatSource = {
  streamChat(
    req: { model: string; messages: ChatMessage[]; tools?: unknown[]; maxTokens?: number },
    onEvent: (event: ChatEvent) => void,
    signal?: AbortSignal,
  ): Promise<{ completionTokens: number; model: string }>
}

/**
 * Serve a chat with tools through Ollama's `/api/chat`.
 *
 * The legacy `/api/generate` path takes a single prompt string and therefore
 * cannot carry tool schemas or tool results; this source exists so a worker can
 * serve an agent, not only a chat box.
 *
 * Ollama reports tool calls as complete objects rather than deltas, so each one
 * is emitted as a single `tool-call` event with the full arguments string.
 */
export function createOllamaChatSource(
  host: string = process.env.GENKAKU_OLLAMA_HOST ?? DEFAULT_HOST,
): LocalChatSource {
  return {
    async streamChat(req, onEvent, signal) {
      const res = await fetch(new URL('/api/chat', host), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model: req.model,
          messages: req.messages,
          stream: true,
          // Thinking models (qwen3, deepseek-r1, …) spend `num_predict` on
          // hidden reasoning first. The protocol has no reasoning channel yet,
          // so that text never reaches the client and a short budget yields an
          // EMPTY answer that looks like a dead worker. Ask for the answer
          // directly; `GENKAKU_OLLAMA_THINK=1` restores the model's default.
          ...(process.env.GENKAKU_OLLAMA_THINK === '1' ? {} : { think: false }),
          ...(req.tools === undefined || req.tools.length === 0 ? {} : { tools: req.tools }),
          options: {
            num_ctx: Number(process.env.GENKAKU_OLLAMA_NUM_CTX ?? 8192),
            ...(req.maxTokens ? { num_predict: req.maxTokens } : {}),
          },
        }),
        ...(signal === undefined ? {} : { signal }),
      })
      if (!res.ok) {
        throw new Error(`[genkaku:ollama] /api/chat refused (${res.status}) — is Ollama running?`)
      }

      let completionTokens = 0
      let toolIndex = 0
      const handleFrame = (frame: Record<string, unknown>): void => {
        const message = frame.message as
          | { content?: string; tool_calls?: Array<{ function?: { name?: string; arguments?: unknown } }> }
          | undefined
        if (typeof message?.content === 'string' && message.content !== '') {
          completionTokens += 1
          onEvent({ type: 'text', text: message.content })
        }
        for (const call of message?.tool_calls ?? []) {
          const args = call.function?.arguments
          onEvent({
            type: 'tool-call',
            index: toolIndex++,
            name: call.function?.name ?? '',
            argumentsDelta: typeof args === 'string' ? args : JSON.stringify(args ?? {}),
          })
        }
      }

      const reader = res.body?.getReader()
      if (reader == null) throw new Error('[genkaku:ollama] /api/chat returned no body')
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
          if (line !== '') {
            try { handleFrame(JSON.parse(line) as Record<string, unknown>) } catch { /* tolerate */ }
          }
          nl = buffer.indexOf('\n')
        }
      }

      return { completionTokens, model: req.model }
    },
  }
}
