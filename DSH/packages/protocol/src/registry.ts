// GENKAKU: WorkerRegistry binding (P4.5) — wallet ⇄ libp2p PeerId.
// The on-chain half (WorkerRegistry.register, msg.sender = wallet) stores a
// bytes32 digest of the worker's libp2p PeerId; EVERY data-plane participant
// recomputes the digest from the PeerId it just dialed and compares — the two
// halves only match if the same operator controls both keys.
//
// Digest scheme (v0, deterministic on both sides): keccak256 over a typed
// UTF-8 tag + the PeerId STRING (its base58btc data-plane form, the same form
// every libp2p address carries). Tagging binds the scheme, not the address —
// a collision with other hashes is structurally impossible:
//     peerIdDigestOf  = keccak("genkaku.peer.v0:<peerId string>")
//     policyHashOf    = keccak("genkaku.policy.v0:<policy code>")
// (WorkerRegistry stores the digest opaquely — bytes32 — so the algorithm is
// an off-chain agreement; the contract comment's "blake2s" was aspirational.)

import { keccak256, toBytes } from 'viem'

const PEER_TAG = 'genkaku.peer.v0:'
const POLICY_TAG = 'genkaku.policy.v0:'

/** v0 content-policy version the sidecar serves and pins on registration. */
export const POLICY_VERSION = 'smoke-v1'

/** bytes32 the worker pins into WorkerRegistry for its PeerId. */
export function peerIdDigestOf(peerId: string): `0x${string}` {
  if (peerId.includes('/') || peerId === '') {
    throw new Error('[genkaku:registry] expected a bare PeerId string (not a multiaddr)')
  }

  return keccak256(toBytes(PEER_TAG + peerId))
}

/** The content-policy code the worker declares with its registration. */
export function policyHashOf(policy: string): `0x${string}` {
  return keccak256(toBytes(POLICY_TAG + policy))
}

/** The libp2p PeerId encoded in a worker multiaddr (the grain of the compare). */
export function peerIdOf(addr: string): string | null {
  // A relay address carries TWO peer ids (relay and destination); the
  // destination is the tail. Taking the first one would identify the seed.
  const segments = addr.split('/p2p/')
  const tail = segments.length > 1 ? segments[segments.length - 1] : undefined

  if (tail != null && tail !== '') {
    // trim any stray suffix (addresses end at the peer id in our dialer)
    return tail.split('/')[0] || null
  }

  return null
}

export type RegistryWorker = {
  active: boolean
  peerId: `0x${string}`
  policyHash: `0x${string}`
}

/** The data-plane half of the binding: does the on-chain record for `wallet`
 *  pin EXACTLY this PeerId? A record that is missing is `absent` (testnet
 *  grace — the wallet may simply be unfunded); a PRESENT record that pins a
 *  different PeerId is an active spoofing attempt and fails hard. */
export function bindingOf(reg: RegistryWorker | null, peerId: string): 'bound' | 'absent' | 'mismatch' {
  if (reg == null || !reg.active) {
    return 'absent'
  }

  return reg.peerId === peerIdDigestOf(peerId) ? 'bound' : 'mismatch'
}
