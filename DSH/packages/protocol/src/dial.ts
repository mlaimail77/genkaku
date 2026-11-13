// GENKAKU: user-side worker transport (P4.3).
// Dials a worker's sidecar over real libp2p: open stream carries the envelope
// out and tok/0 frames in; receipts flow over a second stream so the worker's
// open handler never blocks on them. Offers are fetched per-discovered peer
// and sorted locally — the marketplace columns never touch the wire twice.

import { multiaddr } from '@multiformats/multiaddr'
import { peerIdFromString } from '@libp2p/peer-id'
import type { Libp2p } from 'libp2p'

import { newNonce, verifyHello, type HelloProof } from './hello.ts'
import { FrameReader, lpEncode, WriteQueue } from './lp.ts'
import { fromWire, type Offer } from './offer.ts'
import { ZERO_HASH } from './receipts.ts'
import { peerIdOf } from './registry.ts'
import type { OpenEnvelope } from './workerSession.ts'

type AnyStream = Awaited<ReturnType<Libp2p['dialProtocol']>>

/** How long to wait for the worker's admission ack before assuming an older
 *  worker that streams without one. */
const ADMISSION_TIMEOUT_MS = 8_000

/** Direct dials before a worker's address is considered unreachable and the
 *  seed-VM relay path is preferred for subsequent sessions. */
export const DIRECT_ATTEMPTS_BEFORE_RELAY = 3

/** addr → consecutive direct-dial failures. Kept per process so a client that
 *  learned a worker is behind NAT stops paying the direct timeout every turn. */
const directFailures = new Map<string, number>()

/** A circuit-relayed connection carries a relay-imposed byte/duration limit, so
 *  libp2p marks it "limited" and refuses new streams unless the caller opts in.
 *  Every GenKaKu protocol is application data and must opt in; on a direct
 *  connection the flag is ignored.
 *
 *  The timeout is per call — sharing one AbortSignal would abort every dial made
 *  after the module's first five seconds. An unreachable peer must not stall a
 *  marketplace listing behind a TCP timeout. */
export const DIAL_TIMEOUT_MS = 5_000

function streamOpts(timeoutMs = DIAL_TIMEOUT_MS): { signal: AbortSignal; runOnLimitedConnection: true } {
  return { signal: AbortSignal.timeout(timeoutMs), runOnLimitedConnection: true }
}

export type DialRoute = 'direct' | 'relay'

/** Build `/p2p-circuit` addresses for `peerId` from the relays the seed handed
 *  out. The relay hop keeps its own `/p2p/<id>`; ours is appended last. */
export function circuitAddrsFor(relays: readonly string[], peerId: string): string[] {
  const out: string[] = []

  for (const relay of relays) {
    if (!relay.startsWith('/') || !relay.includes('/p2p/')) continue
    const hop = relay.split('/p2p-circuit')[0] ?? relay
    out.push(`${hop}/p2p-circuit/p2p/${peerId}`)
  }

  return [...new Set(out)]
}

export type WorkerToolCall = { index: number; id: string; name: string; argumentsDelta: string }

export type WorkerTransport = {
  open(env: OpenEnvelope): Promise<void>
  onToken(cb: (delta: string) => void): void
  /** Tool calls relayed by a worker serving `open/1`. */
  onToolCall(cb: (call: WorkerToolCall) => void): void
  onEnd(cb: () => void): void
  onError(cb: (e: Error) => void): void
  /** sig: EIP-191 signature over the packed receipt digest (P4.4 priced
   *  sessions; empty string for escrowless self-tests). */
  sendReceipt(
    jobId: string,
    seq: number,
    amount: bigint,
    sig?: string,
    inputHash?: `0x${string}`,
    outputHash?: `0x${string}`,
  ): Promise<void>
  close(): Promise<void>
}

export async function dialWorker(node: Libp2p, addr: string): Promise<WorkerTransport> {
  const ma = multiaddr(addr)
  const oq = new WriteQueue()
  const rq = new WriteQueue()
  let openStream: AnyStream | null = null
  let receiptStream: AnyStream | null = null
  let openSinkDone: Promise<unknown> = Promise.resolve()
  let receiptSinkDone: Promise<unknown> = Promise.resolve()
  const tokenCbs = new Set<(delta: string) => void>()
  const toolCbs = new Set<(call: WorkerToolCall) => void>()
  const endCbs = new Set<() => void>()
  const errCbs = new Set<(e: Error) => void>()
  /** Resolved once the worker admits the session (ok/0) or sends a token;
   *  rejected when it refuses (err/0). An older worker never acks, so a
   *  timeout keeps this from hanging on compatibility. */
  let admitted: (() => void) | null = null
  let refused: ((e: Error) => void) | null = null

  function fail(e: unknown): void {
    const err = e instanceof Error ? e : new Error(String(e))

    for (const cb of errCbs) {cb(err)}
  }

  function startPosixRead(s: AnyStream): void {
    void (async () => {
      const reader = new FrameReader()
      let dead = false

      try {
        for await (const chunk of s.source) {
          reader.push(chunk)

          while (!dead) {
            const f = reader.next() as {
              proto?: string
              delta?: string
              code?: string
              message?: string
              index?: number
              id?: string
              name?: string
              argumentsDelta?: string
            } | undefined

            if (f == null) {break}

            if (f.proto === 'ok/0') {
              admitted?.()
            } else if (f.proto === 'err/0') {
              // The worker refused the session (P4.9d paywall). This must reach
              // the caller as an error, never as an empty successful answer.
              const err = new Error(`${f.code ?? 'refused'}: ${f.message ?? 'worker refused the session'}`)
              ;(err as Error & { code?: string }).code = f.code
              dead = true
              refused?.(err)
              for (const cb of errCbs) {cb(err)}
            } else if (f.proto === 'tok/0') {
              admitted?.()
              for (const cb of tokenCbs) {cb(String(f.delta ?? ''))}
            } else if (f.proto === 'tool/0') {
              admitted?.()
              const call: WorkerToolCall = {
                index: Number(f.index ?? 0),
                id: String(f.id ?? ''),
                name: String(f.name ?? ''),
                argumentsDelta: String(f.argumentsDelta ?? ''),
              }
              for (const cb of toolCbs) {cb(call)}
            }
          }

          if (dead) {break}
        }

        if (!dead) {for (const cb of endCbs) {cb()}}
      } catch (e) {
        fail(e)
      }
    })()
  }

  return {
    async open(env: OpenEnvelope): Promise<void> {
      openStream = await node.dialProtocol(ma, '/genkaku/open/0', streamOpts())
      // errors surface via the read side
      openSinkDone = openStream.sink(oq.source()).catch(() => {})
      oq.push(lpEncode(env))

      const admission = new Promise<void>((resolve, reject) => {
        admitted = resolve
        refused = reject
      })
      startPosixRead(openStream)

      // Compatibility: a worker that predates the ack simply starts streaming,
      // so wait for a token forever would be wrong — but neither should a slow
      // model look like a refusal. Bound the wait, then trust the stream.
      let timer: ReturnType<typeof setTimeout> | null = null
      const timeout = new Promise<void>((resolve) => {
        timer = setTimeout(resolve, ADMISSION_TIMEOUT_MS)
      })

      try {
        await Promise.race([admission, timeout])
      } finally {
        if (timer != null) clearTimeout(timer)
        admitted = null
        refused = null
      }
    },

    onToolCall(cb: (call: WorkerToolCall) => void): void {
      toolCbs.add(cb)
    },

    onToken(cb: (delta: string) => void): void { tokenCbs.add(cb) },
    onEnd(cb: () => void): void { endCbs.add(cb) },
    onError(cb: (e: Error) => void): void { errCbs.add(cb) },

    async sendReceipt(
      jobId: string,
      seq: number,
      amount: bigint,
      sig = '',
      inputHash = ZERO_HASH,
      outputHash = ZERO_HASH,
    ): Promise<void> {
      if (!receiptStream) {
        receiptStream = await node.dialProtocol(ma, '/genkaku/receipt/0', streamOpts())
        receiptSinkDone = receiptStream.sink(rq.source()).catch(() => {})
      }

      rq.push(lpEncode({
        proto: 'receipt/0',
        jobId,
        seq,
        amount: amount.toString(),
        sig,
        inputHash,
        outputHash,
      }))
    },

    async close(): Promise<void> {
      oq.end()
      rq.end()
      // drain queued writes before the CLOSE frame hits the wire
      await Promise.allSettled([openSinkDone, receiptSinkDone])
      await Promise.allSettled([openStream?.close(), receiptStream?.close()])
    },
  }
}

/** P4.9e: ask the peer to prove it holds the EVM key of the wallet it puts on
 *  its offers. Throws when the answer is missing, malformed, signed by another
 *  key, or claims a different PeerId than the one we dialed. */
export async function helloWorker(node: Libp2p, addr: string): Promise<HelloProof> {
  const expectedPeer = peerIdOf(addr)
  const nonce = newNonce()
  const stream = await node.dialProtocol(multiaddr(addr), '/genkaku/hello/0', streamOpts())

  let reply: {
    proto?: string
    ok?: boolean
    peerId?: string
    wallet?: string
    sig?: string
    reason?: string
  } | undefined

  try {
    stream.sink([lpEncode({ proto: 'hello/0', nonce })]).catch(() => {})
    const reader = new FrameReader()

    for await (const chunk of stream.source) {
      reader.push(chunk)
      const frame = reader.next() as typeof reply

      if (frame != null) {
        reply = frame

        break
      }
    }
  } finally {
    await stream.close().catch(() => {})
  }

  if (reply?.proto !== 'hello/0' || reply.ok !== true) {
    throw new Error(`hello: ${reply?.reason ?? 'no reply from the worker'}`)
  }

  if (typeof reply.peerId !== 'string' || typeof reply.wallet !== 'string' || typeof reply.sig !== 'string') {
    throw new Error('hello: malformed proof')
  }

  // The signature binds the peerId it was made for; a mismatch means the peer
  // replayed someone else's proof or the address was rewritten in transit.
  if (expectedPeer != null && reply.peerId !== expectedPeer) {
    throw new Error(`hello: peer ${reply.peerId} is not ${expectedPeer}`)
  }

  const proof: HelloProof = { peerId: reply.peerId, wallet: reply.wallet as `0x${string}`, sig: reply.sig }

  if (!(await verifyHello(proof, nonce))) {
    throw new Error(`hello: signature does not recover to ${proof.wallet}`)
  }

  return proof
}

/** Which path an established connection actually uses. libp2p reuses an
 *  existing connection to the same peer even when a different address was
 *  requested, so the request alone cannot tell us: read the connection's
 *  remote address. */
function routeOf(node: Libp2p, addr: string): DialRoute | null {
  const peer = peerIdOf(addr)
  if (peer == null) return null

  try {
    const conns = node.getConnections(peerIdFromString(peer))
    if (conns.length === 0) return null

    const relayed = conns.some(c => c.remoteAddr.toString().includes('/p2p-circuit'))
    const direct = conns.some(c => !c.remoteAddr.toString().includes('/p2p-circuit'))

    if (direct) return 'direct'
    if (relayed) return 'relay'

    return null
  } catch {
    return null
  }
}

/** Dial a worker: direct libp2p first, and after repeated failures fall back
 *  to the seed-VM circuit relay. The route is returned so the caller can say
 *  which path a session actually took. */
export async function dialWorkerAny(
  node: Libp2p,
  addr: string,
  opts: { relays?: readonly string[] } = {},
): Promise<{ transport: WorkerTransport; route: DialRoute; addr: string }> {
  // The board already handed us a relay address: no direct attempt to make.
  if (addr.includes('/p2p-circuit')) {
    return { transport: await dialWorker(node, addr), route: 'relay', addr }
  }

  const peer = peerIdOf(addr)
  const circuits = peer == null ? [] : circuitAddrsFor(opts.relays ?? [], peer)
  const failures = directFailures.get(addr) ?? 0
  const relayFirst = failures >= DIRECT_ATTEMPTS_BEFORE_RELAY && circuits.length > 0
  const order: DialRoute[] = relayFirst ? ['relay', 'direct'] : ['direct', 'relay']

  let lastError: unknown

  for (const route of order) {
    if (route === 'relay' && circuits.length === 0) continue

    const target = route === 'relay' ? circuits[0]! : addr

    try {
      const transport = await dialWorker(node, target)

      // Trust the connection, not the request: a relay connection established
      // earlier is reused for a "direct" dial to the same peer.
      const actual = routeOf(node, target) ?? route

      if (actual === 'direct') directFailures.delete(addr)
      else directFailures.set(addr, DIRECT_ATTEMPTS_BEFORE_RELAY)

      return { transport, route: actual, addr: target }
    } catch (error) {
      lastError = error

      if (route === 'direct') directFailures.set(addr, (directFailures.get(addr) ?? 0) + 1)
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}

/** Open (or reuse) a connection to a relay hop. The circuit transport only
 *  reserves a slot while a HOP-capable peer is connected, so a seed restart
 *  needs this again with the seed's new peer id. */
export function connectRelay(node: Libp2p, relay: string): void {
  if (!relay.startsWith('/')) return
  void node.dial(multiaddr(relay)).catch(() => {})
}

/** Fetch + deserialize a worker's offer board (one dial, whole-board read). */
export async function fetchOffers(node: Libp2p, addr: string): Promise<Offer[]> {
  const offers = await fetchOfferBoard(node, addr)
  let proof: HelloProof

  try {
    proof = await helloWorker(node, addr)
  } catch {
    // An older worker (or one with no wallet) cannot prove anything; the board
    // stays unverified and the caller decides whether that is acceptable.
    return offers
  }

  return offers.map((offer) => {
    if (offer.workerWallet?.startsWith('0x') && offer.workerWallet.toLowerCase() !== proof.wallet.toLowerCase()) {
      throw new Error(`offers: ${proof.peerId} claims ${offer.workerWallet} but proved ${proof.wallet}`)
    }

    // The proven wallet wins: a worker that omits its wallet still becomes
    // payable, and a lying one was already rejected above.
    return { ...offer, workerWallet: proof.wallet, walletVerified: true }
  })
}

async function fetchOfferBoard(node: Libp2p, addr: string): Promise<Offer[]> {
  const s = await node.dialProtocol(multiaddr(addr), '/genkaku/offers/0', streamOpts())
  const reader = new FrameReader()
  let board: unknown[] = []

  for await (const chunk of s.source) {
    reader.push(chunk)
    const f = reader.next() as { proto?: string; board?: unknown[] } | undefined

    if ((f?.proto === 'offers/0' || f?.proto === 'offers/1') && Array.isArray(f.board)) {
      board = f.board

      break
    }
  }

  await s.close().catch(() => {})

  return board
    .filter(w => {
      const proto = (w as { proto?: string }).proto
      return proto === 'offers/0' || proto === 'offers/1'
    })
    .map(w => fromWire(w as never))
}

/** P4.5 seed discovery: ask a bootstrap seed which peers it currently sees.
 *  The seed is a pure matchmaker — one frame in, one frame out, no storage. */
export async function fetchSeedPeers(node: Libp2p, addr: string): Promise<string[]> {
  // A seed addressed by URL is read over HTTP: its peer id changes whenever the
  // process restarts, so a baked /p2p/<id> would rot. A libp2p multiaddr still
  // takes the native path.
  if (addr.startsWith('http://') || addr.startsWith('https://')) {
    try {
      const res = await fetch(`${addr.replace(/\/$/, '')}/peers`, { signal: AbortSignal.timeout(DIAL_TIMEOUT_MS) })
      if (!res.ok) return []
      const body = (await res.json()) as { peers?: unknown }
      return Array.isArray(body.peers)
        ? body.peers.filter((p): p is string => typeof p === 'string' && p.startsWith('/'))
        : []
    } catch {
      return []
    }
  }
  const s = await node.dialProtocol(multiaddr(addr), '/genkaku/peers/0', streamOpts())
  const reader = new FrameReader()

  for await (const chunk of s.source) {
    reader.push(chunk)

    const f = reader.next() as { proto?: string; peers?: unknown } | undefined

    if (f?.proto === 'peers/0' && Array.isArray(f.peers)) {
      await s.close().catch(() => {})

      return f.peers.filter((p): p is string => typeof p === 'string' && p.startsWith('/'))
    }
  }

  await s.close().catch(() => {})

  return []
}

/** Relay hops the seed advertises. A worker reserves a slot on one of these and
 *  a client uses them to reach workers that are not directly dialable. Both the
 *  HTTP and the libp2p seed paths answer with a `relay` array. */
export async function fetchSeedRelays(node: Libp2p | null, seed: string): Promise<string[]> {
  if (seed.startsWith('http://') || seed.startsWith('https://')) {
    try {
      const res = await fetch(`${seed.replace(/\/$/, '')}/peers`, { signal: AbortSignal.timeout(DIAL_TIMEOUT_MS) })
      if (!res.ok) return []
      const body = (await res.json()) as { relay?: unknown }
      return Array.isArray(body.relay)
        ? body.relay.filter((p): p is string => typeof p === 'string' && p.startsWith('/'))
        : []
    } catch {
      return []
    }
  }

  if (node == null) return []

  try {
    const s = await node.dialProtocol(multiaddr(seed), '/genkaku/peers/0', streamOpts())
    const reader = new FrameReader()

    for await (const chunk of s.source) {
      reader.push(chunk)
      const f = reader.next() as { proto?: string; relay?: unknown } | undefined

      if (f?.proto === 'peers/0') {
        await s.close().catch(() => {})
        return Array.isArray(f.relay)
          ? f.relay.filter((p): p is string => typeof p === 'string' && p.startsWith('/'))
          : []
      }
    }

    await s.close().catch(() => {})
  } catch {
    // fall through
  }

  return []
}

/**
 * P4.4 settle co-sign (one dial, one frame each way): the user, at session
 * end, presents (jobId, escrowId, receiptHash, spend); the worker checks its
 * held max-cumulative receipt (anti-inflation: it never signs beyond the
 * largest receipt the client piped — P1 §8) and returns an EIP-191 signature
 * over keccak256(abi.encodePacked(escrowId, receiptHash, spend)) — the exact
 * digest JobEscrow.settle recovers against the session's worker address.
 */
export async function requestSettleCosign(
  node: Libp2p,
  addr: string,
  args: { jobId: string; escrowId: string; receiptHash: `0x${string}`; spend: bigint },
): Promise<{ ok: boolean; sig: `0x${string}` | null; reason?: string }> {
  const s = await node.dialProtocol(multiaddr(addr), '/genkaku/settle/0', streamOpts())
  const reader = new FrameReader()
  let reply: { ok?: boolean; sig?: string; reason?: string } | null = null

  const sinkDone = s.sink([lpEncode({
    proto: 'settle/0',
    jobId: args.jobId,
    escrowId: args.escrowId,
    receiptHash: args.receiptHash,
    spend: args.spend.toString(),
  })]).catch(() => {})

  for await (const chunk of s.source) {
    reader.push(chunk)
    const f = reader.next() as { proto?: string; ok?: boolean; sig?: string; reason?: string } | undefined

    if (f?.proto === 'settle/0') {
      reply = f

      break
    }
  }

  await sinkDone // empty the queue BEFORE CLOSE or the request frame dies
  await s.close().catch(() => {})

  if (reply?.ok === true && typeof reply.sig === 'string' && reply.sig.startsWith('0x')) {
    return { ok: true, sig: reply.sig as `0x${string}` }
  }

  return { ok: false, sig: null, reason: reply?.reason ?? 'worker did not co-sign' }
}

/**
 * Tell a seed which addresses this worker can be reached on.
 *
 * Without this the seed can only answer with itself, which is no help to a cold
 * client. A seed that does not implement the protocol is ignored.
 */
export async function announceToSeed(node: Libp2p, seed: string, addrs: string[]): Promise<boolean> {
  if (addrs.length === 0) return false

  // A seed may be configured as a URL (the shipped default): its peer id
  // changes on restart, so the address to dial is whatever it reports right
  // now. `relay` is the seed's own address; `peers` are workers, never dial
  // those for an announcement.
  const targets: string[] = seed.startsWith('http://') || seed.startsWith('https://')
    ? await fetchSeedRelays(node, seed)
    : [seed]

  for (const target of targets) {
    try {
      const s = await node.dialProtocol(multiaddr(target), '/genkaku/announce/0', streamOpts())

      try {
        s.sink([lpEncode({ proto: 'announce/0', addrs })]).catch(() => {})
        const reader = new FrameReader()

        for await (const chunk of s.source) {
          reader.push(chunk)
          const f = reader.next() as { proto?: string; ok?: boolean } | undefined
          if (f?.proto === 'announced/0' && f.ok === true) return true
        }
      } finally {
        await s.close().catch(() => {})
      }
    } catch {
      // try the next address the URL reported
    }
  }

  return false
}
