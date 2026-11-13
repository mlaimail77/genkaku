import { createUserNode, startOpenAiBridge, ModeManager } from './dist/index.js'
const node = await createUserNode()
const modeManager = new ModeManager(); modeManager.switch('user')
const workers = process.env.WORKERS.split(',')
const bridge = await startOpenAiBridge({
  workers, port: 18099, env: 'base-sepolia', modeManager,
  getNode: async () => node,
  userKey: () => '0xac767D06C761663C0fDd1858428d4003fD6d31A0',
  settle: false,
  log: (line) => console.log('[bridge]', line),
})
const res = await fetch('http://127.0.0.1:18099/v1/models')
const body = await res.json()
console.log('models', body.data?.length)
const st = await fetch('http://127.0.0.1:18099/genkaku/status')
const s = await st.json()
console.log('offers', s.offers?.length, 'transports', s.transports)
await bridge.close(); await node.stop(); process.exit(0)
