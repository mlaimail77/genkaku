import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import {
  DEFAULT_CREDIT_LIMIT,
  DEFAULT_PER_SESSION,
  MICRO_USDC,
  STALE_PENDING_MS,
  appendSpend,
  commit,
  committedMicro,
  defaultSpendPolicy,
  deleteSpendPolicy,
  formatMicro,
  parseUsdc,
  patchSpendPolicy,
  periodStart,
  readSpendLog,
  readSpendPolicy,
  recoverStalePending,
  release,
  remainingMicro,
  reserve,
  rollPeriod,
  sanitizeSpendPolicy,
  spendVerdict,
  summarizeSpend,
  writeSpendPolicy,
  type SpendEntry,
  type SpendVerdict,
} from './policy.ts'

const now = (iso: string): number => Date.parse(iso)
const reason = (verdict: SpendVerdict): string => (verdict.ok ? 'ok' : verdict.code)

test('a fresh policy is on, ten dollars total, two dollars a session', () => {
  const policy = defaultSpendPolicy(now('2026-11-16T12:00:00Z'))

  assert.equal(policy.enabled, true)
  assert.equal(policy.creditLimitMicro, DEFAULT_CREDIT_LIMIT)
  assert.equal(policy.perSessionMicro, DEFAULT_PER_SESSION)
  assert.equal(policy.reset, 'never')
  assert.equal(policy.maxPricePerHourMicro, null)
  assert.equal(policy.lifetimeSpentMicro, 0n)
})

test('USDC amounts parse to micro units and blank means no limit', () => {
  assert.equal(parseUsdc('10'), 10n * MICRO_USDC)
  assert.equal(parseUsdc('$0.003'), 3000n)
  assert.equal(parseUsdc('1.5'), 1_500_000n)
  assert.equal(parseUsdc(''), null)
  assert.equal(parseUsdc(null), null)
  assert.throws(() => parseUsdc('ten'))
  assert.throws(() => parseUsdc('1.1234567'))
})

test('micro units format without trailing zeros', () => {
  assert.equal(formatMicro(10n * MICRO_USDC), '10')
  assert.equal(formatMicro(3000n), '0.003')
  assert.equal(formatMicro(1_500_000n), '1.5')
  assert.equal(formatMicro(0n), '0')
})

test('reset windows start at UTC midnight, Monday and the first', () => {
  const sunday = now('2026-11-15T23:30:00Z')

  assert.equal(periodStart('daily', sunday), now('2026-11-15T00:00:00Z'))
  assert.equal(periodStart('weekly', sunday), now('2026-11-09T00:00:00Z'))
  assert.equal(periodStart('monthly', sunday), now('2026-11-01T00:00:00Z'))
  assert.equal(periodStart('weekly', now('2026-11-16T00:00:00Z')), now('2026-11-16T00:00:00Z'))
  assert.equal(periodStart('monthly', now('2027-01-02T00:00:00Z')), now('2027-01-01T00:00:00Z'))
})

test('the period rolls once and only when the cadence says so', () => {
  const policy: ReturnType<typeof defaultSpendPolicy> = {
    ...defaultSpendPolicy(now('2026-11-16T08:00:00Z')),
    reset: 'daily',
    periodStartedAt: now('2026-11-16T00:00:00Z'),
    periodSpentMicro: 5n * MICRO_USDC,
    lifetimeSpentMicro: 5n * MICRO_USDC,
  }

  assert.equal(rollPeriod(policy, now('2026-11-16T23:00:00Z')).periodSpentMicro, 5n * MICRO_USDC)

  const rolled = rollPeriod(policy, now('2026-11-17T00:00:01Z'))
  assert.equal(rolled.periodSpentMicro, 0n)
  assert.equal(rolled.periodStartedAt, now('2026-11-17T00:00:00Z'))
  assert.equal(rolled.lifetimeSpentMicro, 5n * MICRO_USDC)

  // "never" keeps the window forever.
  const never = rollPeriod({ ...policy, reset: 'never' }, now('2030-01-01T00:00:00Z'))
  assert.equal(never.periodSpentMicro, 5n * MICRO_USDC)
})

test('a disabled or expired policy refuses paid sessions', () => {
  const t = now('2026-11-16T12:00:00Z')
  const base = defaultSpendPolicy(t)
  const args = { deposit: 1n * MICRO_USDC, pricePerHour: 6n * MICRO_USDC, now: t }

  assert.equal(spendVerdict(base, args).ok, true)
  assert.equal(reason(spendVerdict({ ...base, enabled: false }, args)), 'policy_disabled')
  assert.equal(reason(spendVerdict({ ...base, expiresAt: t - 1 }, args)), 'policy_expired')
  assert.equal(spendVerdict({ ...base, expiresAt: t + 1000 }, args).ok, true)
})

test('the price cap and the per-session cap are separate refusals', () => {
  const t = now('2026-11-16T12:00:00Z')
  const base = { ...defaultSpendPolicy(t), maxPricePerHourMicro: 5n * MICRO_USDC }

  assert.equal(spendVerdict(base, { deposit: MICRO_USDC, pricePerHour: 5n * MICRO_USDC, now: t }).ok, true)
  assert.equal(
    reason(spendVerdict(base, { deposit: MICRO_USDC, pricePerHour: 6n * MICRO_USDC, now: t })),
    'price_cap',
  )

  const capped = { ...defaultSpendPolicy(t), perSessionMicro: 2n * MICRO_USDC }
  assert.equal(spendVerdict(capped, { deposit: 2n * MICRO_USDC, pricePerHour: 1n, now: t }).ok, true)
  assert.equal(
    reason(spendVerdict(capped, { deposit: 3n * MICRO_USDC, pricePerHour: 1n, now: t })),
    'session_cap',
  )
})

test('the budget counts committed spend and in-flight reservations', () => {
  const t = now('2026-11-16T12:00:00Z')
  let policy: ReturnType<typeof defaultSpendPolicy> = {
    ...defaultSpendPolicy(t),
    creditLimitMicro: 10n * MICRO_USDC,
    perSessionMicro: null,
  }

  const first = reserve(policy, { deposit: 6n * MICRO_USDC, now: t, id: 'a' })
  policy = commit(first.policy, first.id, 6n * MICRO_USDC)

  assert.equal(committedMicro(policy), 6n * MICRO_USDC)
  assert.equal(remainingMicro(policy), 4n * MICRO_USDC)

  // A second session that would prepay 6 is refused while only 4 is left.
  assert.equal(
    reason(spendVerdict(policy, { deposit: 6n * MICRO_USDC, pricePerHour: 1n, now: t })),
    'budget_exhausted',
  )

  // But 4 fits, and while it is in flight the next 1 does not.
  const second = reserve(policy, { deposit: 4n * MICRO_USDC, now: t, id: 'b' })
  assert.equal(spendVerdict(second.policy, { deposit: MICRO_USDC, pricePerHour: 1n, now: t }).ok, false)

  // Releasing (refund) frees the space again.
  const released = release(second.policy, second.id)
  assert.equal(remainingMicro(released), 4n * MICRO_USDC)
  assert.equal(spendVerdict(released, { deposit: 4n * MICRO_USDC, pricePerHour: 1n, now: t }).ok, true)
})

test('committing an unknown reservation never double-counts', () => {
  const policy = { ...defaultSpendPolicy(), periodSpentMicro: MICRO_USDC }
  assert.equal(commit(policy, 'nope', 5n * MICRO_USDC).periodSpentMicro, MICRO_USDC)
})

test('no limit means no refusal and no remainder', () => {
  const t = now('2026-11-16T12:00:00Z')
  const policy = { ...defaultSpendPolicy(t), creditLimitMicro: null, perSessionMicro: null }

  assert.equal(remainingMicro(policy), null)
  assert.equal(spendVerdict(policy, { deposit: 90n * MICRO_USDC, pricePerHour: 1n, now: t }).ok, true)
})

test('a stale reservation becomes spend, a fresh one keeps counting as pending', () => {
  const t = now('2026-11-16T12:00:00Z')
  const policy = {
    ...defaultSpendPolicy(t),
    pending: [
      { id: 'old', micro: (2n * MICRO_USDC).toString(), at: t - STALE_PENDING_MS - 1000 },
      { id: 'new', micro: (3n * MICRO_USDC).toString(), at: t - 1000 },
    ],
  }

  const recovered = recoverStalePending(policy, t)
  assert.deepEqual(recovered.pending.map(entry => entry.id), ['new'])
  assert.equal(recovered.periodSpentMicro, 2n * MICRO_USDC)
  assert.equal(recovered.lifetimeSpentMicro, 2n * MICRO_USDC)
})

test('switching the reset cadence starts a clean window', () => {
  const t = now('2026-11-16T12:00:00Z')
  const policy = { ...defaultSpendPolicy(t), periodSpentMicro: 3n * MICRO_USDC }
  const next = patchSpendPolicy(policy, { reset: 'monthly' }, t)

  assert.equal(next.reset, 'monthly')
  assert.equal(next.periodSpentMicro, 0n)
  assert.equal(next.periodStartedAt, now('2026-11-01T00:00:00Z'))
})

test('a hand-edited file cannot inject negative limits or a fake cadence', () => {
  const policy = sanitizeSpendPolicy({
    name: '  ',
    enabled: 'yes',
    creditLimitMicro: '-5',
    reset: 'hourly',
    perSessionMicro: 'abc',
    periodSpentMicro: '12',
    pending: [{ id: 'x', micro: '3', at: 1000 }, { id: '', micro: '9', at: 1000 }, null],
  })

  assert.equal(policy.name, 'everyday')
  assert.equal(policy.enabled, true)
  assert.equal(policy.creditLimitMicro, null)
  assert.equal(policy.reset, 'never')
  assert.equal(policy.perSessionMicro, null)
  assert.equal(policy.periodSpentMicro, 12n)
  assert.equal(policy.pending.length, 1)
})

test('the summary splits today, week, month and groups by model', () => {
  const t = now('2026-11-16T12:00:00Z')
  const entries: SpendEntry[] = [
    { at: now('2026-11-16T09:00:00Z'), micro: '3000', model: 'qwen3:8b' },
    { at: now('2026-11-15T09:00:00Z'), micro: '2000', model: 'qwen3:8b' },
    { at: now('2026-11-02T09:00:00Z'), micro: '1000', model: 'llama3.2:1b' },
    { at: now('2026-10-20T09:00:00Z'), micro: '4000', model: 'llama3.2:1b' },
  ]
  const policy = { ...defaultSpendPolicy(t), lifetimeSpentMicro: 10_000n }
  const summary = summarizeSpend(policy, entries, t)

  assert.equal(summary.today, '3000')
  // 2026-11-16 is a Monday, so the week starts there and the Sunday row is last week.
  assert.equal(summary.week, '3000')
  assert.equal(summary.month, '6000')
  assert.equal(summary.total, '10000')
  assert.equal(summary.byModel[0]?.model, 'llama3.2:1b')
  assert.equal(summary.byModel[0]?.total, '5000')
  assert.equal(summary.byModel[0]?.avg, '2500')
  assert.equal(summary.recent[0]?.at, entries[0]?.at)
})

test('the policy and the spend log round-trip through the key directory', () => {
  const dir = mkdtempSync(join(tmpdir(), 'genkaku-policy-'))

  try {
    assert.equal(readSpendPolicy(dir).creditLimitMicro, DEFAULT_CREDIT_LIMIT)

    writeSpendPolicy(dir, { ...defaultSpendPolicy(), name: 'work', reset: 'weekly' })
    const read = readSpendPolicy(dir)
    assert.equal(read.name, 'work')
    assert.equal(read.reset, 'weekly')

    appendSpend(dir, { at: Date.now(), micro: '3000', model: 'qwen3:8b' })
    const log = readSpendLog(dir)
    assert.equal(log.length, 1)
    assert.equal(log[0]?.model, 'qwen3:8b')

    const defaults = deleteSpendPolicy(dir)
    assert.equal(defaults.creditLimitMicro, DEFAULT_CREDIT_LIMIT)
    assert.equal(readSpendPolicy(dir).creditLimitMicro, DEFAULT_CREDIT_LIMIT)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
