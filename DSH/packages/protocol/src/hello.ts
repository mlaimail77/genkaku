// GENKAKU: data-plane identity proof (P4.9e).
//
// WorkerRegistry proves wallet ⇄ PeerId, but only for a worker that chose to
// register — and the record is self-declared (whoever pays gas claims the
// peerId). The hello handshake closes that hole directly: the client sends a
// fresh 32-byte nonce, the peer signs
//
//     keccak("genkaku.hello.v0:<peerId>:<wallet>:<nonce>")
//
// with the EVM key it claims, and the client recovers the signer. A peer can
// only answer for a wallet whose private key it holds, so an offer that claims
// someone else's wallet is dropped before any escrow is opened. This also works
// for invite-link workers that never touched the chain.
//
// Both nonce and peerId are inside the digest: the nonce makes a recorded hello
// useless to another client, and the peerId stops a peer from re-serving a
// signature it obtained from a different node.

import { randomBytes } from 'node:crypto'

import { keccak256, toBytes } from 'viem'

import { walletAddress } from './chain.ts'
import { recoverSigner, signDigest } from './receipts.ts'

const HELLO_TAG = 'genkaku.hello.v0:'

export type HelloProof = {
  peerId: string
  wallet: `0x${string}`
  sig: string
}

/** Fresh challenge for one handshake (never reused, never stored). */
export function newNonce(): `0x${string}` {
  return `0x${randomBytes(32).toString('hex')}`
}

/** The exact bytes both sides sign — one definition, no drift. */
export function helloDigest(
  peerId: string,
  wallet: `0x${string}`,
  nonce: `0x${string}`,
): Uint8Array {
  return toBytes(keccak256(toBytes(`${HELLO_TAG}${peerId}:${wallet.toLowerCase()}:${nonce.toLowerCase()}`)))
}

/** Worker side: prove possession of the wallet key for this PeerId. */
export async function signHello(
  key: `0x${string}`,
  peerId: string,
  nonce: `0x${string}`,
): Promise<HelloProof> {
  const wallet = walletAddress(key)
  const sig = await signDigest(key, helloDigest(peerId, wallet, nonce))

  return { peerId, wallet, sig }
}

/** Client side: does this proof really come from `wallet` over `nonce`? */
export async function verifyHello(proof: HelloProof, nonce: `0x${string}`): Promise<boolean> {
  const signer = await recoverSigner(helloDigest(proof.peerId, proof.wallet, nonce), proof.sig)

  return signer != null && signer.toLowerCase() === proof.wallet.toLowerCase()
}
