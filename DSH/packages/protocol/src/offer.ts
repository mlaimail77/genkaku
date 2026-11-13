// GENKAKU: worker offer board (P4.3 marketplace).
// A worker publishes one Offer row per (model, price) it chooses to serve.
// Price is FREELY set by the worker and quoted PER HOUR of user usage time
// (MockUSDC 6 decimals in testnet; canonical USDC 6 decimals in prod). Billing
// accrues per STARTED MINUTE: worker's max unbilled exposure = one minute.
// Credit score: v0 is a local heuristic (sessions served); P4.4 upgrades it to
// the on-chain settled-claim ratio from JobEscrow/WorkerRegistry events.

export type Offer = {
  /**
   * Board revision this row was read from. `offers/1` adds the capability
   * fields below; a v0 row is still valid and is treated as a chat-only model,
   * because a worker that cannot report capabilities cannot be trusted to
   * support tools either.
   */
  proto: 'offers/0' | 'offers/1'
  workerName: string
  model: string
  /** 6-decimal USDC per hour of usage, as bigint */
  pricePerHour: bigint
  /** coarse, self-reported (privacy: never street-level) */
  city?: string
  /** 0–100; v0 local heuristic, chain-verified in P4.4 */
  creditScore: number
  /** completed sessions; join into creditScore on-chain later */
  sessionsServed: number
  /** where creditScore came from: chain-derived (P4.9h) or the worker's own
   *  claim. The UI should only show a chain score as a score. */
  creditSource?: 'chain' | 'self'
  /** measured RTT to this worker at discovery time (ms) */
  latencyMs?: number
  /** parallel sessions the worker accepts */
  maxConcurrent?: number
  /**
   * Ollama's capability list for the model being sold (`tools`, `thinking`,
   * `vision`, …). Present on `offers/1` rows.
   */
  capabilities?: string[]
  /** raw `details.parameter_size`, e.g. '9.0B'. Present on `offers/1` rows. */
  parameterSize?: string
  /**
   * Marketplace tier derived from capabilities + size. `chat` is what the UI
   * labels "not suitable for agents"; it is a label, not a filter.
   */
  tier?: ModelTier
  /** true when `workerWallet` was proven by the P4.9e hello handshake rather
   *  than self-reported. Priced sessions should require this. */
  walletVerified?: boolean
  /**
   * The worker's EVM wallet (escrow settle recipient). The client REPLACES the
   * self-reported value with the wallet proven by the P4.9e hello handshake and
   * sets `walletVerified`; an offer whose claim contradicts its proof is
   * dropped before it is ever listed.
   */
  workerWallet?: string
}

/** JSON-safe shape used over /genkaku/offers/0 frames. */
export type OfferWire = Omit<Offer, 'pricePerHour'> & { pricePerHour: string }

export function toWire(offer: Offer): OfferWire {
  return { ...offer, pricePerHour: offer.pricePerHour.toString() }
}

export function fromWire(wire: OfferWire): Offer {
  // Preserve the revision the row arrived with: a v0 row must not be upgraded
  // silently, or it would look like a worker that reported capabilities.
  return { ...wire, pricePerHour: BigInt(wire.pricePerHour) }
}

export function ceilDiv(a: bigint, b: bigint): bigint {
  if (b <= 0n) {throw new Error('[genkaku:pricing] divisor must be positive')}

  return (a + b - 1n) / b
}

const MS_PER_HOUR = 3_600_000n

/**
 * Cumulative billed amount for a session. `unitMs` must divide 3600000
 * (v0 default 60000 → 60 units/hour). Rate per unit is rounded UP once per
 * hour — never per tick — so the user-perceived hourly price never exceeds
 * the quoted pricePerHour, and the worker's per-tick exposure stays bounded.
 */
export function cumulativeBilled(pricePerHour: bigint, unitMs: number, elapsedMs: number): bigint {
  if (unitMs <= 0) {throw new Error('[genkaku:pricing] unitMs must be positive')}
  const unit = BigInt(unitMs)

  if (MS_PER_HOUR % unit !== 0n) {
    throw new Error('[genkaku:pricing] unitMs must divide 3600000')
  }

  const units = Math.ceil(elapsedMs / unitMs)

  if (units <= 0) {return 0n}

  return BigInt(units) * ceilDiv(pricePerHour, MS_PER_HOUR / unit)
}

import type { ModelTier } from './capabilities.ts'

export type OfferSortKey = 'creditScore' | 'pricePerHour' | 'workerName' | 'model' | 'city' | 'latencyMs'

const comparators: Record<OfferSortKey, (a: Offer, b: Offer) => number> = {
  creditScore: (a, b) => a.creditScore - b.creditScore,
  pricePerHour: (a, b) => (a.pricePerHour <= b.pricePerHour ? -1 : 1),
  workerName: (a, b) => a.workerName.localeCompare(b.workerName),
  model: (a, b) => a.model.localeCompare(b.model),
  city: (a, b) => (a.city ?? '').localeCompare(b.city ?? ''),
  latencyMs: (a, b) => (a.latencyMs ?? Number.POSITIVE_INFINITY) - (b.latencyMs ?? Number.POSITIVE_INFINITY),
}

/** One offer row with the address it arrived from. */
export type AddressedOffer = { addr: string; offer: Offer }

/**
 * Collapse the same worker offer reached through several multiaddrs. A stable
 * peer can be announced over IPv4, IPv6 and relay addresses; the board should
 * list the offer once, not once per address.
 * @param rows - flattened offer rows in discovery order.
 * @returns rows with duplicate (wallet-or-address, model, price) entries removed.
 */
export function dedupeOffers(rows: readonly AddressedOffer[]): AddressedOffer[] {
  const seen = new Set<string>()
  const out: AddressedOffer[] = []
  for (const row of rows) {
    const worker = row.offer.workerWallet ?? row.addr
    const key = `${worker}|${row.offer.model}|${row.offer.pricePerHour.toString()}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(row)
  }
  return out
}

/** One-key sort with stable tiebreakers (name asc, then model asc). */
export function sortOffers(offers: Offer[], key: OfferSortKey = 'creditScore', dir: 'asc' | 'desc' = 'desc'): Offer[] {
  const mul = dir === 'desc' ? -1 : 1

  return [...offers].sort((a, b) =>
    mul * comparators[key](a, b)
    || comparators.workerName(a, b)
    || comparators.model(a, b))
}

export type OfferFilter = {
  model?: string
  maxPricePerHour?: bigint
  minCredit?: number
  city?: string
  /** case-insensitive substring across workerName/model/city */
  query?: string
}

export function filterOffers(offers: Offer[], f: OfferFilter): Offer[] {
  const q = f.query?.toLowerCase()

  return offers.filter(o =>
    (!f.model || o.model === f.model)
    && (!f.minCredit || o.creditScore >= f.minCredit)
    && (!f.city || o.city === f.city)
    && (!q || `${o.workerName} ${o.model} ${o.city ?? ''}`.toLowerCase().includes(q))
    && (!f.maxPricePerHour || o.pricePerHour <= f.maxPricePerHour))
}
