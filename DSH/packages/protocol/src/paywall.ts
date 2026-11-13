// GENKAKU: worker paywall (P4.9d).
//
// A public directory makes a worker dialable by strangers. Without a gate,
// "dialable" means "free GPU": anyone who scans the chain can open a stream and
// burn inference time. The gate is therefore not a billing nicety — it is the
// condition for publishing an address at all.
//
// The check is cheap and self-contained: the client names an escrow id in the
// OPEN envelope; the worker reads that session from JobEscrow and serves only
// if the record exists, pays THIS worker, is still open, and has money in it.
// The money itself never moves here — settlement stays the client's signed
// receipt + JobEscrow.settle.
//
// Deliberate properties:
//   * a verdict is cached for a few seconds (a retry storm must not become RPC
//     load) but never longer than the escrow can change state;
//   * the amount is a ceiling, not a reservation: two clients may name the same
//     escrow, and the ledger still caps what can be settled;
//   * `unpriced` (escrowId "0") is allowed ONLY when the operator explicitly
//     disabled the paywall, so a dev session can never be reached by a stranger
//     that merely guessed "0".

import { readEscrowSession, type GenkakuPublic } from './chain.ts'
import type { NetEnvironment } from './netconfig.ts'

export type PaywallRequest = {
  jobId: string
  escrowId: string
  clientPeer: string
  /** the model in the OPEN envelope; decides whether "unpriced" is free */
  model: string
}

export type PaywallVerdict =
  | { ok: true; /** the escrow's payer — receipts must be signed by this wallet */ payer: `0x${string}` }
  | { ok: false; code: string; reason: string }

export type Paywall = (request: PaywallRequest) => Promise<PaywallVerdict>

const VERDICT_TTL_MS = 15_000
const ZERO = '0x0000000000000000000000000000000000000000'

export type PaywallOptions = {
  publicC: GenkakuPublic
  env: NetEnvironment
  /** the wallet that must be the escrow's payee */
  worker: `0x${string}`
  /** dev escape hatch: allow `escrowId: "0"` (unpriced) sessions */
  allowUnpriced?: boolean
  /** the operator's current quote per model (micro-USDC/hour). An unpriced
   *  session is authorized only for a model quoted at exactly zero — a priced
   *  model must still present real escrow, so naming "0" cannot skip payment. */
  prices?: (model: string) => bigint | undefined
  now?: () => number
  log?: { warn: (msg: string, ...args: unknown[]) => void }
}

export function createPaywall(opts: PaywallOptions): Paywall {
  const cache = new Map<string, { at: number; verdict: PaywallVerdict }>()
  const now = opts.now ?? Date.now

  return async (request) => {
    const raw = (request.escrowId ?? '').trim()

    if (raw === '' || raw === '0') {
      // Unpriced sessions have no payer to certify. Two ways in: the operator
      // disabled the paywall outright (dev), or this model's own quote is 0 —
      // a free listing cannot open a 0-value escrow because the contract
      // reverts, so free has to mean "no escrow".
      const price = request.model === '' ? undefined : opts.prices?.(request.model)

      return opts.allowUnpriced === true || price === 0n
        ? { ok: true, payer: ZERO }
        : { ok: false, code: 'payment-required', reason: 'unpriced session rejected: open an escrow first' }
    }

    let id: bigint
    try {
      id = BigInt(raw)
    } catch {
      return { ok: false, code: 'bad-escrow', reason: 'escrow id is not an integer' }
    }

    const key = id.toString()
    const hit = cache.get(key)
    if (hit != null && now() - hit.at < VERDICT_TTL_MS) return hit.verdict

    let verdict: PaywallVerdict
    try {
      const session = await readEscrowSession(opts.publicC, opts.env, id)
      verdict = judge(session, opts.worker)
    } catch (error) {
      // An RPC failure must not silently turn into free compute: fail closed,
      // but say so, because a flaky endpoint should be retried by the client.
      const message = error instanceof Error ? error.message : String(error)
      opts.log?.warn('paywall: escrow %s read failed (%s)', key, message)
      verdict = { ok: false, code: 'chain-unavailable', reason: 'could not verify the escrow; retry shortly' }
    }

    // Cache failures too: a stranger replaying a dead escrow id must not turn
    // into one chain read per attempt.
    cache.set(key, { at: now(), verdict })

    return verdict
  }
}

function judge(session: Awaited<ReturnType<typeof readEscrowSession>>, worker: `0x${string}`): PaywallVerdict {
  if (session == null) {
    return { ok: false, code: 'unknown-escrow', reason: 'escrow session does not exist' }
  }

  if (session.worker.toLowerCase() !== worker.toLowerCase()) {
    return { ok: false, code: 'wrong-worker', reason: 'escrow pays a different worker' }
  }

  if (session.settled || session.refunded) {
    return { ok: false, code: 'closed-escrow', reason: 'escrow is already settled or refunded' }
  }

  if (session.amount <= 0n) {
    return { ok: false, code: 'empty-escrow', reason: 'escrow has no funds' }
  }

  if (session.user.toLowerCase() === ZERO) {
    return { ok: false, code: 'unknown-escrow', reason: 'escrow has no payer' }
  }

  return { ok: true, payer: session.user }
}
