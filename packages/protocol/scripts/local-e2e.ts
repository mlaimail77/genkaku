// Local end-to-end run against `solana-test-validator`.
//
// Drives the real client (`../src/solana.ts`) against the real program, on a
// throwaway ledger, with a 6-decimal mock USDC mint. The only thing stubbed is
// the chain itself.
//
//   scripts/local-validator.sh                 # in genkaku/solana
//   GENKAKU_RPC_URL=http://127.0.0.1:8899 npx tsx packages/protocol/scripts/local-e2e.ts
//
// The program must already be deployed at PROGRAM_ID with the same authority
// key that is loaded here (`~/.config/solana/team-dev.json`).

import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { homedir } from 'node:os'
import { join } from 'node:path'

import { Keypair, LAMPORTS_PER_SOL, PublicKey, type Connection } from '@solana/web3.js'
import {
  createMint,
  getAccount,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from '@solana/spl-token'

import {
  SESSION_CLAIMED,
  SESSION_CLOSED,
  associatedTokenAddress,
  claimIxs,
  closeSessionIx,
  connection,
  createIdempotentAtaIx,
  escrowPda,
  explain,
  initEscrowIx,
  initRegistryIx,
  openSessionIxs,
  readEscrow,
  readRegistry,
  readSession,
  readWorkerAccount,
  reclaimSessionIx,
  registerWorkerIx,
  settleIx,
  send,
  vaultAddress,
} from '../src/solana.ts'

const RPC = process.env.GENKAKU_RPC_URL ?? 'http://127.0.0.1:8899'
const USDC = 1_000_000n
const PRICE_PER_MIN = 1_000n // 0.001 USDC per started minute
const DEPOSIT = 10_000n // ten minutes' worth
const MINUTES = 3n
const SESSION_CAP = 10n * USDC

const conn: Connection = connection('solana-devnet')

function ok(label: string): void {
  console.log(`  ok  ${label}`)
}

function eq<T>(label: string, actual: T, expected: T): void {
  const a = typeof actual === 'bigint' ? actual.toString() : String(actual)
  const e = typeof expected === 'bigint' ? expected.toString() : String(expected)
  if (a !== e) throw new Error(`${label}: expected ${e}, got ${a}`)
  console.log(`  ok  ${label} = ${a}`)
}

function keypair(path: string): Keypair {
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(path, 'utf8'))))
}

async function fund(kp: Keypair, sol: number): Promise<void> {
  const sig = await conn.requestAirdrop(kp.publicKey, sol * LAMPORTS_PER_SOL)
  await conn.confirmTransaction(sig, 'confirmed')
}

async function balanceOf(owner: PublicKey, mint: PublicKey): Promise<bigint> {
  const account = await getAccount(conn, associatedTokenAddress(owner, mint))
  return account.amount
}

async function main(): Promise<void> {
  console.log(`rpc ${RPC}`)

  const authority = keypair(join(homedir(), '.config/solana/team-dev.json'))
  const user = Keypair.generate()
  const worker = Keypair.generate()

  console.log('setup')
  await fund(authority, 5)
  await fund(user, 2)
  await fund(worker, 2)

  const mint = await createMint(conn, authority, authority.publicKey, null, 6)
  ok(`mint ${mint.toBase58()}`)

  const userAta = await getOrCreateAssociatedTokenAccount(conn, authority, mint, user.publicKey)
  await mintTo(conn, authority, mint, userAta.address, authority, Number(50n * USDC))
  eq('user USDC', await balanceOf(user.publicKey, mint), 50n * USDC)

  // The vault is the escrow PDA's own token account. Only the owner field has
  // to be right; the program checks the mint and owner, not a derived address.
  await send(conn, authority, [createIdempotentAtaIx(authority.publicKey, escrowPda(), mint)])
  const vault = await getAccount(conn, vaultAddress(mint))
  eq('vault owner', vault.owner.toBase58(), escrowPda().toBase58())
  eq('vault mint', vault.mint.toBase58(), mint.toBase58())

  console.log('registry')
  await send(conn, authority, [initRegistryIx(authority.publicKey)])
  const registry = await readRegistry(conn)
  if (!registry) throw new Error('registry not found after init')
  eq('registry owner', registry.owner.toBase58(), authority.publicKey.toBase58())
  eq('registry count', registry.count, 0n)

  console.log('escrow')
  await send(conn, authority, [
    initEscrowIx(authority.publicKey, mint, authority.publicKey, authority.publicKey, SESSION_CAP),
  ])
  const escrow = await readEscrow(conn)
  if (!escrow) throw new Error('escrow not found after init')
  eq('escrow mint', escrow.mint.toBase58(), mint.toBase58())
  eq('escrow vault', escrow.vault.toBase58(), vaultAddress(mint).toBase58())
  eq('escrow next id', escrow.nextSessionId, 0n)
  eq('escrow paused', escrow.paused, false)

  console.log('worker')
  const peerId = Buffer.from('12D3KooWGenKaKuLocalE2EWorkerPeerId0000000000')
  // A realistic locator: a direct address PLUS a relay circuit. Together they
  // are longer than the old 128-byte field, so this also proves the payload
  // round-trips through the 255-byte Worker slot.
  const locator = [
    '/ip4/203.0.113.7/tcp/4001/p2p/12D3KooWGenKaKuLocalE2EWorkerPeerId0000000000',
    '/ip4/35.234.31.54/tcp/4001/p2p/12D3KooWSeedRelayPeerId0000000000000000000000/p2p-circuit/p2p/12D3KooWGenKaKuLocalE2EWorkerPeerId0000000000',
  ].join(';')
  await send(conn, worker, [
    registerWorkerIx({
      wallet: worker.publicKey,
      pricePerMin: PRICE_PER_MIN,
      active: true,
      peerId,
      locator,
    }),
  ])
  const workerState = await readWorkerAccount(conn, worker.publicKey)
  if (!workerState) throw new Error('worker not found after register')
  eq('worker price', workerState.pricePerMin, PRICE_PER_MIN)
  eq('worker peer id', Buffer.from(workerState.peerId).toString(), peerId.toString())
  eq('worker active', workerState.active, true)
  eq('worker locator round-trips', workerState.locator, locator)

  console.log('open session')
  await send(
    conn,
    user,
    openSessionIxs({
      user: user.publicKey,
      worker: worker.publicKey,
      mint,
      id: 0n,
      pricePerMin: PRICE_PER_MIN,
      deposit: DEPOSIT,
    }),
  )
  eq('user USDC after deposit', await balanceOf(user.publicKey, mint), 50n * USDC - DEPOSIT)
  eq('vault USDC after deposit', await balanceOf(escrowPda(), mint), DEPOSIT)

  let session = await readSession(conn, 0n)
  if (!session) throw new Error('session not found after open')
  eq('session status', session.status, 0)
  eq('session deposit', session.deposit, DEPOSIT)
  eq('session worker', session.worker.toBase58(), worker.publicKey.toBase58())

  console.log('settle')
  await send(conn, worker, [
    settleIx({ sessionId: 0n, worker: worker.publicKey, minutes: MINUTES }),
  ])
  session = await readSession(conn, 0n)
  if (!session) throw new Error('session vanished')
  eq('session accrued', session.accrued, PRICE_PER_MIN * MINUTES)
  eq('session minutes', session.minutesSettled, MINUTES)

  const afterSettle = await readWorkerAccount(conn, worker.publicKey)
  if (!afterSettle) throw new Error('worker vanished')
  eq('worker earned (99%)', afterSettle.earned, 2_970n)
  eq('worker settlements', afterSettle.settlements, 1n)
  eq('treasury accrued (1%)', (await readEscrow(conn))!.treasuryAccrued, 30n)

  console.log('close session (refund)')
  await send(conn, user, [
    closeSessionIx({
      sessionId: 0n,
      caller: user.publicKey,
      user: user.publicKey,
      mint,
    }),
  ])
  session = await readSession(conn, 0n)
  if (!session) throw new Error('session vanished')
  eq('session status', session.status, SESSION_CLOSED)
  eq('user refunded', await balanceOf(user.publicKey, mint), 50n * USDC - PRICE_PER_MIN * MINUTES)
  eq('vault after refund', await balanceOf(escrowPda(), mint), PRICE_PER_MIN * MINUTES)

  console.log('claim before the delay elapses')
  try {
    await send(conn, authority, [
      ...claimIxs({
        sessionId: 0n,
        worker: worker.publicKey,
        mint,
        payer: authority.publicKey,
      }),
    ])
    throw new Error('claim should have been refused before CLAIM_DELAY_SECS')
  } catch (err) {
    if (String(err).includes('should have been refused')) throw err
    ok(`refused: ${explain(err).slice(0, 70)}`)
  }

  console.log('claim')
  // The deployed program is the production build, whose payout wait is ten
  // minutes. With GENKAKU_FAST_CLAIM_SO set we upgrade to the `fast-claim`
  // build first, which is the same program with that constant set to zero.
  const fastSo = process.env.GENKAKU_FAST_CLAIM_SO
  if (fastSo) {
    console.log(`  ..  upgrading to ${fastSo}`)
    execFileSync(
      'solana',
      [
        'program',
        'deploy',
        '--url',
        RPC,
        '--keypair',
        join(homedir(), '.config/solana/team-dev.json'),
        '--program-id',
        join(homedir(), '.config/solana/genkaku-program.json'),
        fastSo,
      ],
      { stdio: 'inherit' },
    )
    await new Promise(resolve => setTimeout(resolve, 3_000))
  }
  await send(conn, authority, [
    ...claimIxs({
      sessionId: 0n,
      worker: worker.publicKey,
      mint,
      payer: authority.publicKey,
    }),
  ])
  session = await readSession(conn, 0n)
  if (!session) throw new Error('session vanished')
  eq('session status', session.status, SESSION_CLAIMED)
  eq('worker paid', await balanceOf(worker.publicKey, mint), 2_970n)
  eq('vault after claim', await balanceOf(escrowPda(), mint), 30n)

  console.log('reclaim rent')
  const before = await conn.getBalance(user.publicKey)
  await send(conn, user, [reclaimSessionIx(0n, user.publicKey)])
  const after = await conn.getBalance(user.publicKey)
  if (after <= before) throw new Error(`rent not returned (${before} -> ${after})`)
  ok(`rent returned, net +${after - before} lamports`)
  if (await readSession(conn, 0n)) throw new Error('session account still exists after reclaim')
  ok('session account closed')

  console.log('price ceiling')
  // The listing is a CEILING: a session priced below it is legal (a worker
  // sells several models at different rates against one price account), and
  // only the sidecar's paywall enforces each model's own quote.
  await send(conn, user, openSessionIxs({
    user: user.publicKey,
    worker: worker.publicKey,
    mint,
    id: 1n,
    pricePerMin: PRICE_PER_MIN / 2n,
    deposit: PRICE_PER_MIN,
  }))
  const cheap = await readSession(conn, 1n)
  if (cheap == null) throw new Error('session 1 not found')
  eq('under-listing price accepted', cheap.pricePerMin, PRICE_PER_MIN / 2n)

  try {
    await send(conn, user, openSessionIxs({
      user: user.publicKey,
      worker: worker.publicKey,
      mint,
      id: 2n,
      pricePerMin: PRICE_PER_MIN * 2n,
      deposit: PRICE_PER_MIN * 2n,
    }))
    throw new Error('a price above the listing should have been refused')
  } catch (err) {
    if (String(err).includes('should have been refused')) throw err
    ok(`refused: ${explain(err).slice(0, 60)}`)
  }

  await send(conn, user, [
    closeSessionIx({ sessionId: 1n, caller: user.publicKey, user: user.publicKey, mint }),
  ])
  ok('session 1 closed')

  console.log('\nall checks passed')
}

main().catch(err => {
  console.error('\nFAILED:', explain(err))
  process.exitCode = 1
})
