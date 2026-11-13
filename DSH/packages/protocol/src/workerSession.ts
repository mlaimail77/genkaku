// GENKAKU: worker session service (mode B/C).
// One metered worker session: /genkaku/open handshake → stream completion from
// the local source → token frames out. Settle wiring is P4.4; the receipt side
// is validated at session end against the receipts the client piped in.

import type { ChatMessage, CompletionRequest, LocalChatSource, LocalCompletionSource } from './llmBridge.ts'
import type { ModeManager } from './modeManager.ts'
import type { ReceiptLedger } from './receipts.ts'

export type OpenEnvelopeV0 = {
  proto: 'open/0'
  jobId: string
  /** uint256 escrow id as a decimal string; "0" = unpriced self-test session */
  escrowId: string
  model: string
  prompt: string
  system?: string
  maxTokens?: number
  /** libp2p PeerId of the dialing client; identity→wallet binding lands P4.4 */
  clientPeer: string
  /**
   * Time-based billing (P4.3): the CLIENT's view of the worker's quoted price.
   * The worker records these receipts; at settle (P4.4) its own catalog price +
   * measured wall time are what the escrow actually pays out against.
   */
  billing?: { mode: 'minutes'; unitMs: number; pricePerHour: string; currency: 'USDC' }
}

/**
 * Chat revision: carries whole messages and tool schemas, which `/api/generate`
 * cannot express. A worker that receives this serves through Ollama's
 * `/api/chat` so an agent can actually call tools.
 */
export type OpenEnvelopeV1 = Omit<OpenEnvelopeV0, 'proto'> & {
  proto: 'open/1'
  messages: ChatMessage[]
  tools?: unknown[]
}

export type OpenEnvelope = OpenEnvelopeV0 | OpenEnvelopeV1

export type SessionEvent =
  | { type: 'session-open'; sessionId: string; escrowId: string; model: string }
  | { type: 'token-count'; tokens: number }
  | { type: 'receipt-accepted'; seq: number; amount: bigint }
  | { type: 'session-end'; sessionId: string; tokens: number }
  | { type: 'session-error'; message: string }

export type WorkerSessionDeps = {
  modeManager: ModeManager
  source: LocalCompletionSource
  /** Required to serve `open/1`; absent means chat requests are refused. */
  chatSource?: LocalChatSource
  /** Relay one tool call produced by the model. */
  onToolCall?: (call: { index: number; id: string; name: string; argumentsDelta: string }) => void
  ledger: ReceiptLedger
  emit: (e: SessionEvent) => void
  onDelta: (delta: string) => void
  /** live receipts the client has offered so far (seq → cumulative amount) */
  latestReceipt: () => { seq: number; amount: bigint } | null
  abortSignal?: AbortSignal
}

export type WorkerSession = {
  sessionId: string
  tokens: () => number
  abort(): void
  run(): Promise<void>
}

export function createWorkerSession(
  envelope: OpenEnvelope,
  deps: WorkerSessionDeps,
): WorkerSession {
  const sessionId = envelope.jobId
  let tokens = 0
  let aborted = false

  return {
    sessionId,
    tokens: () => tokens,
    abort(): void { aborted = true },

    async run(): Promise<void> {
      const mode = deps.modeManager.current()

      if (!mode.sharingActive) {
        deps.emit({ type: 'session-error', message: 'worker listeners not installed (mode guard)' })

        return
      }

      deps.emit({ type: 'session-open', sessionId, escrowId: envelope.escrowId, model: envelope.model })

      // Receipts stream IN while the session runs (client pays on a timer in
      // P4.3 time-billing). Each arrival must be strictly increasing — the
      // ledger rejects stale/non-increasing offers (P2 §3).
      let lastSeq = 0

      const checkReceipts = () => {
        const latest = deps.latestReceipt()

        if (latest == null || latest.seq <= lastSeq) {return}

        const verdict = deps.ledger.offer(sessionId, latest.seq, latest.amount)

        if (verdict.accepted) {
          deps.emit({ type: 'receipt-accepted', seq: latest.seq, amount: latest.amount })
        }

        lastSeq = latest.seq
      }

      checkReceipts()

      const req: CompletionRequest = {
        model: envelope.model,
        prompt: envelope.prompt,
        system: envelope.system,
        maxTokens: envelope.maxTokens,
      }

      const chat = envelope.proto === 'open/1' ? envelope : null

      try {
        if (chat != null) {
          if (deps.chatSource == null) {
            throw new Error('worker cannot serve open/1: no chat source configured')
          }
          await deps.chatSource.streamChat(
            {
              model: chat.model,
              messages: chat.messages,
              ...(chat.tools === undefined ? {} : { tools: chat.tools }),
              ...(chat.maxTokens === undefined ? {} : { maxTokens: chat.maxTokens }),
            },
            (event) => {
              if (aborted) {return}
              if (event.type === 'text') {
                tokens += 1
                deps.emit({ type: 'token-count', tokens })
                deps.onDelta(event.text)
              } else {
                deps.onToolCall?.({
                  index: event.index,
                  id: event.id ?? `call_${event.index}`,
                  name: event.name ?? '',
                  argumentsDelta: event.argumentsDelta,
                })
              }
              checkReceipts()
            },
            deps.abortSignal ?? undefined,
          )
        } else {
          await deps.source.stream(req, (delta) => {
            if (aborted) {return}
            tokens += 1 // one delta ≈ one token frame from the local source
            deps.emit({ type: 'token-count', tokens })
            deps.onDelta(delta)
            checkReceipts()
          }, deps.abortSignal ?? undefined)
        }
        deps.emit({ type: 'session-end', sessionId, tokens })
      } catch (err) {
        if (aborted) {
          deps.emit({ type: 'session-end', sessionId, tokens })
        } else {
          deps.emit({ type: 'session-error', message: err instanceof Error ? err.message : String(err) })
        }
      }
    },
  }
}
