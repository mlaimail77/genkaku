import assert from 'node:assert/strict'
import { test } from 'node:test'

import { finishOf, GenkakuAdapter, lastUserText, toOpenAiMessages, withSystemAddendum } from './adapter.ts'

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

test('the team policy joins the loop-built system message instead of adding one', () => {
  const options = {
    provider: 'genkaku',
    model: 'team',
    messages: [
      { role: 'system', id: 's1', source: { kind: 'system-prompt' }, content: [{ type: 'text', text: 'base' }] },
      { role: 'user', content: [{ type: 'text', text: 'hello' }] },
    ],
  } as never

  const prompt = withSystemAddendum(options, 'team policy')
  assert.equal(prompt.messages.length, 2)
  assert.equal(prompt.system, undefined)
  const head = prompt.messages[0] as unknown as { id: string; content: Array<{ text: string }> }
  assert.equal(head.id, 's1')
  assert.equal(head.content[0]!.text, 'base\n\nteam policy')
  // One system message on the wire, not two.
  const wire = toOpenAiMessages({ ...(options as object), ...prompt } as never)
  assert.equal(wire.filter(m => m.role === 'system').length, 1)
})

test('a one-shot with an explicit system prompt keeps it and appends there', () => {
  const options = {
    provider: 'genkaku',
    model: 'team',
    system: 'summarise',
    messages: [{ role: 'user', content: [{ type: 'text', text: 'text' }] }],
  } as never

  const prompt = withSystemAddendum(options, 'team policy')
  assert.equal(prompt.system, 'summarise\n\nteam policy')
  assert.equal(prompt.messages.length, 1)
})

test('a bare one-shot gains one system message and nothing else', () => {
  const options = {
    provider: 'genkaku',
    model: 'team',
    messages: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }],
  } as never

  const prompt = withSystemAddendum(options, 'team policy')
  assert.equal(prompt.messages.length, 2)
  assert.equal((prompt.messages[0] as { role: string }).role, 'system')
})

test('the router reads the last user turn, not a tool result', () => {
  const messages = [
    { role: 'user', content: [{ type: 'text', text: 'first' }] },
    { role: 'assistant', content: [{ type: 'text', text: 'answer' }] },
    { role: 'user', content: [{ type: 'text', text: 'second' }] },
    { role: 'tool', toolCallId: 'c1', content: [{ type: 'text', text: 'result' }] },
  ] as never
  assert.equal(lastUserText(messages), 'second')
  assert.equal(lastUserText([{ role: 'assistant', content: [] }] as never), '')
})
