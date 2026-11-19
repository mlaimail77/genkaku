// GENKAKU: cumulative metered receipts (P2 §3, PDF-derived bounded-loss scheme).
// The client signs, the worker holds, and the largest cumulative receipt is the
// ceiling on what a session may settle for. Pure local crypto — no gas.
//
// What changed with Solana: the chain no longer recovers a signer. A receipt is
// not what authorises payment any more; the worker's own transaction signature
// is (`settle/1`, see p2pNode.ts). Receipts survive as the EVIDENCE both sides
// hold — what the worker is willing to settle up to, and the commitment to the
// request and the answer that makes a settled answer auditable afterwards.
//
// Identity is one ed25519 key: the same key is the Solana wallet, the libp2p
// PeerId and the receipt signer, so a receipt signed by a wallet is proof that
// the peer holding that wallet produced it.
//
// The digest is keccak256 over a NUL-separated canonical string. Every field
// boundary is a NUL, so no two different receipts can produce the same string,
// and the encoding is byte-exact on both sides without a serialisation library.

import { ed25519 } from '@noble/curves/ed25519'
import { keccak_256 } from '@noble/hashes/sha3'
import { bytesToHex, hexToBytes, utf8ToBytes } from '@noble/hashes/utils'
import { Keypair } from './solana.js'
import bs58 from 'bs58'

import type { NetEnvironment } from './netconfig.ts'

/** A 32-byte content digest, hex-encoded with a `0x` prefix. */
export type Digest = `0x${string}`

export type ReceiptPayloadV1 = {
  /** cluster the session settles on */
  chain: NetEnvironment
  /** base58 program id — a receipt from another deployment cannot be replayed */
  program: string
  /** the on-chain session id, as a decimal string */
  sessionId: string
  seq: number
  /** cumulative micro-USDC this session has billed so far */
  amount: bigint
  /** commitment to the request (always set) */
  inputHash: Digest
  /** commitment to the answer; ZERO until the through-end receipt */
  outputHash: Digest
}

/** All-zero digest — "not committed yet" (never a real keccak in practice). */
export const ZERO_HASH = `0x${'0'.repeat(64)}` as Digest

const RECEIPT_TAG = 'genkaku.receipt.v2'
const COMMIT_TAG = 'genkaku.commit.v2'
const ANSWER_TAG = 'genkaku.answer.v2'

function keccakHex(text: string): Digest {
  return `0x${bytesToHex(keccak_256(utf8ToBytes(text)))}` as Digest
}

/** Canonical request commitment. NUL separators make the field boundaries
 *  unambiguous, so no two different requests can produce the same string. */
export function inputHashOf(req: {
  model: string
  prompt: string
  system?: string
  maxTokens?: number
}): Digest {
  return keccakHex([
    COMMIT_TAG,
    req.model,
    req.system ?? '',
    String(req.maxTokens ?? 0),
    req.prompt,
  ].join('\u0000'))
}

/** Commitment to the exact answer text (byte-exact, no normalisation). */
export function outputHashOf(text: string): Digest {
  return keccakHex(`${ANSWER_TAG}\u0000${text}`)
}

export function makeReceiptBody(
  env: NetEnvironment,
  program: string,
  sessionId: string,
  seq: number,
  amount: bigint,
  inputHash: Digest = ZERO_HASH,
  outputHash: Digest = ZERO_HASH,
): ReceiptPayloadV1 & { _domain: 'genkaku.receipt.v1' } {
  if (seq < 1) {throw new Error('[genkaku:receipt] seq starts at 1')}

  return {
    _domain: 'genkaku.receipt.v1',
    chain: env,
    program,
    sessionId,
    seq,
    amount,
    inputHash,
    outputHash,
  }
}

/** The exact bytes both sides hash — one definition, no drift. */
function canonicalReceipt(receipt: ReceiptPayloadV1): string {
  return [
    RECEIPT_TAG,
    receipt.chain,
    receipt.program,
    receipt.sessionId,
    String(receipt.seq),
    receipt.amount.toString(),
    receipt.inputHash,
    receipt.outputHash,
  ].join('\u0000')
}

/** Cumulative-receipt digest. */
export function digestFor(receipt: ReceiptPayloadV1): Uint8Array {
  return keccak_256(utf8ToBytes(canonicalReceipt(receipt)))
}

/** Hex form of {@link digestFor} — what the settle wire carries as `receiptHash`. */
export function digestForHex(receipt: ReceiptPayloadV1): Digest {
  return `0x${bytesToHex(digestFor(receipt))}` as Digest
}

/**
 * Stream handle for a session. A priced session uses the on-chain id verbatim;
 * an unpriced self-test session has no id, so it derives a stable handle from
 * the jobId and receipts still bind to something a log can name.
 */
export function sessionIdOf(jobId: string, escrowId: string): string {
  let id = 0n

  try {
    id = BigInt(escrowId === '' ? '0' : escrowId)
  } catch {
    id = 0n
  }

  if (id > 0n) {return id.toString()}

  return `job:${bytesToHex(keccak_256(utf8ToBytes(`genkaku.job:${jobId}`))).slice(0, 16)}`
}

/** The wallet address (base58 pubkey) of an ed25519 key. */
export function walletOf(key: Keypair): string {
  return key.publicKey.toBase58()
}

/**
 * ed25519 signature over a 32-byte digest, base58-encoded.
 *
 * The bytes signed are the digest itself, not a message wrapper: there is no
 * second consensus on a prefix, because nothing on chain re-derives the signer.
 */
export function signDigest(key: Keypair, digest: Uint8Array): string {
  if (digest.length !== 32) {throw new Error('[genkaku:receipt] digest must be 32 bytes')}
  const signature = ed25519.sign(digest, key.secretKey.subarray(0, 32))

  return bs58.encode(signature)
}

/** Does `sig` verify over `digest` for the wallet `signer` (base58 pubkey)? */
export function verifyDigest(digest: Uint8Array, sig: string, signer: string): boolean {
  if (digest.length !== 32 || sig === '' || signer === '') {return false}

  try {
    return ed25519.verify(bs58.decode(sig), digest, bs58.decode(signer))
  } catch {
    return false
  }
}

/** Zig-zag helper kept for callers that hold a hex digest. */
export function digestBytes(hex: string): Uint8Array | null {
  const bare = hex.replace(/^0x/, '')
  if (!/^[0-9a-fA-F]{64}$/.test(bare)) {return null}

  return hexToBytes(bare.toLowerCase())
}

/** Worker-side ledger: keep max signed receipt per session (SQLite later). */
export class ReceiptLedger {
  private max = new Map<string, { seq: number; amount: bigint }>()

  offer(sessionId: string, seq: number, amount: bigint): { accepted: boolean; reason?: string } {
    const m = this.max.get(sessionId)

    if (m && seq <= m.seq) {return { accepted: false, reason: 'stale-seq' }}

    if (m && amount <= m.amount) {return { accepted: false, reason: 'non-increasing' }}

    this.max.set(sessionId, { seq, amount })

    return { accepted: true }
  }

  cumulative(sessionId: string): bigint {
    return this.max.get(sessionId)?.amount ?? 0n
  }

  settleDigest(sessionId: string): { seq: number; amount: bigint } | null {
    return this.max.get(sessionId) ?? null
  }
}
