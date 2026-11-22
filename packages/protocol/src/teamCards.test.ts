import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import {
  MAX_LIBRARY_CARDS,
  SHARE_PREFIX,
  addCards,
  cardFromAgent,
  decodeShare,
  encodeShare,
  previewAgentId,
  readAnyCardDocument,
  readCardLibrary,
  removeCard,
  resolveCard,
  resolveHint,
  sanitizeCard,
  sanitizePack,
  shareUrl,
  type AgentCard,
} from './teamCards.ts'
import type { TeamAgent, TeamCatalog } from './team.ts'

const catalog: TeamCatalog = {
  providers: [
    { id: 'deepseek', name: 'DeepSeek', models: [{ id: 'chat', name: 'Chat' }, { id: 'reason', name: 'Reason' }] },
    { id: 'openai', name: 'OpenAI', models: [{ id: 'gpt', name: 'GPT' }] },
  ],
  local: [
    { id: 'gk.w1.chat', name: 'w1 · chat', tier: 'chat', pricePerHour: '1000', latencyMs: 900, parameterSize: '3B' },
    { id: 'gk.w2.agent', name: 'w2 · agent', tier: 'agent', pricePerHour: '5000', latencyMs: 400, parameterSize: '7B' },
  ],
}

function agent(overrides: Partial<TeamAgent> = {}): TeamAgent {
  return {
    id: 'translator',
    name: 'Translator',
    whenToUse: 'translate a passage',
    whenNotToUse: '',
    examples: ['translate this'],
    route: { provider: 'genkaku', model: '' },
    systemPrompt: 'you translate',
    maxTokens: 2_000,
    ...overrides,
  }
}

function card(overrides: Partial<AgentCard> = {}): AgentCard {
  return {
    genkaku: 'agent-card/1',
    id: 'translator',
    name: 'Translator',
    lang: 'en',
    tags: [],
    agent: {
      whenToUse: 'translate a passage',
      whenNotToUse: 'research',
      examples: ['translate this'],
      systemPrompt: 'you translate',
      maxTokens: 2_000,
      routeHint: { kind: 'local' },
    },
    ...overrides,
  }
}

test('a card without a name or a when-to-use is not a card', () => {
  assert.equal(sanitizeCard({ agent: { whenToUse: 'x' } }), null)
  assert.equal(sanitizeCard({ name: 'x', agent: {} }), null)
  assert.equal(sanitizeCard({ name: 'x' }), null)
  assert.equal(sanitizeCard(null), null)
})

test('card strings and lists are clamped, not trusted', () => {
  const parsed = sanitizeCard({
    id: 'Translator!!',
    name: '  Translator  ',
    tags: ['A', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'],
    agent: {
      whenToUse: 'x'.repeat(5_000),
      whenNotToUse: 'y'.repeat(5_000),
      examples: ['a', 'a', 'b', 'c', 'd', 'e', 'f', 'g'],
      systemPrompt: 'z'.repeat(20_000),
      maxTokens: 999_999,
      routeHint: { kind: 'local', tier: 'nonsense', prefer: 'fastest' },
    },
  })!

  assert.equal(parsed.id, 'translator')
  assert.equal(parsed.name, 'Translator')
  assert.deepEqual(parsed.tags, ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'])
  assert.equal(parsed.agent.whenToUse.length, 2_000)
  assert.equal(parsed.agent.whenNotToUse.length, 1_000)
  assert.deepEqual(parsed.agent.examples, ['a', 'b', 'c', 'd', 'e', 'f'])
  assert.equal(parsed.agent.systemPrompt.length, 8_000)
  assert.equal(parsed.agent.maxTokens, 32_000)
  assert.deepEqual(parsed.agent.routeHint, { kind: 'local', prefer: 'fastest' })
})

test('a card may not carry the team’s own switches', () => {
  const parsed = sanitizeCard({
    name: 'Translator',
    enabled: true,
    main: { provider: 'genkaku', model: '' },
    maxDelegations: 99,
    agent: { whenToUse: 'translate' },
  })!
  const fields = Object.keys(parsed).sort()
  assert.deepEqual(fields, ['agent', 'genkaku', 'lang', 'name', 'tags'])
})

test('an exported card turns its route into a portable hint', () => {
  assert.deepEqual(
    cardFromAgent(agent({ route: { provider: 'genkaku', model: '', prefer: 'fastest' } })).agent.routeHint,
    { kind: 'local', prefer: 'fastest' },
  )
  assert.deepEqual(
    cardFromAgent(agent({ route: { provider: 'genkaku', model: 'gk.w2.agent' } })).agent.routeHint,
    { kind: 'exact', provider: 'genkaku', model: 'gk.w2.agent' },
  )
  assert.deepEqual(
    cardFromAgent(agent({ route: { provider: 'deepseek', model: 'chat' } })).agent.routeHint,
    { kind: 'cloud', provider: 'deepseek', model: 'chat' },
  )
})

test('a local hint prefers an agent-capable worker and honours the preference', () => {
  assert.equal(resolveHint({ kind: 'local' }, catalog).route.model, 'gk.w2.agent')
  assert.equal(resolveHint({ kind: 'local', tier: 'chat' }, catalog).route.model, 'gk.w1.chat')
  assert.equal(resolveHint({ kind: 'local', prefer: 'cheapest' }, catalog).route.model, 'gk.w1.chat')
  assert.equal(resolveHint({ kind: 'local', prefer: 'fastest' }, catalog).route.model, 'gk.w2.agent')
  assert.equal(resolveHint({ kind: 'local', prefer: 'largest' }, catalog).route.model, 'gk.w2.agent')
})

test('a local hint with no live worker stays honest instead of guessing', () => {
  const resolved = resolveHint({ kind: 'local', prefer: 'cheapest' }, { providers: [], local: [] })
  assert.deepEqual(resolved.route, { provider: 'genkaku', model: '', prefer: 'cheapest' })
  assert.equal(resolved.adjusted, false)
})

test('a cloud hint falls back inside the configured providers and says so', () => {
  assert.deepEqual(resolveHint({ kind: 'cloud', provider: 'deepseek' }, catalog).route, {
    provider: 'deepseek',
    model: 'chat',
  })
  const preferred = resolveHint({ kind: 'cloud', provider: 'deepseek', model: 'reason' }, catalog)
  assert.deepEqual(preferred.route, { provider: 'deepseek', model: 'reason' })
  assert.equal(preferred.adjusted, false)

  const missing = resolveHint({ kind: 'cloud', provider: 'deepseek', model: 'nope' }, catalog)
  assert.deepEqual(missing.route, { provider: 'deepseek', model: 'chat' })
  assert.equal(missing.adjusted, true)

  const unknown = resolveHint({ kind: 'cloud', provider: 'anthropic' }, catalog)
  assert.deepEqual(unknown.route, { provider: 'deepseek', model: 'chat' })
  assert.equal(unknown.adjusted, true)
})

test('an exact route survives only while it exists here', () => {
  assert.deepEqual(
    resolveHint({ kind: 'exact', provider: 'genkaku', model: 'gk.w2.agent' }, catalog),
    { route: { provider: 'genkaku', model: 'gk.w2.agent' }, adjusted: false },
  )
  const gone = resolveHint({ kind: 'exact', provider: 'genkaku', model: 'gk.gone.x' }, catalog)
  assert.deepEqual(gone.route, { provider: 'genkaku', model: '' })
  assert.equal(gone.adjusted, true)
  assert.match(gone.reason ?? '', /not on this machine/)
})

test('the install preview carries the resolved route and a usable agent', () => {
  const preview = resolveCard(card(), catalog, 'translator')
  assert.equal(preview.agent.id, 'translator')
  assert.deepEqual(preview.route, { provider: 'genkaku', model: 'gk.w2.agent' })
  assert.equal(preview.adjusted, false)
  assert.equal(preview.agent.whenToUse, 'translate a passage')
})

test('a Chinese name with no id still gets a usable ascii id', () => {
  const taken = new Set<string>()
  const first = previewAgentId(card({ id: undefined, name: '翻譯' }), taken)
  assert.match(first, /^[a-z][a-z0-9-]*$/)
  taken.add(first)
  const second = previewAgentId(card({ id: undefined, name: '翻譯' }), taken)
  assert.notEqual(second, first)
})

test('ids collide, dedupe, and never start with a digit', () => {
  const taken = new Set(['translator'])
  assert.equal(previewAgentId(card({ id: 'translator' }), taken), 'translator-2')
  assert.equal(previewAgentId(card({ id: '2fast' }), new Set()), 'agent-2fast')
  assert.equal(previewAgentId(card({ id: 'lead' }), new Set()), 'lead-agent')
})

test('a share code round-trips a card and a pack', () => {
  const single = encodeShare(card())
  assert.ok(single.startsWith(SHARE_PREFIX))
  const decoded = decodeShare(single)!
  assert.equal(decoded.cards.length, 1)
  assert.equal(decoded.cards[0]!.name, 'Translator')

  const pack = encodeShare({
    genkaku: 'agent-pack/1',
    name: 'Legal',
    cards: [card(), card({ id: 'editor', name: 'Editor' })],
  })
  const many = decodeShare(pack)!
  assert.equal(many.cards.length, 2)
  assert.equal(many.pack?.name, 'Legal')
})

test('a share code is compact and a share link keeps it in the fragment', () => {
  const code = encodeShare(card({ agent: { ...card().agent, systemPrompt: 'x'.repeat(1_200) } }))
  assert.ok(code.length < 1_200, `expected compression, got ${code.length}`)
  assert.ok(shareUrl(code).includes(`#${encodeURIComponent(code)}`))
})

test('junk is not a share code, and an oversized one is refused', () => {
  assert.equal(decodeShare('hello'), null)
  assert.equal(decodeShare(`${SHARE_PREFIX}not-base64!!`), null)
  assert.equal(decodeShare(`${SHARE_PREFIX}${'a'.repeat(9_000)}`), null)

  // Incompressible content, so gzip cannot sneak it under the cap.
  const noise = Array.from({ length: 6_000 }, () => Math.random().toString(36).slice(2)).join('')
  const huge = card({ agent: { ...card().agent, systemPrompt: noise } })
  assert.throws(() => encodeShare(huge), /over the/)
})

test('one document may be a card, a pack, or a wrapper', () => {
  assert.equal(readAnyCardDocument(card()).cards.length, 1)
  assert.equal(readAnyCardDocument({ card: card() }).cards.length, 1)
  assert.equal(readAnyCardDocument({ cards: [card(), card({ id: 'x', name: 'X' })] }).cards.length, 2)
  assert.equal(readAnyCardDocument({ nope: true }).cards.length, 0)
  assert.equal(sanitizePack({ cards: [] }), null)
})

test('the library dedupes by content and caps its size', () => {
  const dir = mkdtempSync(join(tmpdir(), 'genkaku-cards-'))
  try {
    addCards(dir, [card()], 'paste')
    const again = addCards(dir, [card()], 'file')
    assert.equal(again.library.cards.length, 1)
    assert.equal(again.library.cards[0]!.source, 'file')

    const many = Array.from({ length: MAX_LIBRARY_CARDS + 5 }, (_, index) =>
      card({ id: `a${index}`, name: `A${index}` }))
    addCards(dir, many, 'paste')
    assert.equal(readCardLibrary(dir).cards.length, MAX_LIBRARY_CARDS)

    const id = readCardLibrary(dir).cards[0]!.id
    assert.equal(removeCard(dir, id).cards.some(row => row.id === id), false)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('a broken library file reads as empty', () => {
  const dir = mkdtempSync(join(tmpdir(), 'genkaku-cards-'))
  try {
    writeFileSync(join(dir, 'cards.json'), '{not json')
    assert.deepEqual(readCardLibrary(dir).cards, [])
    writeFileSync(join(dir, 'cards.json'), JSON.stringify({ cards: [{ card: { name: 'x' } }] }))
    assert.deepEqual(readCardLibrary(dir).cards, [])
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
