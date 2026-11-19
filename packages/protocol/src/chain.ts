// GENKAKU: settlement layer bindings — one Solana program.
//
// Two clusters, one program id, one account graph. devnet settles a mock
// 6-decimal USDC mint; mainnet settles Circle's. An env whose mint is empty
// refuses every money-moving write, which is what keeps a half-configured
// build from spending real USDC.
//
// Who pays for what:
//   user    → open the session (deposit), close it (refund of the unused part)
//   worker  → settle (its own signature is the proof it served), claim (payout)
//
// The worker submitting `settle` itself is the design change from the contract
// version: there is no `workerSig` to recover and no digest to re-encode,
// because the transaction signature already proves who is asking. What the
// user keeps is a receipt ledger — the ceiling the worker may settle up to.
//
// Everything here is a thin domain layer over `solana.ts`: that file owns the
// byte layouts and instruction encoding, this one owns the product's verbs.

import { Keypair, PublicKey } from './solana.js'

import { chainWrite, chainWriteFor } from './chainQueue.ts'
import { keypairOf, normalizeKey } from './keys.ts'
import { CONTRACTS, rpcUrl, type NetEnvironment } from './netconfig.ts'
import { digestFor, signDigest, type Digest, type ReceiptPayloadV1 } from './receipts.ts'
import type { RegistryWorker } from './registry.ts'
import { peerIdBytesOf, peerIdFromBytes } from './registry.ts'
import {
  MAX_ACCRUE_MINUTES,
  MAX_MIN_CLAIM,
  MAX_RATE_PER_MIN,
  DEFAULT_MIN_CLAIM as PROTOCOL_DEFAULT_MIN_CLAIM,
  attestIx,
  campaignPda,
  claimCampaignIx,
  closeCampaignIx,
  connection,
  createIdempotentAtaIx,
  fundCampaignIx,
  initAttestorIx,
  initCampaignIx,
  initRegistryIx,
  listWorkers,
  mintFor,
  mintToIx,
  memoIx,
  readAccrual,
  readAttestor,
  readCampaign,
  readReputation,
  readWorkerAccount,
  registerWorkerIx,
  reputationPda,
  send,
  setAttestorIx,
  setCampaignPausedIx,
  setCampaignRateIx,
  setMinClaimIx,
  setRegistryPausedIx,
  settleDayIx,
  transferCheckedIx,
  updateWorkerIx,
  vaultAddress,
  type AccrualState,
  type AttestorState,
  type CampaignState,
  type ReputationState,
  type WorkerState,
  accrueIx,
  associatedTokenAddress,
} from './solana.ts'

/** Hard ceiling on one tip: 5 USDC. A tip is a gesture, not a payment channel. */
export const MAX_TIP_MICRO = 5_000_000n

/** A read-only handle: a connection to the cluster for one environment. */
export type GenkakuPublic = ReturnType<typeof connection>
/** A signing handle: an ed25519 keypair that also pays the network fee. */
export type GenkakuWallet = Keypair

const CONNECTIONS = new Map<string, GenkakuPublic>()

/**
 * One connection per (cluster, endpoint). `Connection` keeps a websocket and a
 * request-agent per instance, so building a new one per read would leak both.
 */
export function publicClientFor(env: NetEnvironment): GenkakuPublic {
  const key = `${env}|${rpcUrl(env)}`
  let conn = CONNECTIONS.get(key)

  if (conn == null) {
    conn = connection(env)
    CONNECTIONS.set(key, conn)
  }

  return conn
}

/**
 * The wallet handle for writes. It is the keypair itself — Solana has no
 * separate "wallet client" — but the function stays so a caller cannot forget
 * which environment it is about to spend in.
 */
export function walletClientFor(env: NetEnvironment, key: GenkakuWallet): GenkakuWallet {
  if (!(key.publicKey instanceof PublicKey)) {
    throw new Error(`[genkaku:chain] not a keypair for ${env}`)
  }

  return key
}

/** The account address (base58) of a signing key. */
export function walletAddress(key: GenkakuWallet): string {
  return key.publicKey.toBase58()
}

/** The configured USDC mint, or a refusal that names the missing step. */
function requireMint(env: NetEnvironment): PublicKey {
  const mint = mintFor(env)

  if (mint == null) {
    throw new Error(
      `[genkaku:chain] no USDC mint configured for ${env} — `
      + 'deploy the program and run packages/protocol/scripts/init-cluster.ts for this cluster first',
    )
  }

  return mint
}

export function keyOf(address: string): PublicKey {
  try {
    return new PublicKey(address)
  } catch {
    throw new Error(`[genkaku:chain] not a Solana address: ${address}`)
  }
}

// ── read ───────────────────────────────────────────────────────────────────

/** What the directory needs from one worker's entry. */
export type WorkerRecord = {
  active: boolean
  peerId: Uint8Array
  locator: string
  pricePerMin: bigint
}

/** The chain view of one worker's directory entry (null when never registered). */
export async function readWorker(
  conn: GenkakuPublic,
  env: NetEnvironment,
  wallet: string,
): Promise<WorkerRecord | null> {
  if (CONTRACTS[env].program === '') return null

  let record: WorkerState | null

  try {
    record = await readWorkerAccount(conn, keyOf(wallet))
  } catch {
    return null
  }

  if (record == null) return null

  return {
    active: record.active,
    peerId: record.peerId,
    locator: record.locator,
    pricePerMin: record.pricePerMin,
  }
}

/** What this worker may claim right now, and what it has ever earned. */
export async function readWorkerAccrual(
  conn: GenkakuPublic,
  campaign: PublicKey,
  wallet: string,
): Promise<AccrualState | null> {
  return await readAccrual(conn, campaign, keyOf(wallet)).catch(() => null)
}

/** One campaign's state: funded, accrued, claimed, rate and settlement day. */
export async function readCampaignState(
  conn: GenkakuPublic,
  campaign: PublicKey,
): Promise<CampaignState | null> {
  return await readCampaign(conn, campaign).catch(() => null)
}

/** Who may accrue and attest, and whether they currently may. */
export async function readAttestorState(conn: GenkakuPublic): Promise<AttestorState | null> {
  return await readAttestor(conn).catch(() => null)
}

/** One day of one worker's record. */
export async function readDayReputation(
  conn: GenkakuPublic,
  wallet: string,
  day: number,
): Promise<ReputationState | null> {
  return await readReputation(conn, keyOf(wallet), day).catch(() => null)
}

/** Native and token balances for one wallet. @property sol lamports (1e9 =
 *  1 SOL); @property usdc micro-USDC (1e6 = 1 USDC). */
export type WalletBalances = { sol: bigint; usdc: bigint }

/** Budget for one balance read.
 *
 *  Callers are panels that poll every few seconds: a figure that arrives later
 *  than this has already been replaced by the next poll, and waiting for it
 *  only makes the whole status response look dead. Callers keep the previous
 *  snapshot and retry, so refusing here costs nothing. */
const BALANCE_READ_BUDGET_MS = 8_000

/** Reject when `work` has not answered inside `ms`.
 *
 *  Exported for the regression test that keeps a stalled RPC from holding a
 *  status request open forever. */
export async function withDeadline<T>(work: Promise<T>, ms: number, what: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => { reject(new Error(`${what} timed out after ${ms / 1000}s`)) }, ms)
      }),
    ])
  } finally {
    if (timer != null) clearTimeout(timer)
  }
}

/**
 * Read the balances a user needs before opening a session: USDC to pay and SOL
 * for rent and fees.
 *
 * The token amount is decoded straight out of the account (mint 32 ‖ owner 32 ‖
 * amount u64) rather than through `@solana/spl-token`: one 72-byte read, no
 * extra dependency in a published bundle.
 */
export async function readWalletBalances(
  conn: GenkakuPublic,
  env: NetEnvironment,
  wallet: string,
): Promise<WalletBalances> {
  const owner = keyOf(wallet)
  const mint = mintFor(env)

  const [lamports, account] = await withDeadline(Promise.all([
    conn.getBalance(owner, 'confirmed'),
    mint == null ? Promise.resolve(null) : conn.getAccountInfo(associatedTokenAddress(owner, mint), 'confirmed'),
  ]), BALANCE_READ_BUDGET_MS, 'balance read')

  let usdc = 0n

  if (account != null && account.data.length >= 72) {
    const data = account.data
    const accountMint = new PublicKey(data.subarray(0, 32))

    // Only count the token account if it really is ours and really is USDC.
    if (accountMint.equals(mint as PublicKey) && new PublicKey(data.subarray(32, 64)).equals(owner)) {
      usdc = data.readBigUInt64LE(64)
    }
  }

  return { sol: BigInt(lamports), usdc }
}

// ── campaign writes ────────────────────────────────────────────────────────

/**
 * Claim threshold: 3 USDC on mainnet, 0.05 on devnet.
 *
 * At 0.005 USDC a sponsored minute, 3 USDC is 600 minutes of work — a milestone,
 * not a routine. That is the right shape for real money (the claim's fee should
 * never be a meaningful fraction of the claim) and completely wrong for a test
 * cluster, where a worker would never reach it. The program itself accepts
 * anything up to 100 USDC; this is the default the operator starts from.
 */
export const DEVNET_MIN_CLAIM = PROTOCOL_DEFAULT_MIN_CLAIM

export function defaultMinClaim(_env: NetEnvironment): bigint {
  // 0.4: self-serve listings split a worker's revenue across campaigns, so the
  // 3 USDC mainnet threshold would make small ads unclaimable forever. 0.05
  // USDC plus batched claims keeps the fee a small fraction of the transfer.
  return PROTOCOL_DEFAULT_MIN_CLAIM
}

/** Default price of one sponsored started minute: 0.005 USDC. */
export const DEFAULT_RATE_PER_MINUTE = 5_000n

/** The address of one advertiser's campaign. Derived, never stored off chain. */
export function campaignAddress(owner: string | PublicKey, index: number): PublicKey {
  return campaignPda(typeof owner === 'string' ? keyOf(owner) : owner, index)
}

/** The first index this wallet has not used yet. Campaigns are cheap to read
 *  and an advertiser has a handful, so a linear scan is the honest version. */
export async function nextCampaignIndex(conn: GenkakuPublic, owner: PublicKey): Promise<number> {
  for (let index = 0; index < 512; index += 1) {
    const raw = await conn.getAccountInfo(campaignAddress(owner, index)).catch(() => null)
    if (raw == null) return index
  }

  throw new Error('[genkaku:campaign] this wallet already has too many campaigns')
}

/**
 * Create one campaign and its vault.
 *
 * The vault is the campaign PDA's associated token account: its address is
 * derivable before the campaign exists, which is why the ATA is created first
 * and passed in for the program to verify.
 */
export function initCampaign(
  conn: GenkakuPublic,
  payer: GenkakuWallet,
  env: NetEnvironment,
  opts: { index: number; minClaim?: bigint; ratePerMinute?: bigint },
): Promise<string> {
  const minClaim = opts.minClaim ?? defaultMinClaim(env)
  const rate = opts.ratePerMinute ?? DEFAULT_RATE_PER_MINUTE
  const campaign = campaignAddress(payer.publicKey, opts.index)

  if (minClaim > MAX_MIN_CLAIM) throw new Error(`[genkaku:campaign] min claim above ${MAX_MIN_CLAIM}`)
  if (rate > MAX_RATE_PER_MIN) throw new Error(`[genkaku:campaign] rate above ${MAX_RATE_PER_MIN}`)

  return chainWriteFor(payer, async () => {
    const mint = requireMint(env)

    return await send(conn, payer, [
      createIdempotentAtaIx(payer.publicKey, campaign, mint),
      initCampaignIx({
        owner: payer.publicKey,
        index: opts.index,
        mint,
        vault: vaultAddress(mint, campaign),
        minClaim,
        ratePerMinute: rate,
      }),
    ])
  })
}

/** Put money in the pool. The only path that increases what can be promised. */
export function fundCampaign(
  conn: GenkakuPublic,
  payer: GenkakuWallet,
  env: NetEnvironment,
  campaign: PublicKey,
  amount: bigint,
): Promise<string> {
  if (amount <= 0n) return Promise.reject(new Error('[genkaku:campaign] amount must be positive'))

  return chainWriteFor(payer, async () => {
    const mint = requireMint(env)

    return await send(conn, payer, [
      createIdempotentAtaIx(payer.publicKey, payer.publicKey, mint),
      fundCampaignIx({
        campaign,
        owner: payer.publicKey,
        ownerAta: associatedTokenAddress(payer.publicKey, mint),
        mint,
        amount,
      }),
    ])
  })
}

/**
 * Book sponsored minutes to one worker.
 *
 * The attestor key signs. The chain refuses an amount the pool cannot cover, so
 * this either owes a worker real money or fails — there is no in-between.
 */
export function accrueMinutes(
  conn: GenkakuPublic,
  attestor: GenkakuWallet,
  campaign: PublicKey,
  worker: string,
  minutes: bigint,
  day: number,
): Promise<string> {
  if (minutes <= 0n) return Promise.reject(new Error('[genkaku:accrue] minutes must be positive'))
  if (minutes > MAX_ACCRUE_MINUTES) {
    return Promise.reject(new Error(`[genkaku:accrue] at most ${MAX_ACCRUE_MINUTES} minutes at a time`))
  }

  return chainWriteFor(attestor, async () => await send(conn, attestor, [
    accrueIx({ attestor: attestor.publicKey, campaign, worker: keyOf(worker), minutes, day }),
  ]))
}

/** A worker takes what one campaign owes it. No approval step exists. */
export function claimAccrual(
  conn: GenkakuPublic,
  worker: GenkakuWallet,
  env: NetEnvironment,
  campaign: PublicKey,
): Promise<string> {
  return chainWriteFor(worker, async () => {
    const mint = requireMint(env)

    return await send(conn, worker, [
      // A worker that has never held USDC needs the account before it can be
      // paid; creating it here keeps the claim a single transaction.
      createIdempotentAtaIx(worker.publicKey, worker.publicKey, mint),
      claimCampaignIx({
        campaign,
        worker: worker.publicKey,
        workerAta: associatedTokenAddress(worker.publicKey, mint),
        mint,
      }),
    ])
  })
}

/**
 * Claim every campaign above its threshold in one transaction.
 *
 * A self-serve ad splits a worker's revenue into many small rows, so claiming
 * one at a time would spend more on fees than the rows are worth. Each claim is
 * still checked by the program against its own campaign and threshold.
 */
export function claimAccruals(
  conn: GenkakuPublic,
  worker: GenkakuWallet,
  env: NetEnvironment,
  campaigns: readonly PublicKey[],
): Promise<string> {
  if (campaigns.length === 0) {
    return Promise.reject(new Error('[genkaku:claim] nothing to claim'))
  }

  return chainWriteFor(worker, async () => {
    const mint = requireMint(env)
    const workerAta = associatedTokenAddress(worker.publicKey, mint)

    return await send(conn, worker, [
      createIdempotentAtaIx(worker.publicKey, worker.publicKey, mint),
      ...campaigns.map(campaign => claimCampaignIx({
        campaign,
        worker: worker.publicKey,
        workerAta,
        mint,
      })),
    ])
  })
}

/** Withdraw money the pool never promised. Accrued minutes are not withdrawable. */
export function closeCampaign(
  conn: GenkakuPublic,
  owner: GenkakuWallet,
  env: NetEnvironment,
  campaign: PublicKey,
  amount: bigint,
): Promise<string> {
  return chainWriteFor(owner, async () => {
    const mint = requireMint(env)

    return await send(conn, owner, [
      closeCampaignIx({
        campaign,
        owner: owner.publicKey,
        ownerAta: associatedTokenAddress(owner.publicKey, mint),
        mint,
        amount,
      }),
    ])
  })
}

/** Tell the chain the attestor has booked through `day` for this campaign.
 *  `close_campaign` refuses a refund until this covers the pause day. */
export function settleCampaignDay(
  conn: GenkakuPublic,
  attestor: GenkakuWallet,
  campaign: PublicKey,
  day: number,
): Promise<string> {
  return chainWriteFor(attestor, async () => await send(conn, attestor, [
    settleDayIx({ attestor: attestor.publicKey, campaign, day }),
  ]))
}

/** Write one day of a worker's reputation. The program computes the score. */
export function attestDay(
  conn: GenkakuPublic,
  attestor: GenkakuWallet,
  input: {
    wallet: string
    day: number
    minutes: number
    sessions: number
    tipMicro: bigint
    tipCount: number
    tippers: number
    nonce: number
    evidenceRoot: Uint8Array
  },
): Promise<string> {
  return chainWriteFor(attestor, async () => await send(conn, attestor, [
    attestIx({
      attestor: attestor.publicKey,
      wallet: keyOf(input.wallet),
      day: input.day,
      minutes: input.minutes,
      sessions: input.sessions,
      tipMicro: input.tipMicro,
      tipCount: input.tipCount,
      tippers: input.tippers,
      nonce: input.nonce,
      evidenceRoot: input.evidenceRoot,
    }),
  ]))
}

// ── attestor / campaign settings ───────────────────────────────────────────

export function initAttestor(
  conn: GenkakuPublic,
  payer: GenkakuWallet,
  attestor: string,
): Promise<string> {
  return chainWriteFor(payer, async () => await send(conn, payer, [
    initAttestorIx(payer.publicKey, keyOf(attestor)),
  ]))
}

export function rotateAttestor(
  conn: GenkakuPublic,
  owner: GenkakuWallet,
  attestor: string,
): Promise<string> {
  return chainWriteFor(owner, async () => await send(conn, owner, [
    setAttestorIx(owner.publicKey, keyOf(attestor)),
  ]))
}

export function setCampaignRate(
  conn: GenkakuPublic,
  owner: GenkakuWallet,
  campaign: PublicKey,
  ratePerMinute: bigint,
): Promise<string> {
  return chainWriteFor(owner, async () => await send(conn, owner, [
    setCampaignRateIx(campaign, owner.publicKey, ratePerMinute),
  ]))
}

export function setMinClaim(
  conn: GenkakuPublic,
  owner: GenkakuWallet,
  campaign: PublicKey,
  minClaim: bigint,
): Promise<string> {
  return chainWriteFor(owner, async () => await send(conn, owner, [
    setMinClaimIx(campaign, owner.publicKey, minClaim),
  ]))
}

export function setCampaignPaused(
  conn: GenkakuPublic,
  owner: GenkakuWallet,
  campaign: PublicKey,
  paused: boolean,
): Promise<string> {
  return chainWriteFor(owner, async () => await send(conn, owner, [
    setCampaignPausedIx(campaign, owner.publicKey, paused),
  ]))
}

export function setRegistryPaused(
  conn: GenkakuPublic,
  owner: GenkakuWallet,
  paused: boolean,
): Promise<string> {
  return chainWriteFor(owner, async () => await send(conn, owner, [
    setRegistryPausedIx(owner.publicKey, paused),
  ]))
}

// ── worker directory ───────────────────────────────────────────────────────

export type RegisterWorkerArgs = {
  /** base58 PeerId — the same ed25519 key as the wallet */
  peerId: string
  pricePerMin: bigint
  active?: boolean
  locator?: string
}

/** Register (or re-pin) this wallet's directory entry. */
export function registerWorker(
  conn: GenkakuPublic,
  wallet: GenkakuWallet,
  env: NetEnvironment,
  args: RegisterWorkerArgs,
): Promise<string> {
  return chainWriteFor(wallet, async () => {
    if (CONTRACTS[env].program === '') {
      throw new Error(`[genkaku:chain] no program configured for ${env}`)
    }

    return await send(conn, wallet, [
      registerWorkerIx({
        wallet: wallet.publicKey,
        pricePerMin: args.pricePerMin,
        active: args.active ?? true,
        peerId: peerIdBytesOf(args.peerId),
        locator: args.locator ?? '',
      }),
    ])
  })
}

/**
 * Register AND publish the locator in one transaction.
 *
 * Kept as the name the runtime calls; on Solana there is no separate
 * `advertise` step at registration time, so this is `registerWorker`.
 */
export function registerWorkerWithLocator(
  conn: GenkakuPublic,
  wallet: GenkakuWallet,
  env: NetEnvironment,
  args: { peerId: string; pricePerMin: bigint; locator: string },
): Promise<string> {
  return registerWorker(conn, wallet, env, args)
}

/**
 * Publish a new locator, keeping the listing's price and active flag.
 *
 * The locator is the only thing that moves: a worker's rate is its own choice
 * and rewriting it on every Wi-Fi change would let a race between two panels
 * silently reprice a listing.
 */
export function advertiseWorker(
  conn: GenkakuPublic,
  wallet: GenkakuWallet,
  env: NetEnvironment,
  locator: string,
  pricePerMin?: bigint,
): Promise<string> {
  return chainWriteFor(wallet, async () => {
    const current = await readWorker(conn, env, wallet.publicKey.toBase58())

    if (current == null) {
      throw new Error(`[genkaku:chain] wallet ${wallet.publicKey.toBase58()} is not registered`)
    }

    return await send(conn, wallet, [
      updateWorkerIx({
        wallet: wallet.publicKey,
        pricePerMin: pricePerMin ?? current.pricePerMin,
        active: current.active,
        locator,
      }),
    ])
  })
}

/** Remove this wallet from the live directory without deleting its history. */
export function deactivateWorker(
  conn: GenkakuPublic,
  wallet: GenkakuWallet,
  env: NetEnvironment,
): Promise<string> {
  return chainWriteFor(wallet, async () => {
    const current = await readWorker(conn, env, wallet.publicKey.toBase58())

    if (current == null || !current.active) return ''

    return await send(conn, wallet, [
      updateWorkerIx({
        wallet: wallet.publicKey,
        pricePerMin: current.pricePerMin,
        active: false,
        locator: current.locator,
      }),
    ])
  })
}

/** One live directory entry, as the marketplace consumes it. */
export type DirectoryEntry = {
  wallet: string
  /** base58 PeerId (the same ed25519 key as the wallet) */
  peerId: string
  locator: string
  addrs: string[]
  pricePerMin: bigint
}

/**
 * The whole directory in one `getProgramAccounts` call.
 *
 * There is no log to scan and no deployment block to start from: the Worker
 * account is the directory row, so a cold client reads the present state
 * instead of replaying history. `active = false` rows are filtered out here —
 * a tombstoned worker must not be dialed.
 */
export async function readWorkerLocators(
  conn: GenkakuPublic,
  env: NetEnvironment,
  opts: { wallet?: string } = {},
): Promise<DirectoryEntry[]> {
  if (CONTRACTS[env].program === '') return []

  const workers = await listWorkers(conn)
  const out: DirectoryEntry[] = []

  for (const worker of workers) {
    if (!worker.active) continue

    const wallet = worker.wallet.toBase58()
    if (opts.wallet != null && wallet !== opts.wallet) continue

    out.push({
      wallet,
      peerId: peerIdFromBytes(worker.peerId),
      locator: worker.locator,
      addrs: parseLocator(worker.locator),
      pricePerMin: worker.pricePerMin,
    })
  }

  return out
}

/**
 * A worker that deactivated itself is simply absent from {@link readWorkerLocators},
 * because the account state is the truth and there is no history to replay. This
 * stays so callers keep one shape, and it answers "which of these wallets are
 * still live?" for a cached directory.
 */
export async function readWorkerDeactivations(
  conn: GenkakuPublic,
  env: NetEnvironment,
  opts: { wallets: readonly string[] },
): Promise<string[]> {
  const live = new Set((await readWorkerLocators(conn, env)).map(entry => entry.wallet))

  return opts.wallets.filter(wallet => !live.has(wallet))
}

// ── one-time initialisation ────────────────────────────────────────────────

/** Create the directory account. Runs once per cluster; the program's own
 *  gate (`INIT_AUTHORITY`) decides who may, so this cannot be replayed by a
 *  stranger on mainnet. */
export function initRegistry(conn: GenkakuPublic, payer: GenkakuWallet): Promise<string> {
  return chainWriteFor(payer, async () => await send(conn, payer, [initRegistryIx(payer.publicKey)]))
}

// ── receipts ───────────────────────────────────────────────────────────────

/**
 * Mint devnet USDC to `to`.
 *
 * The mint authority is the operator's key, never the panel's wallet, and it is
 * read from `GENKAKU_MINT_AUTHORITY_KEY` (base58 secret) so a developer machine
 * can fund itself without the published bundle ever holding a mintable key. On
 * mainnet this refuses outright: the canonical USDC has no mint instruction
 * this program can reach.
 */
export function mintTestUsdc(
  conn: GenkakuPublic,
  env: NetEnvironment,
  to: string,
  amount: bigint,
): Promise<string> {
  return chainWrite(env, async () => {
    if (env !== 'solana-devnet') {
      throw new Error('[genkaku:chain] test USDC mint is only available on solana-devnet')
    }

    const mint = requireMint(env)
    const raw = (process.env.GENKAKU_MINT_AUTHORITY_KEY ?? '').trim()

    if (raw === '') {
      throw new Error(
        'set GENKAKU_MINT_AUTHORITY_KEY (base58 secret key of the devnet mint authority) to mint test USDC',
      )
    }

    const authority = keypairOf(normalizeKey(raw))
    const owner = keyOf(to)

    return await send(conn, authority, [
      createIdempotentAtaIx(authority.publicKey, owner, mint),
      mintToIx(mint, associatedTokenAddress(owner, mint), authority.publicKey, amount),
    ])
  })
}

/**
 * Send a tip from the user's wallet straight to a worker's wallet.
 *
 * GenKaKu is not in this path: no escrow, no fee, no custody. The transfer is
 * a plain SPL `TransferChecked` of USDC plus a memo that says what it was, so
 * the worker's own wallet history is the receipt. The recipient's associated
 * token account is created by the sender when missing (a free worker earning
 * its first tip has never held USDC), which is why the payer must cover rent.
 */
export function sendTip(
  conn: GenkakuPublic,
  env: NetEnvironment,
  from: GenkakuWallet,
  to: string,
  micro: bigint,
  memo = 'genkaku:tip',
): Promise<string> {
  if (micro <= 0n) return Promise.reject(new Error('[genkaku:tip] amount must be positive'))
  if (micro > MAX_TIP_MICRO) return Promise.reject(new Error('[genkaku:tip] amount above the per-transfer ceiling'))

  const recipient = keyOf(to)

  return chainWriteFor(from, async () => {
    const mint = requireMint(env)

    return await send(conn, from, [
      createIdempotentAtaIx(from.publicKey, recipient, mint),
      transferCheckedIx({
        source: associatedTokenAddress(from.publicKey, mint),
        mint,
        destination: associatedTokenAddress(recipient, mint),
        owner: from.publicKey,
        amount: micro,
      }),
      memoIx(`${memo} ${micro.toString()}`, from.publicKey),
    ])
  })
}

/** Sign a receipt digest with the wallet that paid (ed25519 over the digest). */export function signReceiptPayload(key: GenkakuWallet, receipt: ReceiptPayloadV1): string {
  return signDigest(key, digestFor(receipt))
}

// ── locator helpers ────────────────────────────────────────────────────────

/** The program's locator ceiling (LOCATOR_MAX in state.rs). */
export const MAX_LOCATOR_BYTES = 255
/** Four addresses is enough for LAN + public + relay without paying for more. */
export const MAX_LOCATOR_ADDRS = 4

/** Build the on-chain locator from the addresses libp2p actually announces.
 *  Loopback is dropped (useless to a remote peer) and the list is capped so it
 *  always fits MAX_LOCATOR_BYTES. Public addrs come first: a client that can
 *  only use one should try the routable one. Separator is `;` — a multiaddr
 *  never contains it, so parsing stays unambiguous. */
export function locatorOf(
  addrs: readonly string[],
  maxBytes = MAX_LOCATOR_BYTES,
  maxCount = MAX_LOCATOR_ADDRS,
): string {
  const clean = [...new Set(addrs)]
    .filter(a => a.startsWith('/'))
    .filter(a => !a.startsWith('/ip4/127.') && !a.startsWith('/ip6/::1'))
    .map(a => a.trim())
    .filter(a => a.length > 0)

  const rank = (a: string) => {
    if (a.includes('/p2p-circuit/')) return 2
    if (/^\/ip4\/(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(a)) return 1
    if (/^\/ip6\/(fc|fd|fe80)/.test(a)) return 1
    return 0
  }

  const ordered = clean
    .map((addr, index) => ({ addr, index, rank: rank(addr) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map(x => x.addr)

  const picked: string[] = []
  let bytes = 0
  for (const addr of ordered) {
    if (picked.length >= maxCount) break
    const extra = addr.length + (picked.length > 0 ? 1 : 0)
    if (bytes + extra > maxBytes) continue
    picked.push(addr)
    bytes += extra
  }

  return picked.join(';')
}

/** True when this address is reachable from the public internet. LAN, loopback,
 *  link-local and CGNAT (100.64/10) ranges are local-only. A `/p2p-circuit`
 *  address is dialable when its relay hop is a public host: the relay forwards
 *  the stream, so a worker behind NAT is still reachable through it. */
export function isPublicAddr(addr: string): boolean {
  if (!addr.startsWith('/')) return false

  const circuit = addr.indexOf('/p2p-circuit')

  if (circuit >= 0) {
    // Judge the relay hop only; the tail after /p2p-circuit is our own peer id.
    return isPublicAddr(addr.slice(0, circuit))
  }

  const v4 = /^\/ip4\/(\d+)\.(\d+)\.(\d+)\.(\d+)\//.exec(addr)

  if (v4 != null) {
    const a = Number(v4[1])
    const b = Number(v4[2])

    if (a === 0 || a === 10 || a === 127) return false
    if (a === 172 && b >= 16 && b <= 31) return false
    if (a === 192 && b === 168) return false
    if (a === 169 && b === 254) return false
    if (a === 100 && b >= 64 && b <= 127) return false

    return true
  }

  const v6 = /^\/ip6\/([0-9a-f:]+)\//i.exec(addr)

  if (v6 != null) {
    const host = v6[1].toLowerCase()

    if (host === '::1') return false
    if (host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80')) return false

    return true
  }

  return /^\/dns(4|6|addr)\//.test(addr)
}

/** Does this peer announce any address the global directory can use? */
export function hasPublicAddr(addrs: readonly string[]): boolean {
  return addrs.some(isPublicAddr)
}

/** How this peer is reachable to the internet, best first: a direct public
 *  address, a relay circuit through a public hop, or LAN only. */
export function transportOf(addrs: readonly string[]): 'direct' | 'relay' | 'lan' {
  if (addrs.some(a => isPublicAddr(a) && !a.includes('/p2p-circuit'))) return 'direct'
  if (addrs.some(a => a.includes('/p2p-circuit') && isPublicAddr(a))) return 'relay'

  return 'lan'
}

/** The address a client should try first: a public direct address, then a
 *  relay circuit, then anything (LAN) for a same-network peer. */
export function preferredAddr(addrs: readonly string[]): string | undefined {
  const direct = addrs.find(a => isPublicAddr(a) && !a.includes('/p2p-circuit'))
  if (direct != null) return direct
  const relay = addrs.find(a => a.includes('/p2p-circuit') && isPublicAddr(a))
  if (relay != null) return relay

  return addrs.find(a => a.startsWith('/'))
}

/** Split a locator back into multiaddrs (tolerates `;`, newline, whitespace). */
export function parseLocator(locator: string): string[] {
  return locator
    .split(/[;\n]+/)
    .map(s => s.trim())
    .filter(s => s.startsWith('/'))
}

// ── small helpers ──────────────────────────────────────────────────────────

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
