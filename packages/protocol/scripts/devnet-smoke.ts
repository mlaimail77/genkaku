// Smoke test against a REAL cluster (devnet by default), using the deployed
// program and the escrow that `init-cluster.ts` created.
//
//   GENKAKU_RPC_URL=https://api.devnet.solana.com \
//   npx tsx packages/protocol/scripts/devnet-smoke.ts
//
// What it proves that the local run cannot: the binary that is actually
// deployed behaves the same way, the baked USDC mint in `netconfig.ts` is the
// one the escrow holds, and a session opened by a brand-new wallet settles and
// closes. It spends cents of devnet SOL and a few test USDC.
//
// The ten-minute payout delay is NOT waited out here: the claim is expected to
// be refused, and that refusal is the assertion.

import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from '@solana/web3.js'
import { getAccount, getMint, mintTo } from '@solana/spl-token'

import {
  DECIMALS,
  SESSION_OPEN,
  associatedTokenAddress,
  claimIxs,
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

function keypair(path: string): Keypair {
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(path, 'utf8')) as number[]))
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

async function balanceOf(owner: PublicKey, mint: PublicKey): Promise<bigint> {
  return (await getAccount(conn, associatedTokenAddress(owner, mint))).amount
}

async function main(): Promise<void> {
  console.log(`cluster ${RPC}`)

  const mint = mintFor('solana-devnet')
  if (mint == null) throw new Error('netconfig has no devnet mint — run scripts/init-cluster.ts first')

  const info = await getMint(conn, mint)
  eq('mint decimals', info.decimals, DECIMALS)

  const escrow = await readEscrow(conn)
  if (escrow == null) throw new Error('the escrow is not initialised — run scripts/init-cluster.ts')
  eq('escrow mint matches netconfig', escrow.mint.toBase58(), mint.toBase58())

  // The mint authority is the deployment key; it also pays the mint's fee.
  const authority = keypair(join(homedir(), '.config/solana/team-dev.json'))
  eq('mint authority', info.mintAuthority?.toBase58() ?? 'none', authority.publicKey.toBase58())

  const user = Keypair.generate()
  const worker = Keypair.generate()
  console.log(`\nuser   ${user.publicKey.toBase58()}`)
  console.log(`worker ${worker.publicKey.toBase58()}`)

  await transfer(authority, user.publicKey, 0.05)
  await transfer(authority, worker.publicKey, 0.05)
  ok('both funded with 0.05 SOL')

  await send(conn, authority, [createIdempotentAtaIx(authority.publicKey, user.publicKey, mint)])
  await mintTo(conn, authority, mint, associatedTokenAddress(user.publicKey, mint), authority, 1_000_000)
  eq('user test USDC', await balanceOf(user.publicKey, mint), 1_000_000n)

  console.log('\nregister worker')
  await send(conn, worker, [
    registerWorkerIx({
      wallet: worker.publicKey,
      pricePerMin: PRICE_PER_MIN,
      active: true,
      peerId: Buffer.from(`12D3KooWSmoke${Date.now().toString(36)}`),
      locator: '/ip4/203.0.113.9/tcp/4001',
    }),
  ])
  const listing = await readWorkerAccount(conn, worker.publicKey)
  if (listing == null) throw new Error('worker account missing after register')
  eq('listing rate', listing.pricePerMin, PRICE_PER_MIN)

  console.log('\nopen session')
  const id = (await readEscrow(conn))!.nextSessionId
  await send(conn, user, openSessionIxs({
    user: user.publicKey,
    worker: worker.publicKey,
    mint,
    id,
    pricePerMin: PRICE_PER_MIN,
    deposit: DEPOSIT,
  }))
  eq('user USDC after deposit', await balanceOf(user.publicKey, mint), 1_000_000n - DEPOSIT)

  let session = await readSession(conn, id)
  if (session == null) throw new Error('session missing after open')
  eq('session status', session.status, SESSION_OPEN)
  eq('session deposit', session.deposit, DEPOSIT)

  console.log('\nsettle (the worker signs)')
  await send(conn, worker, [settleIx({ sessionId: id, worker: worker.publicKey, minutes: MINUTES })])
  session = await readSession(conn, id)
  if (session == null) throw new Error('session vanished')
  eq('accrued', session.accrued, PRICE_PER_MIN * MINUTES)

  const after = await readWorkerAccount(conn, worker.publicKey)
  if (after == null) throw new Error('worker vanished')
  eq('worker earned (99%)', after.earned, (PRICE_PER_MIN * MINUTES * 99n) / 100n)

  console.log('\nclose (user refund)')
  await send(conn, user, [
    closeSessionIx({ sessionId: id, caller: user.publicKey, user: user.publicKey, mint }),
  ])
  eq('user refunded', await balanceOf(user.publicKey, mint), 1_000_000n - PRICE_PER_MIN * MINUTES)

  console.log('\nclaim (expected to be refused: ten-minute delay)')
  try {
    await send(conn, authority, [
      ...claimIxs({ sessionId: id, worker: worker.publicKey, mint, payer: authority.publicKey }),
    ])
    throw new Error('claim should have been refused before CLAIM_DELAY_SECS')
  } catch (error) {
    if (String(error).includes('should have been refused')) throw error
    ok(`refused: ${explain(error).slice(0, 60)}`)
  }

  console.log('\nreclaim is refused while the payout is unclaimed')
  // The account still points at money sitting in the vault. Deleting it would
  // strand that money, so the program refuses until the claim has happened.
  try {
    await send(conn, user, [reclaimSessionIx(id, user.publicKey)])
    throw new Error('reclaim should have been refused before the claim')
  } catch (error) {
    if (String(error).includes('should have been refused')) throw error
    ok(`refused: ${explain(error).slice(0, 60)}`)
  }

  console.log('\nall checks passed')
}

main().catch((error) => {
  console.error(`\nFAILED: ${explain(error)}`)
  process.exitCode = 1
})
