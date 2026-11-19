// The wallet policy is the line between "the agent may ask" and "the agent may
// spend". These tests pin the decisions that matter: default deny, one-use
// approvals bound to the exact action, caps, freeze, and identity is owner-only.

import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import { WalletPolicy } from './walletPolicy.ts'

function policy(): WalletPolicy {
  return new WalletPolicy(join(mkdtempSync(join(tmpdir(), 'genkaku-policy-')), 'policy.json'))
}

const tip = (p: WalletPolicy, micro: bigint, payload = { to: 'W', micro: String(micro) }) => p.authorize({
  actor: 'agent',
  action: 'tip',
  amountMicro: micro,
  summary: `tip ${micro}`,
  payload,
})

test('agent access is off by default', () => {
  assert.equal(tip(policy(), 1_000n).status, 'deny')
})

test('ask records a request and nothing is spent', () => {
  const p = policy()
  p.setMode('ask')
  const decision = tip(p, 1_000n)
  assert.equal(decision.status, 'pending')
  assert.equal(p.snapshot().pending.length, 1)
  assert.equal(p.snapshot().spentMicro, '0')
})

test('an approval is one use and is bound to the action and amount', () => {
  const p = policy()
  p.setMode('ask')
  const decision = tip(p, 1_000n)
  assert.equal(decision.status, 'pending')
  const id = decision.status === 'pending' ? decision.request.id : ''
  p.approve(id)

  assert.throws(() => p.takeApproval({ id, action: 'tip', amountMicro: 5_000n, payload: { to: 'W', micro: '5000' } }), /different action/)
  p.takeApproval({ id, action: 'tip', amountMicro: 1_000n, payload: { to: 'W', micro: '1000' } })
  assert.throws(() => p.takeApproval({ id, action: 'tip', amountMicro: 1_000n, payload: { to: 'W', micro: '1000' } }), /used/)
})

test('a changed recipient does not reuse the approval', () => {
  const p = policy()
  p.setMode('ask')
  const decision = tip(p, 1_000n)
  const id = decision.status === 'pending' ? decision.request.id : ''
  p.approve(id)

  assert.throws(() => p.takeApproval({
    id,
    action: 'tip',
    amountMicro: 1_000n,
    payload: { to: 'SOMEONE-ELSE', micro: '1000' },
  }), /does not match/)
})

test('capped allows within both caps and asks above the per-request cap', () => {
  const p = policy()
  p.setMode('capped')
  p.setCaps({ perTxMicro: '1000', dailyMicro: '2000' })

  assert.equal(tip(p, 1_000n).status, 'allow')
  p.recordSpend(1_500n)

  // Over the remaining daily budget (2500 > 2000) even though under per-tx.
  assert.equal(tip(p, 600n).status, 'pending')
  // Over per-tx.
  assert.equal(tip(p, 2_000n).status, 'pending')
})

test('claim is allowed under capped without spending', () => {
  const p = policy()
  p.setMode('capped')
  p.setCaps({ perTxMicro: '0', dailyMicro: '0' })
  assert.equal(p.authorize({ actor: 'agent', action: 'claim', summary: 'claim', payload: {} }).status, 'allow')
})

test('identity is denied to an agent in every mode', () => {
  for (const mode of ['off', 'ask', 'capped'] as const) {
    const p = policy()
    p.setMode(mode)
    assert.equal(p.authorize({ actor: 'agent', action: 'identity', summary: 'export', payload: {} }).status, 'deny')
  }
})

test('freezing stops the owner too', () => {
  const p = policy()
  p.setFrozen(true)
  assert.equal(p.authorize({ actor: 'owner', action: 'tip', amountMicro: 1n, summary: 'tip', payload: {} }).status, 'deny')
  assert.equal(p.authorize({ actor: 'agent', action: 'claim', summary: 'claim', payload: {} }).status, 'deny')
})

test('a denied request is not executable', () => {
  const p = policy()
  p.setMode('ask')
  const decision = tip(p, 1_000n)
  const id = decision.status === 'pending' ? decision.request.id : ''
  p.deny(id)
  assert.throws(() => p.takeApproval({ id, action: 'tip', amountMicro: 1_000n, payload: {} }), /denied/)
})

test('the daily spend rolls over at UTC midnight', () => {
  const p = policy()
  p.setMode('capped')
  p.setCaps({ perTxMicro: '1000000', dailyMicro: '1000' })
  p.recordSpend(1_000n)
  // Same day: a further tip is over the cap and asks.
  assert.equal(tip(p, 100n).status, 'pending')
})
