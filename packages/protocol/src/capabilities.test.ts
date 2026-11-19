import assert from 'node:assert/strict'
import { test } from 'node:test'

import { parseParameterSize, profileOf, tierOf } from './capabilities.ts'

test('parseParameterSize reads the forms Ollama reports', () => {
  assert.equal(parseParameterSize('1.2B'), 1.2)
  assert.equal(parseParameterSize('9b'), 9)
  assert.equal(parseParameterSize('70B'), 70)
  assert.equal(parseParameterSize('135M'), 0.135)
  assert.equal(parseParameterSize(undefined), undefined)
  assert.equal(parseParameterSize('unknown'), undefined)
})

test('a model without the tools capability is chat-only, whatever its size', () => {
  assert.equal(tierOf(['completion'], 70), 'chat')
  assert.equal(tierOf([], 70), 'chat')
  assert.equal(tierOf(['completion', 'vision'], 70), 'chat')
})

test('tools + size decides agent or light', () => {
  assert.equal(tierOf(['completion', 'tools'], 9), 'agent')
  assert.equal(tierOf(['completion', 'tools'], 27), 'agent')
  assert.equal(tierOf(['completion', 'tools'], 3.8), 'light')
  assert.equal(tierOf(['completion', 'tools'], 1.2), 'chat')
})

test('tools with an unknown size is light, never agent', () => {
  assert.equal(tierOf(['completion', 'tools'], undefined), 'light')
})

test('profileOf folds both endpoints into one row', () => {
  const profile = profileOf('qwen3.8:27b', { capabilities: ['completion', 'tools', 'thinking'], parameterSize: '27B' })
  assert.deepEqual(profile, {
    model: 'qwen3.8:27b',
    capabilities: ['completion', 'tools', 'thinking'],
    parameterSize: '27B',
    parametersB: 27,
    tier: 'agent',
  })
})

test('a failed probe degrades to chat instead of claiming agent support', () => {
  assert.equal(profileOf('mystery', {}).tier, 'chat')
})
