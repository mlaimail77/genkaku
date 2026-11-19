// GENKAKU: tips — the money a user sends a worker directly.
//
// A tip is not a settlement. GenKaKu is not a party to it: the user signs an SPL
// `TransferChecked` straight into the worker's wallet, with a memo that says
// what the transfer was. That means there is nothing to index and nothing to
// trust — the worker's own token account history IS the ledger.
//
// So reading tips is a wallet read, not a protocol read:
//   1. the worker's associated token account's signatures,
//   2. each transaction's memo (written by `sendTip`),
//   3. the memo's amount.
//
// Both facts come from the same transaction, so a forged memo without a matching
// transfer is not counted: the amount is re-derived from the token balances the
// runtime already reports, and a memo is only used to identify the transfer as
// a tip rather than an ordinary payment.

import type { Connection, ParsedTransactionWithMeta } from '@solana/web3.js'

// Every Solana value in this package comes from `solana.ts`, which is the one
// module the build inlines. Importing web3.js directly here would make the
// published package depend on it — and pull `ws` back in.
import { PublicKey, associatedTokenAddress, mintFor } from './solana.ts'
import type { NetEnvironment } from './netconfig.ts'

export type TipRecord = {
  signature: string
  /** ms since epoch, from the block time */
  at: number
  micro: bigint
  /**
   * The wallet the USDC came from, read off the token account whose balance
   * dropped. The attestor counts distinct tippers from this, so a worker cannot
   * raise its own score by tipping itself repeatedly — that wallet is excluded
   * upstream, and `distinctTippers` below dedupes.
   */
  from?: string
}

export type TipSummary = {
  count: number
  totalMicro: bigint
  recent: TipRecord[]
}

export const EMPTY_TIPS: TipSummary = { count: 0, totalMicro: 0n, recent: [] }

const TIP_MEMO = /genkaku:tip\s+(\d+)/

/** USDC moved INTO `wallet`'s token account by this transaction, in micro. */
function creditedMicro(tx: ParsedTransactionWithMeta, ata: string): bigint {
  const meta = tx.meta
  if (meta == null) return 0n

  const keyOf = (index: number): string => {
    const account = tx.transaction.message.accountKeys[index]

    return typeof account === 'string' ? account : account?.pubkey.toBase58() ?? ''
  }

  const amountFor = (rows: NonNullable<typeof meta.preTokenBalances>): bigint => {
    for (const row of rows) {
      if (keyOf(row.accountIndex) === ata) return BigInt(row.uiTokenAmount.amount)
    }

    return 0n
  }

  const before = amountFor(meta.preTokenBalances ?? [])
  const after = amountFor(meta.postTokenBalances ?? [])

  return after > before ? after - before : 0n
}

/** The owner of the token account that lost USDC in this transaction: the
 *  sender's wallet. */
function senderOf(tx: ParsedTransactionWithMeta): string | undefined {
  const meta = tx.meta
  if (meta == null) return undefined

  const keyOf = (index: number): string => {
    const account = tx.transaction.message.accountKeys[index]

    return typeof account === 'string' ? account : account?.pubkey.toBase58() ?? ''
  }

  const before = new Map<string, bigint>()
  for (const row of meta.preTokenBalances ?? []) {
    before.set(keyOf(row.accountIndex), BigInt(row.uiTokenAmount.amount))
  }

  for (const row of meta.postTokenBalances ?? []) {
    const key = keyOf(row.accountIndex)
    const was = before.get(key)

    if (was == null) continue
    if (BigInt(row.uiTokenAmount.amount) >= was) continue
    if (row.owner == null) continue

    return row.owner
  }

  return undefined
}

function memoOf(tx: ParsedTransactionWithMeta): string {
  const logs = tx.meta?.logMessages ?? []

  for (const line of logs) {
    const index = line.indexOf('genkaku:tip')
    if (index >= 0) return line.slice(index)
  }

  return ''
}

/**
 * Tips this worker received, newest first.
 *
 * Bounded on purpose: ten signatures, no paging, no crawler. A worker who wants
 * a full history has the wallet's own explorer for that; the panel only needs
 * enough to answer "did anyone appreciate this?".
 */
export async function readRecentTips(
  conn: Connection,
  env: NetEnvironment,
  wallet: string,
  opts: { limit?: number } = {},
): Promise<TipSummary> {
  const mint = mintFor(env)
  if (mint == null) return EMPTY_TIPS

  const owner = new PublicKey(wallet)
  const ata = associatedTokenAddress(owner, mint).toBase58()
  const signatures = await conn.getSignaturesForAddress(new PublicKey(ata), {
    limit: opts.limit ?? 10,
  })

  if (signatures.length === 0) return EMPTY_TIPS

  const recent: TipRecord[] = []
  let totalMicro = 0n

  for (const row of signatures) {
    if (row.err != null) continue

    const tx = await conn.getParsedTransaction(row.signature, {
      maxSupportedTransactionVersion: 0,
      commitment: 'confirmed',
    })

    if (tx == null) continue
    if (!TIP_MEMO.test(memoOf(tx))) continue

    const micro = creditedMicro(tx, ata)
    if (micro <= 0n) continue

    recent.push({
      signature: row.signature,
      at: (tx.blockTime ?? 0) * 1000,
      micro,
      ...(senderOf(tx) == null ? {} : { from: senderOf(tx) }),
    })
    totalMicro += micro
  }

  return { count: recent.length, totalMicro, recent }
}

/**
 * Distinct wallets that tipped, excluding the worker's own.
 *
 * A tip from the worker to itself is still real money moving (and still counted
 * in the total), but it must not manufacture reputation, so it never counts as a
 * distinct tipper. That is the one anti-Sybil rule the score can enforce from
 * chain data alone.
 */
export function distinctTippers(tips: TipSummary, wallet: string): number {
  const seen = new Set<string>()

  for (const tip of tips.recent) {
    if (tip.from == null || tip.from === '') continue
    if (tip.from === wallet) continue
    seen.add(tip.from)
  }

  return seen.size
}
