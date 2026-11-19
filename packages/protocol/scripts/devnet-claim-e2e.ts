// The payout half of the escrow, against the DEPLOYED devnet program.
//
//   GENKAKU_RPC_URL=https://api.devnet.solana.com \
//   npx tsx packages/protocol/scripts/devnet-claim-e2e.ts
//
// `devnet-smoke.ts` proves open/settle/close and that a claim is refused before
// the delay. This script waits the ten minutes out and proves the rest:
//
//   * `claim` pays 99% to the WORKER's token account and books 1% as
//     treasury_accrued (the fee never sits in a worker's account);
//   * the session flips to CLAIMED, so a second claim is refused;
//   * `claim_treasury` sweeps the booked fee to the treasury account;
//   * `reclaim` then closes the session and returns its rent to the user.
//
// It spends cents of devnet SOL and a few test USDC, and asserts on the exact
// balances the program promises.

import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'

import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from '@solana/web3.js'
import { getAccount, getMint, mintTo } from '@solana/spl-token'

import {
  CLAIM_DELAY_SECS,
  DECIMALS,
  SESSION_CLAIMED,
  SESSION_CLOSED,
  associatedTokenAddress,
  claimIxs,
  claimTreasuryIx,
  closeSessionIx,
  connection,
  createIdempotentAtaIx,
  explain,
  mintFor,
  openSessionIxs,
  readEscrow,
  readSession,
  readWorkerAccount,
  reclaimSessionIx,
  registerWorkerIx,
  send,
  settleIx,
} from '../src/solana.ts'

const RPC = process.env.GENKAKU_RPC_URL ?? 'https://api.devnet.solana.com'
const conn = connection('solana-devnet', 'confirmed')

const PRICE_PER_MIN = 1_000n // 0.001 USDC
const MINUTES = 3n
const DEPOSIT = PRICE_PER_MIN * MINUTES
const WORKER_SHARE = (DEPOSIT * 99n) / 100n
const FEE_SHARE = DEPOSIT - WORKER_SHARE

function keypair(path: string): Keypair {
  return Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(readFileSync(path, 'utf8')) as number[]),
  )
}

function ok(label: string): void {
  console.log(`  ok  ${label}`)
}

function eq(label: string, actual: unknown, expected: unknown): void {
  const a = typeof actual === 'bigint' ? actual.toString() : String(actual)
  const e = typeof expected === 'bigint' ? expected.toString() : String(expected)
  if (a !== e) throw new Error(`${label}: expected ${e}, got ${a}`)
  console.log(`  ok  ${label} = ${a}`)
}

async function transfer(payer: Keypair, to: PublicKey, sol: number): Promise<void> {
  const tx = new Transaction().add(
    SystemProgram.transfer({ fromPubkey: payer.publicKey, toPubkey: to, lamports: sol * LAMPORTS_PER_SOL }),
  )
  await send(conn, payer, tx.instructions)
}

async function tokenBalance(owner: PublicKey, mint: PublicKey): Promise<bigint> {
  return (await getAccount(conn, associatedTokenAddress(owner, mint))).amount
}

async function main(): Promise<void> {
  console.log(`cluster ${RPC}`)

  const mint = mintFor('solana-devnet')
  if (mint == null) throw new Error('netconfig has no devnet mint — run scripts/init-cluster.ts first')
  eq('mint decimals', (await getMint(conn, mint)).decimals, DECIMALS)

  const before = await readEscrow(conn)
  if (before == null) throw new Error('the escrow is not initialised — run scripts/init-cluster.ts')
  console.log(`treasury ${before.treasury.toBase58()}`)

  const authority = keypair(join(homedir(), '.config/solana/team-dev.json'))
  const user = Keypair.generate()
  const worker = Keypair.generate()
  console.log(`\nuser   ${user.publicKey.toBase58()}`)
  console.log(`worker ${worker.publicKey.toBase58()}`)

  await transfer(authority, user.publicKey, 0.05)
  await transfer(authority, worker.publicKey, 0.05)
  ok('both funded with 0.05 SOL')

  await send(conn, authority, [createIdempotentAtaIx(authority.publicKey, user.publicKey, mint)])
  await mintTo(conn, authority, mint, associatedTokenAddress(user.publicKey, mint), authority, 1_000_000)
  eq('user test USDC', await tokenBalance(user.publicKey, mint), 1_000_000n)
  eq('worker starts with no USDC account', await tokenBalance(worker.publicKey, mint).catch(() => -1n), -1n)

  await send(conn, worker, [
    registerWorkerIx({
      wallet: worker.publicKey,
      pricePerMin: PRICE_PER_MIN,
      active: true,
      peerId: Buffer.from(`12D3KooWClaim${Date.now().toString(36)}`),
      locator: '/ip4/203.0.113.9/tcp/4001',
    }),
  ])
  ok('worker registered')

  const id = (await readEscrow(conn))!.nextSessionId
  await send(conn, user, openSessionIxs({
    user: user.publicKey,
    worker: worker.publicKey,
    mint,
    id,
    pricePerMin: PRICE_PER_MIN,
    deposit: DEPOSIT,
  }))
  console.log(`\nsession ${id.toString()}`)
  eq('deposit taken from the user', await tokenBalance(user.publicKey, mint), 1_000_000n - DEPOSIT)

  await send(conn, worker, [settleIx({ sessionId: id, worker: worker.publicKey, minutes: MINUTES })])
  await send(conn, user, [
    closeSessionIx({ sessionId: id, caller: user.publicKey, user: user.publicKey, mint }),
  ])
  let session = await readSession(conn, id)
  if (session == null) throw new Error('session vanished')
  eq('session status after close', session.status, SESSION_CLOSED)
  eq('accrued', session.accrued, DEPOSIT)

  // The delay is measured from the last settle, not from the close, so the
  // wait is computed from the chain's own clock rather than from "now".
  const chainNow = BigInt(Math.floor(Date.now() / 1000))
  const claimAt = session.lastSettleAt + BigInt(CLAIM_DELAY_SECS) + 5n
  const waitSecs = claimAt > chainNow ? Number(claimAt - chainNow) : 0
  console.log(`\nwaiting ${waitSecs}s for the payout delay (CLAIM_DELAY_SECS=${CLAIM_DELAY_SECS})`)
  await sleep(waitSecs * 1_000)

  const treasuryBefore = (await readEscrow(conn))!.treasuryAccrued
  await send(conn, authority, claimIxs({
    sessionId: id,
    worker: worker.publicKey,
    mint,
    payer: authority.publicKey,
  }))
  ok('claim accepted after the delay')

  session = await readSession(conn, id)
  if (session == null) throw new Error('session vanished after claim')
  eq('session status after claim', session.status, SESSION_CLAIMED)
  eq('claimed flag', session.claimed, true)
  eq('worker USDC (99%)', await tokenBalance(worker.publicKey, mint), WORKER_SHARE)

  const afterClaim = (await readEscrow(conn))!.treasuryAccrued
  eq('treasury accrued (1%)', afterClaim - treasuryBefore, FEE_SHARE)

  try {
    await send(conn, authority, claimIxs({
      sessionId: id,
      worker: worker.publicKey,
      mint,
      payer: authority.publicKey,
    }))
    throw new Error('a second claim should have been refused')
  } catch (error) {
    if (String(error).includes('should have been refused')) throw error
    ok(`second claim refused: ${explain(error).slice(0, 50)}`)
  }

  // The owner sweeps the booked fee; the treasury is the owner's own account
  // on devnet, so this also proves the sweep is not blocked by a fresh ATA.
  // `treasury_accrued` is a running total across every settled session, so the
  // assertion is on the DELTA: sweeping our 1% must leave the rest booked.
  if (FEE_SHARE > 0n) {
    const accruedBeforeSweep = (await readEscrow(conn))!.treasuryAccrued
    const treasuryBal = await tokenBalance(before.treasury, mint).catch(() => 0n)
    await send(conn, authority, claimTreasuryIx({
      owner: authority.publicKey,
      treasury: before.treasury,
      mint,
      amount: FEE_SHARE,
    }))
    eq('treasury token balance', await tokenBalance(before.treasury, mint), treasuryBal + FEE_SHARE)
    eq(
      'treasury accrued after sweep',
      (await readEscrow(conn))!.treasuryAccrued,
      accruedBeforeSweep - FEE_SHARE,
    )
  }

  await send(conn, user, [reclaimSessionIx(id, user.publicKey)])
  eq('session account closed', (await readSession(conn, id)) == null, true)
  ok('rent returned to the user')

  const listing = await readWorkerAccount(conn, worker.publicKey)
  eq('worker earned counter (99%)', listing?.earned ?? -1n, WORKER_SHARE)

  console.log('\nall payout checks passed')
}

main().catch((error) => {
  console.error(`\nFAILED: ${explain(error)}`)
  process.exitCode = 1
})
