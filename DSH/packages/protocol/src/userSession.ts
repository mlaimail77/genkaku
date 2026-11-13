// GENKAKU: user session service (mode A, P4.3; escrow-wired P4.4).
// Consumes a remote worker's LLM with TIME-BASED billing: the offer quotes a
// price PER HOUR (worker's free choice); the user pays per STARTED MINUTE via
// incremental /genkaku/receipt/0 offers. Worker's max unbilled exposure is one
// minute. P4.4: priced sessions carry a REAL escrowId and every receipt is
// EIP-191-signed by the user's wallet over the packed digest (JobEscrow._verify
// shape); escrowless self-test sessions ("0") ride unsigned for compat.

import type { WorkerTransport } from './dial.ts'
import type { ChatMessage } from './llmBridge.ts'
import type { ModeManager } from './modeManager.ts'
import { CHAIN_ID, CONTRACTS, type NetEnvironment } from './netconfig.ts'
import type { Offer } from './offer.ts'
import { cumulativeBilled } from './offer.ts'
import {
  digestForHex,
  inputHashOf,
  outputHashOf,
  ZERO_HASH,
  type ReceiptPayloadV1,
  sessionIdHex,
} from './receipts.ts'
import type { OpenEnvelope } from './workerSession.ts'

export type UserSessionEvent =
  | { type: 'session-open'; jobId: string; worker: string; model: string; pricePerHour: bigint }
  | { type: 'token'; delta: string }
  /** A tool call produced by the model, relayed by an open/1 worker. */
  | { type: 'tool-delta'; index: number; id: string; name: string; argumentsDelta: string }
  | { type: 'receipt-sent'; seq: number; amount: bigint; receiptHash: string; sig: string }
  | { type: 'session-end'; jobId: string; elapsedMs: number; billed: bigint }
  | { type: 'session-error'; message: string }

export type UserSessionOptions = {
  jobId: string
  /** the row the user picked from the sorted marketplace list */
  offer: Offer
  prompt: string
  system?: string
  maxTokens?: number
  /** Whole conversation; when present the session opens as open/1. */
  messages?: ChatMessage[]
  /** JSON schemas the model may call. Requires `messages`. */
  tools?: unknown[]
  transport: WorkerTransport
  modeManager: ModeManager
  onToken?: (delta: string) => void
  emit?: (e: UserSessionEvent) => void
  /** injectable clock for tests; defaults to wall time */
  now?: () => number
  /** billing + receipt tick; MUST divide 3,600,000 (default 60 s = per minute) */
  unitMs?: number
  /** decimal string of the REAL JobEscrow session id; "0" = unpriced self-test */
  escrowId?: string
  /** data-plane chain the receipts bind to (default base-sepolia) */
  env?: NetEnvironment
  /** the user wallet's receipt signer — P4.4: receipts are signed evidence */
  signReceipt?: (receipt: ReceiptPayloadV1) => Promise<string>
}

export type UserSessionResult = {
  jobId: string
  elapsedMs: number
  billed: bigint
  tokens: number
  /** set when the worker refused or the stream broke before any answer */
  failure?: { message: string; code?: string }
}

export async function runUserSession(opts: UserSessionOptions): Promise<UserSessionResult> {
  const unitMs = opts.unitMs ?? 60_000
  const now = opts.now ?? (() => Date.now())
  const emit = (e: UserSessionEvent) => opts.emit?.(e)
  let lastAmount = 0n
  let seq = 0
  let tokens = 0
  let failure: { message: string; code?: string } | undefined
  let paying = false

  // D-block: remote consumption is legal ONLY in user mode — throws otherwise.
  opts.modeManager.beginRemoteSession()

  const escrowId = opts.escrowId ?? '0'
  const env: NetEnvironment = opts.env ?? 'base-sepolia'
  const sessionId = sessionIdHex(opts.jobId, escrowId)
  const inputHash = inputHashOf({
    model: opts.offer.model,
    prompt: opts.prompt,
    system: opts.system,
    maxTokens: opts.maxTokens,
  })
  let output = ''

  try {
    const common = {
      jobId: opts.jobId,
      escrowId,
      model: opts.offer.model,
      prompt: opts.prompt,
      system: opts.system,
      maxTokens: opts.maxTokens,
      clientPeer: 'user', // replaced by the real peer id at app wiring
      billing: { mode: 'minutes' as const, unitMs, pricePerHour: opts.offer.pricePerHour.toString(), currency: 'USDC' as const },
    }
    // A conversation with tool schemas is served by Ollama's chat API; the
    // single-prompt form cannot carry either.
    const envelope: OpenEnvelope = opts.messages == null
      ? { proto: 'open/0', ...common }
      : { proto: 'open/1', ...common, messages: opts.messages, ...(opts.tools === undefined ? {} : { tools: opts.tools }) }

    emit({ type: 'session-open', jobId: opts.jobId, worker: opts.offer.workerName, model: opts.offer.model, pricePerHour: opts.offer.pricePerHour })

    await opts.transport.open(envelope)
    opts.transport.onToolCall((call) => {
      emit({ type: 'tool-delta', ...call })
    })
    opts.transport.onToken((delta) => {
      tokens += 1
      output += delta
      opts.onToken?.(delta)
      emit({ type: 'token', delta })
    })

    const startMs = now()

    const pay = async (final = false): Promise<void> => {
      if (paying) {return}
      paying = true

      try {
        const amount = cumulativeBilled(opts.offer.pricePerHour, unitMs, now() - startMs)

        // The through-end receipt is sent even when the amount did not move:
        // it is what commits the OUTPUT hash, so settle can be challenged.
        if (amount > lastAmount || final) {
          seq += 1
          lastAmount = amount

          // P4.4 signed receipt: EIP-191 sig over the packed digest — the escrow
          // binds this EXACT hash at settle (receiptHashFor in chain.ts).
          const receipt: ReceiptPayloadV1 = {
            chainId: CHAIN_ID[env],
            escrow: (CONTRACTS[env].escrow || '0x0000000000000000000000000000000000000000') as `0x${string}`,
            sessionId,
            seq,
            amount,
            inputHash,
            outputHash: final ? outputHashOf(output) : ZERO_HASH,
          }

          let sig = ''

          if (escrowId !== '0' && opts.signReceipt != null) {
            sig = await opts.signReceipt(receipt)
          }

          // A dead transport must not kill the billing loop — report and keep
          // the ticker alive until the session's own end/stop path resolves.
          try {
            await opts.transport.sendReceipt(opts.jobId, seq, amount, sig, receipt.inputHash, receipt.outputHash)
            emit({ type: 'receipt-sent', seq, amount, receiptHash: digestForHex(receipt), sig })
          } catch (receiptErr) {
            emit({ type: 'session-error', message: `receipt ${seq}: ${receiptErr instanceof Error ? receiptErr.message : String(receiptErr)}` })
          }
        }
      } finally {
        paying = false
      }
    }

    const ticker = setInterval(() => { void pay() }, unitMs)

    try {
      await new Promise<void>((resolve, reject) => {
        opts.transport.onEnd(() => resolve())
        opts.transport.onError(reject)
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      const code = err instanceof Error ? (err as Error & { code?: string }).code : undefined
      failure = { message, ...(code != null ? { code } : {}) }
      emit({ type: 'session-error', message })
    } finally {
      clearInterval(ticker)
      // An in-flight tick must finish before the final one, or the through-end
      // receipt (the only one that commits the output) would be dropped.
      while (paying) {await new Promise(resolve => setTimeout(resolve, 10))}
      await pay(true) // final receipt: settle through the last started minute + commit output
      emit({ type: 'session-end', jobId: opts.jobId, elapsedMs: now() - startMs, billed: lastAmount })
    }

    return { jobId: opts.jobId, elapsedMs: now() - startMs, billed: lastAmount, tokens, ...(failure != null ? { failure } : {}) }
  } finally {
    await opts.transport.close()
    opts.modeManager.endRemoteSession()
  }
}
