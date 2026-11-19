// Regression: a worker must answer the protocols a client actually dials.
//
// 0.3.0-rc.2 shipped a sidecar that registered only open/0 and receipt/0, so
// every client's fetchOffers got `protocol selection failed` and the model
// board stayed empty even though the worker was online and announcing to the
// seed. These tests build both halves over real libp2p (no chain) and fail if
// any of the discovery protocols disappears again.

import assert from 'node:assert/strict'
import { test } from 'node:test'

import { Keypair } from '@solana/web3.js'

import type { GenkakuWallet } from './chain.ts'
import { fetchOffers, helloWorker, pairWithWorker } from './dial.ts'
import { ModeManager } from './modeManager.ts'
import type { Offer } from './offer.ts'
import { createSidecar, createUserNode } from './p2pNode.ts'
import {
  accessFor,
  addPairedUser,
  consumePairing,
  createPendingPairing,
  emptyPrivacy,
  type PrivacyState,
} from './privacy.ts'
import { walletOfPeerId } from './registry.ts'

const catalog: Offer[] = [{
  proto: 'offers/1',
  workerName: 'protocol-test',
  model: 'qwen3:8b',
  pricePerHour: 0n,
  creditScore: 0,
  sessionsServed: 0,
  capabilities: ['completion', 'tools'],
  parameterSize: '8B',
  tier: 'light',
}]

const source = {
  async stream(_req: unknown, onDelta: (text: string) => void) {
    onDelta('unused')

    return { promptTokens: 0, completionTokens: 0, model: 'qwen3:8b' }
  },
}

const DISCOVERY_PROTOCOLS = [
  '/genkaku/offers/0',
  '/genkaku/hello/0',
  '/genkaku/pair/0',
  '/genkaku/policy/0',
]

test('a worker registers every protocol the client dials', async () => {
  const sidecar = await createSidecar({
    modeManager: new ModeManager(),
    source: source as never,
    listen: ['/ip4/127.0.0.1/tcp/0'],
    catalog,
    workerKey: Keypair.generate() as unknown as GenkakuWallet,
  })

  try {
    const registered = sidecar.node.getProtocols()

    for (const protocol of DISCOVERY_PROTOCOLS) {
      assert.ok(registered.includes(protocol), `${protocol} is not registered (got ${registered.join(', ')})`)
    }
  } finally {
    await sidecar.stop().catch(() => {})
  }
})

test('a client sees the board, proves the wallet and pairs a private worker', async () => {
  const userKey = Keypair.generate() as unknown as GenkakuWallet
  const workerKey = Keypair.generate() as unknown as GenkakuWallet

  let privacy: PrivacyState = emptyPrivacy()
  const save = (next: PrivacyState): void => { privacy = next }

  const sidecar = await createSidecar({
    modeManager: new ModeManager(),
    source: source as never,
    listen: ['/ip4/127.0.0.1/tcp/0'],
    catalog,
    workerKey,
    access: peerId => accessFor(privacy)(peerId),
    pair: async ({ peerId, secret }) => {
      const wallet = walletOfPeerId(peerId)

      if (wallet == null) return { ok: false, code: 'unsupported-key', reason: 'not an ed25519 peer' }

      const result = consumePairing(privacy, secret, wallet)

      if (!result.result.ok) return { ok: false, code: result.result.code, reason: result.result.reason }

      save(addPairedUser(result.state, { wallet }))

      return { ok: true, wallet }
    },
  })

  const workerAddr = sidecar.peerAddrs().find(addr => addr.startsWith('/ip4/127.0.0.1')) ?? ''
  assert.notEqual(workerAddr, '', 'sidecar has no loopback address')

  const userNode = await createUserNode([], userKey)

  try {
    // Public: anyone sees the row, and hello proves the wallet it claims.
    const publicBoard = await fetchOffers(userNode, workerAddr)
    assert.equal(publicBoard.length, 1)
    assert.equal(publicBoard[0]?.model, 'qwen3:8b')
    assert.equal(publicBoard[0]?.walletVerified, true)

    const proof = await helloWorker(userNode, workerAddr)
    assert.equal(proof.wallet, workerKey.publicKey.toBase58())

    // Private: the same dial returns no rows until the wallet is paired.
    save({ ...privacy, visibility: 'private' })
    assert.equal((await fetchOffers(userNode, workerAddr)).length, 0)

    const created = createPendingPairing(privacy)
    save(created.state)

    const paired = await pairWithWorker(userNode, workerAddr, created.secret, 'tester')
    assert.equal(paired.ok, true)
    assert.equal(paired.ok && paired.wallet, userKey.publicKey.toBase58())
    assert.equal((await fetchOffers(userNode, workerAddr)).length, 1)
  } finally {
    await Promise.resolve(userNode.stop()).catch(() => {})
    await Promise.resolve(sidecar.stop()).catch(() => {})
  }
})
