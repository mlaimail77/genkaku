// GENKAKU: libp2p nodes (P4.2 sidecar / P4.3 client / P4.4 settle co-sign).
// Workers serve the /genkaku/* protocols (sidecar); users get a bare dial node.
// The mode manager gates handler installs — user mode never constructs the
// worker side, and worker modes never open remote sessions (D-block defense
// in depth, P4-ADAPTATION §2).

import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { circuitRelayTransport } from '@libp2p/circuit-relay-v2'
import { generateKeyPair, privateKeyFromRaw } from '@libp2p/crypto/keys'
import { identify } from '@libp2p/identify'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { tcp } from '@libp2p/tcp'
import { multiaddr } from '@multiformats/multiaddr'
import { createLibp2p, type Libp2p } from 'libp2p'
import { type Hex, toBytes } from 'viem'

import { settleDigest, walletAddress } from './chain.ts'
import { signHello } from './hello.ts'
import type { Paywall } from './paywall.ts'
import type { LocalChatSource, LocalCompletionSource } from './llmBridge.ts'
import { FrameReader, lpEncode, WriteQueue } from './lp.ts'
import type { ModeManager } from './modeManager.ts'
import { CHAIN_ID, CONTRACTS } from './netconfig.ts'
import type { NetEnvironment } from './netconfig.ts'
import { cumulativeBilled, type Offer, toWire } from './offer.ts'
import {
  digestForHex,
  inputHashOf,
  outputHashOf,
  ReceiptLedger,
  type ReceiptPayloadV1,
  recoverSigner,
  sessionIdHex,
  signDigest,
  ZERO_HASH,
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
  '/genkaku/settle/0',
  '/genkaku/offers/0',
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
  paywall?: Paywall
  /** P4.4: with a worker wallet, priced receipts MUST carry a valid signature,
   *  offers self-report the wallet, and settle co-signing becomes available. */
  workerKey?: Hex
  /** Public relay multiaddrs (the seed VM). Dialed at boot so the circuit
   *  transport can reserve a slot, which makes a NAT'd worker dialable. */
  relayHints?: string[]
  /** Diagnostic sink (IPv6 fallback, listener warnings). */
  log?: (line: string) => void
}

/** One stored (latest) receipt per jobId — the evidence the settle co-sign
 *  defends against (spend == max cumulative receipt the client piped). */export type StoredReceipt = {
  seq: number
  amount: bigint
  sig: string
  /** the escrow/stream binding used to build the digest (jobId, escrowId) */
  escrowId: string
  /** commit-challenge commitments carried by the receipt (P4.9f) */
  inputHash: `0x${string}`
  outputHash: `0x${string}`
}

// libp2p 1.9.4's own default nodeInfo omits the REQUIRED `userAgent` field,
// which makes @libp2p/identify crash on start (getAgentVersion →
// nodeInfo.userAgent → undefined → uint8ArrayFromString throws). Provide a
// full NodeInfo; also advertised in identify metadata.
const NODE_INFO = { name: 'genkaku', version: '0.1.0', userAgent: 'genkaku/0.1.0 (desktop)' } as const

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

/** Bounded window AFTER the token EOF in which the client's through-end
 *  receipt may still land before we stop watching. Sidecar-scope: the receipt
 *  protocol stream stays alive independently of the released token stream. */
const RECEIPT_DRAIN_MS = 250

/** Slack for worker/client clock differences in the receipt clock bound. */
const CLOCK_SLACK_MS = 2_000

/** A bare libp2p node for the USER side (no genkaku handlers — dials only). */
export async function createUserNode(listen: string[] = []): Promise<Libp2p> {
  const privateKey = await generateKeyPair('secp256k1')

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

  const ledger = new ReceiptLedger()
  const inbox = new Map<string, StoredReceipt>()
  /** jobId → escrowId as declared in the open envelope (receipt/bind side). */
  const escrowByJob = new Map<string, string>()
  /** jobId → wall time the open envelope arrived (the clock-bound anchor). */
  const openedAtByJob = new Map<string, number>()
  /** jobId → the escrow payer proven by the paywall (receipt signer must match). */
  const payerByJob = new Map<string, string>()
  /** jobId → commitment to the request the open envelope asked for. */
  const inputHashByJob = new Map<string, `0x${string}`>()
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
      chainId: CHAIN_ID[ENV],
      escrow: (CONTRACTS[ENV].escrow || ZERO_ADDRESS) as Hex,
      sessionId: sessionIdHex(jobId, held.escrowId),
      seq: held.seq,
      amount: held.amount,
      inputHash: held.inputHash,
      outputHash: held.outputHash,
    }
  }

  // Identity: secp256k1 peer key — libp2p supports it natively and it is the
  // SAME curve as the EVM wallet, so the P4.4 registry binding proves one key
  // owns both sides of (PeerId, wallet) address. With a worker wallet, derive
  // the PeerId from that exact key; otherwise keep a random identity.
  const privateKey = opts.workerKey != null
    ? privateKeyFromRaw(toBytes(opts.workerKey))
    : await generateKeyPair('secp256k1')
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

      let payer: string | null = null

      if (opts.paywall != null) {
        const verdict = await opts.paywall({
          jobId: env.jobId,
          escrowId: env.escrowId || '0',
          clientPeer: env.clientPeer ?? '',
          model: env.model,
        }).catch(() => ({ ok: false as const, code: 'paywall-error', reason: 'paywall check failed' }))

        if (!verdict.ok) {
          opts.sessionEvents?.({
            type: 'session-error',
            message: `refused ${env.jobId}: ${verdict.code} (${verdict.reason})`,
          })

          try {
            await stream.sink([lpEncode({
              proto: 'err/0',
              jobId: env.jobId,
              code: verdict.code,
              message: verdict.reason,
            })])
          } catch {
            // the client may already have gone; the close below still ends it
          }

          await stream.close().catch(() => {})

          return
        }

        payer = verdict.payer
      }

      if (payer != null) payerByJob.set(env.jobId, payer)
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
              inputHash: (f.inputHash ?? ZERO_HASH) as `0x${string}`,
              outputHash: (f.outputHash ?? ZERO_HASH) as `0x${string}`,
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

            // P4.4: priced receipts are SIGNATURE-BOUND evidence — a forged
            // or anonymous offer never reaches the escrow at settle.
            if (opts.workerKey != null && stored.escrowId !== '0') {
              const bad = await rejectUnsigned(stored, f.jobId)

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

  // P4.4 settle co-sign: one request frame, one reply frame. The digest is
  // rebuilt WORKER-SIDE from the held receipt (the caller's receiptHash is
  // only compared against it), and the spend must equal the held max
  // cumulative receipt — anti-inflation by construction (P1 §8). JobEscrow.
  // settle() then recovers this EIP-191 sig against the session's worker.
  await handle('/genkaku/settle/0', ({ stream }) => {
    void (async () => {
      const reader = new FrameReader()
      let req: { proto?: string; jobId?: string; escrowId?: string; receiptHash?: string; spend?: string } | undefined

      for await (const chunk of stream.source) {
        reader.push(chunk)
        const f = reader.next() as typeof req | undefined

        if (f != null) {
          req = f

          break
        }
      }

      const reply = (ok: boolean, sig?: string, reason?: string) =>
        stream.sink([lpEncode({ proto: 'settle/0', ok, sig, reason })]).then(() => stream.close())

      if (req?.proto !== 'settle/0') {
        await reply(false, undefined, 'bad frame')

        return
      }

      if (opts.workerKey == null) {
        await reply(false, undefined, 'worker has no wallet')

        return
      }

      const jobId = String(req.jobId ?? '')
      const escrowId = escrowByJob.get(jobId) ?? '0'
      const held = inbox.get(jobId)

      if (escrowId === '0' || held == null) {
        await reply(false, undefined, 'no priced session bound for this jobId')

        return
      }

      // Defense in depth: the caller's escrowId must agree with the session's
      // binding. A mismatch can never settle on chain anyway (the worker's
      // digest carries ONLY the envelope escrowId; JobEscrow.settle recovers
      // against the session id), but failing here keeps wire errors local.
      if (req.escrowId != null && String(req.escrowId) !== escrowId) {
        await reply(false, undefined, 'escrowId does not match the session envelope')

        return
      }

      if (req.spend == null) {
        await reply(false, undefined, 'spend is required')

        return
      }

      const spend = BigInt(req.spend)

      if (spend !== held.amount) {
        await reply(false, undefined, 'spend does not match the held max cumulative receipt')

        return
      }

      const receipt = receiptOf(jobId, held)
      const receiptHash = receipt == null ? null : digestForHex(receipt)

      if (receiptHash == null || String(req.receiptHash ?? '').toLowerCase() !== receiptHash.toLowerCase()) {
        await reply(false, undefined, 'receiptHash does not match the held receipt')

        return
      }

      const sig = await signDigest(opts.workerKey, settleDigest(BigInt(escrowId), receiptHash, spend))

      await reply(true, sig)
    })()
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

  // The offer board: a user dials this on every discovered peer and sorts
  // locally (P4.3). bigint prices travel as decimal strings (OfferWire); the
  // wallet here is a CLAIM — the client only trusts it after /genkaku/hello/0
  // proves the key (P4.9e) or the registry binds it (P4.5).
  await handle('/genkaku/offers/0', ({ stream }) => {
    const wallet = opts.workerKey != null ? walletAddress(opts.workerKey) : undefined
    const board = currentCatalog.map(o => toWire(wallet == null ? o : { ...o, workerWallet: wallet }))

    void stream.sink([lpEncode({ proto: 'offers/0', board })]).then(() => stream.close())
  })

  // token is served in-session (open handler); policy is reserved v0.
  await handle('/genkaku/token/0', ({ stream }) => { void stream.close() })
  await handle('/genkaku/policy/0', ({ stream }) => {
    // P4.5: the wire advertises the SAME digest the worker pins on
    // WorkerRegistry, so a user can compare registry.policyHash against it.
    void stream.sink([lpEncode({ proto: 'policy/0', policyHash: policyHashOf(POLICY_VERSION), policyVersion: POLICY_VERSION })]).then(() => stream.close())
  })

  // ── helpers (close over netconfig + maps, never over the wire) ──────────

  /** Starts true when a priced receipt cannot be signature-verified. P4.9e:
   *  the signer must also equal the escrow's payer, so evidence and money name
   *  the same party (a third party can no longer sign for someone's escrow). */
  async function rejectUnsigned(stored: StoredReceipt, jobId: string): Promise<boolean> {
    if (stored.sig === '' || !stored.sig.startsWith('0x')) {return true}

    const receipt = receiptOf(jobId, stored)

    if (receipt == null) {return true}

    const signer = await recoverSigner(toBytes(digestForHex(receipt)), stored.sig)

    if (signer == null) {return true}

    const payer = payerByJob.get(jobId)

    if (payer != null && payer !== ZERO_ADDRESS && signer.toLowerCase() !== payer.toLowerCase()) {
      return true
    }

    return false
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

// data-plane net env the sidecar binds receipts to (single deployment — the
// base mainnet bindings stay empty until P6).
const ENV: NetEnvironment = 'base-sepolia'
type ReceiptPayload = ReceiptPayloadV1
