// GENKAKU admin stats: two independent sources, each cached and each allowed to
// fail without taking the console down.
//   1. the seed process over its token-gated /stats (relay usage, client peers)
//   2. Base Sepolia logs (live workers, unique users, settled/refunded USDC)

import { readFileSync } from 'node:fs'

import {
  CONTRACTS,
  ESCROW_ABI,
  ESCROW_DEPLOY_BLOCK,
  collectLogs,
  publicClientFor,
  readWorkerLocators,
  type NetEnvironment,
} from '@genkaku/protocol'

export type SeedStats = {
  startedAt: number
  peerId: string
  addrs: string[]
  relay: string[]
  relayLimits: { maxReservations: number; dataLimitMb: number; ttlHours: number }
  relayReservations: number
  relaySessions: number
  announcedWorkers: number
  clientPeers24h: number
  io: { rchar: number; wchar: number } | null
  now: number
}

export type ChainStats = {
  /** workers currently listed in the on-chain directory */
  workers: number
  /** distinct wallets that opened an escrow session */
  users: number
  sessions: number
  /** USDC actually paid out of escrow to workers */
  settledUsdc: number
  /** the 1% protocol fee inside settledUsdc */
  feeUsdc: number
  /** USDC returned to users when nothing was billed */
  refundedUsdc: number
  /** USDC locked by open sessions (opened amount, not yet settled) */
  escrowVolumeUsdc: number
  fromBlock: number
  scannedAt: number
}

type Cache<T> = { at: number; value: T | null; error: string | null; pending: Promise<void> | null }

const seedCache: Cache<SeedStats> = { at: 0, value: null, error: null, pending: null }
const chainCache: Cache<ChainStats> = { at: 0, value: null, error: null, pending: null }

const microToUsdc = (value: bigint): number => Number(value) / 1e6

/** Read the stats token the seed writes at boot. */
export function readStatsToken(stateDir: string): string {
  try {
    return readFileSync(`${stateDir}/stats.token`, 'utf8').trim()
  } catch {
    return process.env.GENKAKU_SEED_STATS_TOKEN ?? ''
  }
}

export async function seedStats(url: string, token: string): Promise<{ value: SeedStats | null; error: string | null }> {
  const fresh = Date.now() - seedCache.at < 3_000
  if (fresh) return { value: seedCache.value, error: seedCache.error }

  try {
    const res = await fetch(url, {
      headers: token === '' ? {} : { 'x-genkaku-stats-token': token },
      signal: AbortSignal.timeout(4_000),
    })
    if (!res.ok) throw new Error(`seed /stats answered ${res.status}`)
    const body = (await res.json()) as SeedStats
    seedCache.at = Date.now()
    seedCache.value = body
    seedCache.error = null

    return { value: body, error: null }
  } catch (error) {
    seedCache.at = Date.now()
    seedCache.error = error instanceof Error ? error.message : String(error)

    // Keep the last good sample: a 4-second hiccup should not blank the page.
    return { value: seedCache.value, error: seedCache.error }
  }
}

type EscrowEvent = Extract<(typeof ESCROW_ABI)[number], { type: 'event' }>

function escrowEvent(name: string): EscrowEvent {
  const found = ESCROW_ABI.find(entry => entry.type === 'event' && entry.name === name)
  if (found == null || found.type !== 'event') throw new Error(`escrow ABI is missing ${name}`)

  return found as EscrowEvent
}

async function readChain(env: NetEnvironment): Promise<ChainStats> {
  const configured = CONTRACTS[env].escrow
  if (configured === '') throw new Error(`no escrow deployed for ${env}`)
  const escrow = configured as `0x${string}`

  const publicC = publicClientFor(env)
  const latest = await publicC.getBlockNumber()
  const floor = ESCROW_DEPLOY_BLOCK[env]

  const logs = async (name: string) => collectLogs(
    publicC,
    escrow,
    escrowEvent(name),
    floor,
    latest,
  )

  const [opened, settled, refunded, workers] = await Promise.all([
    logs('SessionOpened'),
    logs('SessionSettled'),
    logs('SessionRefunded'),
    readWorkerLocators(publicC, env).catch(() => []),
  ])

  const users = new Set<string>()
  let escrowVolume = 0n

  for (const log of opened) {
    const args = log.args as { user?: string; amount?: bigint } | undefined
    if (typeof args?.user === 'string') users.add(args.user.toLowerCase())
    if (typeof args?.amount === 'bigint') escrowVolume += args.amount
  }

  let settledTotal = 0n
  let feeTotal = 0n

  for (const log of settled) {
    const args = log.args as { spend?: bigint; fee?: bigint } | undefined
    if (typeof args?.spend === 'bigint') settledTotal += args.spend
    if (typeof args?.fee === 'bigint') feeTotal += args.fee
  }

  let refundedTotal = 0n

  for (const log of refunded) {
    const args = log.args as { amount?: bigint } | undefined
    if (typeof args?.amount === 'bigint') refundedTotal += args.amount
  }

  return {
    workers: workers.length,
    users: users.size,
    sessions: opened.length,
    settledUsdc: microToUsdc(settledTotal),
    feeUsdc: microToUsdc(feeTotal),
    refundedUsdc: microToUsdc(refundedTotal),
    escrowVolumeUsdc: microToUsdc(escrowVolume),
    fromBlock: Number(floor),
    scannedAt: Date.now(),
  }
}

/** Chain scan, cached for five minutes: a public RPC log scan is expensive and
 *  the numbers move on the scale of sessions, not requests. A refresh runs in
 *  the background so the page never waits on it after the first success. */
export async function chainStats(env: NetEnvironment, maxAgeMs = 5 * 60_000): Promise<{ value: ChainStats | null; error: string | null }> {
  if (chainCache.value != null && Date.now() - chainCache.at < maxAgeMs) {
    return { value: chainCache.value, error: chainCache.error }
  }

  if (chainCache.pending == null) {
    chainCache.pending = (async () => {
      try {
        chainCache.value = await readChain(env)
        chainCache.error = null
        chainCache.at = Date.now()
      } catch (error) {
        chainCache.error = error instanceof Error ? error.message : String(error)
        chainCache.at = Date.now()
      } finally {
        chainCache.pending = null
      }
    })()
  }

  if (chainCache.value == null) await chainCache.pending

  return { value: chainCache.value, error: chainCache.error }
}
