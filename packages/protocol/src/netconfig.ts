// GENKAKU: network constants for the plugins.
//
// Solana is the settlement layer. The two clusters share one program id on
// purpose: the same binary is deployed to devnet and to mainnet-beta, so the
// PDA addresses are identical and a test that passes on devnet exercises the
// same account graph that mainnet will use. What differs is the USDC mint —
// Circle's on mainnet, a 6-decimal mock on devnet — and the seed.
//
// Nothing here is a private endpoint. The RPC in the box is a public one; a
// user with a better provider sets GENKAKU_RPC_URL and keeps it to themselves.

export type NetEnvironment = 'solana-devnet' | 'solana-mainnet'

/**
 * Cluster a fresh install talks to before anyone sets `env`.
 *
 * The prerelease line (`0.2.0-rc.*`, published to `next`) exists to exercise
 * devnet, so it defaults there. Flipping this one constant to `solana-mainnet`
 * is part of cutting 0.2.0 for `latest`: a package on the stable tag must not
 * point somebody's wallet at a test chain they never asked for.
 * `netconfig.test.ts` fails the build if the two do not agree.
 */
export const DEFAULT_NET_ENV: NetEnvironment = 'solana-devnet'

export const CLUSTER: Record<NetEnvironment, 'devnet' | 'mainnet-beta'> = {
  'solana-devnet': 'devnet',
  'solana-mainnet': 'mainnet-beta',
}

/**
 * Public RPC endpoints, tried in order. These are undocumented as a contract:
 * they rate-limit aggressively and occasionally return 429. A client that
 * cannot write a transaction now retries; one that cannot read a directory
 * falls back to the seed's cached copy.
 */
export const RPC: Record<NetEnvironment, readonly string[]> = {
  'solana-devnet': ['https://api.devnet.solana.com'],
  'solana-mainnet': ['https://api.mainnet-beta.solana.com'],
}

/**
 * The deployed program. One binary, both clusters, same address.
 *
 * 0.4 changes the account layout (one campaign per advertiser, one accrual per
 * campaign and worker), so it is a new address rather than an upgrade: the
 * 0.3 accounts stay readable by a 0.3 client instead of silently decoding into
 * wrong numbers.
 */
export const PROGRAM_ID = '5HQHqUxNzyfJxQGADFMhVFh1aAe9nZFC2mWvPTEQ12CZ'

/**
 * Per-cluster facts.
 *
 * `usdc` is empty on devnet until the mock mint exists; every caller treats ''
 * as "not configured" rather than as a zero key. The mainnet value is Circle's
 * canonical mint — a token issued by a third party, not by us, and not
 * something this project can mint or freeze.
 */
export const CONTRACTS: Record<NetEnvironment, { program: string; usdc: string }> = {
  'solana-devnet': {
    program: PROGRAM_ID,
    // The 6-decimal mock token created by scripts/init-cluster.ts. Devnet has
    // no canonical USDC; this one is mintable by the deployment key and worth
    // nothing.
    usdc: '4X61aN7pu93j7KkTJByu6GDGU6kj8PbyPSUghoZzP4yu',
  },
  'solana-mainnet': {
    program: PROGRAM_ID,
    usdc: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  },
}

/** Owner / guardian / fee recipient. One key at launch. */
export const TREASURY = '6dnu6kA4PwjyYpSzS18gq9DAybPt2HgjmG4W9KL6wJf3'

/**
 * Discovery seeds, one per cluster.
 *
 * A seed is a matchmaker, not a dependency: it hands out the addresses of
 * peers it has seen, and the on-chain directory remains the source of truth. A
 * shared pool would mix the two clusters, and a receipt from one cluster can
 * never settle on the other.
 */
const BAKED_SEEDS: Record<NetEnvironment, readonly string[]> = {
  'solana-devnet': ['https://staging.genkaku.app/seed'],
  'solana-mainnet': ['https://seed.genkaku.app/seed'],
}

/** Seeds to query for one cluster.
 *
 *  `GENKAKU_BOOTSTRAP_SEEDS` (comma-separated URLs) is a DEVELOPMENT escape
 *  hatch for a LAN bring-up or a private deployment; it is empty in shipped
 *  builds and is never required for discovery to work.
 */
export function seedsFor(env: NetEnvironment): string[] {
  const fromEnv = (process.env.GENKAKU_BOOTSTRAP_SEEDS ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(s => s !== '')

  return (fromEnv.length > 0 ? fromEnv : [...BAKED_SEEDS[env]])
    .filter(s => !s.includes('PLACEHOLDER'))
}

/** RPC endpoint for one cluster, honouring the development override. */
export function rpcUrl(env: NetEnvironment): string {
  const override = (process.env.GENKAKU_RPC_URL ?? '').trim()
  if (override !== '') return override
  return RPC[env][0]
}

// Metered receipts: default k = 10 tokens per signed ledger increment (P2 §3).
export const DEFAULT_RECEIPT_STEP_TOKENS = 10
