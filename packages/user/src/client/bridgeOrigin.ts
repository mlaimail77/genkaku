/**
 * Which local bridge this browser tab is talking to.
 *
 * The panel and the sponsored row both need this answer, and they must agree:
 * a panel showing one bridge's balances beside another bridge's placement would
 * be a bug nobody could explain. One module-level value, written by whoever
 * finds the bridge first, is enough for both.
 */

const CANDIDATE_PORTS = [47821, 47822, 47823, 47824, 47825, 47826] as const

export const originOf = (port: number): string => `http://127.0.0.1:${port}`

let known: string | null = null
let discovering: Promise<string | null> | null = null

/** Remember the origin a successful call proved. */
export function remember(origin: string): void {
  known = origin
}

/** The origin found so far, without probing. */
export function currentOrigin(): string | null {
  return known
}

async function probe(origin: string): Promise<boolean> {
  try {
    const res = await fetch(`${origin}/genkaku/status`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(4_000),
    })

    if (!res.ok) return false

    const doc = (await res.json()) as { role?: string }

    return doc.role === 'user'
  } catch {
    return false
  }
}

/** Find the user-side bridge, reusing the last answer while it still answers. */
export async function discoverOrigin(): Promise<string | null> {
  if (known != null && await probe(known)) return known
  if (discovering != null) return await discovering

  discovering = (async () => {
    for (const port of CANDIDATE_PORTS) {
      const origin = originOf(port)
      if (await probe(origin)) {
        known = origin

        return origin
      }
    }

    return null
  })().finally(() => { discovering = null })

  return await discovering
}
