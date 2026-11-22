#!/usr/bin/env node
/**
 * Build the curated card index from `cards/*.json`.
 *
 *   node scripts/build-cards.mjs          # validate, rewrite index.json
 *   node scripts/build-cards.mjs --check  # fail if index.json is stale (CI)
 *
 * The index is the contract the plugin trusts: it names a file, a size and a
 * sha256, and the plugin refuses a card whose bytes do not match. So this is
 * the only place a card is allowed to enter the registry — a hand-edited
 * index.json that disagrees with its files is a bug, not a shortcut.
 *
 * Validation reuses the plugin's own reader (`sanitizeCard`) rather than a
 * second opinion, so a card the plugin would reject cannot be listed here.
 */
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dir = join(root, 'cards')
const indexFile = join(dir, 'index.json')

let sanitizeCard
try {
  ;({ sanitizeCard } = await import(join(root, 'packages/protocol/dist/index.js')))
} catch (error) {
  console.error('build-cards: build @genkaku/protocol first (pnpm --filter @genkaku/protocol run build)')
  console.error(String(error))
  process.exit(1)
}

const files = readdirSync(dir)
  .filter(name => name.endsWith('.json') && name !== 'index.json')
  .sort()

const cards = []
const problems = []

for (const file of files) {
  const text = readFileSync(join(dir, file), 'utf8')
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch (error) {
    problems.push(`${file}: not JSON (${error.message})`)
    continue
  }

  const card = sanitizeCard(parsed)
  if (card == null) {
    problems.push(`${file}: not a specialist card (needs a name and a whenToUse)`)
    continue
  }

  // The card must be listed under the id it declares, or a share code and a
  // registry id would name the same specialist differently.
  const declared = typeof parsed.id === 'string' ? parsed.id : ''
  if (declared === '') {
    problems.push(`${file}: no id (the registry needs a stable ascii id)`)
    continue
  }
  if (card.id !== declared) {
    problems.push(`${file}: id "${declared}" is not a valid ascii id (got "${card.id ?? ''}")`)
    continue
  }
  if (card.id !== file.replace(/\.json$/, '')) {
    problems.push(`${file}: file name must match the id "${card.id}"`)
    continue
  }
  if (typeof parsed.summary !== 'string' || parsed.summary.trim() === '') {
    problems.push(`${file}: no summary (the list needs one line)`)
    continue
  }

  cards.push({
    id: card.id,
    name: card.name,
    lang: card.lang,
    tags: card.tags,
    ...(card.author == null ? {} : { author: card.author }),
    summary: parsed.summary.trim().slice(0, 200),
    url: file,
    sha256: createHash('sha256').update(text).digest('hex'),
    size: text.length,
  })
}

if (problems.length > 0) {
  console.error('build-cards: refusing to write an index with problems:')
  for (const problem of problems) console.error(`  - ${problem}`)
  process.exit(1)
}

if (cards.length === 0) {
  console.error('build-cards: no cards found')
  process.exit(1)
}

const index = {
  version: 1,
  // A build stamp, not a promise: the plugin only shows it as "as of".
  updatedAt: new Date().toISOString(),
  cards,
}

const next = `${JSON.stringify(index, undefined, 2)}\n`

if (process.argv.includes('--check')) {
  let current = ''
  try {
    current = readFileSync(indexFile, 'utf8')
  } catch {
    current = ''
  }
  // The stamp always changes, so compare everything except it.
  const strip = value => value.replace(/"updatedAt": "[^"]*",?\n?/, '')
  if (strip(current) !== strip(next)) {
    console.error('build-cards: cards/index.json is stale; run node scripts/build-cards.mjs')
    process.exit(1)
  }
  console.log(`build-cards: ${cards.length} card(s), index up to date`)
  process.exit(0)
}

writeFileSync(indexFile, next)
console.log(`build-cards: wrote ${cards.length} card(s) to cards/index.json`)
for (const card of cards) console.log(`  ${card.id}  ${card.name}  ${card.sha256.slice(0, 12)}`)
