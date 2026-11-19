// GENKAKU: the wallet ⇄ libp2p PeerId binding (P4.5).
//
// It used to hash a PeerId into a bytes32 digest and store that on chain,
// because the wallet address and the PeerId were two different encodings of
// the same idea and something had to tie them together.
//
// With Solana the tie is structural: one ed25519 key is the wallet AND the
// libp2p identity, and a libp2p PeerId is just the multihash of that public
// key. So the check is no longer "did this wallet claim this digest" but "is
// this PeerId the key that owns this wallet" — arithmetic, not testimony. The
// on-chain Worker record still stores the PeerId bytes so a cold client has a
// directory to walk; the binding itself needs no stored proof at all.

import { keccak_256 } from '@noble/hashes/sha3'
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils'
import { PublicKey } from './solana.js'
import bs58 from 'bs58'

import type { Digest } from './receipts.ts'

const POLICY_TAG = 'genkaku.policy.v0:'

/** v0 content-policy version the sidecar serves and pins on registration. */
export const POLICY_VERSION = 'smoke-v1'

/** Multihash of a 32-byte ed25519 public key (identity hash, code 0x00). */
const IDENTITY_MULTIHASH = 0x00
/** protobuf `PublicKey { Type = Ed25519(1), Data = <32 bytes> }` prefix. */
const ED25519_KEY_PROTO = [0x08, 0x01, 0x12, 0x20]

/** The PeerId's multihash bytes — what the Worker account stores. */
export function peerIdBytesOf(peerId: string): Uint8Array {
  if (peerId.includes('/') || peerId === '') {
    throw new Error('[genkaku:registry] expected a bare PeerId string (not a multiaddr)')
  }

  const bytes = bs58.decode(peerId)

  if (bytes.length === 0 || bytes.length > 64) {
    throw new Error('[genkaku:registry] PeerId is not a multihash of 1..64 bytes')
  }

  return bytes
}

export function peerIdFromBytes(bytes: Uint8Array | number[]): string {
  return bs58.encode(Uint8Array.from(bytes))
}

/**
 * The Solana wallet an ed25519 PeerId belongs to, or null when the peer uses a
 * key type this product does not issue (RSA, secp256k1, WebCrypto).
 *
 * This is the whole binding: extract the public key out of the multihash and
 * compare it to the address. No handshake, no registry read, no trust.
 */
export function walletOfPeerId(peerId: string): string | null {
  let bytes: Uint8Array

  try {
    bytes = bs58.decode(peerId)
  } catch {
    return null
  }

  // 0x00 0x24 0x08 0x01 0x12 0x20 <32 key bytes> = 38 bytes in total.
  if (bytes.length !== 38) return null
  if (bytes[0] !== IDENTITY_MULTIHASH || bytes[1] !== 0x24) return null
  for (let i = 0; i < ED25519_KEY_PROTO.length; i++) {
    if (bytes[2 + i] !== ED25519_KEY_PROTO[i]) return null
  }

  try {
    return new PublicKey(bytes.subarray(6, 38)).toBase58()
  } catch {
    return null
  }
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

/** The content-policy code the worker declares (wire-only; nothing stores it). */
export function policyHashOf(policy: string): Digest {
  return `0x${bytesToHex(keccak_256(utf8ToBytes(POLICY_TAG + policy)))}` as Digest
}

export type RegistryWorker = {
  active: boolean
  /** multihash bytes, exactly as the Worker account stores them */
  peerId: Uint8Array
  locator: string
}

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }

  return true
}

/** The data-plane half of the binding: does the on-chain record for `wallet`
 *  pin EXACTLY this PeerId? A record that is missing is `absent` (grace for a
 *  wallet that has not registered yet); a PRESENT record that pins a different
 *  PeerId is an active spoofing attempt and fails hard. */
export function bindingOf(reg: RegistryWorker | null, peerId: string): 'bound' | 'absent' | 'mismatch' {
  if (reg == null || !reg.active) {
    return 'absent'
  }

  let wanted: Uint8Array

  try {
    wanted = peerIdBytesOf(peerId)
  } catch {
    return 'mismatch'
  }

  return sameBytes(reg.peerId, wanted) ? 'bound' : 'mismatch'
}

export { sameBytes as samePeerId }
