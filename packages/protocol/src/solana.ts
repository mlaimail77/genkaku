// GENKAKU: Solana client for the settlement program.
//
// Everything the plugins do on-chain goes through this file. It is deliberately
// hand-rolled rather than generated from an IDL: the program is small, the
// account layouts are fixed and documented in `genkaku/solana/LAYOUT.md`, and a
// generated client would pull a second copy of `@solana/web3.js` into every
// install.
//
// Units: every amount is micro-USDC (1 USDC = 1_000_000), matching the mint's
// six decimals. Prices are per started minute; the UI quotes per hour and this
// module converts with an upward rounding step, so a worker never loses the
// fraction of a cent.

import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  type Commitment,
  type Signer,
} from '@solana/web3.js'
import bs58 from 'bs58'

import { CONTRACTS, PROGRAM_ID, rpcUrl, type NetEnvironment } from './netconfig.js'

// Re-exported so every module in this package has one Solana import site. The
// published artifact ships this client bundled (scripts/bundle-solana.mjs) and
// `@solana/web3.js` is a build-time dependency only: installing it from a
// registry pulls `ws`, whose optional native peers make pnpm refuse the install
// with ERR_PNPM_IGNORED_BUILDS before the plugin is ever loaded.
export {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js'
export type { Commitment, Signer } from '@solana/web3.js'

// ---------------------------------------------------------------------------
// Constants that mirror genkaku/solana/src/state.rs
// ---------------------------------------------------------------------------

export const DECIMALS = 6
export const MICRO = 1_000_000n

export const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
/** Memo v2: carries the human-readable reason on a tip transfer. The program
 *  stores nothing and charges nothing extra; it makes the transfer legible to
 *  anyone reading the wallet's history. */
export const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr')

export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
)
export const SYSVAR_RENT = new PublicKey('SysvarRent111111111111111111111111111111111')
export const SYSVAR_CLOCK = new PublicKey('SysvarC1ock11111111111111111111111111111111')

/** Sanity ceiling on a quote: 1 USDC per started minute. */
export const MAX_PRICE_PER_MIN = 1_000_000n
/** The platform's ad price band, in micro-USDC per impression (one sponsored
 *  minute). The chain allows up to 1 USDC; the catalog refuses more than this
 *  so a typo in a console cannot buy a 10 USDC minute. */
export const MIN_AD_PRICE_PER_MIN = 100n
export const MAX_AD_PRICE_PER_MIN = 100_000n
/** Default claim threshold for a self-serve listing: 0.03 USDC. Low enough
 *  that a small advertiser's minutes are reachable, high enough that the fee
 *  does not eat the transfer. */
export const DEFAULT_MIN_CLAIM = 30_000n
/** Ceiling on what one sponsored minute may be worth. */
export const MAX_RATE_PER_MIN = 1_000_000n
/** A single `accrue` may book at most a day of minutes. */
export const MAX_ACCRUE_MINUTES = 1_440n
/** Ceiling on the campaign's claim threshold. */
export const MAX_MIN_CLAIM = 100_000_000n

/** The published reputation formula's scale: tips are counted in 0.001 USDC. */
export const TIP_SCORE_DIVISOR = 1_000n

export const ACCOUNT_LEN = {
  registry: 82,
  worker: 371,
  attestor: 74,
  campaign: 195,
  accrual: 101,
  reputation: 138,
} as const

export const DISCRIMINATOR = {
  registry: Uint8Array.from([23, 118, 10, 246, 173, 231, 243, 156]),
  worker: Uint8Array.from([224, 158, 97, 5, 224, 241, 67, 146]),
  attestor: Uint8Array.from([253, 240, 76, 196, 16, 53, 239, 173]),
  campaign: Uint8Array.from([50, 40, 49, 11, 157, 220, 229, 192]),
  accrual: Uint8Array.from([43, 96, 21, 63, 11, 129, 121, 168]),
  reputation: Uint8Array.from([55, 148, 90, 71, 68, 183, 193, 28]),
} as const

/** Instruction tags, in the order the program dispatches them. */
export const IX = {
  initRegistry: 0,
  registerWorker: 1,
  updateWorker: 2,
  transferRegistryOwner: 3,
  acceptRegistryOwner: 4,
  setRegistryPaused: 5,
  initAttestor: 6,
  setAttestor: 7,
  setAttestorPaused: 8,
  initCampaign: 9,
  fundCampaign: 10,
  setMinClaim: 11,
  setCampaignRate: 12,
  setCampaignPaused: 13,
  accrue: 14,
  claim: 15,
  closeCampaign: 16,
  transferCampaignOwner: 17,
  acceptCampaignOwner: 18,
  attest: 19,
  settleDay: 20,
} as const

/** Custom error codes the program returns, for readable failures. */
export const PROGRAM_ERRORS: Record<number, string> = {
  1: 'not authorised for this account',
  2: 'already initialised',
  3: 'account is not initialised',
  4: 'new accruals or registrations are paused',
  5: 'no ownership transfer is pending',
  6: 'quoted price does not match the listing',
  7: 'worker is not accepting jobs',
  8: 'deposit is too small',
  9: 'deposit is above the ceiling',
  10: 'session is closed',
  11: 'session has already been paid out',
  12: 'nothing to claim',
  13: 'payout wait has not elapsed yet',
  14: 'limit is above the ceiling baked into the program',
  15: 'amount overflow',
  16: 'peer id is empty or too long',
  17: 'locator is not valid UTF-8 or too long',
  18: 'token account holds a different mint',
  19: 'token account belongs to a different owner',
  20: 'unexpected session id',
  21: 'address derivation mismatch',
  22: 'not allowed to close this yet',
  23: 'malformed instruction data',
  24: 'unusable address',
  25: 'price is above the sanity ceiling',
  26: 'settlement would overdraw the deposit',
  27: 'account does not match the named wallet',
  28: 'claim is below the campaign threshold',
  29: 'the campaign cannot cover this accrual',
  30: 'attestation nonce did not advance',
}

// ---------------------------------------------------------------------------
// Addressing
// ---------------------------------------------------------------------------

export function programId(): PublicKey {
  return new PublicKey(PROGRAM_ID)
}

/** The program's own address, as every instruction builder needs it. */
const PROGRAM_KEYS = (): PublicKey => programId()

/**
 * Program addresses are derived here, off chain, and never on chain: the
 * program is a `pinocchio` build without the ed25519 curve code, so it takes
 * the bump as an instruction argument and lets the runtime verify it when it
 * signs for the new account. `findProgramAddressSync` returns exactly the pair
 * the program needs.
 */
function pda(
  seeds: (Buffer | Uint8Array)[],
  program: PublicKey = programId(),
): readonly [PublicKey, number] {
  return PublicKey.findProgramAddressSync(seeds, program)
}

export function workerPdaWithBump(
  wallet: PublicKey,
  program: PublicKey = programId(),
): readonly [PublicKey, number] {
  return pda([Buffer.from('worker'), wallet.toBuffer()], program)
}

export function registryPdaWithBump(
  program: PublicKey = programId(),
): readonly [PublicKey, number] {
  return pda([Buffer.from('registry')], program)
}

export function attestorPdaWithBump(
  program: PublicKey = programId(),
): readonly [PublicKey, number] {
  return pda([Buffer.from('attestor')], program)
}

/** One campaign per owner per index. The index is the advertiser's own
 *  counter; two advertisers can both use 0 and still get different accounts. */
export function campaignPdaWithBump(
  owner: PublicKey,
  index: number,
  program: PublicKey = programId(),
): readonly [PublicKey, number] {
  const bytes = Buffer.alloc(4)
  bytes.writeUInt32LE(index)
  return pda([Buffer.from('campaign'), owner.toBuffer(), bytes], program)
}

/** One accrual per campaign per worker: a worker paid by two advertisers has
 *  two rows, and a claim can only touch the campaign it names. */
export function accrualPdaWithBump(
  campaign: PublicKey,
  wallet: PublicKey,
  program: PublicKey = programId(),
): readonly [PublicKey, number] {
  return pda([Buffer.from('accrual'), campaign.toBuffer(), wallet.toBuffer()], program)
}

/** One reputation account per wallet per UTC day, so a day can be attested,
 *  corrected and audited without rewriting a worker's history. */
export function reputationPdaWithBump(
  wallet: PublicKey,
  day: number,
  program: PublicKey = programId(),
): readonly [PublicKey, number] {
  const bytes = Buffer.alloc(4)
  bytes.writeUInt32LE(day)
  return pda([Buffer.from('rep'), wallet.toBuffer(), bytes], program)
}

export function registryPda(program: PublicKey = programId()): PublicKey {
  return registryPdaWithBump(program)[0]
}

export function attestorPda(program: PublicKey = programId()): PublicKey {
  return attestorPdaWithBump(program)[0]
}

export function campaignPda(owner: PublicKey, index: number, program: PublicKey = programId()): PublicKey {
  return campaignPdaWithBump(owner, index, program)[0]
}

export function accrualPda(
  campaign: PublicKey,
  wallet: PublicKey,
  program: PublicKey = programId(),
): PublicKey {
  return accrualPdaWithBump(campaign, wallet, program)[0]
}

export function reputationPda(
  wallet: PublicKey,
  day: number,
  program: PublicKey = programId(),
): PublicKey {
  return reputationPdaWithBump(wallet, day, program)[0]
}

export function workerPda(wallet: PublicKey, program: PublicKey = programId()): PublicKey {
  return workerPdaWithBump(wallet, program)[0]
}

export function associatedTokenAddress(owner: PublicKey, mint: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  )[0]
}

/** The campaign's own USDC account: what a worker is paid from. */
export function vaultAddress(mint: PublicKey, campaign: PublicKey): PublicKey {
  return associatedTokenAddress(campaign, mint)
}

export function mintFor(env: NetEnvironment): PublicKey | null {
  const mint = CONTRACTS[env].usdc
  return mint === '' ? null : new PublicKey(mint)
}

// ---------------------------------------------------------------------------
// Byte helpers
// ---------------------------------------------------------------------------

export function u64(value: bigint): Buffer {
  const b = Buffer.alloc(8)
  b.writeBigUInt64LE(value)
  return b
}

function u64At(data: Buffer, offset: number): bigint {
  return data.readBigUInt64LE(offset)
}

function i64At(data: Buffer, offset: number): bigint {
  return data.readBigInt64LE(offset)
}

function u8At(data: Buffer, offset: number): number {
  return data[offset]
}

function keyAt(data: Buffer, offset: number): PublicKey {
  return new PublicKey(data.subarray(offset, offset + 32))
}

function hasDisc(data: Buffer, disc: Uint8Array): boolean {
  return data.length >= 8 && Buffer.compare(data.subarray(0, 8), Buffer.from(disc)) === 0
}

/** Build instruction data: one tag byte, then the fields the program reads. */
function data(tag: number, ...fields: Buffer[]): Buffer {
  return Buffer.concat([Buffer.from([tag]), ...fields])
}

// ---------------------------------------------------------------------------
// Decoded state
// ---------------------------------------------------------------------------

export interface RegistryState {
  address: PublicKey
  owner: PublicKey
  pendingOwner: PublicKey
  count: bigint
  paused: boolean
}

export interface WorkerState {
  address: PublicKey
  wallet: PublicKey
  pricePerMin: bigint
  active: boolean
  peerId: Uint8Array
  locator: string
}

export interface AttestorState {
  address: PublicKey
  owner: PublicKey
  attestor: PublicKey
  paused: boolean
}

export interface CampaignState {
  address: PublicKey
  owner: PublicKey
  pendingOwner: PublicKey
  mint: PublicKey
  vault: PublicKey
  funded: bigint
  accrued: bigint
  claimed: bigint
  minClaim: bigint
  ratePerMinute: bigint
  paused: boolean
  /** Which of the owner's campaigns this is. */
  index: number
  /** The UTC day the attestor has booked through. */
  lastSettledDay: number
  /** Unix seconds when the campaign was paused; 0 while live. */
  pausedAt: bigint
}

export interface AccrualState {
  address: PublicKey
  wallet: PublicKey
  campaign: PublicKey
  claimable: bigint
  lifetime: bigint
  lastAccruedAt: bigint
  lastDay: number
}

export interface ReputationState {
  address: PublicKey
  wallet: PublicKey
  attestor: PublicKey
  day: number
  sponsoredMinutes: number
  sponsoredSessions: number
  tipMicro: bigint
  tipCount: number
  distinctTippers: number
  score: number
  nonce: number
  evidenceRoot: Uint8Array
}

export function decodeRegistry(address: PublicKey, raw: Buffer): RegistryState {
  if (!hasDisc(raw, DISCRIMINATOR.registry)) throw new Error('not a RegistryConfig account')
  return {
    address,
    owner: keyAt(raw, 8),
    pendingOwner: keyAt(raw, 40),
    count: u64At(raw, 72),
    paused: u8At(raw, 81) === 1,
  }
}

export function decodeWorker(address: PublicKey, raw: Buffer): WorkerState {
  if (!hasDisc(raw, DISCRIMINATOR.worker)) throw new Error('not a Worker account')
  const peerLen = u8At(raw, 50)
  const locLen = u8At(raw, 115)
  return {
    address,
    wallet: keyAt(raw, 8),
    pricePerMin: u64At(raw, 40),
    active: u8At(raw, 48) === 1,
    peerId: Uint8Array.from(raw.subarray(51, 51 + peerLen)),
    locator: raw.subarray(116, 116 + locLen).toString('utf8'),
  }
}

export function decodeAttestor(address: PublicKey, raw: Buffer): AttestorState {
  if (!hasDisc(raw, DISCRIMINATOR.attestor)) throw new Error('not an Attestor account')
  return {
    address,
    owner: keyAt(raw, 8),
    attestor: keyAt(raw, 40),
    paused: u8At(raw, 72) === 1,
  }
}

export function decodeCampaign(address: PublicKey, raw: Buffer): CampaignState {
  if (!hasDisc(raw, DISCRIMINATOR.campaign)) throw new Error('not a Campaign account')
  return {
    address,
    owner: keyAt(raw, 8),
    pendingOwner: keyAt(raw, 40),
    mint: keyAt(raw, 72),
    vault: keyAt(raw, 104),
    funded: u64At(raw, 136),
    accrued: u64At(raw, 144),
    claimed: u64At(raw, 152),
    minClaim: u64At(raw, 160),
    ratePerMinute: u64At(raw, 168),
    paused: u8At(raw, 176) === 1,
    index: raw.readUInt32LE(179),
    lastSettledDay: raw.readUInt32LE(183),
    pausedAt: i64At(raw, 187),
  }
}

export function decodeAccrual(address: PublicKey, raw: Buffer): AccrualState {
  if (!hasDisc(raw, DISCRIMINATOR.accrual)) throw new Error('not an Accrual account')
  return {
    address,
    wallet: keyAt(raw, 8),
    campaign: keyAt(raw, 40),
    claimable: u64At(raw, 72),
    lifetime: u64At(raw, 80),
    lastAccruedAt: i64At(raw, 88),
    lastDay: raw.readUInt32LE(96),
  }
}

export function decodeReputation(address: PublicKey, raw: Buffer): ReputationState {
  if (!hasDisc(raw, DISCRIMINATOR.reputation)) throw new Error('not a Reputation account')
  return {
    address,
    wallet: keyAt(raw, 8),
    attestor: keyAt(raw, 40),
    day: raw.readUInt32LE(72),
    sponsoredMinutes: raw.readUInt32LE(76),
    sponsoredSessions: raw.readUInt32LE(80),
    tipMicro: u64At(raw, 84),
    tipCount: raw.readUInt32LE(92),
    distinctTippers: raw.readUInt32LE(96),
    nonce: raw.readUInt32LE(100),
    score: u8At(raw, 104),
    evidenceRoot: Uint8Array.from(raw.subarray(105, 137)),
  }
}

export function createIdempotentAtaIx(
  payer: PublicKey,
  owner: PublicKey,
  mint: PublicKey,
): TransactionInstruction {
  return new TransactionInstruction({
    programId: ASSOCIATED_TOKEN_PROGRAM_ID,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: associatedTokenAddress(owner, mint), isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: false, isWritable: false },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: Buffer.from([1]),
  })
}

/**
 * Token program `MintTo` (tag 7): mint `amount` of `mint` into `destination`.
 * Only the mint authority can sign it; on devnet that is the operator's key.
 */
export function mintToIx(
  mint: PublicKey,
  destination: PublicKey,
  authority: PublicKey,
  amount: bigint,
): TransactionInstruction {
  return new TransactionInstruction({
    programId: TOKEN_PROGRAM_ID,
    keys: [
      { pubkey: mint, isSigner: false, isWritable: true },
      { pubkey: destination, isSigner: false, isWritable: true },
      { pubkey: authority, isSigner: true, isWritable: false },
    ],
    data: data(7, u64(amount)),
  })
}

/**
 * Token program `TransferChecked` (tag 12): move `amount` of `mint` from the
 * owner's account to the recipient's. The mint is a required account, so a
 * transfer to a look-alike token can never be mistaken for USDC.
 */
export function transferCheckedIx(params: {
  source: PublicKey
  mint: PublicKey
  destination: PublicKey
  owner: PublicKey
  amount: bigint
  decimals?: number
}): TransactionInstruction {
  const decimals = params.decimals ?? DECIMALS
  const payload = Buffer.concat([
    Buffer.from([12]),
    u64(params.amount),
    Buffer.from([decimals & 0xff]),
  ])

  return new TransactionInstruction({
    programId: TOKEN_PROGRAM_ID,
    keys: [
      { pubkey: params.source, isSigner: false, isWritable: true },
      { pubkey: params.mint, isSigner: false, isWritable: false },
      { pubkey: params.destination, isSigner: false, isWritable: true },
      { pubkey: params.owner, isSigner: true, isWritable: false },
    ],
    data: payload,
  })
}

/** Memo v2 instruction. `signer` is optional: the memo is not an authorisation,
 *  it is a note attached to a transaction that already has one. */
export function memoIx(memo: string, signer?: PublicKey): TransactionInstruction {
  return new TransactionInstruction({
    programId: MEMO_PROGRAM_ID,
    keys: signer == null ? [] : [{ pubkey: signer, isSigner: true, isWritable: false }],
    data: Buffer.from(memo, 'utf8'),
  })
}

export function initRegistryIx(payer: PublicKey): TransactionInstruction {
  const [registry, bump] = registryPdaWithBump()
  return new TransactionInstruction({
    programId: PROGRAM_KEYS(),
    keys: [
      { pubkey: registry, isSigner: false, isWritable: true },
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT, isSigner: false, isWritable: false },
    ],
    data: data(IX.initRegistry, Buffer.from([bump])),
  })
}

export interface RegisterParams {
  wallet: PublicKey
  pricePerMin: bigint
  active: boolean
  peerId: Uint8Array
  locator?: string
}

export function registerWorkerIx(p: RegisterParams): TransactionInstruction {
  const peer = Buffer.from(p.peerId)
  const locator = Buffer.from(p.locator ?? '', 'utf8')
  if (peer.length === 0 || peer.length > 64) throw new Error('peer id must be 1..64 bytes')
  if (locator.length > 255) throw new Error('locator must be at most 255 bytes')
  const [worker, bump] = workerPdaWithBump(p.wallet)
  return new TransactionInstruction({
    programId: PROGRAM_KEYS(),
    keys: [
      { pubkey: worker, isSigner: false, isWritable: true },
      { pubkey: p.wallet, isSigner: true, isWritable: true },
      { pubkey: registryPda(), isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT, isSigner: false, isWritable: false },
    ],
    data: data(
      IX.registerWorker,
      u64(p.pricePerMin),
      Buffer.from([p.active ? 1 : 0, peer.length]),
      peer,
      Buffer.from([locator.length]),
      locator,
      Buffer.from([bump]),
    ),
  })
}

export function updateWorkerIx(p: Omit<RegisterParams, 'peerId'>): TransactionInstruction {
  const locator = Buffer.from(p.locator ?? '', 'utf8')
  if (locator.length > 255) throw new Error('locator must be at most 255 bytes')
  return new TransactionInstruction({
    programId: PROGRAM_KEYS(),
    keys: [
      { pubkey: workerPda(p.wallet), isSigner: false, isWritable: true },
      { pubkey: p.wallet, isSigner: true, isWritable: false },
    ],
    data: data(
      IX.updateWorker,
      u64(p.pricePerMin),
      Buffer.from([p.active ? 1 : 0, locator.length]),
      locator,
    ),
  })
}

export function setRegistryPausedIx(owner: PublicKey, paused: boolean): TransactionInstruction {
  return new TransactionInstruction({
    programId: PROGRAM_KEYS(),
    keys: [
      { pubkey: registryPda(), isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
    ],
    data: data(IX.setRegistryPaused, Buffer.from([paused ? 1 : 0])),
  })
}

// ── attestor ───────────────────────────────────────────────────────────────

export function initAttestorIx(payer: PublicKey, attestor: PublicKey): TransactionInstruction {
  const [account, bump] = attestorPdaWithBump()
  return new TransactionInstruction({
    programId: PROGRAM_KEYS(),
    keys: [
      { pubkey: account, isSigner: false, isWritable: true },
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT, isSigner: false, isWritable: false },
    ],
    data: data(IX.initAttestor, attestor.toBuffer(), Buffer.from([bump])),
  })
}

export function setAttestorIx(owner: PublicKey, attestor: PublicKey): TransactionInstruction {
  return new TransactionInstruction({
    programId: PROGRAM_KEYS(),
    keys: [
      { pubkey: attestorPda(), isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
    ],
    data: data(IX.setAttestor, attestor.toBuffer()),
  })
}

export function setAttestorPausedIx(owner: PublicKey, paused: boolean): TransactionInstruction {
  return new TransactionInstruction({
    programId: PROGRAM_KEYS(),
    keys: [
      { pubkey: attestorPda(), isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
    ],
    data: data(IX.setAttestorPaused, Buffer.from([paused ? 1 : 0])),
  })
}

// ── campaign ───────────────────────────────────────────────────────────────

export function initCampaignIx(p: {
  owner: PublicKey
  index: number
  mint: PublicKey
  vault: PublicKey
  minClaim: bigint
  ratePerMinute: bigint
}): TransactionInstruction {
  const [campaign, bump] = campaignPdaWithBump(p.owner, p.index)
  const indexBytes = Buffer.alloc(4)
  indexBytes.writeUInt32LE(p.index)
  return new TransactionInstruction({
    programId: PROGRAM_KEYS(),
    keys: [
      { pubkey: campaign, isSigner: false, isWritable: true },
      { pubkey: p.owner, isSigner: true, isWritable: true },
      { pubkey: p.mint, isSigner: false, isWritable: false },
      { pubkey: p.vault, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT, isSigner: false, isWritable: false },
    ],
    data: data(IX.initCampaign, u64(p.minClaim), u64(p.ratePerMinute), indexBytes, Buffer.from([bump])),
  })
}

export function fundCampaignIx(p: {
  campaign: PublicKey
  owner: PublicKey
  ownerAta: PublicKey
  mint: PublicKey
  amount: bigint
}): TransactionInstruction {
  return new TransactionInstruction({
    programId: PROGRAM_KEYS(),
    keys: [
      { pubkey: p.campaign, isSigner: false, isWritable: true },
      { pubkey: p.owner, isSigner: true, isWritable: false },
      { pubkey: p.ownerAta, isSigner: false, isWritable: true },
      { pubkey: vaultAddress(p.mint, p.campaign), isSigner: false, isWritable: true },
      { pubkey: p.mint, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: data(IX.fundCampaign, u64(p.amount)),
  })
}

export function setMinClaimIx(campaign: PublicKey, owner: PublicKey, minClaim: bigint): TransactionInstruction {
  return new TransactionInstruction({
    programId: PROGRAM_KEYS(),
    keys: [
      { pubkey: campaign, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
    ],
    data: data(IX.setMinClaim, u64(minClaim)),
  })
}

export function setCampaignRateIx(campaign: PublicKey, owner: PublicKey, ratePerMinute: bigint): TransactionInstruction {
  return new TransactionInstruction({
    programId: PROGRAM_KEYS(),
    keys: [
      { pubkey: campaign, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
    ],
    data: data(IX.setCampaignRate, u64(ratePerMinute)),
  })
}

export function setCampaignPausedIx(campaign: PublicKey, owner: PublicKey, paused: boolean): TransactionInstruction {
  return new TransactionInstruction({
    programId: PROGRAM_KEYS(),
    keys: [
      { pubkey: campaign, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
      { pubkey: SYSVAR_CLOCK, isSigner: false, isWritable: false },
    ],
    data: data(IX.setCampaignPaused, Buffer.from([paused ? 1 : 0])),
  })
}

/**
 * Book sponsored minutes to one worker.
 *
 * `attestor` signs and pays: the config PDA cannot sign a transaction, so the
 * key it names is an ordinary wallet. The accrual account is created on first
 * payment.
 */
export function accrueIx(p: {
  attestor: PublicKey
  campaign: PublicKey
  worker: PublicKey
  minutes: bigint
  day: number
}): TransactionInstruction {
  const [accrual, bump] = accrualPdaWithBump(p.campaign, p.worker)
  const dayBytes = Buffer.alloc(4)
  dayBytes.writeUInt32LE(p.day)
  const minuteBytes = Buffer.alloc(4)
  minuteBytes.writeUInt32LE(Number(p.minutes))
  return new TransactionInstruction({
    programId: PROGRAM_KEYS(),
    keys: [
      { pubkey: attestorPda(), isSigner: false, isWritable: false },
      { pubkey: p.attestor, isSigner: true, isWritable: true },
      { pubkey: p.campaign, isSigner: false, isWritable: true },
      { pubkey: accrual, isSigner: false, isWritable: true },
      { pubkey: workerPda(p.worker), isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_CLOCK, isSigner: false, isWritable: false },
    ],
    data: data(IX.accrue, minuteBytes, dayBytes, Buffer.from([bump])),
  })
}

/** A worker takes what it is owed. The threshold is the campaign's, not ours. */
export function claimCampaignIx(p: {
  campaign: PublicKey
  worker: PublicKey
  workerAta: PublicKey
  mint: PublicKey
}): TransactionInstruction {
  return new TransactionInstruction({
    programId: PROGRAM_KEYS(),
    keys: [
      { pubkey: p.campaign, isSigner: false, isWritable: true },
      { pubkey: accrualPda(p.campaign, p.worker), isSigner: false, isWritable: true },
      { pubkey: p.worker, isSigner: true, isWritable: false },
      { pubkey: p.workerAta, isSigner: false, isWritable: true },
      { pubkey: vaultAddress(p.mint, p.campaign), isSigner: false, isWritable: true },
      { pubkey: p.mint, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: data(IX.claim),
  })
}

export function closeCampaignIx(p: {
  campaign: PublicKey
  owner: PublicKey
  ownerAta: PublicKey
  mint: PublicKey
  amount: bigint
}): TransactionInstruction {
  return new TransactionInstruction({
    programId: PROGRAM_KEYS(),
    keys: [
      { pubkey: p.campaign, isSigner: false, isWritable: true },
      { pubkey: p.owner, isSigner: true, isWritable: false },
      { pubkey: p.ownerAta, isSigner: false, isWritable: true },
      { pubkey: vaultAddress(p.mint, p.campaign), isSigner: false, isWritable: true },
      { pubkey: p.mint, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_CLOCK, isSigner: false, isWritable: false },
    ],
    data: data(IX.closeCampaign, u64(p.amount)),
  })
}

/** Record that the attestor has booked through `day` for this campaign. */
export function settleDayIx(p: {
  attestor: PublicKey
  campaign: PublicKey
  day: number
}): TransactionInstruction {
  const dayBytes = Buffer.alloc(4)
  dayBytes.writeUInt32LE(p.day)
  return new TransactionInstruction({
    programId: PROGRAM_KEYS(),
    keys: [
      { pubkey: attestorPda(), isSigner: false, isWritable: false },
      { pubkey: p.attestor, isSigner: true, isWritable: true },
      { pubkey: p.campaign, isSigner: false, isWritable: true },
      { pubkey: SYSVAR_CLOCK, isSigner: false, isWritable: false },
    ],
    data: data(IX.settleDay, dayBytes),
  })
}

export function transferCampaignOwnerIx(campaign: PublicKey, owner: PublicKey, next: PublicKey): TransactionInstruction {
  return new TransactionInstruction({
    programId: PROGRAM_KEYS(),
    keys: [
      { pubkey: campaign, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
    ],
    data: data(IX.transferCampaignOwner, next.toBuffer()),
  })
}

export function acceptCampaignOwnerIx(campaign: PublicKey, next: PublicKey): TransactionInstruction {
  return new TransactionInstruction({
    programId: PROGRAM_KEYS(),
    keys: [
      { pubkey: campaign, isSigner: false, isWritable: true },
      { pubkey: next, isSigner: true, isWritable: false },
    ],
    data: data(IX.acceptCampaignOwner),
  })
}

/** Write one day of one worker's reputation. The program computes the score. */
export function attestIx(p: {
  attestor: PublicKey
  wallet: PublicKey
  day: number
  minutes: number
  sessions: number
  tipMicro: bigint
  tipCount: number
  tippers: number
  nonce: number
  evidenceRoot: Uint8Array
}): TransactionInstruction {
  if (p.evidenceRoot.length !== 32) throw new Error('evidence root must be 32 bytes')
  const [rep, bump] = reputationPdaWithBump(p.wallet, p.day)
  const u32 = (v: number): Buffer => {
    const b = Buffer.alloc(4)
    b.writeUInt32LE(v)
    return b
  }
  return new TransactionInstruction({
    programId: PROGRAM_KEYS(),
    keys: [
      { pubkey: attestorPda(), isSigner: false, isWritable: false },
      { pubkey: p.attestor, isSigner: true, isWritable: true },
      { pubkey: rep, isSigner: false, isWritable: true },
      { pubkey: p.wallet, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT, isSigner: false, isWritable: false },
    ],
    data: data(
      IX.attest,
      u32(p.day),
      u32(p.minutes),
      u32(p.sessions),
      u64(p.tipMicro),
      u32(p.tipCount),
      u32(p.tippers),
      u32(p.nonce),
      Buffer.from(p.evidenceRoot),
      Buffer.from([bump]),
    ),
  })
}

export function transferRegistryOwnerIx(owner: PublicKey, next: PublicKey): TransactionInstruction {
  return new TransactionInstruction({
    programId: PROGRAM_KEYS(),
    keys: [
      { pubkey: registryPda(), isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
    ],
    data: data(IX.transferRegistryOwner, next.toBuffer()),
  })
}

export function acceptRegistryOwnerIx(next: PublicKey): TransactionInstruction {
  return new TransactionInstruction({
    programId: PROGRAM_KEYS(),
    keys: [
      { pubkey: registryPda(), isSigner: false, isWritable: true },
      { pubkey: next, isSigner: true, isWritable: false },
    ],
    data: data(IX.acceptRegistryOwner),
  })
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

/** Hard ceiling on one RPC round trip.
 *
 *  web3.js builds its `Connection` on the global `fetch` and gives it no
 *  timeout, so a public endpoint that accepts the socket and then stops
 *  answering leaves the promise pending FOREVER. That is not a slow panel: the
 *  panel's status probe gives up, and every later read queues behind the hung
 *  one. Fifteen seconds is far above a healthy devnet reply and far below
 *  "never". */
const RPC_TIMEOUT_MS = 15_000

/** `fetch` with our deadline, still honouring a caller's own signal. */
function fetchWithTimeout(input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]): ReturnType<typeof fetch> {
  const controller = new AbortController()
  const timer = setTimeout(() => {
    controller.abort(new Error(`RPC request timed out after ${RPC_TIMEOUT_MS / 1000}s`))
  }, RPC_TIMEOUT_MS)
  const outer = init?.signal

  if (outer != null) {
    if (outer.aborted) controller.abort(outer.reason)
    else outer.addEventListener('abort', () => { controller.abort(outer.reason) }, { once: true })
  }

  return fetch(input, { ...init, signal: controller.signal })
    .finally(() => { clearTimeout(timer) })
}

export function connection(env: NetEnvironment, commitment: Commitment = 'confirmed'): Connection {
  return new Connection(rpcUrl(env), { commitment, fetch: fetchWithTimeout })
}

async function accountData(conn: Connection, address: PublicKey): Promise<Buffer | null> {
  const info = await conn.getAccountInfo(address, 'confirmed')
  return info ? Buffer.from(info.data) : null
}

export async function readRegistry(conn: Connection): Promise<RegistryState | null> {
  const address = registryPda()
  const raw = await accountData(conn, address)
  return raw ? decodeRegistry(address, raw) : null
}

export async function readAttestor(conn: Connection): Promise<AttestorState | null> {
  const address = attestorPda()
  const raw = await accountData(conn, address)
  return raw ? decodeAttestor(address, raw) : null
}

export async function readCampaign(
  conn: Connection,
  campaign: PublicKey,
): Promise<CampaignState | null> {
  const raw = await accountData(conn, campaign)
  return raw ? decodeCampaign(campaign, raw) : null
}

export async function readAccrual(
  conn: Connection,
  campaign: PublicKey,
  wallet: PublicKey,
): Promise<AccrualState | null> {
  const address = accrualPda(campaign, wallet)
  const raw = await accountData(conn, address)
  return raw ? decodeAccrual(address, raw) : null
}

export async function readReputation(
  conn: Connection,
  wallet: PublicKey,
  day: number,
): Promise<ReputationState | null> {
  const address = reputationPda(wallet, day)
  const raw = await accountData(conn, address)
  return raw ? decodeReputation(address, raw) : null
}

export async function readWorkerAccount(
  conn: Connection,
  wallet: PublicKey,
): Promise<WorkerState | null> {
  const address = workerPda(wallet)
  const raw = await accountData(conn, address)
  return raw ? decodeWorker(address, raw) : null
}

/**
 * Every worker listing, in one `getProgramAccounts` call.
 *
 * The discriminator filter is sent as base58 because that is what the RPC
 * expects for `memcmp` bytes; `dataSlice` keeps the response to exactly the
 * 260 bytes of a Worker so a busy directory does not turn into megabytes.
 */
export async function listWorkers(conn: Connection): Promise<WorkerState[]> {
  const accounts = await conn.getProgramAccounts(programId(), {
    commitment: 'confirmed',
    filters: [{ memcmp: { offset: 0, bytes: bs58.encode(DISCRIMINATOR.worker) } }],
    dataSlice: { offset: 0, length: ACCOUNT_LEN.worker },
  })
  const out: WorkerState[] = []
  for (const { pubkey, account } of accounts) {
    const raw = Buffer.from(account.data)
    if (raw.length < ACCOUNT_LEN.worker) continue
    try {
      out.push(decodeWorker(pubkey, raw))
    } catch {
      // A malformed account is not worth failing the whole listing over.
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// Sending
// ---------------------------------------------------------------------------

export interface SendOptions {
  /** Priority fee in micro-lamports per compute unit. */
  priorityFee?: number
  computeUnits?: number
  commitment?: Commitment
}

/**
 * Sign, send and confirm one transaction, retrying once if the blockhash went
 * stale between fetch and send.
 *
 * The retry is not defensive padding: a public RPC can take longer than the
 * ~60 s blockhash window under load, and losing a settlement to that would
 * leave a worker unpaid with no way to prove it did the work.
 */
export async function send(
  conn: Connection,
  payer: Keypair,
  ixs: TransactionInstruction[],
  signers: Signer[] = [],
  opts: SendOptions = {},
): Promise<string> {
  if (ixs.length === 0) throw new Error('no instructions to send')
  const commitment = opts.commitment ?? 'confirmed'
  const priorityFee = opts.priorityFee ?? 50_000
  const computeUnits = opts.computeUnits ?? 400_000

  let lastError: unknown
  for (let attempt = 0; attempt < 2; attempt++) {
    const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash(commitment)
    const tx = new Transaction()
    tx.feePayer = payer.publicKey
    tx.recentBlockhash = blockhash
    tx.add(
      ComputeBudgetProgram.setComputeUnitLimit({ units: computeUnits }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityFee }),
    )
    for (const ix of ixs) tx.add(ix)
    tx.sign(payer, ...signers)

    try {
      const signature = await conn.sendRawTransaction(tx.serialize(), {
        skipPreflight: false,
        maxRetries: 3,
      })
      const result = await conn.confirmTransaction(
        { signature, blockhash, lastValidBlockHeight },
        commitment,
      )
      if (result.value.err) {
        throw new Error(
          `transaction ${signature} failed: ${JSON.stringify(result.value.err)}`,
        )
      }
      return signature
    } catch (err) {
      lastError = err
      if (!isStaleBlockhash(err)) throw err
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}

function isStaleBlockhash(err: unknown): boolean {
  const text = err instanceof Error ? err.message : String(err)
  return /blockhash not found|BlockhashNotFound|block height exceeded/i.test(text)
}

/** Turn a simulation failure into something a user can act on. */
export function explain(err: unknown): string {
  const text = err instanceof Error ? err.message : String(err)
  const custom = text.match(/custom program error: 0x([0-9a-f]+)/i)
  if (custom) {
    const code = parseInt(custom[1], 16)
    const known = PROGRAM_ERRORS[code]
    if (known) return known
    return `program rejected the transaction (code ${code})`
  }
  if (/insufficient lamports|InsufficientFundsForFee|no record of a prior credit/i.test(text)) {
    return 'not enough SOL in the wallet to pay the network fee'
  }
  if (/insufficient funds/i.test(text)) {
    return 'not enough USDC in the wallet for this deposit'
  }
  if (/could not find account|AccountNotFound/i.test(text)) {
    return 'an account this transaction needs does not exist yet'
  }
  return text
}

// ---------------------------------------------------------------------------
// Pricing helpers
// ---------------------------------------------------------------------------

/** UI quotes per hour; the chain bills per started minute. */
export function hourlyToPerMinute(hourlyMicro: bigint): bigint {
  if (hourlyMicro <= 0n) return 0n
  return (hourlyMicro + 59n) / 60n
}

export function perMinuteToHourly(perMinute: bigint): bigint {
  return perMinute * 60n
}

/** Minutes a deposit buys at a given price. 0 for a free listing. */
export function minutesAffordable(deposit: bigint, pricePerMin: bigint): bigint {
  if (pricePerMin === 0n) return 0n
  return deposit / pricePerMin
}

export function toMicro(usdc: number): bigint {
  return BigInt(Math.round(usdc * Number(MICRO)))
}

export function fromMicro(micro: bigint): number {
  return Number(micro) / Number(MICRO)
}

export function formatUsdc(micro: bigint, digits = 2): string {
  const negative = micro < 0n
  const abs = negative ? -micro : micro
  const whole = abs / MICRO
  const frac = abs % MICRO
  const text = `${whole}.${frac.toString().padStart(6, '0').slice(0, digits)}`
  return negative ? `-${text}` : text
}

/**
 * The published reputation score, recomputed off chain so a client can price a
 * worker without trusting a number it read.
 *
 * Mirrors `score_of` in `genkaku/solana/src/state.rs` exactly.
 */
export function reputationScore(
  tipMicro: bigint,
  sponsoredMinutes: number,
  distinctTippers: number,
): number {
  const tips = tipMicro / TIP_SCORE_DIVISOR
  const raw = tips + BigInt(sponsoredMinutes) * 2n + BigInt(distinctTippers) * 25n
  let x = raw
  if (x >= 2n) {
    let y = (x + 1n) / 2n
    while (y < x) {
      x = y
      y = (x + raw / x) / 2n
    }
  }
  return x > 100n ? 100 : Number(x)
}
