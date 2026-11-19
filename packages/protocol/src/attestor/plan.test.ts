import assert from 'node:assert/strict'
import { test } from 'node:test'

import { emptyLedger, plan, record, type DayReport, type TipsForWorker } from './plan.ts'
import { evidenceRoot, verifyRoot } from './merkle.ts'

const report = (
  workers: Record<string, number>,
  campaign = 'C1',
): DayReport => ({
  day: '2026-11-18',
  campaigns: [{ campaign, ratePerMinuteMicro: '5000', workers }],
})

const rootOf = (lines: string[]): Uint8Array => evidenceRoot(lines)

test('the first run books everything the report claims', () => {
  const result = plan({
    report: report({ W1: 12, W2: 3 }),
    ledger: emptyLedger('2026-11-18'),
    tips: new Map(),
    rootOf,
  })

  assert.deepEqual(result.accruals.map(a => [a.campaign, a.wallet, a.minutes]), [['C1', 'W1', 12], ['C1', 'W2', 3]])
})

test('a second run books only the delta, so a day can be re-run safely', () => {
  const first = plan({
    report: report({ W1: 10 }),
    ledger: emptyLedger('2026-11-18'),
    tips: new Map(),
    rootOf,
  })
  assert.deepEqual(first.accruals.map(a => a.minutes), [10])

  const ledger = record(emptyLedger('2026-11-18'), { campaign: 'C1', wallet: 'W1', minutes: 10, nonce: 1 })
  assert.equal(ledger.accrued['C1:W1'], 10)

  const rest = plan({
    report: report({ W1: 25 }),
    ledger,
    tips: new Map(),
    rootOf,
  })
  assert.deepEqual(rest.accruals.map(a => a.minutes), [15])

  const nothing = plan({
    report: report({ W1: 25 }),
    ledger: record(ledger, { campaign: 'C1', wallet: 'W1', minutes: 15, nonce: 2 }),
    tips: new Map(),
    rootOf,
  })
  assert.deepEqual(nothing.accruals, [])
})

test('a wallet with no Worker account is reported instead of failing the day', () => {
  const result = plan({
    report: report({ W1: 4, W9: 2 }),
    ledger: emptyLedger('2026-11-18'),
    tips: new Map(),
    registered: new Set(['W1']),
    rootOf,
  })

  assert.deepEqual(result.accruals.map(a => a.wallet), ['W1'])
  assert.deepEqual(result.unregistered, ['W9'])
})

test('a report that shrank is reported, never silently settled', () => {
  const ledger = record(emptyLedger('2026-11-18'), { campaign: 'C1', wallet: 'W1', minutes: 20 })

  const result = plan({
    report: report({ W1: 12 }),
    ledger,
    tips: new Map(),
    rootOf,
  })

  assert.deepEqual(result.accruals, [])
  assert.equal(result.skipped.length, 1)
  assert.match(result.skipped[0]!.reason, /shrank/)
})

test('a day longer than the per-call limit is split into several accruals', () => {
  const result = plan({
    report: report({ W1: 2_000 }),
    ledger: emptyLedger('2026-11-18'),
    tips: new Map(),
    rootOf,
  })

  assert.deepEqual(result.accruals.map(a => a.minutes), [1_440, 560])
  assert.equal(result.accruals.reduce((n, a) => n + a.minutes, 0), 2_000)
})

test('a worker with minutes gets an attestation, and one with nothing does not', () => {
  const result = plan({
    report: report({ W1: 5 }),
    ledger: emptyLedger('2026-11-18'),
    tips: new Map(),
    rootOf,
  })

  assert.deepEqual(result.attestations.map(a => [a.wallet, a.minutes]), [['W1', 5]])
  assert.equal(result.attestations[0]!.nonce, 1)
})

test('tips alone earn an attestation even with no sponsored minutes', () => {
  const tips = new Map<string, TipsForWorker>([
    ['W2', { totalMicro: 1_500_000n, count: 2, distinctTippers: 2 }],
  ])

  const result = plan({
    report: report({}),
    ledger: emptyLedger('2026-11-18'),
    tips,
    rootOf,
  })

  assert.deepEqual(result.accruals, [])
  assert.equal(result.attestations.length, 1)
  assert.equal(result.attestations[0]!.wallet, 'W2')
  assert.equal(result.attestations[0]!.tipMicro, 1_500_000n)
})

test('a worker with neither minutes nor tips is left alone', () => {
  const result = plan({
    report: report({ W3: 0 }),
    ledger: emptyLedger('2026-11-18'),
    tips: new Map(),
    rootOf,
  })

  assert.deepEqual(result.attestations, [])
})

test('the nonce advances across runs and is never reused', () => {
  const ledger = record(emptyLedger('2026-11-18'), { campaign: 'C1', wallet: 'W1', minutes: 5, nonce: 7 })

  const result = plan({
    report: report({ W1: 6 }),
    ledger,
    tips: new Map(),
    rootOf,
  })

  assert.equal(result.attestations[0]!.nonce, 8)
})

test('a report for another day is refused rather than settled under the wrong date', () => {
  assert.throws(() => plan({
    report: { ...report({ W1: 1 }), day: '2026-11-17' },
    ledger: emptyLedger('2026-11-18'),
    tips: new Map(),
    rootOf,
  }), /does not match/)
})

test('one worker paid by two campaigns gets two accruals and one reputation row', () => {
  const result = plan({
    report: {
      day: '2026-11-18',
      campaigns: [
        { campaign: 'C1', ratePerMinuteMicro: '5000', workers: { W1: 4 } },
        { campaign: 'C2', ratePerMinuteMicro: '10000', workers: { W1: 6, W2: 1 } },
      ],
    },
    ledger: emptyLedger('2026-11-18'),
    tips: new Map(),
    rootOf,
  })

  assert.deepEqual(
    result.accruals.map(a => [a.campaign, a.wallet, a.minutes]).sort(),
    [['C1', 'W1', 4], ['C2', 'W1', 6], ['C2', 'W2', 1]],
  )
  // Reputation is a wallet-level fact: 4 + 6 minutes, not 10 in one campaign.
  const w1 = result.attestations.find(a => a.wallet === 'W1')
  assert.equal(w1?.minutes, 10)
})

test('a campaign settled last run does not book its minutes twice', () => {
  const ledger = record(emptyLedger('2026-11-18'), { campaign: 'C1', wallet: 'W1', minutes: 7, nonce: 1 })
  const result = plan({
    report: {
      day: '2026-11-18',
      campaigns: [
        { campaign: 'C1', ratePerMinuteMicro: '5000', workers: { W1: 7 } },
        { campaign: 'C2', ratePerMinuteMicro: '5000', workers: { W1: 2 } },
      ],
    },
    ledger,
    tips: new Map(),
    rootOf,
  })

  assert.deepEqual(result.accruals.map(a => [a.campaign, a.minutes]), [['C2', 2]])
})

test('a paused campaign is skipped rather than failing the whole day', () => {
  const result = plan({
    report: report({ W1: 3 }, 'C1'),
    ledger: emptyLedger('2026-11-18'),
    tips: new Map(),
    paused: new Set(['C1']),
    rootOf,
  })

  assert.deepEqual(result.accruals, [])
  assert.match(result.skipped[0]!.reason, /paused/)
})

test('the evidence root is deterministic and order-independent', () => {
  const a = evidenceRoot(['day:1', 'worker:W1', 'minutes:5'])
  const b = evidenceRoot(['minutes:5', 'day:1', 'worker:W1'])
  assert.equal(Buffer.compare(Buffer.from(a), Buffer.from(b)), 0)
  assert.equal(verifyRoot(['minutes:5', 'day:1', 'worker:W1'], a), true)
})

test('a changed number changes the root', () => {
  const before = evidenceRoot(['day:1', 'minutes:5'])
  const after = evidenceRoot(['day:1', 'minutes:6'])
  assert.notEqual(Buffer.compare(Buffer.from(before), Buffer.from(after)), 0)
})

test('no evidence is a zero root, not a hash of nothing', () => {
  assert.deepEqual(evidenceRoot([]), new Uint8Array(32))
})
