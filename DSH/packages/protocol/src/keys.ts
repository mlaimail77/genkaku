// GENKAKU: wallet key vault (P4.4.al) — Electron main process ONLY.
// Key material: one EVM keypair as the app's USER identity (receipt signing,
// escrow open + settle) and one as the WORKER identity (sidecar co-sign,
// claim). Encrypted by an injectable safeStorage-compatible codec and stored
// under the userData dir; dev/test overrides come from GENKAKU_USER_KEY /
// GENKAKU_WORKER_KEY env (documented DEV-ONLY).
//
// NO mainnet paths: consumers are testnet-locked at the chain layer (chain.ts
// refuses non-base-sepolia writes). Keys NEVER leave the main process — the
// renderer receives only the derived ADDRESSES.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import type { Hex } from 'viem'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'

export type PrivKey = Hex
export type EthAddress = `0x${string}`

/** safeStorage-shaped codec: electron main wires { encryptString, ... };
 *  tests/dev can pass a plaintext pass-through (files still skip keys repo). */
export type KeyCodec = {
  encrypt(plain: string): Buffer
  decrypt(blob: Buffer): string
}

const PLAINTEXT_CODEC: KeyCodec = {
  encrypt: plain => Buffer.from(plain, 'utf8'),
  decrypt: blob => blob.toString('utf8'),
}

type VaultFile = { version: 1; userKeyEnc?: string; workerKeyEnc?: string }

export type KeyVault = {
  /** the app's user identity key — generated on first use */
  userKey(): PrivKey
  /** the app's worker identity key — generated on first use */
  workerKey(): PrivKey
  /** replace the user key (import / rotate); refuses while an env key wins */
  setUserKey(key: PrivKey): void
  /** replace the worker identity key (import / rotate); same env guard */
  setWorkerKey(key: PrivKey): void
  /** derived addresses only (renderer-safe mirror of the keys) */
  addresses(): { user: EthAddress; worker: EthAddress }
  /** true when ANY key came from env overrides (dev-only telemetry) */
  readonly usingEnvOverrides: boolean
}

export function createKeyVault(opts: {
  /** directory for the encrypted key file (app userData in main process) */
  dir: string
  codec?: KeyCodec
}): KeyVault {
  const codec = opts.codec ?? PLAINTEXT_CODEC
  const file = join(opts.dir, 'genkaku.keys.json')
  mkdirSync(opts.dir, { recursive: true })
  let vault: VaultFile = { version: 1 }

  try {
    const raw = JSON.parse(readFileSync(file, 'utf8')) as VaultFile

    if (raw?.version === 1) {
      vault = raw
    }
  } catch {
    // first run / unreadable → fresh vault below
  }

  // DEV override (P4.4.al): env keys win when present. Deliberately loud.
  const envUser = envKey('GENKAKU_USER_KEY')
  const envWorker = envKey('GENKAKU_WORKER_KEY')

  if (envUser != null || envWorker != null) {
    console.warn(
      '[genkaku:keys] DEV-ONLY env key override active '
      + `(user:${envUser != null ? 'set' : '-'} worker:${envWorker != null ? 'set' : '-'}) — never ship this path`,
    )
  }

  let userKey: PrivKey | null = envUser
  let workerKey: PrivKey | null = envWorker

  const decode = (enc: string | undefined): PrivKey | null => {
    if (enc == null) {
      return null
    }

    try {
      return normalizeKey(codec.decrypt(Buffer.from(enc, 'base64')))
    } catch (error) {
      console.error('[genkaku:keys] decrypt failed', error instanceof Error ? error.message : String(error))

      return null
    }
  }

  userKey ??= decode(vault.userKeyEnc)
  workerKey ??= decode(vault.workerKeyEnc)

  const persist = () => {
    let writeable = true

    try {
      writeFileSync(file, JSON.stringify(vault), { mode: 0o600 })
    } catch (error) {
      writeable = false
      console.error('[genkaku:keys] vault write failed', error instanceof Error ? error.message : String(error))
    }

    if (!writeable) {
      throw new Error('[genkaku:keys] cannot persist key vault')
    }
  }

  const lock = (name: 'user' | 'worker'): PrivKey => {
    const current = userKey != null && name === 'user' ? userKey : workerKey != null && name === 'worker' ? workerKey : null

    if (current != null) {
      return current
    }

    const generated = normalizeKey(generatePrivateKey())

    // keys from env overrides are intentionally NOT re-persisted — they stay
    // env-scoped for the process lifetime.
    if (name === 'user') {
      userKey = generated

      if (envUser != null) {
        return generated
      }

      vault.userKeyEnc = codec.encrypt(generated).toString('base64')
    } else {
      workerKey = generated

      if (envWorker != null) {
        return generated
      }

      vault.workerKeyEnc = codec.encrypt(generated).toString('base64')
    }

    persist()

    return generated
  }

  return {
    userKey: () => lock('user'),
    workerKey: () => lock('worker'),
    addresses: () => ({
      user: privateKeyToAccount(lock('user')).address as EthAddress,
      worker: privateKeyToAccount(lock('worker')).address as EthAddress,
    }),
    setUserKey(key: PrivKey): void {
      // An env-supplied key is process-scoped by design; silently replacing it
      // would make the panel look successful while the old identity stays live.
      if (envUser != null) {
        throw new Error('the user key comes from GENKAKU_USER_KEY; unset it before importing or rotating')
      }

      const next = normalizeKey(key)
      userKey = next
      vault.userKeyEnc = codec.encrypt(next).toString('base64')
      persist()
    },
    setWorkerKey(key: PrivKey): void {
      // Same reasoning as setUserKey: an env key is process-scoped, so claiming
      // a successful replacement while the old identity stays live would lie.
      if (envWorker != null) {
        throw new Error('the worker key comes from GENKAKU_WORKER_KEY; unset it before importing or rotating')
      }

      const next = normalizeKey(key)
      workerKey = next
      vault.workerKeyEnc = codec.encrypt(next).toString('base64')
      persist()
    },
    get usingEnvOverrides() {
      return envUser != null || envWorker != null
    },
  }
}

/** Accepts 0x-prefixed or bare 32-byte hex; returns lowercase Hex or throws. */
export function normalizeKey(input: string): PrivKey {
  const bare = input.trim().toLowerCase().replace(/^0x/, '')

  if (!/^[0-9a-f]{64}$/.test(bare)) {
    throw new Error('[genkaku:keys] invalid private key material (expected 32-byte hex)')
  }

  return `0x${bare}` as PrivKey
}

function envKey(name: string): PrivKey | null {
  const value = process.env[name]

  if (value == null || value === '') {
    return null
  }

  try {
    return normalizeKey(value)
  } catch (error) {
    console.error(`[genkaku:keys] ${name} malformed`, error instanceof Error ? error.message : String(error))

    return null
  }
}
