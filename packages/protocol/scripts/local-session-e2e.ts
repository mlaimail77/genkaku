// Full session over real libp2p, against a real local cluster.
//
//   scripts/local-validator.sh                     # in genkaku/solana
//   solana program deploy ...                      # the production .so
//   GENKAKU_RPC_URL=http://127.0.0.1:8899 \
//     GENKAKU_MINT_AUTHORITY_KEY=$(...team-dev base58...) \
//     npx tsx packages/protocol/scripts/local-session-e2e.ts
//
// This is the only test that exercises the parts the chain tests cannot:
//
//   * one ed25519 key is the wallet AND the libp2p PeerId, and the client
//     verifies that binding from the address it dialed;
//   * the paywall reads the session off chain and refuses work it cannot be
//     paid for;
//   * receipts are signed by the paying wallet and verified by the worker;
//   * `settle/1` is signed and submitted BY THE WORKER, and the client can see
//     the transaction it got back;
//   * closing the session returns the unused deposit.
//
// It builds both halves in one process: a sidecar serving a scripted token
// stream, and a user node consuming it. Nothing is stubbed except the model.

import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from '@solana/web3.js'
import { getAccount, getMint, mintTo } from '@solana/spl-token'

import {
  DEFAULT_SESSION_MINUTES,
  openEscrow,
  publicClientFor,
  readEscrowSession,
  readWorker,
  refundSession,
  signReceiptPayload,
  type GenkakuWallet,
} from '../src/chain.ts'
import { dialWorkerAny, helloWorker, requestSettle } from '../src/dial.ts'
import { ModeManager } from '../src/modeManager.ts'
import type { Offer } from '../src/offer.ts'
import type { ReceiptPayloadV1 } from '../src/receipts.ts'
import { createPaywall } from '../src/paywall.ts'
import { createSidecar, createUserNode } from '../src/p2pNode.ts'
import { walletOfPeerId } from '../src/registry.ts'
import { associatedTokenAddress, connection, createIdempotentAtaIx, escrowPda, explain, mintFor, send } from '../src/solana.ts'
import { runUserSession } from '../src/userSession.ts'

const ENV = 'solana-devnet' as const
const RPC = process.env.GENKAKU_RPC_URL ?? 'http://127.0.0.1:8899'
const conn = connection(ENV, 'confirmed')

const PRICE_PER_HOUR = 60_000n // 0.06 USDC/hour → 1000 micro per started minute
const PRICE_PER_MIN = 1_000n

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

async function fund(payer: Keypair, to: PublicKey, sol: number): Promise<void> {
  const tx = new Transaction().add(
    SystemProgram.transfer({ fromPubkey: payer.publicKey, toPubkey: to, lamports: sol * LAMPORTS_PER_SOL }),
  )
  await send(conn, payer, tx.instructions)
}

async function usdcOf(owner: PublicKey): Promise<bigint> {
  const mint = mintFor(ENV)
  if (mint == null) throw new Error('no devnet mint in netconfig')

  return (await getAccount(conn, associatedTokenAddress(owner, mint))).amount
}

async function main(): Promise<void> {
  console.log(`cluster ${RPC}`)

  const mint = mintFor(ENV)
  if (mint == null) throw new Error('netconfig has no devnet mint — run scripts/init-cluster.ts first')
  eq('mint decimals', (await getMint(conn, mint)).decimals, 6)

  const authority = keypair(join(homedir(), '.config/solana/team-dev.json'))
  const user = Keypair.generate()
  const worker = Keypair.generate()

  await fund(authority, user.publicKey, 0.1)
  await fund(authority, worker.publicKey, 0.1)
  ok('user and worker funded')

  await send(conn, authority, [createIdempotentAtaIx(authority.publicKey, user.publicKey, mint)])
  await mintTo(conn, authority, mint, associatedTokenAddress(user.publicKey, mint), authority, 1_000_000)
  eq('user test USDC', await usdcOf(user.publicKey), 1_000_000n)

  // ── worker ─────────────────────────────────────────────────────────────
  const workerModes = new ModeManager()
  workerModes.switch('workerDedicated')

  const sidecar = await createSidecar({
    modeManager: workerModes,
    env: ENV,
    workerKey: worker,
    listen: ['/ip4/127.0.0.1/tcp/0'],
    catalog: [{
      proto: 'offers/1',
      workerName: 'e2e-worker',
      model: 'e2e-model',
      pricePerHour: PRICE_PER_HOUR,
      creditScore: 50,
      sessionsServed: 0,
      capabilities: ['tools'],
      tier: 'agent',
    } satisfies Offer],
    source: {
      async stream(req, onDelta) {
        for (const token of ['hello', ' ', 'world']) {
          onDelta(token)
          await new Promise(resolve => setTimeout(resolve, 20))
        }

        return { promptTokens: 1, completionTokens: 3, model: req.model }
      },
    },
    paywall: createPaywall({
      conn,
      env: ENV,
      worker: worker.publicKey.toBase58(),
      prices: () => PRICE_PER_HOUR,
    }),
    sessionEvents: (event) => {
      if (event.type === 'session-error') console.log(`  ..  worker: ${event.message}`)
      if (event.type === 'settlement') console.log(`  ..  worker settled ${event.minutes} min in ${event.tx.slice(0, 12)}…`)
    },
  })

  const peerId = sidecar.peerIdStr()
  eq('PeerId encodes the worker wallet', walletOfPeerId(peerId), worker.publicKey.toBase58())

  const selfAddr = sidecar.peerAddrs().find(addr => addr.startsWith('/ip4/127.0.0.1')) ?? sidecar.peerAddrs()[0]
  if (selfAddr == null) throw new Error('the sidecar announced no address')
  console.log(`  ..  worker at ${selfAddr}`)

  // The on-chain listing only has to be a CEILING at or above the quote, and
  // the account has to exist because settlement pays it.
  const { registerWorkerIx } = await import('../src/solana.ts')
  await send(conn, worker, [
    registerWorkerIx({
      wallet: worker.publicKey,
      pricePerMin: PRICE_PER_MIN,
      active: true,
      peerId: Buffer.from(peerId),
      locator: selfAddr,
    }),
  ])
  const listing = await readWorker(conn, ENV, worker.publicKey.toBase58())
  if (listing == null) throw new Error('worker listing missing')
  eq('listing rate', listing.pricePerMin, PRICE_PER_MIN)

  // ── user ───────────────────────────────────────────────────────────────
  const userNode = await createUserNode([])

  const hello = await helloWorker(userNode, selfAddr)
  eq('hello proves the wallet', hello.wallet, worker.publicKey.toBase58())
  ok('hello verified')

  const opened = await openEscrow(conn, user, ENV, worker.publicKey.toBase58(), PRICE_PER_HOUR)
  console.log(`  ..  session ${opened.escrowId} opened with ${opened.deposit} micro-USDC`)
  eq('prepaid minutes', opened.deposit / PRICE_PER_MIN, DEFAULT_SESSION_MINUTES)

  const dialed = await dialWorkerAny(userNode, selfAddr)
  eq('route', dialed.route, 'direct')

  let receiptHash: string | null = null
  let spend = 0n

  const result = await runUserSession({
    jobId: `e2e-${Date.now().toString(36)}`,
    offer: {
      proto: 'offers/1',
      workerName: 'e2e-worker',
      model: 'e2e-model',
      pricePerHour: PRICE_PER_HOUR,
      creditScore: 50,
      sessionsServed: 0,
      workerWallet: worker.publicKey.toBase58(),
      walletVerified: true,
    },
    prompt: 'say hello',
    transport: dialed.transport,
    modeManager: (() => {
      const modes = new ModeManager()
      modes.switch('user')
      return modes
    })(),
    escrowId: opened.escrowId.toString(),
    env: ENV,
    signReceipt: (receipt: ReceiptPayloadV1) => signReceiptPayload(user, receipt),
    emit: (event) => {
      if (event.type === 'receipt-sent') {
        receiptHash = event.receiptHash
        spend = event.amount
      }
    },
  })

  eq('tokens streamed', result.tokens, 3)
  eq('billed one started minute', result.billed, PRICE_PER_MIN)
  if (receiptHash == null) throw new Error('no receipt was sent — the worker could not settle')

  const settled = await requestSettle(userNode, selfAddr, {
    jobId: result.jobId,
    escrowId: opened.escrowId.toString(),
    receiptHash,
    spend,
  })

  if (!settled.ok || settled.tx == null) throw new Error(`settle refused: ${settled.reason ?? 'no reason'}`)
  eq('settled minutes', settled.minutes ?? 0n, 1n)
  ok(`settlement tx ${settled.tx}`)

  const session = await readEscrowSession(conn, ENV, opened.escrowId)
  if (session == null) throw new Error('session vanished')
  eq('session accrued', session.accrued, PRICE_PER_MIN)
  eq('session remaining', session.amount, opened.deposit - PRICE_PER_MIN)

  const after = await readWorker(conn, ENV, worker.publicKey.toBase58())
  if (after == null) throw new Error('worker listing vanished')
  eq('worker earned (99%)', after.earned, (PRICE_PER_MIN * 99n) / 100n)

  const tx = await refundSession(conn, user, ENV, opened.escrowId)
  if (tx === '') throw new Error('the close was a no-op')
  eq('user refunded', await usdcOf(user.publicKey), 1_000_000n - PRICE_PER_MIN)

  await sidecar.stop()
  await userNode.stop()

  console.log('\nall checks passed')
}

main().catch((error) => {
  console.error(`\nFAILED: ${explain(error)}`)
  process.exitCode = 1
})
