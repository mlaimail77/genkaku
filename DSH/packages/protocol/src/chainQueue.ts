// GENKAKU: one chain-write queue per sending account (P1-C1).
//
// Every transaction needs a nonce, and viem asks an RPC endpoint for the
// account's *pending* nonce at submission time. Two writes that overlap — a
// settle that is still in flight while the next session opens its escrow, or a
// claim racing an advertise — can be handed the same nonce, especially when
// the failover transport answers from a different endpoint than the one that
// accepted the previous transaction. Every endpoint then rejects one of them
// and the user sees a 500 instead of an answer.
//
// The queue makes writes for one address strictly sequential. Different
// accounts keep their independence: a worker's claim does not wait for the
// user's settle, because their nonces cannot collide.
//
// The retry is the second half of the same problem: after the queue has
// serialized the writes, the only remaining failure is an endpoint whose
// pending view has not caught up with the previous receipt. One retry after a
// short delay covers it; anything else is surfaced unchanged.

/** How long to wait before re-submitting after a nonce race, in ms. */
export const DEFAULT_NONCE_RETRY_DELAY_MS = 2_000

/** The node errors that mean "your nonce view is stale", not "this is wrong".
 *  Matched on the message because viem wraps node errors in several shapes. */
const NONCE_RACE = /nonce|already known|known transaction|replacement transaction|underpriced/i

export type ChainWriteOptions = {
  /** Delay before the single retry; 0 in tests. */
  retryDelayMs?: number
  /** Observability hook — called with the first failure before retrying. */
  onRetry?: (message: string) => void
}

/** Tail of each account's queue. The stored promise never rejects, so a failed
 *  write cannot poison the next one. */
const tails = new Map<string, Promise<void>>()

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/** Run `task` after every earlier write from the same account has settled. */
export function chainWrite<T>(
  account: string,
  task: () => Promise<T>,
  options: ChainWriteOptions = {},
): Promise<T> {
  const key = account.toLowerCase()
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_NONCE_RETRY_DELAY_MS

  const attempt = async (): Promise<T> => {
    try {
      return await task()
    } catch (error) {
      const message = messageOf(error)
      if (!NONCE_RACE.test(message)) throw error
      options.onRetry?.(message)
      if (retryDelayMs > 0) await wait(retryDelayMs)
      return await task()
    }
  }

  const previous = tails.get(key) ?? Promise.resolve()
  const run = previous.then(attempt, attempt)
  const tail = run.then(() => undefined, () => undefined)

  tails.set(key, tail)
  void tail.then(() => {
    // Only drop the entry if no later write replaced it — otherwise the map
    // would grow with dead promises instead of one row per active account.
    if (tails.get(key) === tail) tails.delete(key)
  })

  return run
}

/** Convenience shape: any viem wallet client (has `.account.address`). */
export function chainWriteFor<T>(
  wallet: { readonly account: { readonly address: string } },
  task: () => Promise<T>,
  options: ChainWriteOptions = {},
): Promise<T> {
  return chainWrite(wallet.account.address, task, options)
}

/** Test seam: forget every queue. Never called by production code. */
export function resetChainQueues(): void {
  tails.clear()
}
