// The spending ceiling, on a REAL cluster: the last session a budget can afford
// opens and settles, and the next one is refused BEFORE anything is signed.
//
//   GENKAKU_RPC_URL=https://api.devnet.solana.com \
//   npx tsx packages/protocol/scripts/devnet-policy-e2e.ts
//
// The point of this script is the ORDER of the two decisions. A refusal is only
// worth anything if the wallet never signs: a transaction that is built and then
// thrown away has still been a signature, and a signature is the only thing an
// on-chain observer sees. So the assertion is a signature COUNT that does not
// move across a refused session.
//
// It also checks the one thing the policy and the program must agree on: the
// deposit the policy approved is the deposit the escrow actually took. Both sides
// use `sessionDeposit`, and this is the test that says so.

import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from '@solana/web3.js'
import { getAccount, mintTo } from '@solana/spl-token'

import { openEscrow, refundSession, settleSession } from '../src/chain.ts'
import {
  MICRO_USDC,
  appendSpend,
  commit,
  defaultSpendPolicy,
  formatMicro,
  readSpendPolicy,
  remainingMicro,
  reserve,
  spendVerdict,
  writeSpendPolicy,
} from '../src/policy.ts'
import {
  associatedTokenAddress,
  connection,
  createIdempotentAtaIx,
  explain,
  mintFor,
  readEscrow,
  registerWorkerIx,
  send,
  type GenkakuWallet,
} from '../src/solana.ts'

const RPC = process.env.GENKAKU_RPC_URL ?? 'https://api.devnet.solana.com'
const conn = connection('solana-devnet', 'confirmed')
const env = 'solana-devnet' as const

/** 0.0001 USDC a minute → 0.006 USDC an hour. A ten-minute session prepays
 *  0.001 USDC, which is exactly the budget: one session, then nothing. */
const PRICE_PER_MIN = 100n
const PRICE_PER_HOUR = 6_000n
const BUDGET = 1_000n

function keypair(path: string): Keypair {
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(path, 'utf8')) as number[]))
}

function eq(label: string, actual: unknown, expected: unknown): void {
  const a = typeof actual === 'bigint' ? actual.toString() : String(actual)
  const e = typeof expected === 'bigint' ? expected.toString() : String(expected)
  if (a !== e) throw new Error(`${label}: expected ${e}, got ${a}`)
  console.log(`  ok  ${label} = ${a}`)
}

function ok(label: string): void {
  console.log(`  ok  ${label}`)
}

async function transfer(payer: Keypair, to: PublicKey, sol: number): Promise<void> {
  await send(conn, payer, [
    SystemProgram.transfer({ fromPubkey: payer.publicKey, toPubkey: to, lamports: sol * LAMPORTS_PER_SOL }),
  ])
}

async function usdcBalance(owner: PublicKey, mint: PublicKey): Promise<bigint> {
  return (await getAccount(conn, associatedTokenAddress(owner, mint))).amount
}

/** Every signature this wallet ever produced, on both sides. A refusal must not
 *  change this number — not even by one. */
async function signatureCount(wallet: PublicKey): Promise<number> {
  const before = await conn.getSignaturesForAddress(wallet, { limit: 1000 })

  return before.length
}

async function main(): Promise<void> {
  console.log(`cluster ${RPC}`)

  const mint = mintFor(env)
  if (mint == null) throw new Error('netconfig has no devnet mint — run scripts/init-cluster.ts first')

  const escrow = await readEscrow(conn)
  if (escrow == null) throw new Error('the escrow is not initialised — run scripts/init-cluster.ts')

  const authority = keypair(join(homedir(), '.config/solana/team-dev.json'))
  const authoritySol = await conn.getBalance(authority.publicKey)
  if (authoritySol < 0.15 * LAMPORTS_PER_SOL) {
    throw new Error(`team-dev has ${(authoritySol / LAMPORTS_PER_SOL).toFixed(3)} SOL; fund it before running this`)
  }

  const user = Keypair.generate() as GenkakuWallet
  const worker = Keypair.generate() as GenkakuWallet
  console.log(`\nuser   ${user.publicKey.toBase58()}`)
  console.log(`worker ${worker.publicKey.toBase58()}`)

  await transfer(authority, user.publicKey, 0.05)
  await transfer(authority, worker.publicKey, 0.05)
  await send(conn, authority, [createIdempotentAtaIx(authority.publicKey, user.publicKey, mint)])
  // Two sessions' worth of money: the budget, not the balance, is what stops
  // the second one. Otherwise this test would only prove the wallet is empty.
  await mintTo(conn, authority, mint, associatedTokenAddress(user.publicKey, mint), authority, Number(BUDGET * 2n))
  eq('user test USDC', await usdcBalance(user.publicKey, mint), BUDGET * 2n)

  console.log('\nregister worker')
  await send(conn, worker, [
    registerWorkerIx({
      wallet: worker.publicKey,
      pricePerMin: PRICE_PER_MIN,
      active: true,
      peerId: Buffer.from(`12D3KooWPolicy${Date.now().toString(36)}`),
      locator: '/ip4/203.0.113.11/tcp/4001',
    }),
  ])

  const dir = mkdtempSync(join(homedir(), '.genkaku-policy-e2e-'))

  try {
    console.log('\npolicy: 0.001 USDC, never resets')
    writeSpendPolicy(dir, {
      ...defaultSpendPolicy(),
      name: 'e2e-cap',
      creditLimitMicro: BUDGET,
      perSessionMicro: null, // the budget alone decides this first session
      maxPricePerHourMicro: null,
      reset: 'never',
    })
    eq('credit limit', readSpendPolicy(dir).creditLimitMicro, BUDGET)

    // ── session 1: allowed, signed, settled ────────────────────────────────
    console.log('\nsession 1 (the budget allows exactly this one)')
    const before = await signatureCount(user.publicKey)

    const live = readSpendPolicy(dir)
    const verdict = spendVerdict(live, { deposit: BUDGET, pricePerHour: PRICE_PER_HOUR })

    if (!verdict.ok) throw new Error(`session 1 should be allowed: ${verdict.message}`)
    ok('verdict allows the session')

    const reserved = reserve(live, { deposit: verdict.deposit, model: 'tiny:1b' })
    writeSpendPolicy(dir, reserved.policy)

    const opened = await openEscrow(conn, user, env, worker.publicKey.toBase58(), PRICE_PER_HOUR)
    eq('escrow deposit equals what the policy approved', opened.deposit, verdict.deposit)
    eq('deposit is the whole budget', opened.deposit, BUDGET)
    eq('user USDC after deposit', await usdcBalance(user.publicKey, mint), BUDGET)

    const settled = await settleSession(conn, worker, env, { escrowId: opened.escrowId, spend: BUDGET })
    eq('settled minutes', settled.minutes, 10n)
    eq('settled charge', settled.charged, BUDGET)
    await refundSession(conn, user, env, opened.escrowId)
    ok('session closed')

    writeSpendPolicy(dir, commit(readSpendPolicy(dir), reserved.id, settled.charged))
    appendSpend(dir, {
      at: Date.now(),
      micro: settled.charged.toString(),
      model: 'tiny:1b',
      escrowId: opened.escrowId.toString(),
      tx: settled.tx,
    })

    const spent = readSpendPolicy(dir)
    eq('period spend', spent.periodSpentMicro, BUDGET)
    eq('remaining', remainingMicro(spent), 0n)

    // ── session 2: refused, and NOTHING is signed ──────────────────────────
    console.log('\nsession 2 (same wallet, same worker, one more session)')
    const signedBeforeRefusal = await signatureCount(user.publicKey)
    const refusedAt = readSpendPolicy(dir)
    const refusal = spendVerdict(refusedAt, { deposit: BUDGET, pricePerHour: PRICE_PER_HOUR })

    if (refusal.ok) throw new Error('session 2 should have been refused')
    eq('refusal code', refusal.code, 'budget_exhausted')
    ok(`refusal message: ${refusal.message}`)

    // The refusal is the assertion: a wallet that did not sign has nothing to
    // show. Compare the count AFTER the refusal with the count before it.
    eq('user signatures unchanged by the refusal', await signatureCount(user.publicKey), signedBeforeRefusal)

    // The money that would have funded session 2 is still in the wallet.
    eq('user USDC still untouched by session 2', await usdcBalance(user.publicKey, mint), BUDGET)

    // And the first session really did cost exactly the budget.
    eq('session 1 + refusal left two signatures (open, close)', signedBeforeRefusal, before + 2)

    // ── the per-session cap refuses a single too-expensive session ─────────
    console.log('\nper-session cap: 0.0005 USDC against a 0.001 USDC session')
    writeSpendPolicy(dir, {
      ...defaultSpendPolicy(),
      name: 'e2e-per-session',
      creditLimitMicro: 10n * MICRO_USDC,
      perSessionMicro: 500n,
    })

    const capped = spendVerdict(readSpendPolicy(dir), { deposit: BUDGET, pricePerHour: PRICE_PER_HOUR })
    if (capped.ok) throw new Error('the per-session cap should have refused')
    eq('refusal code', capped.code, 'session_cap')
    eq('signatures still unchanged', await signatureCount(user.publicKey), signedBeforeRefusal)

    console.log('\nall policy checks passed')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(`\nFAILED: ${explain(error)}`)
  process.exitCode = 1
})
