import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  MAX_SELECTED_MODELS,
  emptyUserPrefs,
  patchUserPrefs,
  removePrivatePeer,
  sanitizeUserPrefs,
  type UserPrefs,
} from './userPrefs.ts'

test('the selection is capped at ten, deduplicated and order-preserving', () => {
  const keys = Array.from({ length: 25 }, (_, i) => `gk.${i.toString(16).padStart(8, '0')}.m${i}`)
  const prefs = sanitizeUserPrefs({ selected: [...keys, keys[0]!], version: 1 })

  assert.equal(prefs.selected.length, MAX_SELECTED_MODELS)
  assert.deepEqual(prefs.selected, keys.slice(0, MAX_SELECTED_MODELS))
})

test('an unknown sort key falls back to recommended', () => {
  assert.equal(sanitizeUserPrefs({ sort: 'nonsense' }).sort, 'recommended')
  assert.equal(sanitizeUserPrefs({ sort: 'workerName' }).sort, 'workerName')
})

test('editing the selection marks the list as seeded, so empty stays empty', () => {
  const fresh = emptyUserPrefs()
  assert.equal(fresh.seeded, false)

  const cleared = patchUserPrefs(patchUserPrefs(fresh, { selected: ['a'] }), { selected: [] })
  assert.deepEqual(cleared.selected, [])
  assert.equal(cleared.seeded, true)

  // A hand-edited file cannot undo the "user chose nothing" state by dropping
  // the flag: an explicit empty list survives the round trip.
  assert.deepEqual(sanitizeUserPrefs(cleared).selected, [])
})

test('changing the sort alone does not seed the selection', () => {
  const prefs = patchUserPrefs(emptyUserPrefs(), { sort: 'latencyMs' })
  assert.equal(prefs.seeded, false)
  assert.equal(prefs.sort, 'latencyMs')
})

test('private peers are deduplicated by wallet and bad rows are dropped', () => {
  const prefs = sanitizeUserPrefs({
    version: 1,
    privatePeers: [
      { wallet: 'A', peerId: 'p1', pairedAt: 1, addrs: ['/ip4/1.2.3.4/tcp/1'], relay: [] },
      { wallet: 'A', peerId: 'p2', pairedAt: 2, addrs: [], relay: [] },
      { wallet: '', peerId: 'p3', pairedAt: 3, addrs: [], relay: [] },
      { wallet: 'B', peerId: '', pairedAt: 4, addrs: [], relay: [] },
      { wallet: 'C', peerId: 'p4', pairedAt: 5, addrs: ['not-a-multiaddr'], relay: [] },
    ],
  })

  assert.deepEqual(prefs.privatePeers.map(peer => peer.wallet), ['A', 'C'])
  assert.deepEqual(prefs.privatePeers[0]!.addrs, ['/ip4/1.2.3.4/tcp/1'])
  assert.deepEqual(prefs.privatePeers[1]!.addrs, [])
})

test('removing a paired worker leaves the selection and sort alone', () => {
  const prefs: UserPrefs = {
    version: 1,
    selected: ['a'],
    seeded: true,
    sort: 'model',
    privatePeers: [
      { wallet: 'A', peerId: 'p1', pairedAt: 1, addrs: [], relay: [] },
      { wallet: 'B', peerId: 'p2', pairedAt: 2, addrs: [], relay: [] },
    ],
  }

  const next = removePrivatePeer(prefs, 'A')
  assert.deepEqual(next.privatePeers.map(peer => peer.wallet), ['B'])
  assert.deepEqual(next.selected, ['a'])
  assert.equal(next.sort, 'model')
})
