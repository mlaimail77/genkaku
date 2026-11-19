// Agent access to a plugin wallet.
//
// The rule this file encodes: an agent is not the owner. It may ask, and under
// a cap it may act, but it can never read a key or change identity. Every
// decision is written to an audit log, and an approval is bound to the exact
// action by a digest, so it cannot be replayed for a different amount.
//
// Modes:
//   off     agent requests are refused
//   ask     each request waits for the owner, once, for five minutes
//   capped  tips/campaign funding up to a per-request and per-day cap run
//           without asking; claim is always allowed; anything over a cap falls
//           back to ask
//
// The owner's own clicks are not gated by the mode (a frozen wallet stops both).
// This is policy, not a sandbox: an agent running as the same OS user can still
// call the owner routes if it knows them. The approval queue is the security
// boundary that matters.

import { createHash, randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

export type WalletMode = 'off' | 'ask' | 'capped'
export type WalletActionKind = 'tip' | 'campaign-fund' | 'claim' | 'identity'
export type WalletActor = 'owner' | 'agent'

export type WalletRequest = {
  id: string
  at: number
  expiresAt: number
  actor: WalletActor
  action: WalletActionKind
  /** micro-USDC this action would move; 0 for claim */
  amountMicro: string
  summary: string
  digest: string
  status: 'pending' | 'approved' | 'denied' | 'expired' | 'used' | 'failed'
  tx?: string
  reason?: string
}

export type WalletAudit = {
  at: number
  actor: WalletActor
  action: WalletActionKind
  amountMicro: string
  status: 'allowed' | 'pending' | 'denied' | 'executed' | 'failed'
  detail?: string
  requestId?: string
}

type Persisted = {
  version: 1
  mode: WalletMode
  perTxMicro: string
  dailyMicro: string
  frozen: boolean
  /** UTC day the spend belongs to */
  day: string
  spentMicro: string
  requests: WalletRequest[]
  audit: WalletAudit[]
}

export type PolicySnapshot = {
  mode: WalletMode
  perTxMicro: string
  dailyMicro: string
  frozen: boolean
  spentMicro: string
  day: string
  pending: WalletRequest[]
  audit: WalletAudit[]
}

export type AuthorizeInput = {
  actor: WalletActor
  action: WalletActionKind
  amountMicro?: bigint
  /** Human-readable line the owner will see. */
  summary: string
  /** Canonical, secret-free description of what will be signed. */
  payload: Record<string, unknown>
}

export type Decision =
  | { status: 'allow' }
  | { status: 'pending'; request: WalletRequest }
  | { status: 'deny'; reason: string }

const DAY_MS = 86_400_000
const EXPIRY_MS = 5 * 60_000
const MAX_AUDIT = 200
const MAX_REQUESTS = 50

export function utcDay(at = Date.now()): string {
  return new Date(at).toISOString().slice(0, 10)
}

function digestOf(input: AuthorizeInput): string {
  return createHash('sha256')
    .update(JSON.stringify({ action: input.action, amount: String(input.amountMicro ?? 0n), payload: input.payload }))
    .digest('hex')
}

export class WalletPolicy {
  private state: Persisted

  constructor(private readonly file: string) {
    this.state = this.load()
  }

  private fresh(): Persisted {
    return {
      version: 1,
      mode: 'off',
      // 1 USDC per action, 5 USDC per UTC day. Conservative defaults: an owner
      // who wants more has to say so.
      perTxMicro: '1000000',
      dailyMicro: '5000000',
      frozen: false,
      day: utcDay(),
      spentMicro: '0',
      requests: [],
      audit: [],
    }
  }

  private load(): Persisted {
    try {
      const raw = JSON.parse(readFileSync(this.file, 'utf8')) as Partial<Persisted>
      const base = this.fresh()
      return {
        ...base,
        ...raw,
        version: 1,
        requests: Array.isArray(raw.requests) ? raw.requests : [],
        audit: Array.isArray(raw.audit) ? raw.audit : [],
      }
    } catch {
      return this.fresh()
    }
  }

  private save(): void {
    mkdirSync(dirname(this.file), { recursive: true })
    const tmp = `${this.file}.tmp`
    writeFileSync(tmp, `${JSON.stringify(this.state, null, 2)}\n`, { mode: 0o600 })
    renameSync(tmp, this.file)
  }

  private rollDay(at: number): void {
    const day = utcDay(at)
    if (this.state.day === day) return
    this.state.day = day
    this.state.spentMicro = '0'
  }

  private audit(row: Omit<WalletAudit, 'at'>): void {
    this.state.audit.push({ at: Date.now(), ...row })
    if (this.state.audit.length > MAX_AUDIT) this.state.audit.splice(0, this.state.audit.length - MAX_AUDIT)
  }

  private pruned(): WalletRequest[] {
    const now = Date.now()
    for (const request of this.state.requests) {
      if (request.status === 'pending' && request.expiresAt < now) request.status = 'expired'
    }
    // Keep the recent history bounded; pending rows are never dropped.
    const pending = this.state.requests.filter(r => r.status === 'pending' || r.status === 'approved')
    const rest = this.state.requests.filter(r => r.status !== 'pending' && r.status !== 'approved').slice(-MAX_REQUESTS)
    this.state.requests = [...rest, ...pending]
    return this.state.requests
  }

  snapshot(): PolicySnapshot {
    this.rollDay(Date.now())
    const requests = this.pruned()
    return {
      mode: this.state.mode,
      perTxMicro: this.state.perTxMicro,
      dailyMicro: this.state.dailyMicro,
      frozen: this.state.frozen,
      spentMicro: this.state.spentMicro,
      day: this.state.day,
      pending: requests.filter(r => r.status === 'pending' || r.status === 'approved'),
      audit: this.state.audit.slice(-30).reverse(),
    }
  }

  setMode(mode: string): void {
    if (mode !== 'off' && mode !== 'ask' && mode !== 'capped') throw new Error('unknown wallet mode')
    this.state.mode = mode
    this.audit({ actor: 'owner', action: 'identity', amountMicro: '0', status: 'allowed', detail: `mode=${mode}` })
    this.save()
  }

  setCaps(input: { perTxMicro?: unknown; dailyMicro?: unknown }): void {
    for (const key of ['perTxMicro', 'dailyMicro'] as const) {
      if (input[key] == null) continue
      const value = String(input[key])
      if (!/^\d+$/.test(value)) throw new Error(`${key} must be an integer string`)
      this.state[key] = value
    }
    this.save()
  }

  setFrozen(frozen: boolean): void {
    this.state.frozen = frozen
    this.audit({ actor: 'owner', action: 'identity', amountMicro: '0', status: 'allowed', detail: frozen ? 'frozen' : 'unfrozen' })
    this.save()
  }

  authorize(input: AuthorizeInput): Decision {
    const at = Date.now()
    this.rollDay(at)
    const amount = input.amountMicro ?? 0n

    if (input.actor === 'owner') {
      if (this.state.frozen) {
        this.audit({ actor: 'owner', action: input.action, amountMicro: amount.toString(), status: 'denied', detail: 'wallet is frozen' })
        return { status: 'deny', reason: 'the wallet is frozen' }
      }
      this.audit({ actor: 'owner', action: input.action, amountMicro: amount.toString(), status: 'allowed' })
      this.save()
      return { status: 'allow' }
    }

    if (this.state.frozen) {
      this.audit({ actor: 'agent', action: input.action, amountMicro: amount.toString(), status: 'denied', detail: 'wallet is frozen' })
      return { status: 'deny', reason: 'the wallet is frozen' }
    }
    if (input.action === 'identity') {
      this.audit({ actor: 'agent', action: input.action, amountMicro: '0', status: 'denied', detail: 'identity is owner-only' })
      return { status: 'deny', reason: 'key and identity operations are owner-only' }
    }
    if (this.state.mode === 'off') {
      this.audit({ actor: 'agent', action: input.action, amountMicro: amount.toString(), status: 'denied', detail: 'mode=off' })
      return { status: 'deny', reason: 'agent wallet access is off' }
    }

    if (this.state.mode === 'capped') {
      const withinTx = amount <= BigInt(this.state.perTxMicro)
      const withinDay = BigInt(this.state.spentMicro) + amount <= BigInt(this.state.dailyMicro)
      if (input.action === 'claim' || (withinTx && withinDay)) {
        this.audit({ actor: 'agent', action: input.action, amountMicro: amount.toString(), status: 'allowed', detail: 'within cap' })
        return { status: 'allow' }
      }
    }

    const request: WalletRequest = {
      id: randomBytes(8).toString('hex'),
      at,
      expiresAt: at + EXPIRY_MS,
      actor: 'agent',
      action: input.action,
      amountMicro: amount.toString(),
      summary: input.summary,
      digest: digestOf(input),
      status: 'pending',
    }
    this.state.requests.push(request)
    this.audit({ actor: 'agent', action: input.action, amountMicro: amount.toString(), status: 'pending', requestId: request.id })
    this.save()

    return { status: 'pending', request }
  }

  approve(id: string): WalletRequest {
    const request = this.state.requests.find(r => r.id === id)
    if (request == null) throw new Error('unknown request')
    if (request.status !== 'pending') throw new Error(`request is ${request.status}`)
    if (request.expiresAt < Date.now()) {
      request.status = 'expired'
      this.save()
      throw new Error('request expired')
    }
    request.status = 'approved'
    // Approval starts its own short window; it is still one use.
    request.expiresAt = Date.now() + EXPIRY_MS
    this.audit({ actor: 'owner', action: request.action, amountMicro: request.amountMicro, status: 'allowed', detail: 'approved', requestId: id })
    this.save()

    return request
  }

  deny(id: string): WalletRequest {
    const request = this.state.requests.find(r => r.id === id)
    if (request == null) throw new Error('unknown request')
    if (request.status !== 'pending' && request.status !== 'approved') {
      throw new Error(`request is ${request.status}`)
    }
    request.status = 'denied'
    this.audit({ actor: 'owner', action: request.action, amountMicro: request.amountMicro, status: 'denied', detail: 'owner denied', requestId: id })
    this.save()

    return request
  }

  /** Consume an approval for exactly this action. Returns the request or throws. */
  takeApproval(input: {
    id: string
    action: WalletActionKind
    amountMicro?: bigint
    payload: Record<string, unknown>
  }): WalletRequest {
    const request = this.state.requests.find(r => r.id === input.id)
    if (request == null) throw new Error('unknown approval')
    if (request.status !== 'approved') throw new Error(`approval is ${request.status}`)
    if (request.expiresAt < Date.now()) {
      request.status = 'expired'
      this.save()
      throw new Error('approval expired')
    }
    if (request.action !== input.action || request.amountMicro !== (input.amountMicro ?? 0n).toString()) {
      throw new Error('approval is for a different action')
    }
    const expected = digestOf({
      actor: 'agent',
      action: input.action,
      amountMicro: input.amountMicro,
      summary: request.summary,
      payload: input.payload,
    })
    if (expected !== request.digest) throw new Error('approval does not match this request')
    request.status = 'used'
    this.save()

    return request
  }

  complete(id: string, tx: string): void {
    const request = this.state.requests.find(r => r.id === id)
    if (request != null) request.tx = tx
    this.audit({ actor: 'owner', action: request?.action ?? 'claim', amountMicro: request?.amountMicro ?? '0', status: 'executed', requestId: id, detail: tx })
    this.save()
  }

  fail(id: string, reason: string): void {
    const request = this.state.requests.find(r => r.id === id)
    if (request != null) {
      request.status = 'failed'
      request.reason = reason
    }
    this.audit({ actor: 'owner', action: request?.action ?? 'claim', amountMicro: request?.amountMicro ?? '0', status: 'failed', requestId: id, detail: reason })
    this.save()
  }

  recordSpend(amountMicro: bigint): void {
    this.rollDay(Date.now())
    this.state.spentMicro = (BigInt(this.state.spentMicro) + amountMicro).toString()
    this.save()
  }
}
