// The default cluster is a promise to whoever installs the package, so it is
// checked against the release line rather than trusted. A `0.2.0-rc.*` build is
// published to `next` to exercise devnet and may default there; the moment the
// version stops being a prerelease, the same artifact is what `latest` hands a
// stranger, and pointing their wallet at a test chain is not acceptable.
//
// This fails the build, which is the only moment the mismatch is still cheap.

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

import { DEFAULT_NET_ENV } from './netconfig.js'

const { version } = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
) as { version: string }

test('the default cluster matches the release line', () => {
  const prerelease = version.includes('-')
  assert.equal(
    DEFAULT_NET_ENV,
    prerelease ? 'solana-devnet' : 'solana-mainnet',
    `version ${version} defaults to ${DEFAULT_NET_ENV}: a prerelease defaults to devnet, `
      + 'a final release must default to mainnet (see DEFAULT_NET_ENV in netconfig.ts)',
  )
})
