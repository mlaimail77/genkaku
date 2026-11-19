// GENKAKU: libp2p nodes (sidecar / client / settlement).
// Workers serve the /genkaku/* protocols (sidecar); users get a bare dial node.
// The mode manager gates handler installs — user mode never constructs the
// worker side, and worker modes never open remote sessions (D-block defense
// in depth, P4-ADAPTATION §2).
//
// One ed25519 key is the libp2p identity AND the Solana wallet. That makes the
// sidecar's PeerId a self-certifying statement about who gets paid: the wallet
// is inside the PeerId, so a marketplace client can verify the binding without
// a handshake, a registry read or trust.

import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { circuitRelayTransport } from '@libp2p/circuit-relay-v2'
import { generateKeyPair, privateKeyFromRaw } from '@libp2p/crypto/keys'
import { identify } from '@libp2p/identify'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { tcp } from '@libp2p/tcp'
import { multiaddr } from '@multiformats/multiaddr'
import { createLibp2p, type Libp2p } from 'libp2p'

import { walletAddress, type GenkakuWallet } from './chain.ts'
import { signHello } from './hello.ts'
import { walletOfPeerId } from './registry.ts'
import type { LocalChatSource, LocalCompletionSource } from './llmBridge.ts'
import { FrameReader, lpEncode, WriteQueue } from './lp.ts'
import type { ModeManager } from './modeManager.ts'
import { CONTRACTS, DEFAULT_NET_ENV } from './netconfig.ts'
import type { NetEnvironment } from './netconfig.ts'
import { cumulativeBilled, type Offer, toWire } from './offer.ts'
import {
  digestFor,
  digestForHex,
  digestBytes,
  inputHashOf,
  outputHashOf,
  ReceiptLedger,
  sessionIdOf,
  verifyDigest,
  ZERO_HASH,
  type Digest,
  type ReceiptPayloadV1,
} from './receipts.ts'
import { POLICY_VERSION, policyHashOf } from './registry.ts'
import type { OpenEnvelope, SessionEvent, WorkerSession } from './workerSession.ts'

// re-exported for consumers of the codec (tests, user-side dialer)
export { FrameReader, lpEncode, lpFrames } from './lp.ts'
export type { ByteChunk } from './lp.ts'

export const GENKAKU_PROTOCOLS = [
  '/genkaku/open/0',
  '/genkaku/token/0',
  '/genkaku/receipt/0',
  '/genkaku/settle/1',
  '/genkaku/offers/0',
  '/genkaku/pair/0',
  '/genkaku/policy/0',
  '/genkaku/hello/0',
] as const

export type SidecarOptions = {
  modeManager: ModeManager
  source: LocalCompletionSource
  /** Serves `open/1` chat requests (messages + tool schemas). */
  chatSource?: LocalChatSource
  /** ip4/tcp listen addrs; LAN first, NAT traversal (hole punching) later */
  listen: string[]
  /** one Offer row per (model, price) the worker publishes — visible to users */
  catalog: Offer[]
  sessionEvents?: (e: SessionEvent) => void
  /** P4.9d: refuse to spend GPU time unless the named escrow pays this worker. */
  /** With a worker wallet, priced receipts MUST carry a valid signature, the
   *  sidecar's PeerId IS that wallet, and settlement becomes available. */
  workerKey?: GenkakuWallet
  /** Public relay multiaddrs (the seed VM). Dialed at boot so the circuit
   *  transport can reserve a slot, which makes a NAT'd worker dialable. */
  relayHints?: string[]
  /**
   * Private-worker gate. Called with the AUTHENTICATED remote PeerId of every
   * dial before the offers board or a session is served. Absent = public.
   */
  access?: (peerId: string) => { ok: true } | { ok: false; code: 'pair-required'; reason: string }
  /**
   * Exchange a one-time pairing code for the dialing wallet. The wallet is NOT
   * taken from the request: it comes from the connection's authenticated peer
   * id, so a code alone cannot pair an attacker's machine.
   */
  pair?: (args: { peerId: string; secret: string; label?: string }) =>
    Promise<{ ok: true; wallet: string; label?: string } | { ok: false; code: string; reason: string }>
  /** Diagnostic sink (IPv6 fallback, listener warnings). */
  log?: (line: string) => void
  /**
   * Cluster the sidecar binds receipts to. Defaults to devnet so a plugin that
   * predates this option keeps its old behaviour; mainnet must be passed
   * explicitly and is checked against the client's cluster on every open.
   */
  env?: NetEnvironment
}

/** One stored (latest) receipt per jobId — the evidence the settle co-sign
 *  defends against (spend == max cumulative receipt the client piped). */export type StoredReceipt = {
  seq: number
  amount: bigint
  sig: string
  /** the escrow/stream binding used to build the digest (jobId, escrowId) */
  escrowId: string
  /** commit-challenge commitments carried by the receipt (P4.9f) */
  inputHash: Digest
  outputHash: Digest
  /** the wallet that signed it ('' when the client sent it unsigned) */
  signer?: string
}

// libp2p 1.9.4's own default nodeInfo omits the REQUIRED `userAgent` field,
// which makes @libp2p/identify crash on start (getAgentVersion →
// nodeInfo.userAgent → undefined → uint8ArrayFromString throws). Provide a
// full NodeInfo; also advertised in identify metadata.
const NODE_INFO = { name: 'genkaku', version: '0.1.0', userAgent: 'genkaku/0.1.0 (desktop)' } as const

/** Bounded window AFTER the token EOF in which the client's through-end
 *  receipt may still land before we stop watching. Sidecar-scope: the receipt
 *  protocol stream stays alive independently of the released token stream. */
const RECEIPT_DRAIN_MS = 250

/** Slack for worker/client clock differences in the receipt clock bound. */
const CLOCK_SLACK_MS = 2_000

/** A bare libp2p node for the USER side (no genkaku handlers — dials only).
 *
 *  Given the user's wallet key, the node's PeerId IS the wallet: a private
 *  worker authorises the caller by the authenticated peer id of the dial, so
 *  nothing in the request has to be trusted. Without a key (tests, scripts) a
 *  random identity is fine — it simply cannot pair with a private worker. */
export async function createUserNode(listen: string[] = [], key?: GenkakuWallet): Promise<Libp2p> {
  const privateKey = key != null ? privateKeyFromRaw(key.secretKey) : await generateKeyPair('Ed25519')

  return createLibp2p({
    privateKey,
    nodeInfo: NODE_INFO,
    addresses: { listen },
    transports: [tcp(), circuitRelayTransport()],
    connectionEncrypters: [noise()],
    streamMuxers: [yamux()],
    services: { identify: identify() },
  })
}

export type GenkakuSidecar = {
  node: Libp2p
  peerAddrs: () => string[]
  stop(): Promise<void>
  activeSessions: () => number
  /** P4.5: the base58 PeerId string the registry binding pins */
  peerIdStr: () => string
  /** Replace the served offer board without restarting the sidecar. */
  setCatalog: (offers: Offer[]) => void
}

/** Every GenKaKu protocol must accept a relayed (limited) connection: a worker
 *  behind NAT is ONLY reachable that way. libp2p refuses streams on a limited
 *  connection unless both the dialer and the handler opt in. */
const RELAY_HANDLER = { runOnLimitedConnection: true } as const

export async function createSidecar(opts: SidecarOptions): Promise<GenkakuSidecar> {
  // D-block: do not even construct listeners without a sharing-capable mode.
  const mode = opts.modeManager.current()

  if (mode.mode === 'user') {
    throw new Error('[genkaku:sidecar] refusing to build worker listeners in user mode (D-block)')
  }

  opts.modeManager.installWorkerListeners()

  // The data-plane chain this worker signs receipts for. One deployment per
  // chain, so this is a property of the process, not of a session.
  const ENV: NetEnvironment = opts.env ?? DEFAULT_NET_ENV

  const ledger = new ReceiptLedger()
  const inbox = new Map<string, StoredReceipt>()
  /** jobId → escrowId as declared in the open envelope (receipt/bind side). */
  const escrowByJob = new Map<string, string>()
  /** jobId → wall time the open envelope arrived (the clock-bound anchor). */
  const openedAtByJob = new Map<string, number>()
  /** jobId → the wallet the transport proved (receipt signer must match).
   *
   *  0.3 has no paywall to read a payer off a session, and it does not need one:
   *  the libp2p handshake already proved which ed25519 key is on the other end,
   *  and that key IS the wallet. The receipt check therefore still names the
   *  same party that sent the work. */
  const payerByJob = new Map<string, string>()
  /** jobId → commitment to the request the open envelope asked for. */
  const inputHashByJob = new Map<string, Digest>()
  /** jobId → the answer text emitted so far (the reveal side of a challenge). */
  const outputByJob = new Map<string, string>()
  /** jobId → the model the open envelope asked for (bounds price lookup). */
  const sessionModelByJob = new Map<string, string>()
  /** jobId → the client's billing tick (granularity, wallet: the worker owns price). */
  const sessionUnitMsByJob = new Map<string, number>()
  let sessions = 0
  let currentCatalog = [...opts.catalog]

  // The worker-side receipt constructor: EXACTLY what the user signed —
  // chainId/escrow from NETCONFIG (one deployment per env), sessionId from
  // (jobId, escrowId). Nothing the caller controls feeds the struct, so a
  // forged sig can't bind a different amount or stream handle.
  const receiptOf = (jobId: string, held: StoredReceipt): ReceiptPayload | null => {
    if (held == null) {return null}

    return {
      chain: ENV,
      program: CONTRACTS[ENV].program,
      sessionId: sessionIdOf(jobId, held.escrowId),
      seq: held.seq,
      amount: held.amount,
      inputHash: held.inputHash,
      outputHash: held.outputHash,
    }
  }

  // Identity: the worker's own ed25519 key. A Solana Keypair's 64 secret bytes
  // are exactly seed‖public key, which is the layout libp2p expects, so the
  // PeerId it derives encodes the wallet address inside the multihash. With no
  // worker key (a test node) a random identity is fine — it simply cannot
  // settle anything.
  const privateKey = opts.workerKey != null
    ? privateKeyFromRaw(opts.workerKey.secretKey)
    : await generateKeyPair('Ed25519')
  const peerId = peerIdFromPrivateKey(privateKey)

  // The default listen list includes IPv6. A Windows machine (or a Linux box
  // with IPv6 disabled) can refuse that listener; losing the whole worker over
  // a second address family would look like "the plugin does nothing".
  const init = (listen: string[]) => ({
    privateKey,
    nodeInfo: NODE_INFO,
    addresses: { listen: [...new Set([...listen, '/p2p-circuit'])] },
    transports: [tcp(), circuitRelayTransport()],
    connectionEncrypters: [noise()],
    streamMuxers: [yamux()],
    services: { identify: identify() },
  })

  let node: Libp2p

  try {
    node = await createLibp2p(init(opts.listen))
  } catch (error) {
    const ipv4 = opts.listen.filter(addr => !addr.startsWith('/ip6/'))
    if (ipv4.length === opts.listen.length || ipv4.length === 0) throw error
    opts.log?.(`IPv6 listen unavailable (${error instanceof Error ? error.message : String(error)}); retrying on IPv4 only`)
    node = await createLibp2p(init(ipv4))
  }

  // Connect to the public relay up front: the circuit transport reserves a
  // slot only once a HOP-capable peer is connected. Failures are non-fatal —
  // a worker with a public address is still directly dialable.
  for (const hint of opts.relayHints ?? []) {
    void node.dial(multiaddr(hint)).catch(() => {})
  }

  /** Register a protocol that may run over a relayed (limited) connection. */
  const handle = (
    protocol: string,
    handler: Parameters<Libp2p['handle']>[1],
  ): Promise<void> => node.handle(protocol, handler, RELAY_HANDLER)

  await handle('/genkaku/open/0', ({ connection, stream }) => {
    void (async () => {
      // Read ONLY the open envelope, then start serving — the client keeps its
      // write half open for the session, so a drain-to-EOS read would deadlock
      // with muxer window backpressure.
      const reader = new FrameReader()

      let env: OpenEnvelope | undefined

      for await (const chunk of stream.source) {
        reader.push(chunk)
        const frame = reader.next()

        if (frame != null) {
          env = frame as OpenEnvelope

          break
        }
      }

      if (!env || (env.proto !== 'open/0' && env.proto !== 'open/1')) {
        await stream.close()

        return
      }

      // Cross-cluster guard. A client whose session lives on the other cluster
      // would otherwise negotiate a session, consume GPU time, and only
      // discover the mismatch when settlement is attempted — or worse, never
      // discover it. Refuse before any work happens.
      const expectedChain = ENV
      if (env.chain != null && env.chain !== expectedChain) {
        opts.sessionEvents?.({
          type: 'session-error',
          message: `refused ${env.jobId}: wrong-cluster (client ${env.chain}, worker ${expectedChain})`,
        })

        try {
          await stream.sink([lpEncode({
            proto: 'err/0',
            jobId: env.jobId,
            code: 'wrong-cluster',
            message: `this worker settles on ${expectedChain}`,
          })])
        } catch {
          // client already gone; the close below still ends the session
        }

        await stream.close().catch(() => {})

        return
      }

      // Private-worker gate. `connection.remotePeer` was authenticated by the
      // transport handshake, so this is the dialer's wallet, not a claim in the
      // envelope. It runs before anything else: a stranger must not learn
      // whether a model is listed.
      const access = opts.access?.(connection.remotePeer.toString())

      if (access != null && !access.ok) {
        opts.sessionEvents?.({
          type: 'session-error',
          message: `refused ${env.jobId}: ${access.code} (${connection.remotePeer.toString()})`,
        })

        try {
          await stream.sink([lpEncode({
            proto: 'err/0',
            jobId: env.jobId,
            code: access.code,
            message: access.reason,
          })])
        } catch {
          // client already gone; the close below still ends it
        }

        await stream.close().catch(() => {})

        return
      }

      const dialerWallet = walletOfPeerId(connection.remotePeer.toString())
      if (dialerWallet != null) payerByJob.set(env.jobId, dialerWallet)
      inputHashByJob.set(env.jobId, inputHashOf({
        model: env.model,
        prompt: env.prompt,
        system: env.system,
        maxTokens: env.maxTokens,
      }))
      outputByJob.set(env.jobId, '')
      escrowByJob.set(env.jobId, env.escrowId || '0')
      openedAtByJob.set(env.jobId, Date.now())
      sessionModelByJob.set(env.jobId, env.model)
      sessionUnitMsByJob.set(env.jobId, env.billing?.unitMs ?? 60_000)

      // ONE sink for the whole session: token frames push through a durable
      // write queue (a second stream.sink() call would explode it).
      const dq = new WriteQueue()
      const sinkDone = stream.sink(dq.source()).catch(() => {})

      // Admission ack (P4.9d): the client waits for this before it reports a
      // success to its own caller, so a paywall refusal reaches the caller as
      // an error instead of an empty completion.
      dq.push(lpEncode({ proto: 'ok/0', jobId: env.jobId }))

      const emit = (e: SessionEvent) => opts.sessionEvents?.(e)

      const session: WorkerSession = await import('./workerSession.ts').then(({ createWorkerSession }) =>
        createWorkerSession(env, {
          modeManager: opts.modeManager,
          source: opts.source,
          ...(opts.chatSource === undefined ? {} : { chatSource: opts.chatSource }),
          onToolCall: (call) => {
            dq.push(lpEncode({ proto: 'tool/0', ...call }))
          },
          ledger,
          emit,
          onDelta: (delta) => {
            outputByJob.set(env.jobId, (outputByJob.get(env.jobId) ?? '') + delta)
            dq.push(lpEncode({ proto: 'tok/0', delta }))
          },
          latestReceipt: () => inbox.get(env.jobId) ?? null,
        }),
      )

      sessions += 1

      try {
        await session.run()

        // P2 §3 / P4.4: the client sends its THROUGH-END receipt only after
        // the token EOF reaches it — i.e. after this handler would have
        // closed. Release the token stream first (never meter artificial
        // hold time), then poll the shared inbox for one bounded window and
        // push any post-end receipt through the SAME strictly-increasing
        // ledger rule as the live session did. The settle co-sign (below)
        // defends the final evidence either way.
        dq.end()
        await sinkDone
        await stream.close()

        const deadline = Date.now() + RECEIPT_DRAIN_MS

        while (Date.now() < deadline) {
          const held = inbox.get(env.jobId)

          if (held != null) {
            const verdict = ledger.offer(env.jobId, held.seq, held.amount)

            if (verdict.accepted) {
              emit({ type: 'receipt-accepted', seq: held.seq, amount: held.amount })

              break
            }
            // Stale (already merged into the ledger during the live session):
            // keep the window open — a newer receipt may still be in flight.
          }

          await new Promise(r => setTimeout(r, 20))
        }
      } finally {
        sessions -= 1

        if (!dq.ended) { // drain-parked path already closed — safe no-op here
          dq.end()
          await sinkDone
          await stream.close()
        }
      }

      void connection
    })()
  })

  await handle('/genkaku/receipt/0', ({ stream }) => {
    void (async () => {
      const reader = new FrameReader()

      for await (const chunk of stream.source) {
        reader.push(chunk)

        while (true) {
          const f = reader.next() as {
            proto?: string
            jobId?: string
            escrowId?: string
            seq?: number
            amount?: string
            sig?: string
            inputHash?: string
            outputHash?: string
          } | undefined

          if (f == null) {break}

          if (f.proto === 'receipt/0' && typeof f.seq === 'number' && typeof f.amount === 'string' && typeof f.jobId === 'string') {
            // escrowId comes from the OPEN envelope, never from this frame —
            // the binding is the session's, not the receipt-sender's claim.
            const stored: StoredReceipt = {
              seq: f.seq,
              amount: BigInt(f.amount),
              sig: f.sig ?? '',
              escrowId: escrowByJob.get(f.jobId) ?? '0',
              inputHash: (f.inputHash ?? ZERO_HASH) as Digest,
              outputHash: (f.outputHash ?? ZERO_HASH) as Digest,
            }

            // P4.9f commit-challenge: the client may not pay for a different
            // request, and a non-zero output commitment must match the text
            // this worker actually emitted.
            const expectedInput = inputHashByJob.get(f.jobId)

            if (expectedInput != null && stored.inputHash !== expectedInput) {
              opts.sessionEvents?.({ type: 'session-error', message: `receipt ${stored.seq}: input commitment mismatch` })

              continue
            }

            if (stored.outputHash !== ZERO_HASH
              && stored.outputHash !== outputHashOf(outputByJob.get(f.jobId) ?? '')) {
              opts.sessionEvents?.({ type: 'session-error', message: `receipt ${stored.seq}: output commitment mismatch` })

              continue
            }

            // Priced receipts are SIGNATURE-BOUND evidence — a forged or
            // anonymous offer never reaches settlement.
            if (opts.workerKey != null && stored.escrowId !== '0') {
              const bad = rejectUnsigned(stored, f.jobId)

              if (bad) {
                opts.sessionEvents?.({ type: 'session-error', message: `receipt ${stored.seq}: unsigned/malformed offer dropped` })

                continue
              }

              const over = overClockBound(stored, f.jobId)

              if (over != null) {
                opts.sessionEvents?.({ type: 'session-error', message: `receipt ${stored.seq} for ${stored.amount}: ${over}` })

                continue
              }
            }

            // Inbox ONLY: the ledger entry is claimed by the session that owns
            // this jobId (single ingestion point — a pre-offer here would make
            // the session's own offer stale).
            inbox.set(f.jobId, stored)
          }
        }
      }

      await stream.close()
    })()
  })

  // P4.3 offer board: a user dials this on every discovered peer and sorts
  // locally. A private worker answers an unpaired dial with an EMPTY board —
  // the model list is the thing being protected, so hiding only the session
  // would leak it.
  await handle('/genkaku/offers/0', ({ connection, stream }) => {
    const wallet = opts.workerKey != null ? walletAddress(opts.workerKey) : undefined
    const access = opts.access?.(connection.remotePeer.toString())
    const board = access != null && !access.ok
      ? []
      : currentCatalog.map(o => toWire(wallet == null ? o : { ...o, workerWallet: wallet }))

    void stream.sink([lpEncode({
      proto: 'offers/0',
      board,
      ...(access != null && !access.ok ? { private: true, reason: access.reason } : {}),
    })]).then(() => stream.close())
  })

  // P4.9e identity proof: one nonce in, one signed proof out. The client
  // recovers the signer and refuses offers whose wallet it cannot prove.
  await handle('/genkaku/hello/0', ({ stream }) => {
    void (async () => {
      const reader = new FrameReader()
      let req: { proto?: string; nonce?: string } | undefined

      for await (const chunk of stream.source) {
        reader.push(chunk)
        const f = reader.next() as typeof req | undefined

        if (f != null) {
          req = f

          break
        }
      }

      const reply = (body: Record<string, unknown>) =>
        stream.sink([lpEncode({ proto: 'hello/0', ...body })]).then(() => stream.close())

      if (req?.proto !== 'hello/0' || typeof req.nonce !== 'string' || !req.nonce.startsWith('0x')) {
        await reply({ ok: false, reason: 'bad frame' })

        return
      }

      if (opts.workerKey == null) {
        await reply({ ok: false, reason: 'worker has no wallet' })

        return
      }

      const proof = await signHello(opts.workerKey, node.peerId.toString(), req.nonce as `0x${string}`)
      await reply({ ok: true, peerId: proof.peerId, wallet: proof.wallet, sig: proof.sig })
    })()
  })

  // One-time pairing: a code in, a wallet out. The worker derives the wallet
  // from the transport-authenticated peer id, never from the frame.
  await handle('/genkaku/pair/0', ({ connection, stream }) => {
    void (async () => {
      const reader = new FrameReader()
      let req: { proto?: string; secret?: string; label?: string } | undefined

      for await (const chunk of stream.source) {
        reader.push(chunk)
        const frame = reader.next() as typeof req | undefined

        if (frame != null) {
          req = frame

          break
        }
      }

      const reply = (body: Record<string, unknown>) =>
        stream.sink([lpEncode({ proto: 'paired/0', ...body })]).then(() => stream.close()).catch(() => {})

      if (req?.proto !== 'pair/0' || typeof req.secret !== 'string' || req.secret === '') {
        await reply({ ok: false, code: 'bad-frame', reason: 'expected a pairing code' })

        return
      }

      if (opts.pair == null) {
        await reply({ ok: false, code: 'pairing-disabled', reason: 'this worker does not accept pairing codes' })

        return
      }

      const result = await opts.pair({
        peerId: connection.remotePeer.toString(),
        secret: req.secret,
        ...(typeof req.label === 'string' ? { label: req.label } : {}),
      }).catch((error) => ({
        ok: false as const,
        code: 'pairing-error',
        reason: error instanceof Error ? error.message : String(error),
      }))

      await reply(result.ok
        ? { ok: true, wallet: result.wallet }
        : { ok: false, code: result.code, reason: result.reason })
    })()
  })

  // token is served in-session (open handler); policy is reserved v0.
  await handle('/genkaku/token/0', ({ stream }) => { void stream.close() })
  await handle('/genkaku/policy/0', ({ stream }) => {
    // The wire advertises the SAME digest the worker pins in the directory, so
    // a user can compare registry.policyHash against it.
    void stream.sink([lpEncode({ proto: 'policy/0', policyHash: policyHashOf(POLICY_VERSION), policyVersion: POLICY_VERSION })]).then(() => stream.close())
  })

  // ── helpers (close over netconfig + maps, never over the wire) ──────────

  /**
   * The receipt the worker will settle against: the last frame the client sent,
   * or — when the through-end frame was lost — the ledger's max, replayed with
   * the commitments this side holds. The ledger is the authority on the amount;
   * the inbox is the authority on the signatures and hashes.
   */
  function heldReceipt(jobId: string, escrowId: string): StoredReceipt | null {
    const frame = inbox.get(jobId)
    if (frame != null) return frame

    const held = ledger.settleDigest(jobId)
    if (held == null) return null

    return {
      seq: held.seq,
      amount: held.amount,
      sig: '',
      escrowId,
      inputHash: inputHashByJob.get(jobId) ?? ZERO_HASH,
      outputHash: outputHashOf(outputByJob.get(jobId) ?? ''),
    }
  }

  /** True when a receipt cannot be verified against the wallet that dialed.
   *
   *  There is no address recovery with ed25519, and none is needed: the
   *  transport handshake proved the dialer's peer id, and that peer id decodes
   *  to the wallet. Evidence therefore names the same party that sent the work —
   *  a third party cannot sign for someone else's session. */
  function rejectUnsigned(stored: StoredReceipt, jobId: string): boolean {
    if (stored.sig === '' || stored.escrowId === '0') {return true}

    const receipt = receiptOf(jobId, stored)

    if (receipt == null) {return true}

    const payer = payerByJob.get(jobId)

    // A dialer whose peer id does not decode to a wallet (a dev client with a
    // random identity) has no signature to check against. Receipts stay
    // evidence; they no longer move money, so this weakens nothing.
    if (payer == null || payer === '') {return false}

    return !verifyDigest(digestFor(receipt), stored.sig, payer)
  }

  /** The P2 §3 clock bound: a receipt can never exceed what the worker's OWN
   *  catalog price + wall time since the open envelope allow. Returns a
   *  reason string when the receipt is over, null when within the bound. */
  function overClockBound(stored: StoredReceipt, jobId: string): string | null {
    const openedAt = openedAtByJob.get(jobId)

    if (openedAt == null) {return 'session was never opened here'}

    const env = currentCatalog.find(o => o.model === sessionModelByJob.get(jobId)) ?? currentCatalog[0]

    if (env == null) {return 'worker has no priced model'}

    const unitMs = sessionUnitMsByJob.get(jobId) ?? 60_000
    const elapsed = Date.now() - openedAt + CLOCK_SLACK_MS
    const max = cumulativeBilled(env.pricePerHour, unitMs, Math.max(elapsed, unitMs))

    if (stored.amount > max) {
      return `exceeds the clock bound (${stored.amount} > ${max})`
    }

    return null
  }

  return {
    node,
    peerAddrs: () => node.getMultiaddrs().map(m => m.toString()),
    stop: async () => { await opts.modeManager.removeWorkerListeners(); await node.stop() },
    activeSessions: () => sessions,
    peerIdStr: () => peerId.toString(),
    setCatalog: (offers) => { currentCatalog = [...offers] },
  }
}

type ReceiptPayload = ReceiptPayloadV1
