import assert from 'node:assert/strict'
import { test } from 'node:test'

import { chainWrite, chainWriteFor, resetChainQueues } from './chainQueue.ts'

const A = '0x00000000000000000000000000000000000000aa'
const B = '0x00000000000000000000000000000000000000bb'

test('writes from one account never overlap and keep their order', async () => {
  resetChainQueues()
  let active = 0
  let peak = 0
  const order: number[] = []

  const write = (n: number) => chainWrite(A, async () => {
    active++
    peak = Math.max(peak, active)
    await new Promise(resolve => setTimeout(resolve, n === 0 ? 15 : 5))
    order.push(n)
    active--
    return n
  })

  const results = await Promise.all([write(0), write(1), write(2)])

  assert.deepEqual(results, [0, 1, 2])
  assert.deepEqual(order, [0, 1, 2])
  assert.equal(peak, 1, 'a second write started before the first finished')
})

test('different accounts are independent', async () => {
  resetChainQueues()
  let active = 0
  let peak = 0

  const write = (account: string) => chainWrite(account, async () => {
    active++
    peak = Math.max(peak, active)
    await new Promise(resolve => setTimeout(resolve, 10))
    active--
  })

  await Promise.all([write(A), write(B)])

  assert.equal(peak, 2, 'one account blocked another')
})

test('an address is one queue regardless of case', async () => {
  resetChainQueues()
  let active = 0
  let peak = 0

  const write = (account: string) => chainWrite(account, async () => {
    active++
    peak = Math.max(peak, active)
    await new Promise(resolve => setTimeout(resolve, 10))
    active--
  })

  await Promise.all([write(A), write(A.toUpperCase().replace('0X', '0x'))])

  assert.equal(peak, 1)
})

test('a nonce race is retried once, inside the same queue slot', async () => {
  resetChainQueues()
  let calls = 0
  const retries: string[] = []

  const result = await chainWrite(A, async () => {
    calls++
    if (calls === 1) throw new Error('nonce too low: next nonce 7, tx nonce 6')
    return 'ok'
  }, { retryDelayMs: 0, onRetry: message => retries.push(message) })

  assert.equal(result, 'ok')
  assert.equal(calls, 2)
  assert.equal(retries.length, 1)
  assert.match(retries[0]!, /nonce too low/)
})

test('a second failure is surfaced, not retried forever', async () => {
  resetChainQueues()
  let calls = 0

  await assert.rejects(
    chainWrite(A, async () => {
      calls++
      throw new Error('replacement transaction underpriced')
    }, { retryDelayMs: 0 }),
    /underpriced/,
  )

  assert.equal(calls, 2)
})

test('an ordinary failure is not retried', async () => {
  resetChainQueues()
  let calls = 0

  await assert.rejects(
    chainWrite(A, async () => {
      calls++
      throw new Error('execution reverted: InsufficientBalance')
    }, { retryDelayMs: 0 }),
    /InsufficientBalance/,
  )

  assert.equal(calls, 1)
})

test('a failed write does not poison the queue', async () => {
  resetChainQueues()

  await assert.rejects(chainWrite(A, async () => { throw new Error('boom') }), /boom/)
  assert.equal(await chainWrite(A, async () => 'after'), 'after')
})

test('chainWriteFor keys on the wallet address', async () => {
  resetChainQueues()
  let active = 0
  let peak = 0
  const wallet = { account: { address: A } }

  const write = () => chainWriteFor(wallet, async () => {
    active++
    peak = Math.max(peak, active)
    await new Promise(resolve => setTimeout(resolve, 10))
    active--
  })

  await Promise.all([write(), write()])

  assert.equal(peak, 1)
})
