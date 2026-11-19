// GENKAKU: worker visibility and pairing (private workers).
//
// A public worker is discoverable by anyone: its address is on chain, the seed
// hands out its peer id, and its offer board is one dial away. A private worker
// wants the same product for a chosen audience — a team, a client, a friend —
// without listing anything publicly.
//
// The trust anchor is the one this product already has: the wallet IS the
// libp2p PeerId (one ed25519 key, `walletOfPeerId`). A TCP/QUIC connection is
// authenticated to the remote peer's key before a byte of GenKaKu protocol is
// exchanged, so `connection.remotePeer` cannot be forged by the dialer. That
// makes authorisation arithmetic rather than testimony:
//
//     allowed(connection.remotePeer) ⇔ walletOfPeerId(peer) ∈ paired list
//
// No bearer token travels with a request, and no signature is needed per call.
// The only secret in the system is the ONE-TIME pairing code, and it is never
// stored: the worker keeps sha256(secret), marks it used the first time a
// wallet exchanges it, and the wallet is what authorises every later dial.
//
// Private does not mean free: a private worker may still quote a price, and the
// existing escrow path pays it. The chain row is kept (settlement pays the
// Worker account) but its locator stays empty, so the directory has nothing to
// dial.

import { sha256 } from '@noble/hashes/sha256'
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils'
import { randomBytes } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { walletOfPeerId } from './registry.ts'

export type Visibility = 'public' | 'private'

/** Default lifetime of a pairing code. Short enough to paste, long enough to
 *  send over a chat app without it rotting on the way. */
export const PAIRING_TTL_MS = 15 * 60_000

/** Used codes are kept for a while so a retry can say "already paired with
 *  THIS wallet" instead of the misleading "invalid code". */
const USED_RETENTION_MS = 24 * 60 * 60_000

export type PendingPairing = {
  /** short local id, never the secret */
  id: string
  /** sha256(secret) hex */
  hash: string
  createdAt: number
  expiresAt: number
  usedAt?: number
  /** wallet that exchanged this code, when used */
  usedBy?: string
  /** label the user asked to be known by */
  label?: string
}

export type PairedUser = {
  /** base58 Solana address; also the user's libp2p PeerId */
  wallet: string
  label?: string
  pairedAt: number
}

export type PrivacyState = {
  version: 1
  visibility: Visibility
  /** public display name; falls back to config.workerName when absent */
  displayName?: string
  pending: PendingPairing[]
  paired: PairedUser[]
}

export const PRIVACY_FILE = 'privacy.json'

export function privacyPath(keyDir: string): string {
  return join(keyDir, PRIVACY_FILE)
}

/** Read the worker's privacy state; never throws (a corrupt file is "public"). */
export function readPrivacy(keyDir: string): PrivacyState {
  try {
    const raw = JSON.parse(readFileSync(privacyPath(keyDir), 'utf8')) as Partial<PrivacyState>
    if (raw?.version !== 1) return emptyPrivacy()

    return {
      version: 1,
      visibility: raw.visibility === 'private' ? 'private' : 'public',
      ...(typeof raw.displayName === 'string' && raw.displayName !== '' ? { displayName: raw.displayName } : {}),
      pending: Array.isArray(raw.pending) ? raw.pending.filter(isPending) : [],
      paired: Array.isArray(raw.paired) ? raw.paired.filter(isPairedUser) : [],
    }
  } catch {
    return emptyPrivacy()
  }
}

export function emptyPrivacy(): PrivacyState {
  return { version: 1, visibility: 'public', pending: [], paired: [] }
}

export function writePrivacy(keyDir: string, state: PrivacyState): void {
  mkdirSync(keyDir, { recursive: true, mode: 0o700 })
  writeFileSync(privacyPath(keyDir), `${JSON.stringify(state, undefined, 2)}\n`, { mode: 0o600 })
}

export function setVisibility(state: PrivacyState, visibility: Visibility): PrivacyState {
  return { ...state, visibility }
}

export function setDisplayName(state: PrivacyState, displayName: string): PrivacyState {
  const clean = displayName.trim().slice(0, 48)
  return { ...state, ...(clean === '' ? { displayName: undefined } : { displayName: clean }) }
}

/** Drop expired pending codes and old used ones. Cheap and idempotent. */
export function prunePairings(state: PrivacyState, now = Date.now()): PrivacyState {
  const pending = state.pending.filter(entry =>
    entry.usedAt == null ? entry.expiresAt > now : entry.expiresAt > now - USED_RETENTION_MS)

  return pending.length === state.pending.length ? state : { ...state, pending }
}

/** Base64url of 32 random bytes: the only secret in the pairing flow. */
export function newPairingSecret(): string {
  return randomBytes(32).toString('base64url')
}

export function pairingHash(secret: string): string {
  return bytesToHex(sha256(utf8ToBytes(secret)))
}

/** Create one pending code and return the secret exactly once. */
export function createPendingPairing(
  state: PrivacyState,
  opts: { now?: number; ttlMs?: number } = {},
): { state: PrivacyState; pending: PendingPairing; secret: string } {
  const now = opts.now ?? Date.now()
  const secret = newPairingSecret()
  const pending: PendingPairing = {
    id: randomBytes(6).toString('hex'),
    hash: pairingHash(secret),
    createdAt: now,
    expiresAt: now + (opts.ttlMs ?? PAIRING_TTL_MS),
  }

  return { state: prunePairings({ ...state, pending: [...state.pending, pending] }, now), pending, secret }
}

export type ConsumeResult =
  | { ok: true; pending: PendingPairing; /** true when this wallet already used it */ replayed: boolean }
  | { ok: false; code: 'unknown-code' | 'expired-code' | 'used-code'; reason: string }

/**
 * Exchange a one-time code for a wallet.
 *
 * A retry from the SAME wallet succeeds: the first attempt may have paired
 * successfully and lost the reply, and refusing it would leave the user with a
 * spent code and no visible reason.
 */
export function consumePairing(
  state: PrivacyState,
  secret: string,
  wallet: string,
  now = Date.now(),
): { state: PrivacyState; result: ConsumeResult } {
  const hash = pairingHash(secret)
  const index = state.pending.findIndex(entry => entry.hash === hash)

  if (index < 0) {
    return { state, result: { ok: false, code: 'unknown-code', reason: 'this pairing code was not created by this worker' } }
  }

  const entry = state.pending[index]!
  const normalized = wallet.toLowerCase()

  if (entry.usedAt != null) {
    return entry.usedBy?.toLowerCase() === normalized
      ? { state, result: { ok: true, pending: entry, replayed: true } }
      : { state, result: { ok: false, code: 'used-code', reason: 'this pairing code has already been used' } }
  }

  if (entry.expiresAt <= now) {
    return { state, result: { ok: false, code: 'expired-code', reason: 'this pairing code has expired' } }
  }

  const pending = state.pending.map((row, i) => i === index ? { ...row, usedAt: now, usedBy: wallet } : row)

  return { state: { ...state, pending }, result: { ok: true, pending: state.pending[index]!, replayed: false } }
}

export function addPairedUser(
  state: PrivacyState,
  user: { wallet: string; label?: string; now?: number },
): PrivacyState {
  const label = user.label?.trim().slice(0, 48)
  const next: PairedUser = {
    wallet: user.wallet,
    pairedAt: user.now ?? Date.now(),
    ...(label == null || label === '' ? {} : { label }),
  }
  const rest = state.paired.filter(entry => entry.wallet !== user.wallet)

  return { ...state, paired: [...rest, next] }
}

export function removePairedUser(state: PrivacyState, wallet: string): PrivacyState {
  return { ...state, paired: state.paired.filter(entry => entry.wallet !== wallet) }
}

export function revokePending(state: PrivacyState, id: string): PrivacyState {
  return { ...state, pending: state.pending.filter(entry => entry.id !== id) }
}

export function isPaired(state: PrivacyState, wallet: string): boolean {
  return state.paired.some(entry => entry.wallet === wallet)
}

/** Does the authenticated remote peer belong to a paired wallet? `null` when
 *  the peer uses a key type this product does not issue. */
export function peerWallet(peerId: string): string | null {
  return walletOfPeerId(peerId)
}

export type AccessVerdict = { ok: true } | { ok: false; code: 'pair-required'; reason: string }

/** Authorise one dialed peer against the paired-wallet list. */
export function accessFor(state: PrivacyState): (peerId: string) => AccessVerdict {
  return (peerId) => {
    if (state.visibility !== 'private') return { ok: true }

    const wallet = walletOfPeerId(peerId)

    if (wallet != null && isPaired(state, wallet)) return { ok: true }

    return { ok: false, code: 'pair-required', reason: 'this worker is private; pair it with a one-time code first' }
  }
}

// ── the pairing code the worker hands out ────────────────────────────────────

export const PAIRING_TOKEN_PREFIX = 'genkaku1.'
const MAX_TOKEN_CHARS = 8_192

export type PairingToken = {
  v: 1
  /** local id, so the worker panel can revoke exactly this code */
  id: string
  /** worker peer id (base58) */
  peerId: string
  /** worker wallet (base58); the same key as `peerId` */
  wallet: string
  /** worker display name at creation time, for a readable label */
  name: string
  /** addresses the worker was reachable on when the code was made */
  addrs: string[]
  /** relay hops (without the worker's peer id appended) */
  relay: string[]
  secret: string
  exp: number
}

export function encodePairingToken(token: PairingToken): string {
  return PAIRING_TOKEN_PREFIX + Buffer.from(JSON.stringify(token), 'utf8').toString('base64url')
}

/** Decode a pasted code. Throws with a user-facing reason on anything invalid. */
export function decodePairingToken(text: string, now = Date.now()): PairingToken {
  const trimmed = text.trim()

  if (!trimmed.startsWith(PAIRING_TOKEN_PREFIX)) {
    throw new Error('that is not a GenKaKu pairing code')
  }

  if (trimmed.length > MAX_TOKEN_CHARS) throw new Error('pairing code is too long')

  let raw: unknown
  try {
    raw = JSON.parse(Buffer.from(trimmed.slice(PAIRING_TOKEN_PREFIX.length), 'base64url').toString('utf8'))
  } catch {
    throw new Error('pairing code is not valid base64url JSON')
  }

  const token = raw as Partial<PairingToken>
  const strings: Array<keyof PairingToken> = ['id', 'peerId', 'wallet', 'name', 'secret']
  for (const key of strings) {
    if (typeof token[key] !== 'string' || token[key] === '') throw new Error(`pairing code is missing ${key}`)
  }

  if (token.v !== 1) throw new Error('pairing code is from a different version')
  if (!Array.isArray(token.addrs) || !Array.isArray(token.relay)) throw new Error('pairing code has no addresses')
  if (typeof token.exp !== 'number' || !Number.isFinite(token.exp)) throw new Error('pairing code has no expiry')
  if (token.exp <= now) throw new Error('pairing code has expired')

  return {
    v: 1,
    id: token.id!,
    peerId: token.peerId!,
    wallet: token.wallet!,
    name: token.name!,
    addrs: token.addrs.filter((addr): addr is string => typeof addr === 'string' && addr.startsWith('/')),
    relay: token.relay.filter((addr): addr is string => typeof addr === 'string' && addr.startsWith('/')),
    secret: token.secret!,
    exp: token.exp,
  }
}

/** Every address worth trying for a paired worker: the ones it had when the
 *  code was made, plus circuits built from the seed relays it reported.
 *  Duplicates are removed; order is direct-first so a LAN pairing stays fast. */
export function tokenAddrs(
  token: Pick<PairingToken, 'peerId' | 'addrs' | 'relay'>,
  extraRelays: readonly string[] = [],
): string[] {
  const out = [...token.addrs]
  const relays = [...new Set([...token.relay, ...extraRelays])]

  for (const relay of relays) {
    if (!relay.startsWith('/') || !relay.includes('/p2p/')) continue
    const hop = relay.split('/p2p-circuit')[0] ?? relay
    out.push(`${hop}/p2p-circuit/p2p/${token.peerId}`)
  }

  const direct = out.filter(addr => !addr.includes('/p2p-circuit'))
  const relayed = out.filter(addr => addr.includes('/p2p-circuit'))

  return [...new Set([...direct, ...relayed])]
}

function isPending(value: unknown): value is PendingPairing {
  const entry = value as Partial<PendingPairing> | null

  return entry != null
    && typeof entry.id === 'string'
    && typeof entry.hash === 'string'
    && typeof entry.createdAt === 'number'
    && typeof entry.expiresAt === 'number'
}

function isPairedUser(value: unknown): value is PairedUser {
  const entry = value as Partial<PairedUser> | null

  return entry != null && typeof entry.wallet === 'string' && entry.wallet !== '' && typeof entry.pairedAt === 'number'
}
