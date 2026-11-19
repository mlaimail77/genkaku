import assert from 'node:assert/strict'
import { test } from 'node:test'

import { formatRpcFailures, rpcUrls } from './rpc.ts'

test('the explicit override leads the endpoint list and is never dropped', () => {
  const before = process.env.GENKAKU_RPC_URL
  process.env.GENKAKU_RPC_URL = 'https://example.invalid/helius'

  try {
    const urls = rpcUrls('solana-devnet')

    assert.equal(urls[0], 'https://example.invalid/helius')
    assert.ok(urls.includes('https://api.devnet.solana.com'), 'the public endpoint must stay as a fallback')
  } finally {
    if (before == null) delete process.env.GENKAKU_RPC_URL
    else process.env.GENKAKU_RPC_URL = before
  }
})

test('without an override the public endpoint is used', () => {
  const before = process.env.GENKAKU_RPC_URL
  delete process.env.GENKAKU_RPC_URL

  try {
    assert.ok(rpcUrls('solana-mainnet').includes('https://api.mainnet-beta.solana.com'))
  } finally {
    if (before != null) process.env.GENKAKU_RPC_URL = before
  }
})

test('every endpoint failing reports all of them, not just the last', () => {
  const message = formatRpcFailures('getSlot', [
    { url: 'https://a.invalid', message: 'HTTP 429' },
    { url: 'https://b.invalid', message: 'HTTP 503' },
  ])

  assert.match(message, /no RPC endpoint answered getSlot \(2 tried\)/)
  assert.match(message, /a\.invalid -> HTTP 429/)
  assert.match(message, /b\.invalid -> HTTP 503/)
})

test('with no endpoints configured the message names the method', () => {
  assert.equal(formatRpcFailures('getSlot', []), 'genkaku: no RPC endpoint configured for getSlot')
})
