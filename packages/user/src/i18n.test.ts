// Every language must carry the same keys. A partial dictionary would silently
// fall back to English mid-sentence, which is exactly what this change exists
// to stop.

import assert from 'node:assert/strict'
import { test } from 'node:test'

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
