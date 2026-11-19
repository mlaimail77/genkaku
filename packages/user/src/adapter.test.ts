import assert from 'node:assert/strict'
import { test } from 'node:test'

import { finishOf, GenkakuAdapter, toOpenAiMessages } from './adapter.ts'

test('developer messages are dropped and tool results keep their call id', () => {
  const options = {
    provider: 'genkaku',
    model: 'm',
    messages: [
      { role: 'developer', content: [] },
      { role: 'user', content: [{ type: 'text', text: 'hi' }] },
      { role: 'assistant', content: [{ type: 'tool-call', id: 'c1', name: 'read', arguments: '{}' }] },
      { role: 'tool', toolCallId: 'c1', content: [{ type: 'text', text: 'ok' }] },
    ],
  } as never
  const out = toOpenAiMessages(options)
  assert.equal(out.length, 3)
  assert.deepEqual(out[1], {
    role: 'assistant',
    content: '',
    tool_calls: [{ id: 'c1', type: 'function', function: { name: 'read', arguments: '{}' } }],
  })
  assert.deepEqual(out[2], { role: 'tool', tool_call_id: 'c1', content: 'ok' })
})

test('a tool call finishes as tool-calls, not stop', () => {
  assert.deepEqual(finishOf(null, true), { kind: 'tool-calls' })
  assert.deepEqual(finishOf('length', false), { kind: 'max-tokens' })
  assert.deepEqual(finishOf('stop', false), { kind: 'stop' })
})
