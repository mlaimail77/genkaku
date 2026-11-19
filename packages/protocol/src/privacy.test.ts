import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  accessFor,
  addPairedUser,
  consumePairing,
  createPendingPairing,
  decodePairingToken,
  emptyPrivacy,
  encodePairingToken,
  pairingHash,
  setDisplayName,
  setVisibility,
  tokenAddrs,
  type PairingToken,
} from './privacy.ts'

const WALLET_A = '3Pcte9nfiVdAx1zkGx2BZP557L22JerWEcMp1YneT3iS'
const WALLET_B = 'D2TtZsuyFz6wCyg5H9tsRibiJNFbcfcDNoQ99EP67RUu'
const PEER = '12D3KooWJ9mVZ7uXbP9zQm3vKk2iC8sY5oR7tN4bH6aL1dF3gE2h'

test('a pairing code is shown once and keeps only its hash on disk', () => {
  const created = createPendingPairing(emptyPrivacy(), { now: 1000 })
  const state = JSON.stringify(created.state)

  assert.equal(created.state.pending.length, 1)
  assert.equal(created.state.pending[0]!.hash, pairingHash(created.secret))
  assert.ok(!state.includes(created.secret), 'the raw secret must never be persisted')
})

test('a code pairs exactly one wallet, and retrying from that wallet is idempotent', () => {
  const created = createPendingPairing(emptyPrivacy(), { now: 1000 })
  const first = consumePairing(created.state, created.secret, WALLET_A, 2000)

  assert.equal(first.result.ok, true)
  if (!first.result.ok) return
  assert.equal(first.result.replayed, false)

  const retry = consumePairing(first.state, created.secret, WALLET_A, 3000)
  assert.equal(retry.result.ok, true)
  if (retry.result.ok) assert.equal(retry.result.replayed, true)

  const stolen = consumePairing(first.state, created.secret, WALLET_B, 3000)
  assert.equal(stolen.result.ok, false)
  if (!stolen.result.ok) assert.equal(stolen.result.code, 'used-code')
})

test('expired and unknown codes are refused with a reason', () => {
  const created = createPendingPairing(emptyPrivacy(), { now: 1000, ttlMs: 10 })

  const expired = consumePairing(created.state, created.secret, WALLET_A, 2000)
  assert.equal(expired.result.ok, false)
  if (!expired.result.ok) assert.equal(expired.result.code, 'expired-code')

  const unknown = consumePairing(created.state, 'not-a-real-secret', WALLET_A, 1010)
  assert.equal(unknown.result.ok, false)
  if (!unknown.result.ok) assert.equal(unknown.result.code, 'unknown-code')
})

test('accessFor gates private workers on the wallet behind the peer id', () => {
  const publicState = emptyPrivacy()
  assert.deepEqual(accessFor(publicState)(PEER), { ok: true })

  const privateState = addPairedUser(setVisibility(publicState, 'private'), { wallet: WALLET_A })
  // A peer id that is not an ed25519 wallet is never allowed while private.
  const refused = accessFor(privateState)(PEER)
  assert.equal(refused.ok, false)
  if (!refused.ok) assert.equal(refused.code, 'pair-required')
})

test('the pairing token round trips and expires', () => {
  const token: PairingToken = {
    v: 1,
    id: 'abc123',
    peerId: PEER,
    wallet: WALLET_A,
    name: 'alice-gpu',
    addrs: ['/ip4/192.168.1.4/tcp/4001'],
    relay: ['/ip4/35.234.31.54/tcp/4001/p2p/12D3KooSeed'],
    secret: 'secret-value',
    exp: 10_000,
  }

  const decoded = decodePairingToken(encodePairingToken(token), 5_000)
  assert.deepEqual(decoded, token)

  assert.throws(() => decodePairingToken(encodePairingToken(token), 20_000), /expired/)
  assert.throws(() => decodePairingToken('not-a-code'), /not a GenKaKu pairing code/)
})

test('tokenAddrs keeps direct addresses first and builds a circuit from a relay hop', () => {
  const token: PairingToken = {
    v: 1,
    id: 'abc',
    peerId: PEER,
    wallet: WALLET_A,
    name: 'w',
    addrs: ['/ip4/192.168.1.4/tcp/4001'],
    relay: ['/ip4/35.234.31.54/tcp/4001/p2p/12D3KooSeed'],
    secret: 's',
    exp: 9_999_999_999_999,
  }

  const addrs = tokenAddrs(token, ['/ip4/35.234.31.54/tcp/4001/p2p/12D3KooSeed'])
  assert.deepEqual(addrs, [
    '/ip4/192.168.1.4/tcp/4001',
    // A circuit address names the relay's peer id before `p2p-circuit`, then
    // the worker it forwards to.
    `/ip4/35.234.31.54/tcp/4001/p2p/12D3KooSeed/p2p-circuit/p2p/${PEER}`,
  ])
})

test('the display name is trimmed and capped, and an empty one clears it', () => {
  const named = setDisplayName(emptyPrivacy(), '  Alice GPU  ')
  assert.equal(named.displayName, 'Alice GPU')

  const long = setDisplayName(emptyPrivacy(), 'x'.repeat(200))
  assert.equal(long.displayName?.length, 48)

  assert.equal(setDisplayName(named, '   ').displayName, undefined)
})
