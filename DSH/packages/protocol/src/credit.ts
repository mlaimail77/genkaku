// GENKAKU: behavioural credit (trust layer A) — derived off-chain from escrow
// events. There is no token, no oracle and no extra transaction: anyone with a
// Base RPC can re-derive exactly these numbers from the same logs, which is the
// whole point of putting the formula in the open (strata-migration §36).
//
// A worker's score answers one question a payer asks before funding an escrow:
// "when this peer opens a session, does it finish?" It does NOT attest to model
// quality or honesty — that is P4.10 (deposits) and the commit-challenge.
//
//   opened   = SessionOpened(worker=w)      sessions funded for w
//   settled  = SessionSettled(worker=w)     sessions that reached settlement
//   completion = settled / opened           (in-flight sessions count as not yet)
//   confidence = settled / (settled + 5)    (shrink small samples toward 0)
//   score    = round(100 * completion * confidence)
//
// New worker = 0. 5 settled of 5 = 50. 20 of 20 = 80. 95 of 95 = 95.

import {
  collectLogs,
  ESCROW_ABI,
  ESCROW_DEPLOY_BLOCK,
  type GenkakuPublic,
} from './chain.ts'
import { CONTRACTS, type NetEnvironment } from './netconfig.ts'

/** The event choice is made at runtime; one widened type keeps viem happy. */
type EscrowEventAbi = Extract<(typeof ESCROW_ABI)[number], { type: 'event' }>

function escrowEvent(name: string): EscrowEventAbi {
  const found = ESCROW_ABI.find(entry => entry.type === 'event' && entry.name === name)

  if (found == null || found.type !== 'event') {
    throw new Error('[genkaku:credit] escrow ABI is missing event ' + name)
  }

  return found
}

export type WorkerStats = {
  opened: number
  settled: number
  /** cumulative settled USDC (6 decimals) */
  spend: bigint
}

export type CreditSnapshot = {
  score: number
  sessions: number
  spend: bigint
}

/** The published formula; pure so tests and the UI can reuse it verbatim. */
export function creditScoreOf(stats: Pick<WorkerStats, 'opened' | 'settled'>): number {
  if (stats.settled <= 0) {return 0}

  const completion = stats.opened > 0 ? stats.settled / stats.opened : 0
  const confidence = stats.settled / (stats.settled + 5)

  return Math.round(100 * Math.min(1, completion) * confidence)
}

const SCAN_CHUNK = 50_000n

/** Incremental, process-local index. The chain is the source of truth; this is
 *  only a cache so a status page never pays for a full re-scan. */
export class CreditTracker {
  private stats = new Map<string, WorkerStats>()
  private next: bigint
  private running: Promise<void> | null = null
  private lastBlock = 0n

  constructor(
    private readonly publicC: GenkakuPublic,
    private readonly env: NetEnvironment,
  ) {
    this.next = ESCROW_DEPLOY_BLOCK[env]
  }

  /** Scan only the blocks nobody has scanned yet. Concurrent callers share one
   *  pass; a failed pass leaves the cursor where it was so the next one retries. */
  async refresh(): Promise<void> {
    if (CONTRACTS[this.env].escrow === '') {return}
    if (this.running != null) {return await this.running}

    this.running = this.scan().finally(() => { this.running = null })

    return await this.running
  }

  /** null = this wallet has no history (leave the offer's self-report alone). */
  snapshot(wallet: string): CreditSnapshot | null {
    const stats = this.stats.get(wallet.toLowerCase())

    if (stats == null) {return null}

    return { score: creditScoreOf(stats), sessions: stats.settled, spend: stats.spend }
  }

  statsOf(wallet: string): WorkerStats | null {
    return this.stats.get(wallet.toLowerCase()) ?? null
  }

  blockNumber(): bigint {
    return this.lastBlock
  }

  private async scan(): Promise<void> {
    const latest = await this.publicC.getBlockNumber()

    if (latest < this.next) {return}

    const escrow = CONTRACTS[this.env].escrow as `0x${string}`
    const openedEvent = escrowEvent('SessionOpened')
    const settledEvent = escrowEvent('SessionSettled')

    const bump = (wallet: string, change: (s: WorkerStats) => void): void => {
      const key = wallet.toLowerCase()
      const row = this.stats.get(key) ?? { opened: 0, settled: 0, spend: 0n }
      change(row)
      this.stats.set(key, row)
    }

    for (let start = this.next; start <= latest; start += SCAN_CHUNK) {
      const end = start + SCAN_CHUNK - 1n > latest ? latest : start + SCAN_CHUNK - 1n
      const [opens, settles] = await Promise.all([
        collectLogs(this.publicC, escrow, openedEvent, start, end),
        collectLogs(this.publicC, escrow, settledEvent, start, end),
      ])

      for (const log of opens) {
        const a = log.args as { worker: `0x${string}` }
        bump(a.worker, (row) => { row.opened += 1 })
      }

      for (const log of settles) {
        const a = log.args as { worker: `0x${string}`; spend: bigint }
        bump(a.worker, (row) => {
          row.settled += 1
          row.spend += a.spend
        })
      }
    }

    this.next = latest + 1n
    this.lastBlock = latest
  }
}
