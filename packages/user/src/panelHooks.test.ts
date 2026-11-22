// Hooks must run on every render, in the same order.
//
// 0.8.0-rc.1 shipped a blank panel because four `useCallback`s were added after
// the `if (draft == null) return` guard: the first render ran ten hooks and the
// second ran fourteen, and React unmounted the tree. Nothing caught it — it
// type-checks, it bundles, and there is no renderer in this test suite.
//
// So this is a text check, deliberately narrow: inside a component, once a
// two-space-indented `if (` appears, no hook may follow. It is not a general
// linter, and it does not need to be: it encodes the one mistake this file has
// actually made.

import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const source = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'client', 'teamPanel.tsx')

/** `const x = useThing(` or `useThing(` at component-body indentation. */
const HOOK = /^ {2}(?:const [\w{[\], ]+ = )?use[A-Z]\w*\(/
/** A guard clause at component-body indentation. */
const GUARD = /^ {2}if \(/
/** The start of a component or helper function. */
const COMPONENT = /^(?:export )?function ([A-Z]\w*)\s*[(<]/

test('no hook appears after an early return in a component', () => {
  // A published tarball ships dist only; there is nothing to scan there.
  if (!existsSync(source)) return

  const lines = readFileSync(source, 'utf8').split('\n')
  const violations: string[] = []
  let component: string | null = null
  let guardLine = 0

  lines.forEach((line, index) => {
    const start = COMPONENT.exec(line)
    if (start != null) {
      component = start[1]!
      guardLine = 0
      return
    }
    // A top-level declaration ends the previous component's body.
    if (/^(?:export )?(?:const|let|type|interface|class) /.test(line)) {
      component = null
      guardLine = 0
      return
    }
    if (component == null) return

    if (GUARD.test(line) && guardLine === 0) {
      guardLine = index + 1
      return
    }
    if (guardLine > 0 && HOOK.test(line)) {
      violations.push(`${component}: hook at line ${index + 1} follows the guard at line ${guardLine}`)
    }
  })

  assert.deepEqual(violations, [], violations.join('\n'))
})
