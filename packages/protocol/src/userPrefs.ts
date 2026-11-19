// GENKAKU: the user's marketplace preferences.
//
// Two things live here that are the USER's choice, not the worker's:
//
//   * which (worker, model) pairs the chat model picker may show — at most ten,
//     because the picker is a menu, not an inventory;
//   * how the network list is ordered, so a user who cares about price, speed
//     or a worker's reputation can put that first.
//
// Private workers are also stored here: a pairing code is exchanged once, then
// the worker is known by the user's wallet. The addresses are a cache, not
// authority — the worker can move and the user retries with the seed relay.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import type { OfferSortKey } from './offer.ts'

/** Hard cap: the chat model picker must stay a menu. */
export const MAX_SELECTED_MODELS = 10

/** Order the network list and, for the auto list, the top ten. */
export type ModelSortKey = 'recommended' | OfferSortKey

export const MODEL_SORT_KEYS: readonly ModelSortKey[] = [
  'recommended',
  'pricePerHour',
  'latencyMs',
  'sessionsServed',
  'model',
  'workerName',
]

export type PrivatePeer = {
  /** base58 Solana address; also the worker's libp2p PeerId */
  wallet: string
  peerId: string
  /** name the worker had when it was paired */
  name?: string
  /** label this user gave the worker, falling back to `name` */
  label?: string
  /** last known addresses; a relay circuit is rebuilt from `relay` on dial */
  addrs: string[]
  relay: string[]
  pairedAt: number
}

export type UserPrefs = {
  version: 1
  /**
   * The exact (worker, model) keys the chat picker may show, at most ten.
   *
   * `seeded` separates "the user has never chosen" from "the user chose
   * nothing": on first run the bridge fills the top ten once, and from then on
   * an empty list means the picker is deliberately empty. Without that, untick-
   * ing every row would silently bring ten models back.
   */
  selected: string[]
  seeded?: boolean
  sort: ModelSortKey
  privatePeers: PrivatePeer[]
}

export const USER_PREFS_FILE = 'user.json'

export function userPrefsPath(keyDir: string): string {
  return join(keyDir, USER_PREFS_FILE)
}

export function emptyUserPrefs(): UserPrefs {
  return { version: 1, selected: [], seeded: false, sort: 'recommended', privatePeers: [] }
}

export function readUserPrefs(keyDir: string): UserPrefs {
  try {
    if (!existsSync(userPrefsPath(keyDir))) return emptyUserPrefs()
    return sanitizeUserPrefs(JSON.parse(readFileSync(userPrefsPath(keyDir), 'utf8')))
  } catch {
    return emptyUserPrefs()
  }
}

export function writeUserPrefs(keyDir: string, prefs: UserPrefs): void {
  mkdirSync(keyDir, { recursive: true, mode: 0o700 })
  writeFileSync(userPrefsPath(keyDir), `${JSON.stringify(sanitizeUserPrefs(prefs), undefined, 2)}\n`, { mode: 0o600 })
}

/** Never let a whitelist longer than the picker may show through, and never
 *  let a hand-edited file inject a sort key the bridge cannot honour. */
export function sanitizeUserPrefs(value: unknown): UserPrefs {
  const raw = value as Partial<UserPrefs> | null
  const selected: string[] = []

  if (Array.isArray(raw?.selected)) {
    for (const key of raw.selected) {
      if (typeof key !== 'string' || key === '' || selected.includes(key)) continue
      selected.push(key)
      if (selected.length >= MAX_SELECTED_MODELS) break
    }
  }

  const sort = MODEL_SORT_KEYS.includes(raw?.sort as ModelSortKey)
    ? raw!.sort as ModelSortKey
    : 'recommended'

  const privatePeers: PrivatePeer[] = []

  if (Array.isArray(raw?.privatePeers)) {
    for (const peer of raw.privatePeers) {
      if (peer == null || typeof peer.wallet !== 'string' || peer.wallet === '') continue
      if (typeof peer.peerId !== 'string' || peer.peerId === '') continue
      if (privatePeers.some(existing => existing.wallet === peer.wallet)) continue
      privatePeers.push({
        wallet: peer.wallet,
        peerId: peer.peerId,
        pairedAt: typeof peer.pairedAt === 'number' ? peer.pairedAt : Date.now(),
        addrs: strings(peer.addrs),
        relay: strings(peer.relay),
        ...(typeof peer.name === 'string' && peer.name !== '' ? { name: peer.name } : {}),
        ...(typeof peer.label === 'string' && peer.label !== '' ? { label: peer.label } : {}),
      })
    }
  }

  return { version: 1, selected, seeded: raw?.seeded === true, sort, privatePeers }
}

/** Apply one panel edit. Selection is capped here as well as in the UI: the
 *  bridge is the only writer, and an HTTP client is not the UI. Editing the
 *  selection marks prefs as seeded, so an empty list stays empty. */
export function patchUserPrefs(prefs: UserPrefs, patch: Partial<Omit<UserPrefs, 'version'>>): UserPrefs {
  return sanitizeUserPrefs({
    ...prefs,
    ...patch,
    ...(patch.selected === undefined ? {} : { seeded: true }),
    version: 1,
  })
}

export function removePrivatePeer(prefs: UserPrefs, wallet: string): UserPrefs {
  return { ...prefs, privatePeers: prefs.privatePeers.filter(peer => peer.wallet !== wallet) }
}

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.startsWith('/'))
    : []
}
