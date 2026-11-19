// The policy endpoints over the REAL bridge HTTP server, no chain and no worker.
//
//   npx tsx packages/protocol/scripts/policy-http-check.ts
//
// The panel is a form over these four routes, so they are worth testing as HTTP
// rather than as module calls: a status body the panel cannot parse shows up as
// an empty budget card, and a missing DELETE shows up as a broken button. The
// bridge is started with `settle: true` and no workers — nothing here can reach
// a cluster, which is also the assertion that a policy edit itself signs nothing.

import { mkdtempSync, rmSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

import { Keypair } from '@solana/web3.js'

import { startOpenAiBridge } from '../src/bridge.ts'
import { ModeManager } from '../src/modeManager.ts'
import { createUserNode } from '../src/p2pNode.ts'

type PolicyBody = {
  ok: boolean
  policy: {
    name: string
    enabled: boolean
    creditLimitMicro: string | null
    perSessionMicro: string | null
    reset: string
    remainingMicro: string | null
    spend: { total: string; today: string }
  }
}

const dir = mkdtempSync(join(homedir(), '.genkaku-policy-http-'))
const key = Keypair.generate()

function check(label: string, actual: unknown, expected: unknown): void {
  if (String(actual) !== String(expected)) throw new Error(`${label}: expected ${expected}, got ${actual}`)
  console.log(`  ok  ${label} = ${String(actual)}`)
}

async function policy(base: string, init?: RequestInit): Promise<PolicyBody> {
  const res = await fetch(`${base}/genkaku/policy`, init)

  if (!res.ok) throw new Error(`${init?.method ?? 'GET'} /genkaku/policy → ${res.status}`)

  return await res.json() as PolicyBody
}

async function main(): Promise<void> {
  const node = await createUserNode([], key)
  const modes = new ModeManager()
  modes.switch('user')
  const bridge = await startOpenAiBridge({
    workers: [],
    port: 0,
    env: 'solana-devnet',
    modeManager: modes,
    getNode: async () => node,
    userKey: () => key,
    settle: true,
    log: () => {},
    keyDir: dir,
  })

  const base = bridge.url.replace(/\/v1$/, '')
  const post = (body: unknown): Promise<PolicyBody> => policy(base, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

  try {
    const status = await (await fetch(`${base}/genkaku/status`)).json() as {
      role?: string
      policy?: PolicyBody['policy']
    }
    check('status.role', status.role, 'user')
    check('default name', status.policy?.name, 'everyday')
    check('default credit', status.policy?.creditLimitMicro, '10000000')
    check('default reset', status.policy?.reset, 'never')
    check('default remaining', status.policy?.remainingMicro, '10000000')
    check('total spent', status.policy?.spend.total, '0')

    const patched = await post({
      name: 'work',
      creditLimitUsdc: '0.25',
      perSessionUsdc: '0.05',
      reset: 'daily',
      enabled: false,
    })
    check('patched name', patched.policy.name, 'work')
    check('patched credit', patched.policy.creditLimitMicro, '250000')
    check('patched per session', patched.policy.perSessionMicro, '50000')
    check('patched reset', patched.policy.reset, 'daily')
    check('patched enabled', patched.policy.enabled, 'false')

    const bad = await fetch(`${base}/genkaku/policy`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ creditLimitUsdc: 'ten' }),
    })
    check('bad amount is 400', bad.status, 400)

    const noLimit = await post({ creditLimitUsdc: null, enabled: true })
    check('cleared credit', noLimit.policy.creditLimitMicro, 'null')
    check('cleared remaining', noLimit.policy.remainingMicro, 'null')

    const deleted = await policy(base, { method: 'DELETE' })
    check('delete restores defaults', deleted.policy.creditLimitMicro, '10000000')
    check('delete restores reset', deleted.policy.reset, 'never')

    const put = await fetch(`${base}/genkaku/policy`, { method: 'PUT' })
    check('PUT is 405', put.status, 405)

    console.log('\npolicy HTTP checks passed')
  } finally {
    await bridge.close()

    try {
      await node.stop()
    } catch {
      // stopping a node that never dialed anything
    }

    rmSync(dir, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
