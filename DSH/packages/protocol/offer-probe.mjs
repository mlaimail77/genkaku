import { createUserNode, fetchOffers, fetchSeedRelays } from './dist/index.js'
const node = await createUserNode()
const worker = `/ip4/127.0.0.1/tcp/4001/p2p/16Uiu2HAmUX8a5ebCwARLBWCRk8cvSDCNj944FDk9amQYZCRHtW6c`
for (const addr of [worker]) {
  try {
    const offers = await fetchOffers(node, addr)
    console.log('direct', addr, offers.length)
  } catch (e) { console.log('direct failed', e.message) }
}
const relays = await fetchSeedRelays(node, 'https://staging.genkaku.app/seed')
console.log('relays', relays)
const circuit = `${relays[0]}/p2p-circuit/p2p/16Uiu2HAmUX8a5ebCwARLBWCRk8cvSDCNj944FDk9amQYZCRHtW6c`
try {
  const offers = await fetchOffers(node, circuit)
  console.log('relay', circuit.slice(0,60), offers.length)
} catch (e) { console.log('relay failed', e.message) }
await node.stop()
