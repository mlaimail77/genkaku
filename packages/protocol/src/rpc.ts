// GENKAKU: zero-config Solana RPC.
//
// The product promise is "no fields to fill": a user or worker never sees an
// RPC URL unless every endpoint is down. That rules out shipping a metered key
// (an Electron app's asar is readable — a bundled unlimited key becomes someone
// else's free tier) and rules out asking a non-technical operator to sign up.
//
// So: the cluster's public endpoint, probed once at boot for health and
// latency, cached on disk, and reported so the panel can say which endpoint is
// answering. `GENKAKU_RPC_URL` still wins when set — that is the escape hatch
// for development and for a power user who wants privacy, never a product
// requirement.
//
// Unlike the old transport there is no failover list: a
// Solana `Connection` is bound to one endpoint, and a mid-session roll would
// have to re-sign a transaction whose blockhash another node may not know. The
// probe therefore picks ONE endpoint and the write path retries there.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

import { RPC, rpcUrl, type NetEnvironment } from './netconfig.ts'

const PROBE_TIMEOUT_MS = 4_000

type RpcCache = {
  version: 2
  /** env → endpoint that answered fastest last time */
  preferred?: Record<string, string>
  /** env → measured latency in ms (diagnostics only) */
  latency?: Record<string, Record<string, number>>
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
    if (!existsSync(cachePath())) return { version: 2 }

    const raw = JSON.parse(readFileSync(cachePath(), 'utf8')) as Partial<RpcCache>

    return raw?.version === 2 ? (raw as RpcCache) : { version: 2 }
  } catch {
    return { version: 2 }
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

/** Endpoints to try for one cluster, best guess first.
 *
 *  The explicit override leads and is never removed: if a paid endpoint dies,
 *  falling back to the public one is better than refusing to work. */
export function rpcUrls(env: NetEnvironment): string[] {
  const override = (process.env.GENKAKU_RPC_URL ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(s => s.startsWith('http'))

  const preferred = readCache().preferred?.[env]

  return [...new Set([...override, ...(preferred == null ? [] : [preferred]), ...RPC[env]])]
}

/** One endpoint's answer to one request: what failed and what it said. */
export type RpcFailure = { url: string; message: string }

/** Every endpoint failed; say so once, with all of them, instead of only the
 *  last one. Kept as a pure function so the shape is testable without a node. */
export function formatRpcFailures(method: string, failures: readonly RpcFailure[]): string {
  if (failures.length === 0) {
    return `genkaku: no RPC endpoint configured for ${method}`
  }

  const lines = failures.map(({ url, message }) => `  ${url} -> ${message}`)

  return [
    `genkaku: no RPC endpoint answered ${method} (${failures.length} tried)`,
    ...lines,
  ].join('\n')
}

async function call(url: string, method: string, params: unknown[] = []): Promise<unknown> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
  })

  if (!response.ok) throw new Error(`HTTP ${response.status}`)

  const body = (await response.json()) as { result?: unknown; error?: { message?: string } }
  if (body.error != null) throw new Error(body.error.message ?? 'rpc error')

  return body.result
}

/**
 * Probe every candidate and remember the fastest healthy one.
 *
 * Health is `getHealth` (the node has a recent block) plus `getSlot`, which is
 * the cheapest call that proves the endpoint is not a load-balancer caching
 * only health. Fire-and-forget at boot; a failure leaves the previous
 * preference untouched.
 */
export async function probeRpc(
  env: NetEnvironment,
  log?: { info: (msg: string, ...args: unknown[]) => void; warn: (msg: string, ...args: unknown[]) => void },
): Promise<string | null> {
  const urls = rpcUrls(env)
  const failures: RpcFailure[] = []
  const healthy: { url: string; ms: number; slot: bigint }[] = []

  await Promise.all(urls.map(async (url) => {
    const started = Date.now()

    try {
      const [health, slot] = await Promise.all([
        call(url, 'getHealth'),
        call(url, 'getSlot'),
      ])

      if (health !== 'ok' || typeof slot !== 'number') throw new Error('unhealthy')

      healthy.push({ url, ms: Date.now() - started, slot: BigInt(slot) })
    } catch (error) {
      failures.push({ url, message: error instanceof Error ? error.message : String(error) })
    }
  }))

  if (healthy.length === 0) {
    log?.warn(formatRpcFailures('getSlot', failures))
    return null
  }

  healthy.sort((a, b) => a.ms - b.ms)
  const best = healthy[0]
  if (best == null) return null

  const cache = readCache()
  cache.preferred = { ...cache.preferred, [env]: best.url }
  cache.latency = {
    ...cache.latency,
    [env]: Object.fromEntries(healthy.map(h => [h.url, h.ms])),
  }
  writeCache(cache)

  log?.info('rpc: %s (%dms, slot %s) — %d/%d endpoint(s) healthy',
    best.url, best.ms, best.slot.toString(), healthy.length, urls.length)

  return best.url
}

/** Human-readable network state for the dashboard (no input field anywhere). */
export function rpcSummary(env: NetEnvironment): { url: string; cached: boolean; override: boolean } {
  const override = (process.env.GENKAKU_RPC_URL ?? '').trim() !== ''
  const preferred = readCache().preferred?.[env]

  return {
    url: override ? rpcUrl(env) : (preferred ?? rpcUrl(env)),
    cached: preferred != null,
    override,
  }
}
