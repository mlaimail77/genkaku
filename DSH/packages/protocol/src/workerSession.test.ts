import assert from 'node:assert/strict'
import { test } from 'node:test'

import { createWorkerSession, type OpenEnvelopeV1 } from './workerSession.ts'

const envelope: OpenEnvelopeV1 = {
  proto: 'open/1',
  jobId: 'j1',
  escrowId: '0',
  model: 'm',
  prompt: 'hi',
  clientPeer: 'peer',
  messages: [{ role: 'user', content: 'hi' }],
  tools: [{ name: 'read', description: 'read a file', parameters: {} }],
}

test('an open/1 session serves chat and relays tool calls', async () => {
  const text: string[] = []
  const calls: Array<{ index: number; id: string; name: string; argumentsDelta: string }> = []

  const session = createWorkerSession(envelope, {
    modeManager: { current: () => ({ sharingActive: true }) } as never,
    source: { stream: async () => ({ promptTokens: 0, completionTokens: 0, model: 'm' }) } as never,
    chatSource: {
      async streamChat(_req, onEvent) {
        onEvent({ type: 'text', text: 'let me look' })
        onEvent({ type: 'tool-call', index: 0, name: 'read', argumentsDelta: '{"path":"a"}' })
        return { completionTokens: 3, model: 'm' }
      },
    },
    ledger: { offer: () => ({ accepted: true }) } as never,
    emit: () => {},
    onDelta: delta => text.push(delta),
    onToolCall: call => calls.push(call),
    latestReceipt: () => null,
  })

  await session.run()

  assert.deepEqual(text, ['let me look'])
  assert.deepEqual(calls, [{ index: 0, id: 'call_0', name: 'read', argumentsDelta: '{"path":"a"}' }])
})

test('an open/1 session without a chat source fails loudly instead of answering empty', async () => {
  const session = createWorkerSession(envelope, {
    modeManager: { current: () => ({ sharingActive: true }) } as never,
    source: { stream: async () => ({ promptTokens: 0, completionTokens: 0, model: 'm' }) } as never,
    ledger: { offer: () => ({ accepted: true }) } as never,
    emit: () => {},
    onDelta: () => {},
    latestReceipt: () => null,
  })
  await session.run()
  assert.equal(session.tokens(), 0)
})
