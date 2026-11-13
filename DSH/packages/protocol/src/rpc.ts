// GENKAKU: zero-config Base RPC (P4.9b).
//
// The product promise is "no fields to fill": a user or worker never sees an
// RPC URL unless every endpoint is down. That rules out shipping a metered key
// (an Electron app's asar is readable — a bundled unlimited key becomes someone
// else's free tier) and rules out asking a non-technical operator to sign up.
//
// So: a small list of public endpoints, probed once at boot to find the fastest
// healthy one, cached on disk, and wrapped in viem's `fallback` transport so a
// 429 / 5xx / timeout mid-session rolls to the next endpoint without user
// involvement. `GENKAKU_RPC_URL` still wins when set — that is the escape hatch
// for development and for a power user who wants privacy, never a product
// requirement.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

import { fallback, http, type Transport } from 'viem'

import { CONTRACTS } from './netconfig.ts'
import type { NetEnvironment } from './netconfig.ts'

/** Public endpoints, measured reachable 2026-11. Order matters twice: it is the
 *  order `fallback` walks within one request, and the directory scan walks logs
 *  across every one of them. `sepolia.base.org` is last because it rejects any
 *  `eth_getLogs` range wider than 200 blocks — putting it first made every scan
 *  chunk a bisection storm. Blast API was removed: it now answers 403 for every
 *  method, and because `fallback` reports the LAST transport's error, a dead
 *  endpoint at the end masked the real failure of the four healthy ones. */
export const PUBLIC_RPC_ENDPOINTS: Record<NetEnvironment, readonly string[]> = {
  'base-sepolia': [
    'https://base-sepolia-rpc.publicnode.com',
    'https://base-sepolia.gateway.tenderly.co',
    'https://base-sepolia.drpc.org',
    'https://base-sepolia.api.onfinality.io/public',
    'https://sepolia.base.org',
  ],
  base: [
    'https://mainnet.base.org',
    'https://base-rpc.publicnode.com',
    'https://base.drpc.org',
    'https://gateway.tenderly.co/public/base',
    'https://base-pokt.nodies.app',
  ],
}

const PROBE_TIMEOUT_MS = 4_000
const REQUEST_TIMEOUT_MS = 10_000

type RpcCache = {
  version: 1
  /** env → endpoint that answered fastest last time */
  preferred?: Record<string, string>
  /** env → measured latency in ms (diagnostics only) */
  latency?: Record<string, Record<string, number>>
  /** env → endpoints that answered `eth_getLogs` on the last probe */
  logsOk?: Record<string, string[]>
}

function keyDir(): string {
  const dir = process.env.GENKAKU_KEY_DIR?.trim()
  return dir != null && dir !== '' ? dir : join(homedir(), '.dsh', 'genkaku')
}

function cachePath(): string {
  return join(keyDir(), 'rpc.json')
}

function readCache(): RpcCache {
  try {
    if (!existsSync(cachePath())) return { version: 1 }
    const raw = JSON.parse(readFileSync(cachePath(), 'utf8')) as RpcCache
    return raw?.version === 1 ? raw : { version: 1 }
  } catch {
    return { version: 1 }
  }
}

function writeCache(cache: RpcCache): void {
  try {
    mkdirSync(keyDir(), { recursive: true })
    writeFileSync(cachePath(), JSON.stringify(cache, null, 2), { mode: 0o600 })
  } catch {
    // a cache miss only costs one probe next boot
  }
}

/** Explicit override, then last-good endpoint, then the rest.
 *  `GENKAKU_RPC_URL` is kept FIRST and not removed: if the operator's endpoint
 *  dies mid-session we still want to keep serving from a public one. */
export function rpcUrls(env: NetEnvironment): string[] {
  const override = (process.env.GENKAKU_RPC_URL ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(s => s.startsWith('http'))

  const cache = readCache()
  const preferred = cache.preferred?.[env]
  const logsOk = cache.logsOk?.[env]

  // A cached preference from an older build can name an endpoint that cannot
  // serve the directory scan. Treat "not logs-capable" as a demotion, not a
  // removal: it stays as the last resort for plain calls.
  const preferredLeads = preferred != null && (logsOk == null || logsOk.includes(preferred))

  const publicList = PUBLIC_RPC_ENDPOINTS[env]


  const ordered = [
    ...override,
    ...(preferredLeads ? [preferred] : []),
    ...publicList.filter(url => url !== preferred),
    ...(preferred != null && !preferredLeads ? [preferred] : []),
  ]

  return [...new Set(ordered)]
}

/** Transport with automatic failover — the part the user never sees. */
export function rpcTransport(env: NetEnvironment): Transport {
  return fallback(
    rpcUrls(env).map(url => http(url, { timeout: REQUEST_TIMEOUT_MS, retryCount: 1 })),
    // Keep the configured order: ranking samples would re-probe on every
    // failure burst, which is exactly when the endpoints are least healthy.
    { rank: false },
  )
}

/** One `eth_blockNumber` per endpoint, keep the fastest. Fire-and-forget at
 *  boot; a failure leaves the previous preference untouched. */
export async function probeRpc(
  env: NetEnvironment,
  log?: { info: (msg: string, ...args: unknown[]) => void; warn: (msg: string, ...args: unknown[]) => void },
): Promise<string | null> {
  const urls = rpcUrls(env)
  const results = await Promise.all(urls.map(async (url) => {
    const started = Date.now()
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] }),
        signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
      })
      if (!response.ok) return null
      const body = await response.json() as { result?: string; error?: unknown }
      if (typeof body.result !== 'string') return null

      // Faithful latency is not enough: a preferred endpoint that cannot serve
      // `eth_getLogs` over the scanner's chunk would force every directory sync
      // to bisect. The probe therefore asks for a real 5,000-block window — the
      // 200-block endpoints (sepolia.base.org) fail it here instead of during a
      // chat. The window may be empty; only the answer's shape matters.
      // Filter by the registry address: an unfiltered window returns every log
      // on the chain and the heavy endpoints reject it as too large, which
      // would disqualify all of them for the wrong reason.
      const registry = CONTRACTS[env].registry
      const latest = BigInt(body.result)
      const from = latest > 2_000n ? latest - 2_000n : 0n
      const logs = registry === '' ? true : await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_getLogs',
          params: [{
            address: registry,
            fromBlock: `0x${from.toString(16)}`,
            toBlock: body.result,
          }],
        }),
        signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
      }).then(async (r) => {
        if (!r.ok) return false
        const j = await r.json() as { result?: unknown }
        return Array.isArray(j.result)
      }).catch(() => false)

      return { url, ms: Date.now() - started, block: body.result, logs }
    } catch {
      return null
    }
  }))

  const healthy = results.filter(
    (r): r is { url: string; ms: number; block: string; logs: boolean } => r != null,
  )
  if (healthy.length === 0) {
    log?.warn('rpc: no endpoint answered a probe; requests will still try all of them')
    return null
  }

  healthy.sort((a, b) => Number(b.logs) - Number(a.logs) || a.ms - b.ms)
  const best = healthy[0]
  if (best == null) return null

  const cache = readCache()
  cache.preferred = { ...cache.preferred, [env]: best.url }
  cache.latency = {
    ...cache.latency,
    [env]: Object.fromEntries(healthy.map(h => [h.url, h.ms])),
  }
  cache.logsOk = {
    ...cache.logsOk,
    [env]: healthy.filter(h => h.logs).map(h => h.url),
  }
  writeCache(cache)

  log?.info('rpc: %s (%dms, block %s) — %d/%d endpoints healthy, %d serve logs',
    best.url, best.ms, BigInt(best.block).toString(), healthy.length, urls.length,
    healthy.filter(h => h.logs).length)

  return best.url
}

/** Human-readable network state for the dashboard (no input field anywhere). */
export function rpcSummary(env: NetEnvironment): { url: string; cached: boolean; override: boolean } {
  const override = (process.env.GENKAKU_RPC_URL ?? '').trim() !== ''
  const preferred = readCache().preferred?.[env]
  const first = rpcUrls(env)[0] ?? ''
  return {
    url: override ? first : (preferred ?? first),
    cached: preferred != null,
    override,
  }
}
