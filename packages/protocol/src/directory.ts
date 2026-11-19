// GENKAKU: on-chain worker discovery.
//
// The directory is the Worker account set, read in one `getProgramAccounts`
// call. There is no bootstrap server in this path and no log replay: a cold
// client with an empty config and no cache finds workers using nothing but a
// public Solana RPC.
//
// Two cost controls still make sense:
//   1. an on-disk entry cache, so the offer list is available even when the
//      chain read fails (offline start, RPC trouble);
//   2. a "drop after repeated dial failures" hook, so a dead entry stops
//      costing a connection attempt on every boot.
//
// What is gone: the block cursor. With account state as the source of truth a
// refresh is one request, so there is nothing to scan forward from.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { readWorkerLocators, parseLocator, type DirectoryEntry, type GenkakuPublic } from './chain.ts'
import type { NetEnvironment } from './netconfig.ts'
import { peerIdOf, walletOfPeerId } from './registry.ts'

export type DirectoryCacheEntry = {
  wallet: string
  peerId: string
  locator: string
  /** micro-USDC per started minute, as listed on chain */
  pricePerMin: string
}

export type DirectoryCache = {
  version: 3
  env: NetEnvironment
  entries: DirectoryCacheEntry[]
  updatedAt: number
}

type Logger = { info: (msg: string, ...args: unknown[]) => void; warn: (msg: string, ...args: unknown[]) => void }

export function directoryPath(keyDir: string): string {
  return join(keyDir, 'directory.json')
}

export function loadDirectory(keyDir: string, env: NetEnvironment): DirectoryCache {
  const empty: DirectoryCache = { version: 3, env, entries: [], updatedAt: 0 }

  try {
    if (!existsSync(directoryPath(keyDir))) return empty

    const raw = JSON.parse(readFileSync(directoryPath(keyDir), 'utf8')) as Partial<DirectoryCache>

    // Version 3 dropped the escrow-derived `earned`/`settlements`. An older
    // cache is not migrated: it is re-read from chain on the next scan.
    if (raw?.version !== 3 || raw.env !== env || !Array.isArray(raw.entries)) return empty

    return { version: 3, env, entries: raw.entries, updatedAt: raw.updatedAt ?? 0 }
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

/**
 * Does the locator actually point at the peer identity the entry claims?
 *
 * Two independent things must hold: the multiaddr's tail PeerId is the one the
 * row was filed under, and that PeerId is the ed25519 key that owns the wallet.
 * The second check is what makes a listing unspoofable — a worker cannot point
 * at someone else's address, because the address encodes the key.
 */
function walletMatchesPeer(entry: { wallet: string; peerId: string; locator: string }): boolean {
  const embedded = walletOfPeerId(entry.peerId)

  if (embedded == null || embedded !== entry.wallet) return false

  const ids = entry.locator
    .split(/[;\n]+/)
    .map(part => peerIdOf(part))
    .filter((id): id is string => id != null && id !== '')

  // An empty locator is legal (a worker that has not published an address yet);
  // it simply contributes nothing to dial.
  if (ids.length === 0) return true

  return ids.every(id => id === entry.peerId)
}

export type DirectorySync = {
  entries: DirectoryCacheEntry[]
  added: number
  removed: number
}

/** Read the directory, merge it into the cache, and persist. */
export async function syncDirectory(
  conn: GenkakuPublic,
  env: NetEnvironment,
  keyDir: string,
  log: Logger,
): Promise<DirectorySync> {
  const cache = loadDirectory(keyDir, env)
  const previous = new Map(cache.entries.map(entry => [entry.wallet, entry]))

  const found = await readWorkerLocators(conn, env)
  const next: DirectoryCacheEntry[] = []
  let added = 0

  for (const entry of found) {
    if (!walletMatchesPeer(entry)) {
      log.warn('directory: %s advertises a locator that is not its own peerId — ignored', entry.wallet)
      continue
    }

    if (!previous.has(entry.wallet)) added++
    next.push(toCacheEntry(entry))
  }

  let removed = 0
  for (const wallet of previous.keys()) {
    if (!next.some(entry => entry.wallet === wallet)) removed++
  }

  saveDirectory(keyDir, { version: 3, env, entries: next, updatedAt: Date.now() })
  log.info('directory: %d live worker(s) on chain (%d new, %d gone)', next.length, added, removed)

  return { entries: next, added, removed }
}

function toCacheEntry(entry: DirectoryEntry): DirectoryCacheEntry {
  return {
    wallet: entry.wallet,
    peerId: entry.peerId,
    locator: entry.locator,
    pricePerMin: entry.pricePerMin.toString(),
  }
}

/** Every dialable multiaddr in the directory, cheapest first. */
export function workerAddrs(cache: DirectoryCache): string[] {
  const addrs: string[] = []
  const ordered = [...cache.entries].sort((a, b) => {
    const pa = BigInt(a.pricePerMin)
    const pb = BigInt(b.pricePerMin)
    // A free worker is the best default for a caller that has no preference;
    // ties keep discovery order.
    if (pa === pb) return 0

    return pa < pb ? -1 : 1
  })

  for (const entry of ordered) {
    for (const addr of parseLocator(entry.locator)) addrs.push(addr)
  }

  return [...new Set(addrs)]
}

/** Drop a wallet from the cache after repeated dial failures, so a dead worker
 *  stops costing a connection attempt on every boot until it advertises again. */
export function dropEntry(keyDir: string, env: NetEnvironment, wallet: string): void {
  const cache = loadDirectory(keyDir, env)
  const next = cache.entries.filter(entry => entry.wallet !== wallet)

  if (next.length === cache.entries.length) return

  saveDirectory(keyDir, { ...cache, entries: next, updatedAt: Date.now() })
}
