// 0.3 tips and sponsored placements, end to end on devnet.
//
//   npx tsx packages/protocol/scripts/tip-e2e.ts
//
// What this proves, and why it needs a cluster rather than a mock:
//
//   * a tip is an ordinary SPL `TransferChecked` with a memo, signed by the
//     user's key — so the worker's own token history is the receipt, and
//     `readRecentTips` can re-derive it without trusting GenKaKu;
//   * the recipient's token account is created by the sender, so a worker that
//     has never held USDC can still be tipped;
//   * the bridge endpoint signs exactly the amount the panel asked for;
//   * with no ads service reachable, every ad route answers "paused" instead of
//     erroring — the unsponsored fallback.
//
// It spends ~0.05 devnet SOL on rent/fees and 1 test USDC.

import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from '@solana/web3.js'
import { getAccount, mintTo } from '@solana/spl-token'

import { createAdFeed } from '../src/adFeed.ts'
import { startOpenAiBridge } from '../src/bridge.ts'
import { sendTip } from '../src/chain.ts'
import { ModeManager } from '../src/modeManager.ts'
import { readRecentTips } from '../src/tips.ts'
import {
  associatedTokenAddress,
  connection,
  createIdempotentAtaIx,
  mintFor,
  send,
} from '../src/solana.ts'

const conn = connection('solana-devnet', 'confirmed')
const TIP = 2_500_000n // 2.5 USDC — one of the panel's buttons

function keypair(path: string): Keypair {
  return Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(readFileSync(path, 'utf8')) as number[]),
  )
}

function ok(label: string): void {
  console.log(`  ok  ${label}`)
}

function eq(label: string, actual: unknown, expected: unknown): void {
  const a = String(actual)
  const e = String(expected)
  if (a !== e) throw new Error(`${label}: expected ${e}, got ${a}`)
  console.log(`  ok  ${label} = ${a}`)
}

async function transfer(payer: Keypair, to: PublicKey, sol: number): Promise<void> {
  const tx = new Transaction().add(
    SystemProgram.transfer({ fromPubkey: payer.publicKey, toPubkey: to, lamports: sol * LAMPORTS_PER_SOL }),
  )
  await send(conn, payer, tx.instructions)
}

async function main(): Promise<void> {
  const mint = mintFor('solana-devnet')
  if (mint == null) throw new Error('netconfig has no devnet mint')

  const authority = keypair(join(homedir(), '.config/solana/team-dev.json'))
  const user = Keypair.generate()
  const worker = Keypair.generate()
  console.log(`user   ${user.publicKey.toBase58()}`)
  console.log(`worker ${worker.publicKey.toBase58()}\n`)

  await transfer(authority, user.publicKey, 0.05)
  ok('user funded with 0.05 SOL')

  await send(conn, authority, [createIdempotentAtaIx(authority.publicKey, user.publicKey, mint)])
  await mintTo(conn, authority, mint, associatedTokenAddress(user.publicKey, mint), authority, 5_000_000)
  ok('user minted 5 test USDC')

  const workerAta = associatedTokenAddress(worker.publicKey, mint)
  eq(
    'worker has no token account yet',
    await getAccount(conn, workerAta).then(() => 'yes').catch(() => 'no'),
    'no',
  )

  // ── 1. sendTip creates the recipient ATA, transfers, and memos ────────────
  console.log('\nsendTip')
  const signature = await sendTip(conn, 'solana-devnet', user, worker.publicKey.toBase58(), TIP)
  ok(`transfer ${signature.slice(0, 12)}…`)

  eq('worker token balance', (await getAccount(conn, workerAta)).amount, TIP)
  eq('user token balance', (await getAccount(conn, associatedTokenAddress(user.publicKey, mint))).amount, 2_500_000n)

  const tips = await readRecentTips(conn, 'solana-devnet', worker.publicKey.toBase58())
  eq('tips counted from the wallet history', tips.count, 1)
  eq('tips total', tips.totalMicro, TIP)
  eq('tip signature matches', tips.recent[0]?.signature, signature)

  // ── 2. the bridge endpoint signs the amount the panel sent ────────────────
  console.log('\nbridge')
  const bridge = await startOpenAiBridge({
    workers: [],
    port: 0,
    env: 'solana-devnet',
    modeManager: new ModeManager(),
    getNode: () => Promise.reject(new Error('no libp2p node in this script')),
    userKey: () => user,
    settle: false,
    log: () => undefined,
    keyDir: join(homedir(), '.dsh', 'genkaku'),
    // A deliberately unreachable ads service: the launch state before the ads
    // host exists, and the state a fresh install sees.
    ads: createAdFeed({ baseUrl: 'http://127.0.0.1:1/ads/v1', timeoutMs: 400 }),
    tip: async ({ to, micro }) => await sendTip(conn, 'solana-devnet', user, to, micro),
  })
  const root = bridge.url.replace(/\/v1$/, '')

  try {
    const tipRes = await fetch(`${root}/genkaku/tip`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ worker: worker.publicKey.toBase58(), micro: '500000' }),
    })
    eq('POST /genkaku/tip status', tipRes.status, 200)
    eq('worker token balance after the second tip', (await getAccount(conn, workerAta)).amount, TIP + 500_000n)

    const over = await fetch(`${root}/genkaku/tip`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ worker: worker.publicKey.toBase58(), micro: '9000000' }),
    })
    eq('over-ceiling tip refused', over.status, 400)

    const adMode = await (await fetch(`${root}/genkaku/ads`)).json() as { mode: string; endpoint: unknown }
    eq('ads mode with no service', adMode.mode, 'paused')
    eq('ads endpoint', adMode.endpoint, 'http://127.0.0.1:1/ads/v1/catalog')

    const ad = await (await fetch(`${root}/genkaku/ad`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: 'please refactor this typescript module' }),
    })).json() as { ad: unknown; mode: string }
    eq('no creative is offered', ad.ad, null)
    eq('and the mode says why', ad.mode, 'paused')

    const dock = await (await fetch(`${root}/genkaku/ad`)).json() as { ad: unknown; turn: number }
    eq('the dock renders nothing', dock.ad, null)

    const finalTips = await readRecentTips(conn, 'solana-devnet', worker.publicKey.toBase58())
    eq('both tips are readable', finalTips.count, 2)
    eq('total', finalTips.totalMicro, TIP + 500_000n)
  } finally {
    await bridge.close()
  }

  console.log('\nall checks passed')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
