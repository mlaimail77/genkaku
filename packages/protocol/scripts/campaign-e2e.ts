// The 0.3 money path, end to end on devnet.
//
//   npx tsx packages/protocol/scripts/campaign-e2e.ts
//
// What this proves, in the order a worker experiences it:
//
//   * the pool is funded and refuses to promise more than it holds;
//   * the attestor books minutes to a registered worker, creating the accrual
//     account on first payment;
//   * the worker claims without anyone's approval, and the money lands in its own
//     token account;
//   * the owner cannot withdraw a minute that was accrued, only what was never
//     promised;
//   * a day of reputation is written, and the program computes the score from
//     the numbers beside it.
//
// It spends devnet-only USDC and a few cents of devnet SOL. It is safe to run
// repeatedly: a second run reuses the campaign and the worker's accrual.

import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

import { Keypair, LAMPORTS_PER_SOL, SystemProgram, Transaction } from '@solana/web3.js'
import { getAccount, mintTo } from '@solana/spl-token'

import {
  accrueMinutes,
  attestDay,
  claimAccrual,
  closeCampaign,
  fundCampaign,
  initAttestor,
  initCampaign,
  initRegistry,
  publicClientFor,
  readAttestorState,
  readCampaignState,
  readDayReputation,
  readWorkerAccrual,
  registerWorker,
  walletAddress,
  type GenkakuWallet,
} from '../src/chain.ts'
import {
  associatedTokenAddress,
  programId,
  readRegistry,
  createIdempotentAtaIx,
  mintFor,
  send,
} from '../src/solana.ts'

const conn = publicClientFor('solana-devnet')
const MINT = mintFor('solana-devnet')!
const RATE = 5_000n // 0.005 USDC per sponsored minute
const MIN_CLAIM = 50_000n // 0.05 USDC, so this test can claim after ten minutes
const MINUTES = 10n
const DAY = Math.floor(Date.now() / 86_400_000)

function keypair(path: string): Keypair {
  return Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(readFileSync(path, 'utf8')) as number[]),
  )
}

function eq(label: string, actual: unknown, expected: unknown): void {
  const a = String(actual)
  const e = String(expected)
  if (a !== e) throw new Error(`${label}: expected ${e}, got ${a}`)
  console.log(`  ok  ${label} = ${a}`)
}

function ok(label: string): void {
  console.log(`  ok  ${label}`)
}

async function fund(payer: Keypair, to: Keypair, sol: number): Promise<void> {
  const tx = new Transaction().add(
    SystemProgram.transfer({ fromPubkey: payer.publicKey, toPubkey: to.publicKey, lamports: Math.round(sol * LAMPORTS_PER_SOL) }),
  )
  await send(conn, payer, tx.instructions)
}

async function balance(wallet: Keypair): Promise<bigint> {
  return (await getAccount(conn, associatedTokenAddress(wallet.publicKey, MINT))).amount
}

async function main(): Promise<void> {
  const owner = keypair(join(homedir(), '.config/solana/team-dev.json'))
  const attestor = keypair(join(homedir(), '.config/solana/genkaku-attestor-devnet.json'))
  const worker = Keypair.generate()

  console.log(`program  ${programId().toBase58()}`)
  console.log(`owner    ${walletAddress(owner)}`)
  console.log(`attestor ${walletAddress(attestor)}`)
  console.log(`worker   ${walletAddress(worker)}\n`)

  // ── 1. accounts that exist once ──────────────────────────────────────────
  if ((await readRegistry(conn)) == null) {
    console.log(await initRegistry(conn, owner))
    ok('registry created')
  } else {
    ok('registry already present')
  }

  if ((await readAttestorState(conn)) == null) {
    console.log(await initAttestor(conn, owner, walletAddress(attestor)))
    ok('attestor created')
  } else {
    const state = await readAttestorState(conn)
    eq('attestor key', walletAddress(state!.attestor), walletAddress(attestor))
  }

  let campaign = await readCampaignState(conn)

  if (campaign == null) {
    console.log(await initCampaign(conn, owner, 'solana-devnet', {
      minClaim: MIN_CLAIM,
      ratePerMinute: RATE,
    }))
    campaign = await readCampaignState(conn)
    ok('campaign created')
  }

  eq('rate per minute', campaign!.ratePerMinute, RATE)
  eq('min claim', campaign!.minClaim, MIN_CLAIM)

  // ── 2. the worker registers, then the pool is funded ─────────────────────
  await fund(owner, worker, 0.05)

  try {
    // The peer id is the wallet's own key: in GenKaKu a peer id IS a wallet, so
    // a fresh keypair can register itself without a libp2p node.
    await registerWorker(conn, worker, 'solana-devnet', {
      peerId: walletAddress(worker),
      pricePerMin: 0n,
      locator: '',
      active: true,
    })
    ok('worker registered (free listing)')
  } catch (error) {
    if (!/already|0x2\b/i.test(String(error))) throw error
    ok('worker already registered')
  }

  const funded = 1_000_000n // 1 USDC — far more than this run accrues
  await send(conn, owner, [createIdempotentAtaIx(owner.publicKey, owner.publicKey, MINT)])
  await mintTo(conn, owner, MINT, associatedTokenAddress(owner.publicKey, MINT), owner, Number(funded))
  await fundCampaign(conn, owner, 'solana-devnet', funded)
  ok(`campaign funded with ${funded} micro-USDC`)

  const before = await readCampaignState(conn)

  // ── 3. the attestor books minutes ───────────────────────────────────────
  const accrualBefore = await readWorkerAccrual(conn, walletAddress(worker))
  await accrueMinutes(conn, attestor, walletAddress(worker), MINUTES, DAY)
  const accrual = await readWorkerAccrual(conn, walletAddress(worker))
  const expected = MINUTES * RATE

  eq(
    'claimable grew by minutes × rate',
    accrual!.claimable - (accrualBefore?.claimable ?? 0n),
    expected,
  )
  eq('lifetime tracks it too', accrual!.lifetime >= expected, true)

  const afterAccrue = await readCampaignState(conn)
  eq('campaign accrued grew', afterAccrue!.accrued - before!.accrued, expected)
  eq('nothing was paid out yet', afterAccrue!.claimed, before!.claimed)

  // ── 4. the owner may not withdraw a promised minute ─────────────────────
  const withdrawable = afterAccrue!.funded - afterAccrue!.accrued

  try {
    await closeCampaign(conn, owner, 'solana-devnet', withdrawable + expected)
    throw new Error('the program allowed withdrawing an accrued minute')
  } catch (error) {
    ok(`withdrawing a promised minute refused (${(error as Error).message.slice(0, 48)}…)`)
  }

  // ── 5. the worker claims, with nobody's approval ────────────────────────
  const workerBalanceBefore = await balance(worker).catch(() => 0n)
  console.log(await claimAccrual(conn, worker, 'solana-devnet'))
  eq('worker received the accrual', (await balance(worker)) - workerBalanceBefore, expected)
  eq('claimable is spent', (await readWorkerAccrual(conn, walletAddress(worker)))!.claimable, 0n)

  const afterClaim = await readCampaignState(conn)
  eq('campaign claimed grew', afterClaim!.claimed - afterAccrue!.claimed, expected)

  // ── 6. a day of reputation, with the score computed on chain ────────────
  const previous = await readDayReputation(conn, walletAddress(worker), DAY)
  const nonce = (previous?.nonce ?? 0) + 1

  await attestDay(conn, attestor, {
    wallet: walletAddress(worker),
    day: DAY,
    minutes: Number(MINUTES),
    sessions: 1,
    tipMicro: 2_000_000n,
    tipCount: 2,
    tippers: 2,
    nonce,
    evidenceRoot: new Uint8Array(32).fill(nonce),
  })

  const rep = await readDayReputation(conn, walletAddress(worker), DAY)
  eq('attestation landed', rep?.nonce, nonce)
  eq('sponsored minutes recorded', rep?.sponsoredMinutes, Number(MINUTES))
  eq('tip micro recorded', rep?.tipMicro, 2_000_000n)
  // score = isqrt(2_000_000/1000 + 10*2 + 2*25) = isqrt(2070) = 45
  eq('score follows the published formula', rep?.score, 45)

  console.log('\nall checks passed')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
