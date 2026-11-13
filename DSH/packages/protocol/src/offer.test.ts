import assert from 'node:assert/strict'
import { test } from 'node:test'

import { fromWire, toWire, type Offer } from './offer.ts'

const base: Offer = {
  proto: 'offers/1',
  workerName: 'worker-a',
  model: 'qwen3.8:27b',
  pricePerHour: 6_000_000n,
  creditScore: 80,
  sessionsServed: 3,
  capabilities: ['completion', 'tools'],
  parameterSize: '27B',
  tier: 'agent',
}

test('offers/1 survives the wire round trip', () => {
  const wire = toWire(base)
  assert.equal(wire.pricePerHour, '6000000')
  assert.deepEqual(fromWire(wire), base)
})

test('a v0 row stays v0 after decoding, so it cannot pose as capability-aware', () => {
  const v0: Offer = {
    proto: 'offers/0',
    workerName: 'old-worker',
    model: 'llama3:8b',
    pricePerHour: 1_000_000n,
    creditScore: 10,
    sessionsServed: 0,
  }
  const decoded = fromWire(toWire(v0))
  assert.equal(decoded.proto, 'offers/0')
  assert.equal(decoded.tier, undefined)
})
