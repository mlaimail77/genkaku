// GENKAKU admin console (seed VM).
//
// Runs next to the seed process and answers under /admin. It reads three
// independent sources and never blocks on any of them:
//   - the seed's token-gated /stats (relay reservations, client peers, bytes)
//   - Base Sepolia logs (workers, users, settled/refunded USDC)
//   - its own state file (password hash, traffic pricing, usage baseline)
//
// It holds no wallet keys and moves no money. Caddy is expected to proxy
// /admin* to this process on 127.0.0.1; the server itself never binds publicly.

import { randomBytes } from 'node:crypto'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { homedir } from 'node:os'
import { join } from 'node:path'

import { CONTRACTS, type NetEnvironment } from '@genkaku/protocol'

import { ADMIN_HTML } from './html.ts'
import { chainStats, readStatsToken, seedStats, type SeedStats } from './stats.ts'
import { AdminStore, type Pricing, type ProcessIo } from './store.ts'

const PORT = Number(process.env.GENKAKU_ADMIN_PORT ?? 8082)
const HOST = process.env.GENKAKU_ADMIN_HOST ?? '127.0.0.1'
const ENV = (process.env.GENKAKU_NET_ENV ?? 'base-sepolia') as NetEnvironment
const STATE_FILE = process.env.GENKAKU_ADMIN_STATE ?? join(homedir(), '.genkaku-admin', 'admin.json')
const SEED_STATE_DIR = process.env.GENKAKU_SEED_STATE_DIR ?? join(homedir(), '.genkaku-seed')
const SEED_STATS_URL = process.env.GENKAKU_SEED_STATS_URL ?? 'http://127.0.0.1:8081/stats'
const SEED_PUBLIC_URL = process.env.GENKAKU_SEED_PUBLIC_URL ?? 'https://staging.genkaku.app/seed/peers'

const COOKIE = 'gk_admin'
const SESSION_MS = 12 * 60 * 60_000
const BODY_LIMIT = 64 * 1024

const store = new AdminStore(STATE_FILE)
const statsToken = readStatsToken(SEED_STATE_DIR)
const sessions = new Map<string, number>()
/** ip → failed sign-ins inside the current window */
const attempts = new Map<string, { count: number; until: number }>()

function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' })
  res.end(JSON.stringify(body))
}

function fail(res: ServerResponse, status: number, message: string): void {
  json(res, status, { ok: false, error: { message } })
}

async function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = []
  let bytes = 0

  for await (const chunk of req) {
    const buf = chunk as Buffer
    bytes += buf.length
    if (bytes > BODY_LIMIT) throw new Error('body too large')
    chunks.push(buf)
  }

  const text = Buffer.concat(chunks).toString('utf8') || '{}'
  const parsed: unknown = JSON.parse(text)
  if (typeof parsed !== 'object' || parsed === null) throw new Error('body must be a JSON object')

  return parsed as Record<string, unknown>
}

function cookies(req: IncomingMessage): Record<string, string> {
  const out: Record<string, string> = {}
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const at = part.indexOf('=')
    if (at < 0) continue
    out[part.slice(0, at).trim()] = part.slice(at + 1).trim()
  }

  return out
}

function sessionOf(req: IncomingMessage): string | null {
  const token = cookies(req)[COOKIE]
  if (token == null || token === '') return null
  const expiry = sessions.get(token)
  if (expiry == null) return null
  if (expiry < Date.now()) {
    sessions.delete(token)

    return null
  }

  return token
}

function ipOf(req: IncomingMessage): string {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded !== '') return forwarded.split(',')[0]!.trim()

  return req.socket.remoteAddress ?? 'unknown'
}

function tooManyAttempts(ip: string): boolean {
  const row = attempts.get(ip)
  if (row == null) return false
  if (row.until < Date.now()) {
    attempts.delete(ip)

    return false
  }

  return row.count >= 6
}

function noteFailure(ip: string): void {
  const now = Date.now()
  const row = attempts.get(ip)
  if (row == null || row.until < now) attempts.set(ip, { count: 1, until: now + 10 * 60_000 })
  else row.count += 1
}

function clearFailures(ip: string): void {
  attempts.delete(ip)
}

type Traffic = {
  available: boolean
  inBytes: number | null
  outBytes: number | null
  inGb: number | null
  outGb: number | null
  billableGb: number | null
  trafficUsdc: number
  totalUsdc: number
  since: number | null
}

/** Bill the byte delta since the usage window started. The free allowance is
 *  spread across both directions by the same ratio, so asymmetric traffic is
 *  not double-counted. */
function trafficOf(seed: SeedStats | null, pricing: Pricing): Traffic {
  if (seed?.io == null) {
    return {
      available: false,
      inBytes: null,
      outBytes: null,
      inGb: null,
      outGb: null,
      billableGb: null,
      trafficUsdc: 0,
      totalUsdc: Number(pricing.vmMonthlyUsdc) || 0,
      since: store.baseline?.at ?? null,
    }
  }

  const io: ProcessIo = seed.io
  let baseline = store.baseline

  // A restart resets /proc/self/io to zero; a stale baseline would report a
  // negative delta and hide real usage. Treat that as a new window.
  if (baseline == null || io.rchar < baseline.rchar || io.wchar < baseline.wchar) {
    store.setBaseline(io)
    baseline = store.baseline
  }

  const inBytes = Math.max(0, io.rchar - (baseline?.rchar ?? 0))
  const outBytes = Math.max(0, io.wchar - (baseline?.wchar ?? 0))
  const inGb = inBytes / 1e9
  const outGb = outBytes / 1e9
  const totalGb = inGb + outGb
  const free = Number(pricing.freeGbPerMonth) || 0
  const scale = totalGb > 0 ? Math.max(0, totalGb - free) / totalGb : 0
  const trafficUsdc = scale * (inGb * (Number(pricing.usdcPerGbIn) || 0) + outGb * (Number(pricing.usdcPerGbOut) || 0))
  const totalUsdc = trafficUsdc + (Number(pricing.vmMonthlyUsdc) || 0)

  return {
    available: true,
    inBytes,
    outBytes,
    inGb,
    outGb,
    billableGb: scale * totalGb,
    trafficUsdc,
    totalUsdc,
    since: baseline?.at ?? null,
  }
}

async function overview(): Promise<Record<string, unknown>> {
  const [seed, chain] = await Promise.all([
    seedStats(SEED_STATS_URL, statsToken),
    chainStats(ENV),
  ])
  const pricing = store.pricing

  return {
    ok: true,
    auth: { mustChangePassword: store.mustChangePassword },
    seed: { value: seed.value, error: seed.error },
    chain: { value: chain.value, error: chain.error },
    pricing,
    traffic: trafficOf(seed.value, pricing),
    contracts: CONTRACTS[ENV],
    env: ENV,
    seedUrl: SEED_PUBLIC_URL,
  }
}

const server = createServer((req, res) => {
  void (async () => {
    const url = new URL(req.url ?? '/', 'http://localhost')
    const path = url.pathname.replace(/\/+$/, '') || '/'

    if (path === '/' || path === '/index.html') {
      res.writeHead(302, { location: '/admin' })
      res.end()

      return
    }

    if (!path.startsWith('/admin')) {
      res.writeHead(404, { 'content-type': 'text/plain' })
      res.end('not found')

      return
    }

    if (req.method === 'GET' && (path === '/admin' || path === '/admin/index.html')) {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' })
      res.end(ADMIN_HTML)

      return
    }

    if (!path.startsWith('/admin/api/')) {
      res.writeHead(404, { 'content-type': 'text/plain' })
      res.end('not found')

      return
    }

    const action = path.slice('/admin/api/'.length)
    const ip = ipOf(req)

    // ---- unauthenticated -------------------------------------------------
    if (action === 'session' && req.method === 'GET') {
      const token = sessionOf(req)
      if (token == null) return fail(res, 401, 'not signed in')
      json(res, 200, { ok: true, mustChangePassword: store.mustChangePassword })

      return
    }

    if (action === 'login' && req.method === 'POST') {
      if (tooManyAttempts(ip)) return fail(res, 429, 'too many attempts; try again later')

      let body: Record<string, unknown>
      try {
        body = await readBody(req)
      } catch (error) {
        return fail(res, 400, error instanceof Error ? error.message : String(error))
      }

      const password = typeof body.password === 'string' ? body.password : ''
      if (password === '' || !store.verify(password)) {
        noteFailure(ip)
        return fail(res, 401, 'wrong password')
      }

      clearFailures(ip)
      const token = randomBytes(32).toString('hex')
      sessions.set(token, Date.now() + SESSION_MS)
      res.setHeader('set-cookie', `${COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/admin; Max-Age=${Math.floor(SESSION_MS / 1000)}`)
      json(res, 200, { ok: true, mustChangePassword: store.mustChangePassword })

      return
    }

    // ---- authenticated ---------------------------------------------------
    const token = sessionOf(req)
    if (token == null) return fail(res, 401, 'not signed in')

    // State-changing calls must carry the header the console's own script adds;
    // a cross-site form post cannot set it, and SameSite=Strict already blocks
    // the cookie.
    if (req.method === 'POST' && req.headers['x-genkaku-admin'] !== '1') {
      return fail(res, 403, 'missing admin header')
    }

    if (action === 'logout' && req.method === 'POST') {
      sessions.delete(token)
      res.setHeader('set-cookie', `${COOKIE}=; HttpOnly; SameSite=Strict; Path=/admin; Max-Age=0`)
      json(res, 200, { ok: true })

      return
    }

    if (action === 'overview' && req.method === 'GET') {
      json(res, 200, await overview())

      return
    }

    if (action === 'pricing' && req.method === 'POST') {
      let body: Record<string, unknown>
      try {
        body = await readBody(req)
      } catch (error) {
        return fail(res, 400, error instanceof Error ? error.message : String(error))
      }

      try {
        const pricing = store.setPricing(body)
        json(res, 200, { ok: true, pricing, traffic: trafficOf((await seedStats(SEED_STATS_URL, statsToken)).value, pricing) })
      } catch (error) {
        fail(res, 400, error instanceof Error ? error.message : String(error))
      }

      return
    }

    if (action === 'password' && req.method === 'POST') {
      let body: Record<string, unknown>
      try {
        body = await readBody(req)
      } catch (error) {
        return fail(res, 400, error instanceof Error ? error.message : String(error))
      }

      const current = typeof body.current === 'string' ? body.current : ''
      const next = typeof body.next === 'string' ? body.next : ''

      if (!store.verify(current)) {
        noteFailure(ip)
        return fail(res, 401, 'current password is wrong')
      }

      try {
        store.setPassword(next)
      } catch (error) {
        return fail(res, 400, error instanceof Error ? error.message : String(error))
      }

      // Password rotation invalidates every other browser session.
      sessions.clear()
      const fresh = randomBytes(32).toString('hex')
      sessions.set(fresh, Date.now() + SESSION_MS)
      res.setHeader('set-cookie', `${COOKIE}=${fresh}; HttpOnly; SameSite=Strict; Path=/admin; Max-Age=${Math.floor(SESSION_MS / 1000)}`)
      json(res, 200, { ok: true })

      return
    }

    if (action === 'reset-usage' && req.method === 'POST') {
      const probe = await seedStats(SEED_STATS_URL, statsToken)
      store.setBaseline(probe.value?.io ?? null)
      json(res, 200, { ok: true })

      return
    }

    fail(res, 404, 'unknown endpoint')
  })().catch((error) => {
    if (!res.headersSent) fail(res, 500, error instanceof Error ? error.message : String(error))
    else res.end()
  })
})

server.on('listening', () => {
  const address = server.address()
  const port = typeof address === 'object' && address != null ? address.port : PORT
  console.log(`[admin] listening on http://${HOST}:${port}/admin`)
  if (store.mustChangePassword) {
    console.log('[admin] WARNING: still using the initial password — change it in Settings')
  }
  if (statsToken === '') {
    console.log('[admin] no seed stats token found; relay counters will be unavailable')
  }
})

server.listen(PORT, HOST)

function shutdown(): void {
  server.close(() => { process.exit(0) })
  setTimeout(() => { process.exit(0) }, 3_000).unref()
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
