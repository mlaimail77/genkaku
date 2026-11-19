// GENKAKU: user-side settlement opt-in.
//
// `config.settle` is the deployment default and is NOT a volatile settings
// field: writing it into the profile patch is rejected by dsh ("is not
// volatile") and, because the write was fire-and-forget, it took the whole app
// down. The panel's Payments switch therefore persists here instead, next to
// the worker's publish opt-in, and the runtime reads it when it builds the
// bridge.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/** File name under the GenKaKu key directory. */
export const SETTLE_OPT_IN_FILE = 'settle.json'

/**
 * Read the user's settlement opt-in.
 * @param keyDir - GenKaKu state directory.
 * @returns true/false when the user chose, or null to keep the profile default.
 */
export function readSettleOptIn(keyDir: string): boolean | null {
  try {
    const value: unknown = JSON.parse(readFileSync(join(keyDir, SETTLE_OPT_IN_FILE), 'utf8'))
    const settle = (value as { settle?: unknown }).settle
    return typeof settle === 'boolean' ? settle : null
  } catch {
    return null
  }
}

/**
 * Persist the user's settlement opt-in.
 * @param keyDir - GenKaKu state directory.
 * @param settle - whether sessions should open and settle escrows.
 */
export function writeSettleOptIn(keyDir: string, settle: boolean): void {
  mkdirSync(keyDir, { recursive: true, mode: 0o700 })
  writeFileSync(join(keyDir, SETTLE_OPT_IN_FILE), `${JSON.stringify({ settle }, undefined, 2)}\n`, { mode: 0o600 })
}
