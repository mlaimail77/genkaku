/**
 * GenKaKu bootstrap seed.
 *
 * A cold client has an empty worker list and no way to learn one. This process
 * answers `/genkaku/peers/0` with the peers that have announced themselves and
 * runs a circuit-relay-v2 server, so a worker behind NAT gets a public
 * `/p2p-circuit` address that clients can dial as a fallback (P5).
 *
 * It holds no keys, moves no money, and never sees a prompt — but it does carry
 * relayed bytes, so its usage is metered for the admin page.
 */

import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { circuitRelayServer } from '@libp2p/circuit-relay-v2'
import { identify } from '@libp2p/identify'
import { tcp } from '@libp2p/tcp'
import { generateKeyPairFromSeed } from '@libp2p/crypto/keys'
import { createLibp2p } from 'libp2p'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import type { Stream } from '@libp2p/interface'

const PORT = Number(process.env.GENKAKU_SEED_PORT ?? 4001)
/** Public address this node should advertise; GCE NAT hides it from the interface. */
const PUBLIC_IP = process.env.GENKAKU_SEED_PUBLIC ?? ''
const ANNOUNCE_TTL_MS = 10 * 60_000
const STARTED_AT = Date.now()

const announced = new Map<string, { addrs: string[]; at: number }>()
/** peer id → last time it asked for the peer list (a user looking for workers). */
const clients = new Map<string, number>()
/** Reservation grants since boot; the relay service exposes only the live set. */
let relaySessions = 0
const relayLimits = {
  maxReservations: Number(process.env.GENKAKU_SEED_MAX_RESERVATIONS ?? 512),
  dataLimitMb: Number(process.env.GENKAKU_SEED_RELAY_DATA_MB ?? 256),
  ttlHours: 2,
}

const STATE_DIR = process.env.GENKAKU_SEED_STATE_DIR
  ?? `${process.env.HOME ?? '/tmp'}/.genkaku-seed`

// A bootstrap seed is single-purpose infrastructure: one malformed peer must
// not take discovery down for every client. Log and keep serving.
process.on('uncaughtException', (error) => {
  console.error('[seed] uncaught exception (continuing):', error instanceof Error ? error.message : error)
})
process.on('unhandledRejection', (reason) => {
  console.error('[seed] unhandled rejection (continuing):', reason instanceof Error ? reason.message : reason)
})

const encoder = new TextEncoder()
const decoder = new TextDecoder()

/** Length-prefixed JSON frames: 4-byte big-endian length + UTF-8 JSON. This
 *  must match the protocol's `lp.ts` exactly — the seed and its clients share
 *  one codec, and a text header here silently failed every announcement. */
async function writeFrame(stream: Stream, value: unknown): Promise<void> {
  const body = encoder.encode(JSON.stringify(value) + '\n')
  const head = new Uint8Array(4)
  new DataView(head.buffer).setUint32(0, body.byteLength)
  const out = new Uint8Array(head.length + body.length)
  out.set(head, 0)
  out.set(body, head.length)
  await stream.sink([out]).catch(() => {})
}

async function readOne(stream: Stream): Promise<Record<string, unknown> | null> {
  const chunks: Uint8Array[] = []
  let total = 0
  let need = -1

  const assemble = (): Uint8Array => {
    const out = new Uint8Array(total)
    let off = 0
    for (const chunk of chunks) {
      out.set(chunk, off)
      off += chunk.length
    }
    return out
  }

  for await (const chunk of stream.source) {
    const bytes = (chunk instanceof Uint8Array ? chunk : chunk.subarray()) as Uint8Array
    chunks.push(bytes)
    total += bytes.length

    if (need < 0 && total >= 4) {
      need = new DataView(assemble().buffer, 0, 4).getUint32(0)
      // Refuse absurd frames: this endpoint is reachable from the internet.
      if (need <= 0 || need > 1_048_576) return null
    }

    if (need >= 0 && total >= 4 + need) {
      const all = assemble()
      try {
        return JSON.parse(decoder.decode(all.subarray(4, 4 + need))) as Record<string, unknown>
      } catch {
        return null
      }
    }
  }

  return null
}

function live(): string[] {
  const now = Date.now()
  const out: string[] = []
  for (const [peer, row] of announced) {
    if (now - row.at > ANNOUNCE_TTL_MS) {
      announced.delete(peer)
      continue
    }
    out.push(...row.addrs)
  }
  return out
}

/** Live announcements, ignoring stale ones (the map is pruned on read). */
function liveWorkers(): number {
  void live()
  return announced.size
}

function recentClients(withinMs = 24 * 60 * 60_000): number {
  const floor = Date.now() - withinMs
  let count = 0
  for (const [peer, at] of clients) {
    if (at < floor) clients.delete(peer)
    else count += 1
  }
  return count
}

/** Bytes this process has read and written, from the kernel counters. Linux
 *  only; other platforms report null so the admin page says "unavailable"
 *  instead of inventing a number. */
function processIo(): { rchar: number; wchar: number } | null {
  try {
    const text = readFileSync('/proc/self/io', 'utf8')
    const read = /^rchar:\s*(\d+)$/m.exec(text)
    const write = /^wchar:\s*(\d+)$/m.exec(text)
    if (read == null || write == null) return null
    return { rchar: Number(read[1]), wchar: Number(write[1]) }
  } catch {
    return null
  }
}

const node = await createLibp2p({
  addresses: {
    listen: [`/ip4/0.0.0.0/tcp/${PORT}`],
    ...(PUBLIC_IP === '' ? {} : { announce: [`/ip4/${PUBLIC_IP}/tcp/${PORT}`] }),
  },
  transports: [tcp()],
  connectionEncrypters: [noise()],
  streamMuxers: [yamux()],
  services: {
    identify: identify(),
    relay: circuitRelayServer({
      reservations: {
        // The cap is what the admin page prices. libp2p then marks each relayed
        // connection "limited" and only lets it carry streams whose dial AND
        // handler opted in (runOnLimitedConnection).
        maxReservations: relayLimits.maxReservations,
        reservationTtl: relayLimits.ttlHours * 60 * 60_000,
        defaultDurationLimit: relayLimits.ttlHours * 60 * 60_000,
        defaultDataLimit: BigInt(relayLimits.dataLimitMb) * 1024n * 1024n,
      },
    }),
  },
})

await node.start()

const self = node.getMultiaddrs().map(a => a.toString())
/** Addresses a worker should dial to reserve a relay slot. */
const relay = [...new Set([
  ...self,
  ...(PUBLIC_IP === '' ? [] : [`/ip4/${PUBLIC_IP}/tcp/${PORT}/p2p/${node.peerId.toString()}`]),
])]
console.log('[seed] listening on', self.join(', '))
console.log('[seed] relay on', relay.join(', '))

/** Relay hops are public and a client may only be able to reach the seed over a
 *  circuit, so the seed's own protocols accept limited connections too. */
const handle = (protocol: string, handler: Parameters<typeof node.handle>[1]) =>
  node.handle(protocol, handler, { runOnLimitedConnection: true })

await handle('/genkaku/peers/0', async ({ stream, connection }) => {
  clients.set(connection.remotePeer.toString(), Date.now())
  await writeFrame(stream, { proto: 'peers/0', peers: live(), relay })
  await stream.close().catch(() => {})
})

await handle('/genkaku/announce/0', async ({ stream, connection }) => {
  const frame = await readOne(stream)
  const addrs = Array.isArray(frame?.addrs)
    ? frame.addrs.filter((a): a is string => typeof a === 'string' && a.startsWith('/'))
    : []
  const peer = connection.remotePeer.toString()
  if (addrs.length > 0) announced.set(peer, { addrs, at: Date.now() })
  await writeFrame(stream, { proto: 'announced/0', ok: addrs.length > 0 })
  await stream.close().catch(() => {})
})

// Live reservations are the relay service's own map; this event is the only
// place a grant is observable, so cumulative relay sessions are counted here.
const relayService = node.services.relay as unknown as {
  addEventListener?: (type: string, cb: () => void) => void
  reservations?: { size: number }
} | undefined
relayService?.addEventListener?.('relay:reservation', () => { relaySessions += 1 })

/** Header token that gates /stats. The public Caddy route speaks only to
 *  /peers, but a token keeps the counters off the open internet even if a
 *  future route exposes the whole server. */
const STATS_TOKEN = (() => {
  mkdirSync(STATE_DIR, { recursive: true, mode: 0o700 })
  const file = `${STATE_DIR}/stats.token`
  if (existsSync(file)) {
    const found = readFileSync(file, 'utf8').trim()
    if (found !== '') return found
  }
  const made = randomBytes(24).toString('hex')
  writeFileSync(file, `${made}\n`, { mode: 0o600 })
  return made
})()

import { createServer } from 'node:http'

const HTTP_PORT = Number(process.env.GENKAKU_SEED_HTTP_PORT ?? 8081)
createServer((req, res) => {
  const path = (req.url ?? '/').split('?')[0]

  if (path === '/stats') {
    if (req.headers['x-genkaku-stats-token'] !== STATS_TOKEN) {
      res.writeHead(403, { 'content-type': 'application/json' }).end(JSON.stringify({ ok: false }))
      return
    }
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' })
    res.end(JSON.stringify({
      ok: true,
      startedAt: STARTED_AT,
      peerId: node.peerId.toString(),
      addrs: self,
      relay,
      relayLimits,
      relayReservations: relayService?.reservations?.size ?? 0,
      relaySessions,
      announcedWorkers: liveWorkers(),
      clientPeers24h: recentClients(),
      io: processIo(),
      now: Date.now(),
    }))
    return
  }

  if (path !== '/peers') {
    res.writeHead(404).end()
    return
  }
  clients.set(`http:${req.socket.remoteAddress ?? 'unknown'}`, Date.now())
  res.writeHead(200, { 'content-type': 'application/json' })
  res.end(JSON.stringify({ peers: live(), relay }))
}).listen(HTTP_PORT, '127.0.0.1', () => {
  console.log('[seed] http discovery on', HTTP_PORT)
})

console.log('[seed] ready')
