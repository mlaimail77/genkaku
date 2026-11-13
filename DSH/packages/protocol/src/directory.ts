// GENKAKU: on-chain worker discovery (P4.9b).
//
// Replaces the bootstrap seed. The directory is built from `WorkerLocated` logs
// and never from a server we run: a cold client with an empty config and no
// cache can find workers using nothing but a public Base RPC.
//
// Two cost controls make that affordable at scale:
//   1. a persisted checkpoint (`lastBlock`) so a normal boot scans only the
//      blocks since the last run — usually a handful;
//   2. an on-disk entry cache, so the offer list is available even when the
//      chain read fails (offline start, RPC trouble).

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import {
  readWorkerDeactivations,
  readWorkerLocators,
  REGISTRY_DEPLOY_BLOCK,
  type DirectoryEntry,
  type GenkakuPublic,
} from './chain.ts'
import type { NetEnvironment } from './netconfig.ts'
import { peerIdDigestOf } from './registry.ts'

export type DirectoryCacheEntry = {
  wallet: `0x${string}`
  peerId: `0x${string}`
  locator: string
  updatedAt: number
  blockNumber: string
}

export type DirectoryCache = {
  version: 1
  env: NetEnvironment
  lastBlock: string
  entries: DirectoryCacheEntry[]
  updatedAt: number
}

type Logger = { info: (msg: string, ...args: unknown[]) => void; warn: (msg: string, ...args: unknown[]) => void }

export function directoryPath(keyDir: string): string {
  return join(keyDir, 'directory.json')
}

export function loadDirectory(keyDir: string, env: NetEnvironment): DirectoryCache {
  const empty: DirectoryCache = {
    version: 1,
    env,
    lastBlock: (REGISTRY_DEPLOY_BLOCK[env] - 1n).toString(),
    entries: [],
    updatedAt: 0,
  }

  try {
    if (!existsSync(directoryPath(keyDir))) return empty
    const raw = JSON.parse(readFileSync(directoryPath(keyDir), 'utf8')) as DirectoryCache
    if (raw?.version !== 1 || raw.env !== env || !Array.isArray(raw.entries)) return empty
    return raw
  } catch {
    return empty
  }
}

function saveDirectory(keyDir: string, cache: DirectoryCache): void {
  try {
    mkdirSync(keyDir, { recursive: true })
    writeFileSync(directoryPath(keyDir), JSON.stringify(cache, null, 2), { mode: 0o600 })
  } catch {
    // the cache is an optimisation; never fail discovery because of it
  }
}

/** Does the locator actually point at the peerId the wallet pinned?
 *  A worker could advertise someone else's address (or an old one); the digest
 *  compare is the only thing that makes the directory trustworthy. */
function locatorMatchesPeer(entry: { locator: string; peerId: string }): boolean {
  const wanted = entry.peerId.toLowerCase()
  const ids = entry.locator
    .split(/[;\n]+/)
    .map(part => part.split('/p2p/').pop()?.split('/')[0])
    .filter((id): id is string => id != null && id !== '')

  if (ids.length === 0) return false

  return ids.every((id) => {
    try {
      return peerIdDigestOf(id).toLowerCase() === wanted
    } catch {
      return false
    }
  })
}

export type DirectorySync = {
  entries: DirectoryCacheEntry[]
  scannedFrom: bigint
  scannedTo: bigint
  added: number
  removed: number
}

/** Scan forward from the checkpoint, merge into the cache, and persist.
 *  Returns the merged directory (live entries only). */
export async function syncDirectory(
  publicC: GenkakuPublic,
  env: NetEnvironment,
  keyDir: string,
  log: Logger,
): Promise<DirectorySync> {
  const cache = loadDirectory(keyDir, env)
  const floor = REGISTRY_DEPLOY_BLOCK[env] - 1n
  const scannedFrom = BigInt(cache.lastBlock) + 1n > floor ? BigInt(cache.lastBlock) + 1n : floor
  const latest = await publicC.getBlockNumber()

  const byWallet = new Map<string, DirectoryCacheEntry>()
  for (const entry of cache.entries) byWallet.set(entry.wallet.toLowerCase(), entry)

  let added = 0
  let removed = 0

  if (latest >= scannedFrom) {
    const [located, dead] = await Promise.all([
      readWorkerLocators(publicC, env, { fromBlock: scannedFrom, toBlock: latest }),
      readWorkerDeactivations(publicC, env, { fromBlock: scannedFrom, toBlock: latest }),
    ])

    for (const entry of located) {
      if (!locatorMatchesPeer(entry)) {
        log.warn('directory: %s advertises a locator that does not contain its pinned peerId — ignored', entry.wallet)
        continue
      }
      const key = entry.wallet.toLowerCase()
      const prev = byWallet.get(key)
      if (prev == null || BigInt(prev.blockNumber) < entry.blockNumber) added++
      byWallet.set(key, toCacheEntry(entry))
    }

    for (const gone of dead) {
      const key = gone.wallet.toLowerCase()
      const prev = byWallet.get(key)
      if (prev != null && BigInt(prev.blockNumber) < gone.blockNumber) {
        byWallet.delete(key)
        removed++
      }
    }

    log.info('directory: scanned %s..%s (%d located, %d deactivated, %d new, %d dropped)',
      scannedFrom.toString(), latest.toString(), located.length, dead.length, added, removed)
  }

  const next: DirectoryCache = {
    version: 1,
    env,
    lastBlock: latest.toString(),
    entries: [...byWallet.values()],
    updatedAt: Date.now(),
  }
  saveDirectory(keyDir, next)

  return { entries: next.entries, scannedFrom, scannedTo: latest, added, removed }
}

function toCacheEntry(entry: DirectoryEntry): DirectoryCacheEntry {
  return {
    wallet: entry.wallet,
    peerId: entry.peerId,
    locator: entry.locator,
    updatedAt: entry.updatedAt,
    blockNumber: entry.blockNumber.toString(),
  }
}

/** Every dialable multiaddr in the directory, newest worker first. */
export function workerAddrs(cache: DirectoryCache): string[] {
  const addrs: string[] = []
  const newestFirst = [...cache.entries].sort((a, b) => {
    const delta = BigInt(b.blockNumber) - BigInt(a.blockNumber)
    return delta === 0n ? 0 : delta > 0n ? 1 : -1
  })

  for (const entry of newestFirst) {
    for (const addr of entry.locator.split(/[;\n]+/).map(s => s.trim())) {
      if (addr.startsWith('/')) addrs.push(addr)
    }
  }

  return [...new Set(addrs)]
}

/** Drop a wallet from the cache after repeated dial failures, so a dead worker
 *  stops costing a connection attempt on every boot until it advertises again. */
export function dropEntry(keyDir: string, env: NetEnvironment, wallet: string): void {
  const cache = loadDirectory(keyDir, env)
  const next = cache.entries.filter(e => e.wallet.toLowerCase() !== wallet.toLowerCase())
  if (next.length === cache.entries.length) return
  saveDirectory(keyDir, { ...cache, entries: next, updatedAt: Date.now() })
}
