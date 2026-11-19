// GENKAKU: wallet key vault (P4.4.al) — Electron main process ONLY.
//
// One ed25519 key per identity. The same 32 bytes are the Solana account, the
// libp2p PeerId and the receipt signer: a payment, a directory listing and a
// signed session receipt therefore name the SAME party by construction, with no
// cross-key binding to prove. That is why the vault holds keypairs rather than
// bare hex strings — the caller always needs the public half as well.
//
// Encrypted by an injectable safeStorage-compatible codec and stored under the
// userData dir; dev/test overrides come from GENKAKU_USER_KEY /
// GENKAKU_WORKER_KEY env (documented DEV-ONLY).
//
// Keys NEVER leave the main process — the renderer receives only the base58
// ADDRESSES.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { Keypair } from './solana.js'
import bs58 from 'bs58'

/** A base58 ed25519 secret key (64 bytes: seed ‖ public key). */
export type PrivKey = string
/** A base58 ed25519 public key — the Solana account address. */
export type WalletAddress = string

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

type VaultFile = {
  version: 2
  userKeyEnc?: string
  workerKeyEnc?: string
}

export type KeyVault = {
  /** the app's user identity key — generated on first use */
  userKey(): Keypair
  /** the app's worker identity key — generated on first use */
  workerKey(): Keypair
  /** replace the user key (import / rotate); refuses while an env key wins */
  setUserKey(key: PrivKey): void
  /** replace the worker identity key (import / rotate); same env guard */
  setWorkerKey(key: PrivKey): void
  /** derived addresses only (renderer-safe mirror of the keys) */
  addresses(): { user: WalletAddress; worker: WalletAddress }
  /** the exportable secret (base58), for an explicit panel export only */
  userKeySecret(): PrivKey
  workerKeySecret(): PrivKey
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
  let vault: VaultFile = { version: 2 }

  try {
    const raw = JSON.parse(readFileSync(file, 'utf8')) as { version?: unknown }

    if (raw?.version === 2) {
      vault = raw as VaultFile
    } else {
      // This vault only ever holds ed25519 keys. A file in any other shape is
      // not ours: start clean rather than guessing at bytes that cannot be a
      // Solana account.
      console.warn(
        `[genkaku:keys] ignoring an unrecognised key vault (${file}); a new ed25519 identity will be generated`,
      )
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

    const generated = generateKey()

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
    userKey: () => keypairOf(lock('user')),
    workerKey: () => keypairOf(lock('worker')),
    addresses: () => ({
      user: keypairOf(lock('user')).publicKey.toBase58(),
      worker: keypairOf(lock('worker')).publicKey.toBase58(),
    }),
    userKeySecret: () => lock('user'),
    workerKeySecret: () => lock('worker'),
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

/** Fresh ed25519 identity, exported as a base58 secret key. */
export function generateKey(): PrivKey {
  return bs58.encode(Keypair.generate().secretKey)
}

/** Keypair from a secret key that is already normalized. */
export function keypairOf(key: PrivKey): Keypair {
  return Keypair.fromSecretKey(bs58.decode(key))
}

/**
 * Accept every shape a user might paste and return the canonical base58 secret
 * key:
 *
 *  * base58, 64 bytes — `solana-keygen` / a panel export
 *  * base58, 32 bytes — a bare ed25519 seed (Phantom calls this the secret key)
 *  * hex, 64 or 128 characters — a hex seed or a raw key
 *  * JSON array of numbers — the `id.json` file the Solana CLI writes
 *
 * Anything else throws rather than deriving a key from a typo.
 */
export function normalizeKey(input: string): PrivKey {
  const text = input.trim().replace(/^["']|["']$/g, '')

  if (text === '') throw new Error('[genkaku:keys] empty private key')

  // `solana-keygen` output: a JSON array of byte values.
  if (text.startsWith('[')) {
    let bytes: Uint8Array

    try {
      const parsed = JSON.parse(text) as unknown

      if (!Array.isArray(parsed) || !parsed.every(n => typeof n === 'number')) {
        throw new Error('not a byte array')
      }

      bytes = Uint8Array.from(parsed as number[])
    } catch {
      throw new Error('[genkaku:keys] invalid key file (expected a JSON byte array)')
    }

    return normalizeBytes(bytes)
  }

  if (/^0x[0-9a-fA-F]+$/.test(text)) {
    const bare = text.slice(2)

    if (bare.length !== 64 && bare.length !== 128) {
      throw new Error('[genkaku:keys] invalid private key material (expected 32- or 64-byte hex)')
    }

    return normalizeBytes(Uint8Array.from(Buffer.from(bare, 'hex')))
  }

  let bytes: Uint8Array

  try {
    bytes = bs58.decode(text)
  } catch {
    throw new Error('[genkaku:keys] invalid private key material (expected base58 or hex)')
  }

  return normalizeBytes(bytes)
}

function normalizeBytes(bytes: Uint8Array): PrivKey {
  if (bytes.length === 64) return bs58.encode(bytes)

  if (bytes.length === 32) {
    // A bare seed: the public half is derived, which is also what makes a
    // Phantom-style export importable.
    return bs58.encode(Keypair.fromSeed(bytes).secretKey)
  }

  throw new Error(`[genkaku:keys] invalid private key material (${bytes.length} bytes; expected 32 or 64)`)
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
