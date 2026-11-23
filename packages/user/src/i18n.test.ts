// Every language must carry the same keys. A partial dictionary would silently
// fall back to English mid-sentence, which is exactly what this change exists
// to stop.

import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

import { MESSAGES } from './client/locales.ts'

const locales = Object.keys(MESSAGES)
const base = Object.keys(MESSAGES.en)

test('the plugin ships the same locale set as the website and DSH plus Korean', () => {
  assert.deepEqual([...locales].sort(), ['de', 'en', 'es', 'fr', 'ja', 'ko', 'pt', 'ru', 'zh'])
})

test('every locale has every key, with no empty value', () => {
  for (const locale of locales) {
    const dict = MESSAGES[locale as keyof typeof MESSAGES]
    assert.deepEqual(Object.keys(dict), base, `${locale}: key set drifted`)
    for (const key of base) {
      assert.ok((dict as Record<string, string>)[key]?.trim() !== '', `${locale}: empty value for ${key}`)
    }
  }
})

test('the Simplified Chinese dictionary has no Traditional-only forms', () => {
  // A small guard against a copy/paste of the old zh-Hant strings. These are
  // the characters that appeared most in the previous panel.
  const zh = JSON.stringify(MESSAGES.zh)
  for (const traditional of ['個', '這', '說', '連線', '廣告', '錢包', '設', '為']) {
    assert.equal(zh.includes(traditional), false, `Traditional character ${traditional} in zh`)
  }
})

test('every string the panel asks for exists in the dictionary', () => {
  // The dictionary can be complete and still miss a key the UI uses, which is
  // how one label shipped in English inside a Chinese panel. Scan the sources
  // for `t('…')` and require each key.
  const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'client')
  // A published tarball ships dist only; there is nothing to scan there.
  if (!existsSync(dir)) return

  const used = new Set<string>()
  for (const name of readdirSync(dir)) {
    if (!name.endsWith('.tsx') && !name.endsWith('.ts')) continue
    const source = readFileSync(join(dir, name), 'utf8')
    for (const match of source.matchAll(/\bt\('((?:[^'\\]|\\.)*)'/g)) {
      used.add(match[1]!.replace(/\\(.)/g, '$1'))
    }
  }

  const missing = [...used].filter(key => !(key in MESSAGES.en))
  assert.deepEqual(missing, [], `keys used by the panel but absent from en.json: ${missing.join(' | ')}`)
})

