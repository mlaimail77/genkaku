import { createSidecar, createUserNode, startOpenAiBridge, ModeManager, fetchOffers } from './dist/index.js'
const modeManager = new ModeManager(); modeManager.switch('workerDedicated')
const sidecar = await createSidecar({
  modeManager,
  source: { async stream(req, onDelta) { onDelta('hi'); return { promptTokens: 1, completionTokens: 1, model: req.model } } },
  listen: ['/ip4/0.0.0.0/tcp/0'],
  catalog: [{ proto: 'offers/1', workerName: 'p', model: 'probe:1b', pricePerHour: 0n, creditScore: 50, sessionsServed: 0 }],
})
const workerAddr = sidecar.peerAddrs().find(a => a.startsWith('/ip4/127.')) ?? sidecar.peerAddrs()[0]
console.log('workerAddr', workerAddr)
const userNode = await createUserNode()
console.log('direct fetch', (await fetchOffers(userNode, workerAddr)).length)

const um = new ModeManager(); um.switch('user')
const bridge = await startOpenAiBridge({
  workers: [workerAddr], port: 18098, env: 'base-sepolia', modeManager: um,
  getNode: async () => userNode,
  userKey: () => '0xac767D06C761663C0fDd1858428d4003fD6d31A0',
  settle: false,
  log: (line) => console.log('[bridge]', line),
})
const res = await fetch('http://127.0.0.1:18098/v1/models')
console.log('models', (await res.json()).data?.length)
await bridge.close(); await userNode.stop(); await sidecar.stop(); process.exit(0)
