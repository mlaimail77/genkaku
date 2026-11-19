// GENKAKU: data-plane identity proof (P4.9e).
//
// With one ed25519 key behind both the wallet and the PeerId, the binding is
// already arithmetic (see registry.ts: `walletOfPeerId`). The hello handshake
// stays as the second, explicit proof: the client sends a fresh 32-byte nonce
// and the peer signs
//
//     keccak("genkaku.hello.v1:<peerId>:<wallet>:<nonce>")
//
// with the key it claims, and the client verifies the signature against that
// wallet. It costs one round trip and it proves the PROCESS holding the key is
// the one answering, which a chain record never can.
//
// Both nonce and peerId are inside the digest: the nonce makes a recorded hello
// useless to another client, and the peerId stops a peer from re-serving a
// signature it obtained from a different node.

import { keccak_256 } from '@noble/hashes/sha3'
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils'
import { Keypair } from './solana.js'
import { randomBytes } from 'node:crypto'

import { signDigest, verifyDigest, walletOf } from './receipts.ts'
import { walletOfPeerId } from './registry.ts'

const HELLO_TAG = 'genkaku.hello.v1:'

export type HelloProof = {
  peerId: string
  wallet: string
  sig: string
}

/** Fresh challenge for one handshake (never reused, never stored). */
export function newNonce(): `0x${string}` {
  return `0x${randomBytes(32).toString('hex')}`
}

/** The exact bytes both sides sign — one definition, no drift. */
export function helloDigest(
  peerId: string,
  wallet: string,
  nonce: `0x${string}`,
): Uint8Array {
  return keccak_256(utf8ToBytes(`${HELLO_TAG}${peerId}:${wallet.toLowerCase()}:${nonce.toLowerCase()}`))
}

/** Worker side: prove possession of the wallet key for this PeerId. */
export function signHello(
  key: Keypair,
  peerId: string,
  nonce: `0x${string}`,
): HelloProof {
  const wallet = walletOf(key)
  const sig = signDigest(key, helloDigest(peerId, wallet, nonce))

  return { peerId, wallet, sig }
}

/** Client side: does this proof really come from `wallet` over `nonce`? */
export function verifyHello(proof: HelloProof, nonce: `0x${string}`): boolean {
  if (!verifyDigest(helloDigest(proof.peerId, proof.wallet, nonce), proof.sig, proof.wallet)) {
    return false
  }

  // Belt and braces: the PeerId must itself encode this wallet. A peer cannot
  // pass the check above while claiming a wallet its own identity contradicts.
  const embedded = walletOfPeerId(proof.peerId)

  return embedded != null && embedded === proof.wallet
}

export { bytesToHex }
