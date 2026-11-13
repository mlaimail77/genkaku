import assert from 'node:assert/strict'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { after, test } from 'node:test'

import { createPublicClient } from 'viem'
import { baseSepolia } from 'viem/chains'

import { formatRpcFailures, rpcTransportFor } from './rpc.ts'

/** A JSON-RPC endpoint that answers `eth_blockNumber` and rejects everything
 *  else — enough to look like a node to viem's client. */
async function endpoint(status: number, blockNumber?: string): Promise<{ url: string; server: Server }> {
  const server = createServer((req, res) => {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      if (status !== 200) {
        res.writeHead(status, { 'content-type': 'text/plain' })
        res.end(`endpoint says ${status}`)
        return
      }
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ jsonrpc: '2.0', id: 1, result: blockNumber ?? '0x0' }))
    })
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo
  return { url: `http://127.0.0.1:${port}`, server }
}

const started: Server[] = []
after(() => { for (const server of started) server.close() })

async function start(status: number, blockNumber?: string): Promise<string> {
  const { url, server } = await endpoint(status, blockNumber)
  started.push(server)
  return url
}

function client(urls: string[]) {
  return createPublicClient({
    chain: baseSepolia,
    transport: rpcTransportFor(urls),
  })
}

test('a dead first endpoint rolls to the next one', async () => {
  const dead = await start(503)
  const live = await start(200, '0x2a')

  assert.equal(await client([dead, live]).getBlockNumber(), 42n)
})

test('every endpoint failing reports all of them, not just the last', async () => {
  const a = await start(429)
  const b = await start(503)

  await assert.rejects(client([a, b]).getBlockNumber(), (error: Error) => {
    assert.match(error.message, /no RPC endpoint answered eth_blockNumber \(2 tried\)/)
    assert.ok(error.message.includes(a), 'missing first endpoint')
    assert.ok(error.message.includes(b), 'missing second endpoint')
    assert.match(error.message, /429/)
    assert.match(error.message, /503/)
    return true
  })
})

test('an execution revert is not retried on another endpoint', async () => {
  const { createServer: create } = await import('node:http')
  const hits: string[] = []
  const revert = create((req, res) => {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      hits.push('revert')
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        error: { code: 3, message: 'execution reverted: SessionNotOpen', data: '0x' },
      }))
    })
  })
  await new Promise<void>(resolve => revert.listen(0, '127.0.0.1', resolve))
  started.push(revert)
  const revertUrl = `http://127.0.0.1:${(revert.address() as AddressInfo).port}`

  const backup = await start(200, '0x2a')

  await assert.rejects(
    client([revertUrl, backup]).readContract({
      address: '0x0000000000000000000000000000000000000001',
      abi: [{ name: 'x', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] }],
      functionName: 'x',
    }),
    /SessionNotOpen/,
  )

  assert.deepEqual(hits, ['revert'], 'a revert was asked of a second endpoint')
})

test('formatRpcFailures flattens and names every endpoint', () => {
  const message = formatRpcFailures('eth_call', [
    { url: 'https://a.example', message: 'HTTP request failed. Status: 429' },
    { url: 'https://b.example', message: 'fetch failed' },
  ])

  assert.match(message, /eth_call \(2 tried\)/)
  assert.match(message, /https:\/\/a\.example -> HTTP request failed/)
  assert.match(message, /https:\/\/b\.example -> fetch failed/)
  assert.equal(formatRpcFailures('eth_call', []), 'genkaku: no RPC endpoint configured for eth_call')
})
