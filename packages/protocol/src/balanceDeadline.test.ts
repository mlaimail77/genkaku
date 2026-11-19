import assert from 'node:assert/strict'
import { test } from 'node:test'

import { withDeadline } from './chain.ts'

// The user panel polls /genkaku/status every few seconds. A public RPC that
// accepts the socket and then goes quiet used to leave the balance promise
// pending forever, so every later status request queued behind it and the panel
// reported "no bridge on 47821–47826" while the bridge was running fine.
test('a balance read that never answers is refused, not waited on', async () => {
  const startedAt = Date.now()

  await assert.rejects(
    withDeadline(new Promise<never>(() => {}), 30, 'balance read'),
    /balance read timed out/,
  )

  assert.ok(Date.now() - startedAt < 1_000, 'the deadline must fire promptly')
})

test('a read that answers keeps its value', async () => {
  assert.equal(await withDeadline(Promise.resolve(7n), 30, 'balance read'), 7n)
})
