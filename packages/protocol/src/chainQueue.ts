// GENKAKU: one chain-write queue per sending account.
//
// What the queue is for changed with Solana, but it is needed for a different
// reason than before. There is no nonce: every transaction carries a recent
// blockhash and the fee payer simply has to exist. What a wallet CAN do to
// itself is spend against the same account state twice — open two sessions that
// both read `next_session_id`, or advertise twice and leave the later write
// racing the earlier one's confirmation. Serialising one account's writes costs
// nothing and removes a whole class of "worked the second time" failures from
// the panel.
//
// The retry half is a stale blockhash: a public endpoint can take longer than
// the ~60 s validity window under load, and losing a settlement to that would
// leave a worker unpaid with no way to prove it did the work. `solana.ts::send`
// already retries inside one attempt; this outer retry covers the case where the
// whole call had to restart from a fresh read.

/** How long to wait before re-submitting after a transient failure, in ms. */
export const DEFAULT_NONCE_RETRY_DELAY_MS = 2_000

/** The node errors that mean "this is worth another try", not "this is wrong".
 *  Matched on the message because web3.js wraps node errors in several shapes. */
const RETRYABLE = /blockhash not found|BlockhashNotFound|block height exceeded|node is behind|429|Too Many Requests|timed out|fetch failed/i

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
      if (!RETRYABLE.test(message)) throw error
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

/** Convenience shape: anything with a Solana address, or the address itself. */
export function chainWriteFor<T>(
  wallet: { readonly publicKey: { toBase58(): string } } | string,
  task: () => Promise<T>,
  options: ChainWriteOptions = {},
): Promise<T> {
  const account = typeof wallet === 'string' ? wallet : wallet.publicKey.toBase58()

  return chainWrite(account, task, options)
}

/** Test seam: forget every queue. Never called by production code. */
export function resetChainQueues(): void {
  tails.clear()
}
