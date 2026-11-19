// GENKAKU: the user's spending policy.
//
// A wallet is a payment front end, not a vault: the agent is supposed to be
// able to run a session without asking for permission every time. What it must
// not be able to do is spend without a ceiling. This module is that ceiling.
//
// The shape follows the API-key budgets people already know:
//
//   name        a label that shows up when a request is refused
//   enabled     the "disable key" switch — paid sessions stop, free ones do not
//   expiresAt   a fixed expiry; after it, paid sessions stop
//   creditLimit at most this much, ever or per period
//   reset       never | daily (midnight UTC) | weekly (Monday) | monthly (1st)
//   perSession  at most this much prepaid for one session
//   maxPrice    a model priced above this never reaches the picker
//
// Everything is micro-USDC (6 decimals as 10^-6 dollars) and BigInt. A float
// never touches money here.
//
// Accounting mirrors the chain: opening a session takes a deposit out of the
// wallet immediately, so it is RESERVED while the session runs; settling
// commits the billed amount and the unused deposit comes back. A crash between
// the two leaves a reservation behind, which is treated as spent on the next
// read — over-counting is recoverable, under-counting is a hole.

import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/** Micro-USDC per dollar. */
export const MICRO_USDC = 1_000_000n

/** Ten dollars of prepaid inference for a fresh profile. */
export const DEFAULT_CREDIT_LIMIT = 10n * MICRO_USDC
/** Two dollars is the most one session may prepay by default. */
export const DEFAULT_PER_SESSION = 2n * MICRO_USDC

/** A reservation older than this is presumed spent: the bridge died mid-session. */
export const STALE_PENDING_MS = 30 * 60 * 1000

export const POLICY_FILE = 'policy.json'
export const SPEND_LOG_FILE = 'spend.jsonl'

/** Keep the log small; the lifetime total lives in the policy file, not here. */
const SPEND_LOG_MAX_BYTES = 512 * 1024
const SPEND_LOG_KEEP_LINES = 1000

export type SpendReset = 'never' | 'daily' | 'weekly' | 'monthly'

export const SPEND_RESETS: readonly SpendReset[] = ['never', 'daily', 'weekly', 'monthly']

export type PendingSpend = {
  /** bridge-generated id, also used to commit or release */
  id: string
  micro: string
  at: number
  model?: string
}

export type SpendPolicy = {
  version: 1
  name: string
  enabled: boolean
  expiresAt: number | null
  creditLimitMicro: bigint | null
  reset: SpendReset
  perSessionMicro: bigint | null
  maxPricePerHourMicro: bigint | null
  /** start of the window `periodSpentMicro` counts in */
  periodStartedAt: number
  periodSpentMicro: bigint
  lifetimeSpentMicro: bigint
  pending: PendingSpend[]
}

/** One settled (or recovered) session, appended to `spend.jsonl`. */
export type SpendEntry = {
  at: number
  micro: string
  model?: string
  worker?: string
  workerName?: string
  escrowId?: string
  tx?: string
  /** true when a stale reservation was turned into spend at startup */
  recovered?: boolean
}

export type SpendVerdict =
  | { ok: true; deposit: bigint }
  | {
    ok: false
    code: 'policy_disabled' | 'policy_expired' | 'price_cap' | 'session_cap' | 'budget_exhausted'
    message: string
  }

export function policyPath(keyDir: string): string {
  return join(keyDir, POLICY_FILE)
}

export function spendLogPath(keyDir: string): string {
  return join(keyDir, SPEND_LOG_FILE)
}

/** The documented starting point: on, ten dollars total, never resets, two
 *  dollars per session, no price filter. */
export function defaultSpendPolicy(now: number = Date.now()): SpendPolicy {
  return {
    version: 1,
    name: 'everyday',
    enabled: true,
    expiresAt: null,
    creditLimitMicro: DEFAULT_CREDIT_LIMIT,
    reset: 'never',
    perSessionMicro: DEFAULT_PER_SESSION,
    maxPricePerHourMicro: null,
    periodStartedAt: now,
    periodSpentMicro: 0n,
    lifetimeSpentMicro: 0n,
    pending: [],
  }
}

/** "0.003" — for messages and the panel, never for arithmetic. */
export function formatMicro(micro: bigint): string {
  const negative = micro < 0n
  const abs = negative ? -micro : micro
  const whole = abs / MICRO_USDC
  const frac = (abs % MICRO_USDC).toString().padStart(6, '0').replace(/0+$/, '')

  return `${negative ? '-' : ''}${whole}${frac === '' ? '' : `.${frac}`}`
}

/** "$10" | "10.5" | "" → micro-USDC; `null` for "no limit". Throws on junk so
 *  a typo in the panel is a 400, not a silent zero. */
export function parseUsdc(input: unknown): bigint | null {
  if (input == null) return null
  if (typeof input === 'bigint') return input < 0n ? null : input

  if (typeof input !== 'string' && typeof input !== 'number') {
    throw new Error('amount must be a decimal string')
  }

  const text = String(input).trim().replace(/^\$/, '')
  if (text === '') return null
  if (!/^\d+(\.\d{1,6})?$/.test(text)) throw new Error(`not a USDC amount: ${text}`)

  const [whole, frac = ''] = text.split('.')
  const micro = BigInt(whole) * MICRO_USDC + BigInt(frac.padEnd(6, '0'))

  return micro
}

/** Start of the window containing `now` for a given reset cadence (UTC). */
export function periodStart(reset: SpendReset, now: number): number {
  const d = new Date(now)
  const midnight = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())

  if (reset === 'daily') return midnight
  if (reset === 'weekly') {
    // OpenRouter resets weekly on Monday; getUTCDay() is 0 on Sunday.
    const weekday = (new Date(midnight).getUTCDay() + 6) % 7

    return midnight - weekday * 86_400_000
  }
  if (reset === 'monthly') return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)

  return midnight
}

/** Roll the spending window if the cadence says it is over. */
export function rollPeriod(policy: SpendPolicy, now: number = Date.now()): SpendPolicy {
  if (policy.reset === 'never') return policy

  const start = periodStart(policy.reset, now)

  if (start <= policy.periodStartedAt) return policy

  return { ...policy, periodStartedAt: start, periodSpentMicro: 0n }
}

/**
 * Turn reservations the bridge can no longer own into spend. Called on read:
 * a session that was open when the process died has either settled or been
 * refunded on chain, and guessing "refunded" is the one guess that loses money.
 */
export function recoverStalePending(policy: SpendPolicy, now: number = Date.now()): SpendPolicy {
  const stale = policy.pending.filter(entry => now - entry.at > STALE_PENDING_MS)

  if (stale.length === 0) return policy

  const sum = stale.reduce((total, entry) => total + BigInt(entry.micro), 0n)
  const remaining = policy.pending.filter(entry => now - entry.at <= STALE_PENDING_MS)

  return {
    ...policy,
    pending: remaining,
    periodSpentMicro: policy.periodSpentMicro + sum,
    lifetimeSpentMicro: policy.lifetimeSpentMicro + sum,
  }
}

/** Everything already committed plus everything in flight. */
export function committedMicro(policy: SpendPolicy): bigint {
  return policy.periodSpentMicro + policy.pending.reduce((total, entry) => total + BigInt(entry.micro), 0n)
}

/** What is left in this period; `null` when the policy has no limit. */
export function remainingMicro(policy: SpendPolicy): bigint | null {
  if (policy.creditLimitMicro == null) return null
  const remaining = policy.creditLimitMicro - committedMicro(policy)

  return remaining > 0n ? remaining : 0n
}

/**
 * Decide whether one more session may open. `deposit` is the amount the chain
 * will actually take, so the caller computes it with the same helper the
 * escrow does.
 */
export function spendVerdict(
  policy: SpendPolicy,
  args: { deposit: bigint; pricePerHour: bigint; now?: number },
): SpendVerdict {
  const now = args.now ?? Date.now()

  if (!policy.enabled) {
    return { ok: false, code: 'policy_disabled', message: `spending is disabled (${policy.name})` }
  }

  if (policy.expiresAt != null && now >= policy.expiresAt) {
    return { ok: false, code: 'policy_expired', message: `spending policy "${policy.name}" expired` }
  }

  if (policy.maxPricePerHourMicro != null && args.pricePerHour > policy.maxPricePerHourMicro) {
    return {
      ok: false,
      code: 'price_cap',
      message: `this model costs ${formatMicro(args.pricePerHour)} USDC/h, above the ${formatMicro(policy.maxPricePerHourMicro)} USDC/h cap`,
    }
  }

  if (policy.perSessionMicro != null && args.deposit > policy.perSessionMicro) {
    return {
      ok: false,
      code: 'session_cap',
      message: `this session would prepay ${formatMicro(args.deposit)} USDC, above the ${formatMicro(policy.perSessionMicro)} USDC per-session cap`,
    }
  }

  const remaining = remainingMicro(policy)

  if (remaining != null && args.deposit > remaining) {
    return {
      ok: false,
      code: 'budget_exhausted',
      message: `budget "${policy.name}" has ${formatMicro(remaining)} USDC left, this session needs ${formatMicro(args.deposit)}`,
    }
  }

  return { ok: true, deposit: args.deposit }
}

/** Add a reservation. Returns the id to commit or release later. */
export function reserve(
  policy: SpendPolicy,
  args: { deposit: bigint; model?: string; now?: number; id?: string },
): { policy: SpendPolicy; id: string } {
  const at = args.now ?? Date.now()
  const id = args.id ?? `p-${at.toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  const entry: PendingSpend = {
    id,
    micro: args.deposit.toString(),
    at,
    ...(args.model == null ? {} : { model: args.model }),
  }

  return { policy: { ...policy, pending: [...policy.pending, entry] }, id }
}

/** Commit a reservation to spend. Unknown ids are ignored: a commit after a
 *  release must not double-count. */
export function commit(policy: SpendPolicy, id: string, billed: bigint): SpendPolicy {
  const entry = policy.pending.find(item => item.id === id)

  if (entry == null) return policy

  return {
    ...policy,
    pending: policy.pending.filter(item => item.id !== id),
    periodSpentMicro: policy.periodSpentMicro + billed,
    lifetimeSpentMicro: policy.lifetimeSpentMicro + billed,
  }
}

/** Drop a reservation without spending anything (refund, failure, free run). */
export function release(policy: SpendPolicy, id: string): SpendPolicy {
  return { ...policy, pending: policy.pending.filter(item => item.id !== id) }
}

/** Read + repair: missing file means defaults, a crossed window is rolled, and
 *  stale reservations become spend. */
export function readSpendPolicy(keyDir: string, now: number = Date.now()): SpendPolicy {
  let policy: SpendPolicy

  try {
    if (!existsSync(policyPath(keyDir))) {
      policy = defaultSpendPolicy(now)
    } else {
      policy = sanitizeSpendPolicy(JSON.parse(readFileSync(policyPath(keyDir), 'utf8')), now)
    }
  } catch {
    policy = defaultSpendPolicy(now)
  }

  return recoverStalePending(rollPeriod(policy, now), now)
}

export function writeSpendPolicy(keyDir: string, policy: SpendPolicy): void {
  mkdirSync(keyDir, { recursive: true, mode: 0o700 })
  writeFileSync(
    policyPath(keyDir),
    `${JSON.stringify(policyToWire(policy), undefined, 2)}\n`,
    { mode: 0o600 },
  )
}

/** Delete the file: the next read returns the documented defaults. */
export function deleteSpendPolicy(keyDir: string): SpendPolicy {
  try {
    rmSync(policyPath(keyDir), { force: true })
  } catch {
    // already gone
  }

  return defaultSpendPolicy()
}

/** Merge one panel edit. `null` clears a limit ("no limit"), `undefined` keeps
 *  the current value, so "leave blank" and "send nothing" stay distinguishable. */
export function patchSpendPolicy(
  policy: SpendPolicy,
  patch: {
    name?: string
    enabled?: boolean
    expiresAt?: number | null
    creditLimitMicro?: bigint | null
    reset?: SpendReset
    perSessionMicro?: bigint | null
    maxPricePerHourMicro?: bigint | null
  },
  now: number = Date.now(),
): SpendPolicy {
  const next: SpendPolicy = {
    ...policy,
    ...(patch.name === undefined ? {} : { name: patch.name }),
    ...(patch.enabled === undefined ? {} : { enabled: patch.enabled }),
    ...(patch.expiresAt === undefined ? {} : { expiresAt: patch.expiresAt }),
    ...(patch.creditLimitMicro === undefined ? {} : { creditLimitMicro: patch.creditLimitMicro }),
    ...(patch.reset === undefined ? {} : { reset: patch.reset }),
    ...(patch.perSessionMicro === undefined ? {} : { perSessionMicro: patch.perSessionMicro }),
    ...(patch.maxPricePerHourMicro === undefined ? {} : { maxPricePerHourMicro: patch.maxPricePerHourMicro }),
  }

  // A reset change starts a fresh window rather than mixing two cadences.
  if (patch.reset !== undefined && patch.reset !== policy.reset) {
    next.periodStartedAt = periodStart(patch.reset, now)
    next.periodSpentMicro = 0n
  }

  return sanitizeSpendPolicy(policyToWire(next), now)
}

/** Append one settled session. Rotates the file when it gets large; the
 *  lifetime total is in the policy file, so rotation only trims the windows. */
export function appendSpend(keyDir: string, entry: SpendEntry): void {
  mkdirSync(keyDir, { recursive: true, mode: 0o700 })

  const file = spendLogPath(keyDir)
  appendFileSync(file, `${JSON.stringify(entry)}\n`, { mode: 0o600 })

  try {
    if (statSync(file).size <= SPEND_LOG_MAX_BYTES) return
    const lines = readFileSync(file, 'utf8').split('\n').filter(Boolean).slice(-SPEND_LOG_KEEP_LINES)
    writeFileSync(file, `${lines.join('\n')}\n`, { mode: 0o600 })
  } catch {
    // A log that cannot be trimmed must not fail a paid session.
  }
}

export function readSpendLog(keyDir: string): SpendEntry[] {
  try {
    return readFileSync(spendLogPath(keyDir), 'utf8')
      .split('\n')
      .filter(line => line !== '')
      .map(line => JSON.parse(line) as SpendEntry)
      .filter(entry => typeof entry.at === 'number' && typeof entry.micro === 'string')
  } catch {
    return []
  }
}

export type SpendSummary = {
  /** micro-USDC spent in the current policy window */
  period: string
  lifetime: string
  total: string
  today: string
  week: string
  month: string
  /** models, heaviest first */
  byModel: Array<{ model: string; count: number; total: string; min: string; max: string; avg: string }>
  /** newest first */
  recent: SpendEntry[]
}

/** Windows are computed from the log; `total` is the policy's own lifetime
 *  counter so a rotated log can never make the number go down. */
export function summarizeSpend(policy: SpendPolicy, entries: SpendEntry[], now: number = Date.now()): SpendSummary {
  const today = periodStart('daily', now)
  const week = periodStart('weekly', now)
  const month = periodStart('monthly', now)
  const sums = { today: 0n, week: 0n, month: 0n }
  const models = new Map<string, { count: number; total: bigint; min: bigint; max: bigint }>()

  for (const entry of entries) {
    const micro = BigInt(entry.micro)

    if (entry.at >= today) sums.today += micro
    if (entry.at >= week) sums.week += micro
    if (entry.at >= month) sums.month += micro

    const key = entry.model ?? '(unknown)'
    const row = models.get(key) ?? { count: 0, total: 0n, min: micro, max: micro }
    row.count += 1
    row.total += micro
    if (micro < row.min) row.min = micro
    if (micro > row.max) row.max = micro
    models.set(key, row)
  }

  return {
    period: policy.periodSpentMicro.toString(),
    lifetime: policy.lifetimeSpentMicro.toString(),
    total: policy.lifetimeSpentMicro.toString(),
    today: sums.today.toString(),
    week: sums.week.toString(),
    month: sums.month.toString(),
    byModel: [...models.entries()]
      .map(([model, row]) => ({
        model,
        count: row.count,
        total: row.total.toString(),
        min: row.min.toString(),
        max: row.max.toString(),
        avg: (row.total / BigInt(row.count)).toString(),
      }))
      .sort((a, b) => (BigInt(b.total) > BigInt(a.total) ? 1 : -1)),
    recent: [...entries].sort((a, b) => b.at - a.at).slice(0, 20),
  }
}

/** The JSON on disk: mirror image of `SpendPolicy`, in decimal strings. */
export function policyToWire(policy: SpendPolicy): Record<string, unknown> {
  return {
    version: 1,
    name: policy.name,
    enabled: policy.enabled,
    expiresAt: policy.expiresAt,
    creditLimitMicro: policy.creditLimitMicro?.toString() ?? null,
    reset: policy.reset,
    perSessionMicro: policy.perSessionMicro?.toString() ?? null,
    maxPricePerHourMicro: policy.maxPricePerHourMicro?.toString() ?? null,
    periodStartedAt: policy.periodStartedAt,
    periodSpentMicro: policy.periodSpentMicro.toString(),
    lifetimeSpentMicro: policy.lifetimeSpentMicro.toString(),
    pending: policy.pending,
  }
}

/** Never let a hand-edited file inject a negative limit, an unknown cadence or
 *  a reservation that is not a reservation. */
export function sanitizeSpendPolicy(value: unknown, now: number = Date.now()): SpendPolicy {
  const raw = value as Record<string, unknown> | null
  const fallback = defaultSpendPolicy(now)

  if (raw == null) return fallback

  const micro = (input: unknown): bigint | null => {
    if (input == null) return null
    const text = String(input).trim()

    if (!/^\d+$/.test(text)) return null

    return BigInt(text)
  }

  const pending: PendingSpend[] = []

  if (Array.isArray(raw.pending)) {
    for (const item of raw.pending) {
      const entry = item as Partial<PendingSpend> | null

      if (entry == null || typeof entry.id !== 'string' || entry.id === '') continue
      if (typeof entry.micro !== 'string' || !/^\d+$/.test(entry.micro)) continue
      if (typeof entry.at !== 'number' || !Number.isFinite(entry.at)) continue
      pending.push({
        id: entry.id,
        micro: entry.micro,
        at: entry.at,
        ...(typeof entry.model === 'string' ? { model: entry.model } : {}),
      })
    }
  }

  const name = typeof raw.name === 'string' && raw.name.trim() !== ''
    ? raw.name.trim().slice(0, 40)
    : fallback.name

  return {
    version: 1,
    name,
    enabled: raw.enabled !== false,
    expiresAt: typeof raw.expiresAt === 'number' && Number.isFinite(raw.expiresAt) ? raw.expiresAt : null,
    creditLimitMicro: micro(raw.creditLimitMicro),
    reset: SPEND_RESETS.includes(raw.reset as SpendReset) ? raw.reset as SpendReset : 'never',
    perSessionMicro: micro(raw.perSessionMicro),
    maxPricePerHourMicro: micro(raw.maxPricePerHourMicro),
    periodStartedAt: typeof raw.periodStartedAt === 'number' && Number.isFinite(raw.periodStartedAt)
      ? raw.periodStartedAt
      : now,
    periodSpentMicro: micro(raw.periodSpentMicro) ?? 0n,
    lifetimeSpentMicro: micro(raw.lifetimeSpentMicro) ?? 0n,
    pending,
  }
}
