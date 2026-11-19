import assert from 'node:assert/strict'
import { test } from 'node:test'

import { filterOffers, fromWire, modelKeyOf, toWire, type Offer } from './offer.ts'

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

test('a model key names one (worker, model) pair, not one model name', () => {
  const a = modelKeyOf('wallet-a', 'llama3.2:1b')
  const b = modelKeyOf('wallet-b', 'llama3.2:1b')

  assert.notEqual(a, b)
  assert.match(a, /^gk\.[0-9a-f]{8}\.llama3\.2:1b$/)
  // Stable across calls: the picker sends this id back on every request.
  assert.equal(a, modelKeyOf('wallet-a', 'llama3.2:1b'))
})

test('the filter query also matches the worker name and wallet', () => {
  const rows: Offer[] = [
    { ...base, workerName: 'Alice GPU', model: 'qwen3', pricePerHour: 2_000_000n },
    { ...base, workerName: 'bob', model: 'llama3', pricePerHour: 5_000_000n, workerWallet: 'BobWallet111' },
  ]

  assert.deepEqual(filterOffers(rows, { query: 'alice' }).map(o => o.workerName), ['Alice GPU'])
  assert.deepEqual(filterOffers(rows, { query: 'bobwallet' }).map(o => o.workerName), ['bob'])
  assert.deepEqual(filterOffers(rows, { maxPricePerHour: 3_000_000n }).map(o => o.model), ['qwen3'])
})
