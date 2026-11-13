// GENKAKU: cumulative metered receipts (P2 §3, PDF-derived bounded-loss scheme).
// Client signs; worker holds; the LARGEST cumulative receipt is co-signed at
// settle. Zero gas — pure local crypto.
//
// P4.4 (cutover): digestFor is now REAL keccak256(abi.encodePacked(...)) over
// the receipt struct, and signatures are EIP-191 personal-message over the
// 32-byte digest — exactly the shape JobEscrow._verify recovers ("0x19Ethereum
// Signed Message:\n32" prefix), so a receipt presented at settle verifies on
// chain with no re-encoding.

import { encodePacked, type Hex, keccak256, recoverMessageAddress, toBytes, toHex } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

import type { NetEnvironment } from './netconfig.ts'
import { CHAIN_ID } from './netconfig.ts'

export type ReceiptPayloadV1 = {
  chainId: 84532 | 8453
  escrow: `0x${string}`
  sessionId: `0x${string}` // 32-byte session id (JobEscrow id or stream handle)
  seq: number
  amount: bigint // 6-dec USDC cumulative
  /** commit-challenge (P4.9f): keccak of the canonical REQUEST. Always set. */
  inputHash: `0x${string}`
  /** keccak of the full answer. ZERO until the through-end receipt, which
   *  commits the exact text the worker was paid for. */
  outputHash: `0x${string}`
}

/** All-zero bytes32 — "not committed yet" (never a real keccak in practice). */
export const ZERO_HASH = '0x0000000000000000000000000000000000000000000000000000000000000000' as const

/** Canonical request commitment. NUL separators make the field boundaries
 *  unambiguous, so no two different requests can produce the same string. */
export function inputHashOf(req: {
  model: string
  prompt: string
  system?: string
  maxTokens?: number
}): `0x${string}` {
  const canonical = [
    'genkaku.commit.v1',
    req.model,
    req.system ?? '',
    String(req.maxTokens ?? 0),
    req.prompt,
  ].join('\u0000')

  return keccak256(toBytes(canonical))
}

/** Commitment to the exact answer text (byte-exact, no normalisation). */
export function outputHashOf(text: string): `0x${string}` {
  return keccak256(toBytes(text))
}

export function makeReceiptBody(
  env: NetEnvironment,
  escrow: string,
  sessionId: `0x${string}`,
  seq: number,
  amount: bigint,
  inputHash: `0x${string}` = ZERO_HASH,
  outputHash: `0x${string}` = ZERO_HASH,
): ReceiptPayloadV1 & { _domain: 'genkaku.receipt.v1' } {
  if (seq < 1) {throw new Error('[genkaku:receipt] seq starts at 1')}

  return {
    _domain: 'genkaku.receipt.v1',
    chainId: CHAIN_ID[env],
    escrow: escrow as `0x${string}`,
    sessionId,
    seq,
    amount,
    inputHash,
    outputHash,
  }
}

/** Cumulative-receipt digest: keccak256(abi.encodePacked(chainId, escrow,
 *  sessionId, seq, amount)) — the receiptHash JobEscrow.settle takes as an
 *  opaque bytes32; a receipt replayed on chain verifies bit-for-bit. */
export function digestFor(receipt: ReceiptPayloadV1): Uint8Array {
  return toBytes(digestForHex(receipt))
}

/** Hex form of digestFor — what the settle wire/tx carry as `receiptHash`. */
export function digestForHex(receipt: ReceiptPayloadV1): Hex {
  const fields = [
    // uint256 / address / bytes32 / uint256 / uint256 / bytes32 / bytes32 —
    // packed layout (each numeric field big-endian full-width; all sizes are
    // multiples of 8 bits so nothing is right-padded).
    BigInt(receipt.chainId),
    receipt.escrow.toLowerCase() as `0x${string}`,
    receipt.sessionId.toLowerCase() as `0x${string}`,
    BigInt(receipt.seq),
    receipt.amount,
    receipt.inputHash,
    receipt.outputHash,
  ]

  return keccak256(encodePacked(
    ['uint256', 'address', 'bytes32', 'uint256', 'uint256', 'bytes32', 'bytes32'],
    fields as never,
  ))
}

/**
 * 32-byte stream handle for a session. Priced sessions (real escrow id) use
 * the numeric id as a bytes32 big-endian — the same integer JobEscrow keys
 * `sessions[id]` with. Unpriced self-test sessions carry a deterministic
 * keccak of the jobId so already-wired clients still bind receipts to a stream.
 */
export function sessionIdHex(jobId: string, escrowId: string): `0x${string}` {
  let id = 0n

  try {
    id = BigInt(escrowId === '' ? '0' : escrowId)
  } catch {
    id = 0n
  }

  if (id > 0n) {return toHex(id, { size: 32 })}

  return keccak256(toBytes(`genkaku.job:${jobId}`))
}

/** EIP-191 personal_message signature over the 32-byte receipt digest —
 *  recovers in JobEscrow._verify's `_verify(digest, sig, expected)` shape. */
export async function signDigest(key: `0x${string}`, digest: Uint8Array): Promise<string> {
  if (digest.length !== 32) {throw new Error('[genkaku:receipt] digest must be 32 bytes')}

  const account = privateKeyToAccount(key)
  const sig = await account.signMessage({ message: { raw: digest } })

  // viem personal signatures are 65 bytes r||s||v with v in 27|28 — the exact
  // split JobEscrow._verify calldata-loads.
  if (toBytes(sig as Hex).length !== 65) {throw new Error('[genkaku:receipt] signature must be 65 bytes')}

  return sig
}

/** Recover the signer address (EIP-191) — rejects malformed sigs with null. */
export async function recoverSigner(digest: Uint8Array, sig: string): Promise<`0x${string}` | null> {
  try {
    if (toBytes(sig as Hex).length !== 65) {return null}

    return await recoverMessageAddress({ message: { raw: digest }, signature: sig as Hex })
  } catch {
    return null
  }
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
