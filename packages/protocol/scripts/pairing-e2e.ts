// Private-worker pairing over real libp2p, no chain required.
//
//   npx tsx packages/protocol/scripts/pairing-e2e.ts
//
// The chain never enters this path: authorisation is "the dialer's wallet is in
// the paired list", and that wallet is arithmetic from the PeerId the transport
// authenticated. This script builds both halves and checks that
//
//   * an unpaired user gets an EMPTY board (the private model list is hidden),
//   * a one-time code pairs the user's wallet,
//   * the SAME user then sees the board, while a second wallet still does not,
//   * replaying the spent code from the other wallet is refused.

import { Keypair } from '@solana/web3.js'

import type { GenkakuWallet } from '../src/chain.ts'
import { fetchOffers, pairWithWorker } from '../src/dial.ts'
import { ModeManager } from '../src/modeManager.ts'
import type { Offer } from '../src/offer.ts'
import { createSidecar, createUserNode } from '../src/p2pNode.ts'
import {
  accessFor,
  addPairedUser,
  consumePairing,
  createPendingPairing,
  emptyPrivacy,
  type PrivacyState,
} from '../src/privacy.ts'
import { walletOfPeerId } from '../src/registry.ts'

const catalog: Offer[] = [{
  proto: 'offers/1',
  workerName: 'pairing-test',
  model: 'tiny:1b',
  pricePerHour: 0n,
  creditScore: 0,
  sessionsServed: 0,
  capabilities: ['completion'],
  parameterSize: '1B',
  tier: 'agent',
}]

const source = {
  async stream(_req: unknown, onDelta: (text: string) => void) {
    onDelta('unused')
    return { promptTokens: 0, completionTokens: 0, model: 'tiny:1b' }
  },
}

async function main(): Promise<void> {
  // The user's wallet IS its libp2p identity: the same key is used below.
  const userKey: GenkakuWallet = Keypair.generate()
  const strangerKey: GenkakuWallet = Keypair.generate()

  let privacy: PrivacyState = emptyPrivacy()
  const save = (next: PrivacyState): void => { privacy = next }

  const sidecar = await createSidecar({
    modeManager: new ModeManager(),
    source: source as never,
    listen: ['/ip4/127.0.0.1/tcp/0'],
    catalog,
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

  if (workerAddr === '') throw new Error('sidecar has no loopback address')

  const userNode = await createUserNode([], userKey)
  const strangerNode = await createUserNode([], strangerKey)

  const check = (label: string, actual: unknown, expected: unknown): void => {
    if (String(actual) !== String(expected)) {
      throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`)
    }
    console.log(`  ok  ${label}`)
  }

  try {
    // 1. Public: anyone sees the board.
    check('public board size', (await fetchOffers(userNode, workerAddr)).length, 1)

    // 2. Private: the same dial returns an empty board.
    save({ ...privacy, visibility: 'private' })
    check('unpaired board is empty', (await fetchOffers(userNode, workerAddr)).length, 0)

    // 3. A code minted by this worker pairs the USER's wallet.
    const created = createPendingPairing(privacy)
    save(created.state)

    const paired = await pairWithWorker(userNode, workerAddr, created.secret, 'tester')

    if (!paired.ok) throw new Error(`pairing failed: ${paired.reason}`)
    check('paired wallet', paired.wallet, userKey.publicKey.toBase58())

    // Retrying the SAME code from the SAME wallet is idempotent, not an error.
    check('retry from the same wallet', (await pairWithWorker(userNode, workerAddr, created.secret)).ok, true)

    // 4. The paired user now sees the board.
    check('paired board size', (await fetchOffers(userNode, workerAddr)).length, 1)

    // 5. Another wallet is refused even with the spent code.
    check('stranger refused', (await pairWithWorker(strangerNode, workerAddr, created.secret)).ok, false)
    check('stranger board is empty', (await fetchOffers(strangerNode, workerAddr)).length, 0)

    console.log('\nall pairing checks passed')
  } finally {
    await userNode.stop().catch(() => {})
    await strangerNode.stop().catch(() => {})
    await sidecar.stop().catch(() => {})
  }
}

void main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
