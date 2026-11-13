// GENKAKU: worker directory opt-in (P4.7b).
//
// `config.publishAddress` is the deployment default and stays false for
// privacy. The settings page writes this per-machine opt-in instead of editing
// the profile YAML, so a non-technical worker can join the global directory
// after reading the warning that a public address is permanent on chain.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/** File name under the GenKaKu key directory. */
export const PUBLISH_OPT_IN_FILE = 'publish.json'

/**
 * Read the worker's directory opt-in.
 * @param keyDir - GenKaKu state directory.
 * @returns true only when the worker explicitly opted in.
 */
export function readPublishOptIn(keyDir: string): boolean {
  try {
    const value: unknown = JSON.parse(readFileSync(join(keyDir, PUBLISH_OPT_IN_FILE), 'utf8'))
    return typeof value === 'object' && value !== null && (value as { publish?: unknown }).publish === true
  } catch {
    return false
  }
}

/**
 * Persist the worker's directory opt-in.
 * @param keyDir - GenKaKu state directory.
 * @param publish - whether a public address may be written to the chain.
 */
export function writePublishOptIn(keyDir: string, publish: boolean): void {
  mkdirSync(keyDir, { recursive: true, mode: 0o700 })
  writeFileSync(join(keyDir, PUBLISH_OPT_IN_FILE), `${JSON.stringify({ publish }, undefined, 2)}\n`, { mode: 0o600 })
}
