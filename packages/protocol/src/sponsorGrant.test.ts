import assert from 'node:assert/strict'
import { test } from 'node:test'

import { Keypair } from '@solana/web3.js'

import {
  GRANT_TTL_MS,
  checkGrant,
  decodeGrant,
  grantCanonical,
  signGrant,
  type SponsorGrant,
} from './sponsorGrant.ts'

const service = Keypair.generate()
const other = Keypair.generate()
const now = 1_800_000_000_000

function grant(overrides: Partial<SponsorGrant> = {}): SponsorGrant {
  return {
    worker: 'WorkerWallet111',
    model: 'llama3.2:3b',
    priceMicro: '5000',
    day: 20_833,
    exp: now + GRANT_TTL_MS,
    ...overrides,
  }
}

test('a grant signed by the service passes for the right session', () => {
  const wire = signGrant(service, grant())
  const verdict = checkGrant({
    wire,
    serviceKey: service.publicKey.toBase58(),
    worker: 'WorkerWallet111',
    model: 'llama3.2:3b',
    priceMicro: 5_000n,
    now,
  })

  assert.equal(verdict.ok, true)
})

test('a grant for another wallet is refused', () => {
  const wire = signGrant(service, grant({ worker: 'SomeoneElse' }))
  const verdict = checkGrant({
    wire,
    serviceKey: service.publicKey.toBase58(),
    worker: 'WorkerWallet111',
    model: 'llama3.2:3b',
    priceMicro: 5_000n,
    now,
  })

  assert.equal(verdict.ok, false)
  assert.equal(verdict.ok === false && verdict.code, 'grant-wrong-worker')
})

test('a grant for another model is refused, so it cannot be replayed across listings', () => {
  const wire = signGrant(service, grant({ model: 'qwen2:0.5b' }))
  const verdict = checkGrant({
    wire,
    serviceKey: service.publicKey.toBase58(),
    worker: 'WorkerWallet111',
    model: 'llama3.2:3b',
    priceMicro: 5_000n,
    now,
  })

  assert.equal(verdict.ok === false && verdict.code, 'grant-wrong-model')
})

test('an expired grant is refused even when the signature is good', () => {
  const wire = signGrant(service, grant({ exp: now - 1 }))
  const verdict = checkGrant({
    wire,
    serviceKey: service.publicKey.toBase58(),
    worker: 'WorkerWallet111',
    model: 'llama3.2:3b',
    priceMicro: 5_000n,
    now,
  })

  assert.equal(verdict.ok === false && verdict.code, 'grant-expired')
})

test('a grant for a cheaper price than the listing is refused', () => {
  const wire = signGrant(service, grant({ priceMicro: '4000' }))
  const verdict = checkGrant({
    wire,
    serviceKey: service.publicKey.toBase58(),
    worker: 'WorkerWallet111',
    model: 'llama3.2:3b',
    priceMicro: 5_000n,
    now,
  })

  assert.equal(verdict.ok === false && verdict.code, 'grant-price-too-high')
})

test('a grant signed by anyone else is refused', () => {
  const wire = signGrant(other, grant())
  const verdict = checkGrant({
    wire,
    serviceKey: service.publicKey.toBase58(),
    worker: 'WorkerWallet111',
    model: 'llama3.2:3b',
    priceMicro: 5_000n,
    now,
  })

  assert.equal(verdict.ok === false && verdict.code, 'grant-bad-signature')
})

test('a tampered payload fails the signature rather than parsing into trust', () => {
  const wire = signGrant(service, grant())
  const payload = Buffer.from(
    JSON.stringify({ ...grant(), exp: grant().exp + 86_400_000 }),
    'utf8',
  ).toString('base64')

  const verdict = checkGrant({
    wire: { payload, sig: wire.sig },
    serviceKey: service.publicKey.toBase58(),
    worker: 'WorkerWallet111',
    model: 'llama3.2:3b',
    priceMicro: 5_000n,
    now,
  })

  assert.equal(verdict.ok === false && verdict.code, 'grant-bad-signature')
})

test('no grant at all is a refusal, not a crash', () => {
  const verdict = checkGrant({
    wire: null,
    serviceKey: service.publicKey.toBase58(),
    worker: 'W',
    model: 'm',
    priceMicro: 1n,
    now,
  })

  assert.equal(verdict.ok === false && verdict.code, 'grant-malformed')
})

test('garbage in the payload is a refusal, not an exception', () => {
  const verdict = checkGrant({
    wire: { payload: Buffer.from('not json').toString('base64'), sig: 'x' },
    serviceKey: service.publicKey.toBase58(),
    worker: 'W',
    model: 'm',
    priceMicro: 1n,
    now,
  })

  assert.equal(verdict.ok === false && verdict.code, 'grant-malformed')
})

test('the canonical bytes are stable: both sides hash the same string', () => {
  const one = grantCanonical(grant())
  const two = grantCanonical(grant())

  assert.equal(one, two)
  assert.match(one, /^genkaku:grant:1\nworker:WorkerWallet111\nmodel:llama3\.2:3b\n/)
})

test('the wire round-trips through base64 without losing a field', () => {
  const wire = signGrant(service, grant())
  assert.deepEqual(decodeGrant(wire), grant())
})
