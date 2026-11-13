// GENKAKU: settlement layer bindings (P4.4) — JobEscrow v0.2 on Base Sepolia.
// Writes are testnet-only until P6: env 'base' (mainnet) write paths throw.
// Gas is paid by the calling wallet (user → open/settle; worker → claim,
// self-paid per the locked design in contracts/README.md).
//
// Every digest goes through the packed hashing the escrow's `_verify`
// recovers against, so wire-held receipts verify bit-for-bit on chain.
// ABI DTOs are `as const` so viem's contract-call typing narrows exactly.

import {
  createPublicClient,
  createWalletClient,
  decodeEventLog,
  encodePacked,
  keccak256,
  maxUint256,
  toBytes,
} from 'viem'
import type { Account, Chain, PublicClient, Transport, WalletClient } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { baseSepolia } from 'viem/chains'

import { chainWriteFor } from './chainQueue.ts'
import { CONTRACTS } from './netconfig.ts'
import type { NetEnvironment } from './netconfig.ts'
import { rpcTransport } from './rpc.ts'
import { digestForHex, type ReceiptPayloadV1, signDigest } from './receipts.ts'

export const ESCROW_ABI = [
  {
    name: 'openSession',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'worker', type: 'address' },
      { name: 'amount', type: 'uint128' },
    ],
    outputs: [{ name: 'id', type: 'uint256' }],
  },
  {
    name: 'settle',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'id', type: 'uint256' },
      { name: 'receiptHash', type: 'bytes32' },
      { name: 'spend', type: 'uint128' },
      { name: 'workerSig', type: 'bytes' },
    ],
    outputs: [],
  },
  {
    name: 'claim',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'refund',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'sessions',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [
      { name: 'user', type: 'address' },
      { name: 'worker', type: 'address' },
      { name: 'amount', type: 'uint128' },
      { name: 'openedAt', type: 'uint64' },
      { name: 'settled', type: 'bool' },
      { name: 'refunded', type: 'bool' },
    ],
  },
  {
    name: 'accrued',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'worker', type: 'address' }],
    outputs: [{ name: 'balance', type: 'uint128' }],
  },
  {
    name: 'SessionOpened',
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'id', type: 'uint256', indexed: true },
      { name: 'user', type: 'address', indexed: true },
      { name: 'worker', type: 'address', indexed: true },
      { name: 'amount', type: 'uint128', indexed: false },
    ],
  },
  {
    name: 'SessionSettled',
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'id', type: 'uint256', indexed: true },
      { name: 'worker', type: 'address', indexed: true },
      { name: 'user', type: 'address', indexed: true },
      { name: 'spend', type: 'uint128', indexed: false },
      { name: 'fee', type: 'uint128', indexed: false },
      { name: 'leftover', type: 'uint128', indexed: false },
      { name: 'receiptHash', type: 'bytes32', indexed: false },
    ],
  },
  {
    name: 'SessionRefunded',
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'id', type: 'uint256', indexed: true },
      { name: 'user', type: 'address', indexed: true },
      { name: 'amount', type: 'uint128', indexed: false },
    ],
  },
] as const

/** One escrow session as the worker must see it before spending GPU time. */
export type EscrowSession = {
  id: bigint
  user: `0x${string}`
  worker: `0x${string}`
  amount: bigint
  openedAt: number
  settled: boolean
  refunded: boolean
}

/** Read the escrow record a client claims to have funded. The paywall (P4.9d)
 *  refuses to serve unless this returns a live session that pays THIS worker. */
export async function readEscrowSession(
  publicC: GenkakuPublic,
  env: NetEnvironment,
  id: bigint,
): Promise<EscrowSession | null> {
  if (CONTRACTS[env].escrow === '') return null

  const row = await publicC.readContract({
    address: CONTRACTS[env].escrow as `0x${string}`,
    abi: ESCROW_ABI,
    functionName: 'sessions',
    args: [id],
    authorizationList: undefined,
  } as never) as unknown as readonly [`0x${string}`, `0x${string}`, bigint, bigint, boolean, boolean]

  const [user, worker, amount, openedAt, settled, refunded] = row
  if (user === '0x0000000000000000000000000000000000000000') return null

  return { id, user, worker, amount, openedAt: Number(openedAt), settled, refunded }
}

/** WorkerRegistry v0.2 (P4.9a) — wallet ⇄ PeerId binding + on-chain directory.
 *  Register/advertise writes are worker-key-gas (self-paid); reads are the
 *  data-plane compare. The locator lives ONLY in the `WorkerLocated` log, so
 *  the directory is rebuilt by scanning logs — never by storage reads. */
export const REGISTRY_ABI = [
  {
    name: 'register',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'peerId', type: 'bytes32' },
      { name: 'policyHash', type: 'bytes32' },
    ],
    outputs: [],
  },
  {
    name: 'registerWithLocator',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'peerId', type: 'bytes32' },
      { name: 'policyHash', type: 'bytes32' },
      { name: 'locator', type: 'string' },
    ],
    outputs: [],
  },
  {
    name: 'advertise',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'locator', type: 'string' }],
    outputs: [],
  },
  {
    name: 'selfDeactivate',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'MAX_LOCATOR_BYTES',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'WorkerLocated',
    type: 'event',
    inputs: [
      { name: 'wallet', type: 'address', indexed: true },
      { name: 'peerId', type: 'bytes32', indexed: true },
      { name: 'locator', type: 'string', indexed: false },
      { name: 'updatedAt', type: 'uint64', indexed: false },
    ],
  },
  {
    name: 'WorkerDeactivated',
    type: 'event',
    inputs: [
      { name: 'wallet', type: 'address', indexed: true },
      { name: 'reason', type: 'string', indexed: false },
    ],
  },
  {
    name: 'workers',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }],
    outputs: [
      { name: 'peerId', type: 'bytes32' },
      { name: 'policyHash', type: 'bytes32' },
      { name: 'registeredAt', type: 'uint64' },
      { name: 'lastActiveAt', type: 'uint64' },
      { name: 'active', type: 'bool' },
    ],
  },
  {
    name: 'isActive',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'wallet', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const

export const USDC_ABI = [  {
  name: 'approve',
  type: 'function',
  stateMutability: 'nonpayable',
  inputs: [
    { name: 'spender', type: 'address' },
    { name: 'amount', type: 'uint256' },
  ],
  outputs: [{ name: '', type: 'bool' }],
},
{
  name: 'allowance',
  type: 'function',
  stateMutability: 'view',
  inputs: [
    { name: 'owner', type: 'address' },
    { name: 'spender', type: 'address' },
  ],
  outputs: [{ name: '', type: 'uint256' }],
},
{
  name: 'balanceOf',
  type: 'function',
  stateMutability: 'view',
  inputs: [{ name: 'owner', type: 'address' }],
  outputs: [{ name: '', type: 'uint256' }],
},
{
  // MockUSDC (Base Sepolia only) — the mainnet token has no mint, and the
  // only caller is guarded by `env === 'base-sepolia'`.
  name: 'mint',
  type: 'function',
  stateMutability: 'nonpayable',
  inputs: [
    { name: 'to', type: 'address' },
    { name: 'amount', type: 'uint256' },
  ],
  outputs: [],
},
] as const

function viemChain(env: NetEnvironment) {
  // P6 will add the mainnet chain object. Until then the ONLY wired chain is
  // Base Sepolia — refusing keeps the chain type narrow for viem's contract
  // typing and makes the mainnet write guard structural, not call-site.
  if (env !== 'base-sepolia') {
    throw new Error('[genkaku:chain] mainnet uses canonical USDC and a Safe treasury — locked for P6')
  }

  return baseSepolia
}

/** Public reads. The transport is a failover list (P4.9b): a rate-limited or
 *  dead endpoint rolls to the next one without surfacing anything to the user. */
/** Explicit return type: viem's inferred client type points into its own
 *  package-internal modules, which cannot be re-exported from a declaration. */
export function publicClientFor(env: NetEnvironment): PublicClient {
  return createPublicClient({ chain: viemChain(env), transport: rpcTransport(env) }) as PublicClient
}

/** Local-account wallet client — signs and pays gas itself. Writes go through
 *  the same failover list, so a flaky endpoint cannot strand a registration. */
/** Explicit return type, same reason as {@link publicClientFor}. */
export function walletClientFor(
  env: NetEnvironment,
  key: `0x${string}`,
): WalletClient<Transport, Chain, Account> {
  return createWalletClient({
    chain: viemChain(env),
    transport: rpcTransport(env),
    account: privateKeyToAccount(key),
  }) as WalletClient<Transport, Chain, Account>
}

export type GenkakuPublic = ReturnType<typeof publicClientFor>
export type GenkakuWallet = ReturnType<typeof walletClientFor>

// ── digests ────────────────────────────────────────────────────────────────

/** The worker's settle co-sign digest: keccak256(abi.encodePacked(id,
 *  receiptHash, spend)) — an EIP-191 signature over this is what settle's
 *  `_verify` checks against the session's WORKER address. */
export function settleDigest(escrowId: bigint, receiptHash: `0x${string}`, spend: bigint): Uint8Array {
  // `spend` is a uint128 in JobEscrow, and abi.encodePacked uses the TYPE's
  // width: packing it as uint256 shifted every byte after it, so the contract
  // recovered a different signer (BadSignature) on every real settlement.
  return toBytes(keccak256(encodePacked(
    ['uint256', 'bytes32', 'uint128'],
    [escrowId, receiptHash, spend],
  ) as `0x${string}`))
}

/** The on-chain `receiptHash` argument: the digest of the worker-held max
 *  cumulative receipt (bit-for-bit what both data-plane sides verify). */
export function receiptHashFor(receipt: ReceiptPayloadV1): `0x${string}` {
  return digestForHex(receipt)
}

// ── read ───────────────────────────────────────────────────────────────────

export async function readAccrued(publicC: GenkakuPublic, env: NetEnvironment, worker: `0x${string}`): Promise<bigint> {
  if (CONTRACTS[env].escrow === '') {
    return 0n
  }

  return await publicC.readContract({
    address: CONTRACTS[env].escrow as `0x${string}`,
    abi: ESCROW_ABI,
    functionName: 'accrued',
    args: [worker],
    // viem 2.57 types `authorizationList` as `any` but TypeScript 6.0.3
    // promotes it to a REQUIRED position (TS5.9 keeps it optional — verified
    // in /tmp/viem-typecheck). Explicit undefined restores the TS5 shape;
    // it is ignored at runtime for non-EIP-7702 calls.
    authorizationList: undefined,
  }) as bigint
}

/** Native gas and USDC balances for one wallet, read in parallel. */
export type WalletBalances = { eth: bigint; usdc: bigint }

/**
 * Read the balances a user needs before opening an escrow: USDC to pay and ETH
 * for gas. A chain without a deployed escrow still has canonical USDC.
 * @param publicC - public client for the selected network.
 * @param env - network whose USDC address is used.
 * @param wallet - account to read.
 * @returns gas and 6-decimal USDC balances.
 */
export async function readWalletBalances(
  publicC: GenkakuPublic,
  env: NetEnvironment,
  wallet: `0x${string}`,
): Promise<WalletBalances> {
  const [eth, usdc] = await Promise.all([
    publicC.getBalance({ address: wallet }),
    publicC.readContract({
      address: CONTRACTS[env].usdc as `0x${string}`,
      abi: USDC_ABI,
      functionName: 'balanceOf',
      args: [wallet],
      // Same viem 2.57 / TS 6.0 shape workaround as readAccrued above.
      authorizationList: undefined,
    }) as Promise<bigint>,
  ])
  return { eth, usdc }
}

/** The worker account's own wallet address (P4.5 binds peerId ⇄ wallet via
 *  WorkerRegistry; offers self-report it until then). */
export function walletAddress(key: `0x${string}`): `0x${string}` {
  return privateKeyToAccount(key).address as `0x${string}`
}

// ── writes ─────────────────────────────────────────────────────────────────

/** Approve (only when the allowance is short) + open. The numeric escrow id
 *  is parsed from SessionOpened's OWN log — never from a counter probe (a
 *  concurrent open would desync the id). */
async function openEscrowUnqueued(
  publicC: GenkakuPublic,
  walletC: GenkakuWallet,
  env: NetEnvironment,
  worker: `0x${string}`,
  amount: bigint,
): Promise<{ escrowId: bigint; approved: bigint }> {
  const escrow = CONTRACTS[env].escrow as `0x${string}`
  const usdc = CONTRACTS[env].usdc as `0x${string}`

  if (!escrow) {
    throw new Error(`[genkaku:chain] no escrow deployed for ${env}`)
  }

  const allowance = await publicC.readContract({
    address: usdc,
    abi: USDC_ABI,
    functionName: 'allowance',
    args: [walletC.account.address, escrow],
    // viem 2.57 types `authorizationList` as `any` but TypeScript 6.0.3
    // promotes it to a REQUIRED position (TS5.9 keeps it optional — verified
    // in /tmp/viem-typecheck). Explicit undefined restores the TS5 shape;
    // it is ignored at runtime for non-EIP-7702 calls.
    authorizationList: undefined,
  })

  let approved = allowance as bigint

  if ((allowance as bigint) < amount) {
    const approveHash = await walletC.writeContract({
      address: usdc,
      abi: USDC_ABI,
      functionName: 'approve',
      args: [escrow, maxUint256],
      // viem 2.57 types `authorizationList` as `any` but TypeScript 6.0.3
      // promotes it to a REQUIRED position (TS5.9 keeps it optional — verified
      // in /tmp/viem-typecheck). Explicit undefined restores the TS5 shape;
      // it is ignored at runtime for non-EIP-7702 calls.
      authorizationList: undefined,
      chain: viemChain(env),
      account: walletC.account,
    })

    await publicC.waitForTransactionReceipt({ hash: approveHash })
    approved = maxUint256
  }

  const openHash = await walletC.writeContract({
    address: escrow,
    abi: ESCROW_ABI,
    functionName: 'openSession',
    args: [worker, amount],
    // viem 2.57 types `authorizationList` as `any` but TypeScript 6.0.3
    // promotes it to a REQUIRED position (TS5.9 keeps it optional — verified
    // in /tmp/viem-typecheck). Explicit undefined restores the TS5 shape;
    // it is ignored at runtime for non-EIP-7702 calls.
    authorizationList: undefined,
    chain: viemChain(env),
    account: walletC.account,
  })

  const rc = await publicC.waitForTransactionReceipt({ hash: openHash })
  const openLog = rc.logs.find(l => l.address.toLowerCase() === escrow.toLowerCase())

  if (openLog == null) {
    throw new Error('[genkaku:chain] open: no SessionOpened log in the open tx')
  }

  // TS6: viem's Log type drops `topics` (same TS6-only narrowing quirk as
  // authorizationList). Bridge through unknown; the log is filtered to the
  // escrow address above, and SessionOpened's args are runtime-guaranteed
  // by the ABI.
  const decoded = decodeEventLog({
    abi: ESCROW_ABI,
    data: openLog.data as `0x${string}`,
    topics: (openLog as unknown as { topics: [`0x${string}`, ...`0x${string}`[]] }).topics,
  }) as unknown as { eventName: string; args: { id: bigint } }

  if (decoded.eventName !== 'SessionOpened') {
    throw new Error(`[genkaku:chain] open: unexpected event ${decoded.eventName}`)
  }

  const id: bigint | undefined = decoded.args.id

  if (id == null) {
    throw new Error('[genkaku:chain] open: SessionOpened log without an id')
  }

  return { escrowId: id, approved }
}

async function settleSessionUnqueued(
  walletC: GenkakuWallet,
  env: NetEnvironment,
  args: { escrowId: bigint; receiptHash: `0x${string}`; spend: bigint; workerSig: `0x${string}` },
): Promise<`0x${string}`> {
  return await walletC.writeContract({
    address: CONTRACTS[env].escrow as `0x${string}`,
    abi: ESCROW_ABI,
    functionName: 'settle',
    args: [args.escrowId, args.receiptHash, args.spend, args.workerSig],
    // viem 2.57 types `authorizationList` as `any` but TypeScript 6.0.3
    // promotes it to a REQUIRED position (TS5.9 keeps it optional — verified
    // in /tmp/viem-typecheck). Explicit undefined restores the TS5 shape;
    // it is ignored at runtime for non-EIP-7702 calls.
    authorizationList: undefined,
    chain: viemChain(env),
    account: walletC.account,
  })
}

/** Mint test USDC to `to`. MockUSDC on Base Sepolia lets anyone mint; the
 *  canonical mainnet token has no such function, so the env check is load
 *  bearing, not a convenience. */
async function mintTestUsdcUnqueued(
  walletC: GenkakuWallet,
  env: NetEnvironment,
  to: `0x${string}`,
  amount: bigint,
): Promise<`0x${string}`> {
  if (env !== 'base-sepolia') {
    throw new Error('[genkaku:chain] test USDC mint is only available on base-sepolia')
  }

  const configured = CONTRACTS[env].usdc
  if (configured === '') throw new Error(`[genkaku:chain] no USDC token for ${env}`)
  const usdc = configured as `0x${string}`

  return await walletC.writeContract({
    address: usdc,
    abi: USDC_ABI,
    functionName: 'mint',
    args: [to, amount],
    authorizationList: undefined,
    chain: viemChain(env),
    account: walletC.account,
  })
}

/** Reclaim an unsettled escrow. A short session can bill zero started minutes;
 *  without this the funds would sit in the contract until the user found a
 *  manual refund, which a non-technical user never will. */
async function refundSessionUnqueued(
  walletC: GenkakuWallet,
  env: NetEnvironment,
  escrowId: bigint,
): Promise<`0x${string}`> {
  return await walletC.writeContract({
    address: CONTRACTS[env].escrow as `0x${string}`,
    abi: ESCROW_ABI,
    functionName: 'refund',
    args: [escrowId],
    authorizationList: undefined,
    chain: viemChain(env),
    account: walletC.account,
  })
}

async function claimAccrualUnqueued(walletC: GenkakuWallet, env: NetEnvironment): Promise<`0x${string}`> {
  return await walletC.writeContract({
    address: CONTRACTS[env].escrow as `0x${string}`,
    abi: ESCROW_ABI,
    functionName: 'claim',
    args: [],
    // viem 2.57 types `authorizationList` as `any` but TypeScript 6.0.3
    // promotes it to a REQUIRED position (TS5.9 keeps it optional — verified
    // in /tmp/viem-typecheck). Explicit undefined restores the TS5 shape;
    // it is ignored at runtime for non-EIP-7702 calls.
    authorizationList: undefined,
    chain: viemChain(env),
    account: walletC.account,
  })
}

// ── worker registry (P4.5: wallet ⇄ PeerId binding) ──────────────────────

/** The chain view of one worker's registry record (null when never active). */
export async function readWorker(
  publicC: GenkakuPublic,
  env: NetEnvironment,
  wallet: `0x${string}`,
): Promise<{ active: boolean; peerId: `0x${string}`; policyHash: `0x${string}` } | null> {
  if (CONTRACTS[env].registry === '') {
    return null
  }

  const w = await publicC.readContract({
    address: CONTRACTS[env].registry as `0x${string}`,
    abi: REGISTRY_ABI,
    functionName: 'workers',
    args: [wallet],
    // viem 2.57 types `authorizationList` as `any` but TypeScript 6.0.3
    // promotes it to a REQUIRED position (see openEscrow's comment).
    authorizationList: undefined,
  }) as unknown as readonly [`0x${string}`, `0x${string}`, bigint, bigint, boolean]

  // viem returns the struct as this tuple: peerId, policyHash, registeredAt,
  // lastActiveAt, active.
  const [peerId, policyHash, , , active] = w

  return active ? { active, peerId, policyHash } : null
}

/** Register (or re-pin) the CALLER's wallet to its PeerId digest + policy.
 *  The caller is the worker wallet itself (msg.sender == the binding) — the
 *  desktop pays gas from the worker key. Testnet-only (viemChain refuses
 *  mainnet until P6). */
async function registerWorkerUnqueued(
  walletC: GenkakuWallet,
  env: NetEnvironment,
  args: { peerIdDigest: `0x${string}`; policyHash: `0x${string}` },
): Promise<{ txHash: `0x${string}`; rebind?: boolean }> {
  if (CONTRACTS[env].registry === '') {
    throw new Error(`[genkaku:chain] no registry deployed for ${env}`)
  }

  const txHash = await walletC.writeContract({
    address: CONTRACTS[env].registry as `0x${string}`,
    abi: REGISTRY_ABI,
    functionName: 'register',
    args: [args.peerIdDigest, args.policyHash],
    // viem 2.57 types `authorizationList` as `any` but TypeScript 6.0.3
    // promotes it to a REQUIRED position (see openEscrow's comment).
    authorizationList: undefined,
    chain: viemChain(env),
    account: walletC.account,
  })

  await publicClientFor(env).waitForTransactionReceipt({ hash: txHash })

  return { txHash }
}

/** First block that can hold a v0.2 directory entry (the scan floor). */
export const REGISTRY_DEPLOY_BLOCK: Record<NetEnvironment, bigint> = {
  'base-sepolia': 55_900_292n, // DeployRegistryV2, 2026-11-08
  base: 0n, // set at mainnet launch
}

/** First block that can hold a v0.2 escrow session (same deployment batch). */
export const ESCROW_DEPLOY_BLOCK: Record<NetEnvironment, bigint> = {
  'base-sepolia': 55_900_292n,
  base: 0n,
}

/** The contract's locator ceiling (mirrors MAX_LOCATOR_BYTES). */
export const MAX_LOCATOR_BYTES = 256
/** Four addresses is enough for LAN + public + relay without paying for more. */
export const MAX_LOCATOR_ADDRS = 4

/** Build the on-chain locator from the addresses libp2p actually announces.
 *  Loopback is dropped (useless to a remote peer) and the list is capped so it
 *  always fits MAX_LOCATOR_BYTES. Public addrs come first: a client that can
 *  only use one should try the routable one. Separator is `;` — a multiaddr
 *  never contains it, so parsing stays unambiguous. */
export function locatorOf(
  addrs: readonly string[],
  maxBytes = MAX_LOCATOR_BYTES,
  maxCount = MAX_LOCATOR_ADDRS,
): string {
  const clean = [...new Set(addrs)]
    .filter(a => a.startsWith('/'))
    .filter(a => !a.startsWith('/ip4/127.') && !a.startsWith('/ip6/::1'))
    .map(a => a.trim())
    .filter(a => a.length > 0)

  const rank = (a: string) => {
    if (a.includes('/p2p-circuit/')) return 2
    if (/^\/ip4\/(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(a)) return 1
    if (/^\/ip6\/(fc|fd|fe80)/.test(a)) return 1
    return 0
  }

  const ordered = clean
    .map((addr, index) => ({ addr, index, rank: rank(addr) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map(x => x.addr)

  const picked: string[] = []
  let bytes = 0
  for (const addr of ordered) {
    if (picked.length >= maxCount) break
    const extra = addr.length + (picked.length > 0 ? 1 : 0)
    if (bytes + extra > maxBytes) continue
    picked.push(addr)
    bytes += extra
  }

  return picked.join(';')
}

/** True when this address is reachable from the public internet. LAN, loopback,
 *  link-local and CGNAT (100.64/10) ranges are local-only. A `/p2p-circuit`
 *  address is dialable when its relay hop is a public host: the relay forwards
 *  the stream, so a worker behind NAT is still reachable through it (P5). */
export function isPublicAddr(addr: string): boolean {
  if (!addr.startsWith('/')) return false

  const circuit = addr.indexOf('/p2p-circuit')

  if (circuit >= 0) {
    // Judge the relay hop only; the tail after /p2p-circuit is our own peer id.
    return isPublicAddr(addr.slice(0, circuit))
  }

  const v4 = /^\/ip4\/(\d+)\.(\d+)\.(\d+)\.(\d+)\//.exec(addr)

  if (v4 != null) {
    const a = Number(v4[1])
    const b = Number(v4[2])

    if (a === 0 || a === 10 || a === 127) return false
    if (a === 172 && b >= 16 && b <= 31) return false
    if (a === 192 && b === 168) return false
    if (a === 169 && b === 254) return false
    if (a === 100 && b >= 64 && b <= 127) return false

    return true
  }

  const v6 = /^\/ip6\/([0-9a-f:]+)\//i.exec(addr)

  if (v6 != null) {
    const host = v6[1].toLowerCase()

    if (host === '::1') return false
    if (host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80')) return false

    return true
  }

  return /^\/dns(4|6|addr)\//.test(addr)
}

/** Does this peer announce any address the global directory can use? Without
 *  one, on-chain presence only advertises a dead end (P4.9g §39). */
export function hasPublicAddr(addrs: readonly string[]): boolean {
  return addrs.some(isPublicAddr)
}

/** How this peer is reachable to the internet, best first: a direct public
 *  address, a relay circuit through a public hop, or LAN only. The worker panel
 *  reports this instead of guessing from a bare address list. */
export function transportOf(addrs: readonly string[]): 'direct' | 'relay' | 'lan' {
  if (addrs.some(a => isPublicAddr(a) && !a.includes('/p2p-circuit'))) return 'direct'
  if (addrs.some(a => a.includes('/p2p-circuit') && isPublicAddr(a))) return 'relay'

  return 'lan'
}

/** The address a client should try first: a public direct address, then a
 *  relay circuit, then anything (LAN) for a same-network peer. */
export function preferredAddr(addrs: readonly string[]): string | undefined {
  const direct = addrs.find(a => isPublicAddr(a) && !a.includes('/p2p-circuit'))
  if (direct != null) return direct
  const relay = addrs.find(a => a.includes('/p2p-circuit') && isPublicAddr(a))
  if (relay != null) return relay

  return addrs.find(a => a.startsWith('/'))
}

/** Split a locator back into multiaddrs (tolerates `;`, newline, whitespace). */
export function parseLocator(locator: string): string[] {
  return locator
    .split(/[;\n]+/)
    .map(s => s.trim())
    .filter(s => s.startsWith('/'))
}

/** Register (or re-pin) AND publish the locator in one transaction. */
async function registerWorkerWithLocatorUnqueued(
  walletC: GenkakuWallet,
  env: NetEnvironment,
  args: { peerIdDigest: `0x${string}`; policyHash: `0x${string}`; locator: string },
): Promise<`0x${string}`> {
  if (CONTRACTS[env].registry === '') {
    throw new Error(`[genkaku:chain] no registry deployed for ${env}`)
  }

  const txHash = await walletC.writeContract({
    address: CONTRACTS[env].registry as `0x${string}`,
    abi: REGISTRY_ABI,
    functionName: 'registerWithLocator',
    args: [args.peerIdDigest, args.policyHash, args.locator],
    authorizationList: undefined,
    chain: viemChain(env),
    account: walletC.account,
  })

  await publicClientFor(env).waitForTransactionReceipt({ hash: txHash })

  return txHash
}

/** Publish a new locator for an already-registered worker. Only call this when
 *  the announced address set actually changed — each call is a chain write. */
async function advertiseWorkerUnqueued(
  walletC: GenkakuWallet,
  env: NetEnvironment,
  locator: string,
): Promise<`0x${string}`> {
  if (CONTRACTS[env].registry === '') {
    throw new Error(`[genkaku:chain] no registry deployed for ${env}`)
  }

  const txHash = await walletC.writeContract({
    address: CONTRACTS[env].registry as `0x${string}`,
    abi: REGISTRY_ABI,
    functionName: 'advertise',
    args: [locator],
    authorizationList: undefined,
    chain: viemChain(env),
    account: walletC.account,
  })

  await publicClientFor(env).waitForTransactionReceipt({ hash: txHash })

  return txHash
}

/** Remove this wallet from the live directory. Used when a worker loses the
 *  public address it advertised — a stale entry is worse than none. */
async function deactivateWorkerUnqueued(
  walletC: GenkakuWallet,
  env: NetEnvironment,
): Promise<`0x${string}`> {
  if (CONTRACTS[env].registry === '') {
    throw new Error(`[genkaku:chain] no registry deployed for ${env}`)
  }

  const txHash = await walletC.writeContract({
    address: CONTRACTS[env].registry as `0x${string}`,
    abi: REGISTRY_ABI,
    functionName: 'selfDeactivate',
    args: [],
    authorizationList: undefined,
    chain: viemChain(env),
    account: walletC.account,
  })

  await publicClientFor(env).waitForTransactionReceipt({ hash: txHash })

  return txHash
}

/** One live directory entry: the newest locator a worker published. */
export type DirectoryEntry = {
  wallet: `0x${string}`
  peerId: `0x${string}`
  locator: string
  addrs: string[]
  updatedAt: number
  blockNumber: bigint
}

/** The shape every log scan touches; viem returns far more, we ignore it. */
type RawLog = { args: unknown; blockNumber: bigint | null }

type RegistryEventAbi = Extract<(typeof REGISTRY_ABI)[number], { type: 'event' }>
/** Any event this module scans (registry directory or escrow sessions). */
type ChainEventAbi = Extract<
  (typeof REGISTRY_ABI)[number] | (typeof ESCROW_ABI)[number],
  { type: 'event' }
>

function registryEvent(name: string): RegistryEventAbi {
  const found = REGISTRY_ABI.find(entry => entry.type === 'event' && entry.name === name)
  if (found == null || found.type !== 'event') {
    throw new Error('[genkaku:chain] registry ABI is missing event ' + name)
  }

  return found
}

type LocatedLog = { wallet: `0x${string}`; peerId: `0x${string}`; locator: string; updatedAt: number; blockNumber: bigint }

/** Walk a block range, halving it whenever the RPC refuses the span.
 *  Public Base endpoints disagree wildly on `eth_getLogs` limits (some reject
 *  even a single block), so the scan floor is discovered at runtime instead of
 *  assumed. */
export async function collectLogs(
  publicC: GenkakuPublic,
  address: `0x${string}`,
  event: ChainEventAbi,
  fromBlock: bigint,
  toBlock: bigint,
  args?: Record<string, unknown>,
  depth = 0,
) : Promise<readonly RawLog[]> {
  try {
    // viem's getLogs overloads narrow on the literal event object; the event
    // here is chosen at runtime from REGISTRY_ABI, so the generic cannot be
    // inferred and the call is widened once, here.
    const client = publicC as unknown as {
      getLogs: (input: unknown) => Promise<readonly RawLog[]>
    }
    return await client.getLogs({ address, event, args, fromBlock, toBlock })
  } catch (error) {
    if (fromBlock >= toBlock || depth > 24) throw error
    const mid = fromBlock + (toBlock - fromBlock) / 2n
    const [left, right] = await Promise.all([
      collectLogs(publicC, address, event, fromBlock, mid, args, depth + 1),
      collectLogs(publicC, address, event, mid + 1n, toBlock, args, depth + 1),
    ])
    return [...left, ...right]
  }
}

/** Rebuild the worker directory from chain logs — the whole point of P4.9a.
 *  Returns only entries still live: a wallet whose LAST directory-relevant
 *  event is `WorkerDeactivated` is dropped (the tombstone stays in history,
 *  which is exactly what an auditor needs). */
export async function readWorkerLocators(
  publicC: GenkakuPublic,
  env: NetEnvironment,
  opts: { fromBlock?: bigint; toBlock?: bigint; chunkSize?: bigint; wallet?: `0x${string}` } = {},
): Promise<DirectoryEntry[]> {
  const registry = CONTRACTS[env].registry as `0x${string}`
  if (CONTRACTS[env].registry === '') return []

  const latest = opts.toBlock ?? (await publicC.getBlockNumber())
  const floor = opts.fromBlock ?? REGISTRY_DEPLOY_BLOCK[env]
  if (latest < floor) return []

  // Public Base endpoints cap `eth_getLogs` between 200 (sepolia.base.org) and
  // just under 50,000 blocks. 9,000 clears every one of them, so a scanned
  // range is one request per chunk in the normal case instead of a bisection.
  // `collectLogs` still halves a chunk that a stricter provider rejects.
  const chunkSize = opts.chunkSize ?? 9_000n
  const from = floor
  const to = latest

  const locatedEvent = registryEvent('WorkerLocated')
  const deactivatedEvent = registryEvent('WorkerDeactivated')

  const located: LocatedLog[] = []
  const tombstone = new Map<string, bigint>()

  for (let start = from; start <= to; start += chunkSize) {
    const end = start + chunkSize - 1n > to ? to : start + chunkSize - 1n
    const walletFilter = opts.wallet != null ? { wallet: opts.wallet } : undefined
    const [locatedLogs, deadLogs] = await Promise.all([
      collectLogs(publicC, registry, locatedEvent, start, end, walletFilter),
      collectLogs(publicC, registry, deactivatedEvent, start, end, walletFilter),
    ])

    for (const log of locatedLogs) {
      const a = log.args as { wallet: `0x${string}`; peerId: `0x${string}`; locator: string; updatedAt: bigint }
      located.push({
        wallet: a.wallet,
        peerId: a.peerId,
        locator: a.locator,
        updatedAt: Number(a.updatedAt),
        blockNumber: log.blockNumber ?? 0n,
      })
    }

    for (const log of deadLogs) {
      const a = log.args as { wallet: `0x${string}` }
      const key = a.wallet.toLowerCase()
      const block = log.blockNumber ?? 0n
      const prev = tombstone.get(key)
      if (prev == null || block > prev) tombstone.set(key, block)
    }
  }

  // newest locator per wallet, then drop wallets whose last event was a death
  const newest = new Map<string, LocatedLog>()
  for (const entry of located) {
    const key = entry.wallet.toLowerCase()
    const prev = newest.get(key)
    if (prev == null || entry.blockNumber > prev.blockNumber
      || (entry.blockNumber === prev.blockNumber && entry.updatedAt >= prev.updatedAt)) {
      newest.set(key, entry)
    }
  }

  const out: DirectoryEntry[] = []
  for (const [key, entry] of newest) {
    const deadAt = tombstone.get(key)
    if (deadAt != null && deadAt > entry.blockNumber) continue
    out.push({
      wallet: entry.wallet,
      peerId: entry.peerId,
      locator: entry.locator,
      addrs: parseLocator(entry.locator),
      updatedAt: entry.updatedAt,
      blockNumber: entry.blockNumber,
    })
  }

  return out.sort((a, b) => (a.blockNumber === b.blockNumber ? 0 : a.blockNumber < b.blockNumber ? 1 : -1))
}

/** Wallets that tombstoned themselves in a block range. Incremental readers
 *  need these separately: `readWorkerLocators` only reports live entries for
 *  the range it scanned, so a cached entry must be evicted by a later death. */
export async function readWorkerDeactivations(
  publicC: GenkakuPublic,
  env: NetEnvironment,
  opts: { fromBlock: bigint; toBlock?: bigint; chunkSize?: bigint },
): Promise<{ wallet: `0x${string}`; blockNumber: bigint }[]> {
  const registry = CONTRACTS[env].registry as `0x${string}`
  if (CONTRACTS[env].registry === '') return []

  const to = opts.toBlock ?? (await publicC.getBlockNumber())
  // Public Base endpoints cap `eth_getLogs` between 200 (sepolia.base.org) and
  // just under 50,000 blocks. 9,000 clears every one of them, so a scanned
  // range is one request per chunk in the normal case instead of a bisection.
  // `collectLogs` still halves a chunk that a stricter provider rejects.
  const chunkSize = opts.chunkSize ?? 9_000n
  const event = registryEvent('WorkerDeactivated')
  const out: { wallet: `0x${string}`; blockNumber: bigint }[] = []

  for (let start = opts.fromBlock; start <= to; start += chunkSize) {
    const end = start + chunkSize - 1n > to ? to : start + chunkSize - 1n
    const logs = await collectLogs(publicC, registry, event, start, end)
    for (const log of logs) {
      const a = log.args as { wallet: `0x${string}` }
      out.push({ wallet: a.wallet, blockNumber: log.blockNumber ?? 0n })
    }
  }

  return out
}

/** Receipt signing re-export (single crypto door for callers). */
export async function signReceiptPayload(key: `0x${string}`, receipt: ReceiptPayloadV1): Promise<string> {
  return await signDigest(key, toBytes(digestForHex(receipt)))
}

// ── serialized write entries ───────────────────────────────────────────────
// Every state-changing call goes through the per-account queue in
// chainQueue.ts. A write is a nonce, and two overlapping writes from one
// wallet can be handed the same one; the queue is what keeps them apart.
//
// The whole operation is queued, not just the `writeContract` call: openEscrow
// is approve → wait → open, and the pair must not interleave with another
// session's submit. Different accounts never wait for each other.

export function openEscrow(
  publicC: GenkakuPublic,
  walletC: GenkakuWallet,
  env: NetEnvironment,
  worker: `0x${string}`,
  amount: bigint,
): Promise<{ escrowId: bigint; approved: bigint }> {
  return chainWriteFor(walletC, () => openEscrowUnqueued(publicC, walletC, env, worker, amount))
}

export function settleSession(
  walletC: GenkakuWallet,
  env: NetEnvironment,
  args: { escrowId: bigint; receiptHash: `0x${string}`; spend: bigint; workerSig: `0x${string}` },
): Promise<`0x${string}`> {
  return chainWriteFor(walletC, () => settleSessionUnqueued(walletC, env, args))
}

export function mintTestUsdc(
  walletC: GenkakuWallet,
  env: NetEnvironment,
  to: `0x${string}`,
  amount: bigint,
): Promise<`0x${string}`> {
  return chainWriteFor(walletC, () => mintTestUsdcUnqueued(walletC, env, to, amount))
}

export function refundSession(
  walletC: GenkakuWallet,
  env: NetEnvironment,
  escrowId: bigint,
): Promise<`0x${string}`> {
  return chainWriteFor(walletC, () => refundSessionUnqueued(walletC, env, escrowId))
}

export function claimAccrual(walletC: GenkakuWallet, env: NetEnvironment): Promise<`0x${string}`> {
  return chainWriteFor(walletC, () => claimAccrualUnqueued(walletC, env))
}

export function registerWorker(
  walletC: GenkakuWallet,
  env: NetEnvironment,
  args: { peerIdDigest: `0x${string}`; policyHash: `0x${string}` },
): Promise<{ txHash: `0x${string}`; rebind?: boolean }> {
  return chainWriteFor(walletC, () => registerWorkerUnqueued(walletC, env, args))
}

export function registerWorkerWithLocator(
  walletC: GenkakuWallet,
  env: NetEnvironment,
  args: { peerIdDigest: `0x${string}`; policyHash: `0x${string}`; locator: string },
): Promise<`0x${string}`> {
  return chainWriteFor(walletC, () => registerWorkerWithLocatorUnqueued(walletC, env, args))
}

export function advertiseWorker(
  walletC: GenkakuWallet,
  env: NetEnvironment,
  locator: string,
): Promise<`0x${string}`> {
  return chainWriteFor(walletC, () => advertiseWorkerUnqueued(walletC, env, locator))
}

export function deactivateWorker(walletC: GenkakuWallet, env: NetEnvironment): Promise<`0x${string}`> {
  return chainWriteFor(walletC, () => deactivateWorkerUnqueued(walletC, env))
}
