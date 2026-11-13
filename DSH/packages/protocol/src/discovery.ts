// GENKAKU: discovery layer 2 (P2 §2) — DNS TXT seeds.
// A TXT record lists multiaddrs; editing DNS reboots discovery without a
// client release. Resolution goes through DNS-over-HTTPS so a client whose
// local resolver strips TXT (or is hijacked) still works, and so there is no
// native resolver dependency in the main process.
//
// Record shape (chunked strings are joined before parsing):
//   _genkaku-v0.seeds.genkaku.app. TXT "v=1; seeds=<addr1>,<addr2>"
// The `v=1;` prefix is optional; only tokens that look like multiaddrs ("/…")
// are kept, so prose or future fields cannot be dialed by accident.

export const DNS_SEED_NAME = '_genkaku-v0.seeds.genkaku.app'

/** Cloudflare's JSON DoH endpoint (no key, no logging of the query body). */
export const DEFAULT_DOH_URL = 'https://cloudflare-dns.com/dns-query'

type DohAnswer = { data?: string; type?: number }
type DohResponse = { Status?: number; Answer?: DohAnswer[] }

export type SeedResolverOptions = {
  /** the DNS name to query (default _genkaku-v0.seeds.genkaku.app) */
  name?: string
  /** DoH endpoint override (tests inject a fake fetch instead) */
  dohUrl?: string
  /** injectable fetch for tests */
  fetchImpl?: typeof fetch
  /** hard cap — discovery must never stall the marketplace */
  timeoutMs?: number
}

/** Resolve TXT seed multiaddrs. Any failure (network, DNS, malformed record)
 *  degrades to [] — the caller falls through to peerstore/manual layers. */
export async function resolveDnsSeeds(opts: SeedResolverOptions = {}): Promise<string[]> {
  const name = opts.name ?? DNS_SEED_NAME
  const dohUrl = opts.dohUrl ?? DEFAULT_DOH_URL
  const doFetch = opts.fetchImpl ?? fetch
  const url = `${dohUrl}?name=${encodeURIComponent(name)}&type=TXT`

  try {
    const res = await doFetch(url, {
      headers: { accept: 'application/dns-json' },
      signal: AbortSignal.timeout(opts.timeoutMs ?? 4_000),
    })

    if (!res.ok) {
      return []
    }

    const body = (await res.json()) as DohResponse

    if (body.Status !== 0 || !Array.isArray(body.Answer)) {
      return []
    }

    return parseSeedTxt(body.Answer.map(a => a.data).filter((d): d is string => typeof d === 'string'))
  } catch {
    return []
  }
}

/** TXT payloads → multiaddrs. Quoted chunks are joined, `v=1;` style prefixes
 *  ignored, and only "/"-prefixed tokens survive. */
export function parseSeedTxt(records: string[]): string[] {
  const out = new Set<string>()

  for (const raw of records) {
    const joined = raw
      .split('"')
      .join('')
      .replace(/^\s*v=\d+\s*;\s*/i, '')

    for (const token of joined.split(/[,\s]+/)) {
      // tolerate `seeds=` / `v=` style key prefixes on the first token
      const addr = token.trim().replace(/^[a-z][a-z0-9_-]*=/i, '')

      if (addr.startsWith('/') && addr.includes('/p2p/')) {
        out.add(addr)
      }
    }
  }

  return [...out]
}
