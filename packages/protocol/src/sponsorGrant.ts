// The sponsor grant (rc.05): permission to spend one sponsored minute.
//
// A priced worker in 0.3 is paid by the campaign, not by the user, so the
// question a worker has to answer before it accepts a session is "is anybody
// paying for this minute?". The ads service is the only party that can answer,
// and it answers with a signature:
//
//   { worker, model, priceMicro, day, exp }  signed by the ads service key
//
// The worker verifies it locally with a public key it fetched from
// `/ads/v1/key`, so no round trip happens per session and no new on-chain
// account is needed. Five-minute expiry is the revocation.
//
// What this module owns is the *bytes* that get signed. Both sides must agree on
// them exactly, or a valid grant verifies as invalid — the classic way this kind
// of scheme fails late and confusingly. One canonical string, one hash, one
// signature, both directions in this file.

import type { Keypair } from './solana.js'
import { signDigest, verifyDigest } from './receipts.ts'
import { keccak_256 } from '@noble/hashes/sha3'

/** A grant as the wire carries it: base64 of `JSON.stringify(payload)` plus the
 *  detached signature, or `null` when a session is not sponsored. */
export type SponsorGrantWire = {
  /** canonical payload, base64 */
  payload: string
  /** base58 ed25519 over the payload digest */
  sig: string
}

/** The payload, in the order it is hashed. Do not reorder: the hash follows. */
export type SponsorGrant = {
  /** the wallet that may use this grant — a grant is not transferable */
  worker: string
  model: string
  /** micro-USDC per started minute the worker quoted */
  priceMicro: string
  /** UTC day index the budget is charged to (`floor(ms / 86_400_000)`) */
  day: number
  /** unix ms after which the grant is worthless */
  exp: number
}

/** How long a grant lives. Long enough for a dial and a slow first token, short
 *  enough that a leaked one is worth one session. */
export const GRANT_TTL_MS = 5 * 60_000

/** The exact bytes both sides sign. Field order is the contract. */
export function grantCanonical(grant: SponsorGrant): string {
  return [
    'genkaku:grant:1',
    `worker:${grant.worker}`,
    `model:${grant.model}`,
    `price:${grant.priceMicro}`,
    `day:${grant.day}`,
    `exp:${grant.exp}`,
  ].join('\n')
}

export function grantDigest(grant: SponsorGrant): Uint8Array {
  return keccak_256(new TextEncoder().encode(grantCanonical(grant)))
}

/** The service side: sign a grant with the ads key. */
export function signGrant(key: Keypair, grant: SponsorGrant): SponsorGrantWire {
  return {
    payload: Buffer.from(JSON.stringify(grant), 'utf8').toString('base64'),
    sig: signDigest(key, grantDigest(grant)),
  }
}

export function decodeGrant(wire: SponsorGrantWire): SponsorGrant | null {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(wire.payload, 'base64').toString('utf8'))

    if (typeof parsed !== 'object' || parsed === null) return null
    const row = parsed as Record<string, unknown>

    if (typeof row.worker !== 'string' || row.worker === '') return null
    if (typeof row.model !== 'string' || row.model === '') return null
    if (typeof row.priceMicro !== 'string' || !/^\d+$/.test(row.priceMicro)) return null
    if (typeof row.day !== 'number' || !Number.isFinite(row.day)) return null
    if (typeof row.exp !== 'number' || !Number.isFinite(row.exp)) return null

    return {
      worker: row.worker,
      model: row.model,
      priceMicro: row.priceMicro,
      day: row.day,
      exp: row.exp,
    }
  } catch {
    return null
  }
}

export type GrantVerdict =
  | { ok: true; grant: SponsorGrant }
  | { ok: false; code: 'grant-malformed' | 'grant-expired' | 'grant-wrong-worker' | 'grant-wrong-model' | 'grant-price-too-high' | 'grant-bad-signature'; reason: string }

/**
 * The worker side: is this grant good for this session, right now, with this key?
 *
 * Everything is checked here rather than in the caller, because a gate that is
 * assembled from three call sites is a gate with three ways to forget a check.
 */
export function checkGrant(input: {
  wire: SponsorGrantWire | null | undefined
  /** the ads service key the operator pinned */
  serviceKey: string
  /** the wallet this session was dialed for */
  worker: string
  model: string
  priceMicro: bigint
  now?: number
}): GrantVerdict {
  const now = input.now ?? Date.now()
  const wire = input.wire

  if (wire == null || typeof wire.payload !== 'string' || typeof wire.sig !== 'string') {
    return { ok: false, code: 'grant-malformed', reason: 'no grant was presented for a priced session' }
  }

  const grant = decodeGrant(wire)
  if (grant == null) return { ok: false, code: 'grant-malformed', reason: 'the grant payload is not a grant' }

  if (grant.worker !== input.worker) {
    return { ok: false, code: 'grant-wrong-worker', reason: 'the grant was issued for a different wallet' }
  }

  if (grant.model !== input.model) {
    return { ok: false, code: 'grant-wrong-model', reason: 'the grant was issued for a different model' }
  }

  if (BigInt(grant.priceMicro) < input.priceMicro) {
    return {
      ok: false,
      code: 'grant-price-too-high',
      reason: `the grant covers ${grant.priceMicro} micro/min, this listing asks ${input.priceMicro}`,
    }
  }

  if (grant.exp <= now) {
    return { ok: false, code: 'grant-expired', reason: 'the grant has expired; ask the bridge for a new one' }
  }

  if (!verifyDigest(grantDigest(grant), wire.sig, input.serviceKey)) {
    return { ok: false, code: 'grant-bad-signature', reason: 'the grant is not signed by the ads service' }
  }

  return { ok: true, grant }
}

/** What the bridge sends to the ads service to ask for one. */
export type GrantRequest = {
  worker: string
  model: string
  priceMicro: string
}

export function grantRequestOf(worker: string, model: string, priceMicro: bigint): GrantRequest {
  return { worker, model, priceMicro: priceMicro.toString() }
}
