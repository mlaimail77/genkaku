// GENKAKU: network constants for the desktop client (P4).
// Chain/data-model follows protocol/GENKAKU-P1.md + GENKAKU-P2.md.
// Testnet values are verified on-chain (deployed 2026-11-06, contracts/README.md).

export type NetEnvironment = 'base-sepolia' | 'base'

export const CHAIN_ID: Record<NetEnvironment, 84532 | 8453> = {
  'base-sepolia': 84532,
  base: 8453,
}

export const CONTRACTS: Record<NetEnvironment, { escrow: string; registry: string; usdc: string }> = {
  'base-sepolia': {
    escrow: '0x8175df796A659681009BeDa4609a3cFe9d281D82',
    registry: '0xFbE9FF497dC24bD69d13E4201418938Df7435Ff6', // v0.2 — on-chain directory (P4.9a)
    usdc: '0xEb33DFC0424810039337a38510ef522e9E7F9727', // MockUSDC — test only
  },
  base: {
    escrow: '', // deploy at mainnet launch
    registry: '',
    usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // canonical USDC — verify vs Circle
  },
}

export const TREASURY = '0x639a2B713041e15B0c5C18710536b661d5265b48'

// Discovery (P4.9): the worker directory lives on Base — see directory.ts and
// rpc.ts. There is NO baked bootstrap seed: genkaku.app is a static download
// page, and neither a user nor a worker may depend on infrastructure we run.
//
// `GENKAKU_BOOTSTRAP_SEEDS` (comma-separated multiaddrs) is a DEVELOPMENT
// escape hatch for a LAN bring-up or a private deployment; it is empty in
// shipped builds and is never required for discovery to work.
// The live GenKaKu bootstrap seed. It is addressed by URL rather than by
// multiaddr because the process picks a new peer id on every restart; the URL
// answers with the addresses that are true right now.
//
// `seed.genkaku.app` is the permanent address. `staging.genkaku.app/seed` is the
// same process behind its old name and stays second so a DNS change on the new
// hostname cannot strand a client: discovery queries every seed in parallel and
// a dead one degrades to an empty list.
const BAKED_SEEDS: string[] = [
  'https://seed.genkaku.app/seed',
  'https://staging.genkaku.app/seed',
]

export const HARDCODED_SEEDS: string[] = (() => {
  const fromEnv = (process.env.GENKAKU_BOOTSTRAP_SEEDS ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(s => s !== '')

  return (fromEnv.length > 0 ? fromEnv : BAKED_SEEDS)
    .filter(s => !s.includes('PLACEHOLDER'))
})()

// Metered receipts: default k = 10 tokens per signed ledger increment (P2 §3).
export const DEFAULT_RECEIPT_STEP_TOKENS = 10
