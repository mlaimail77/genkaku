// Bring a fresh cluster up to "the 0.4 plugins can trade here".
//
// Creates what only needs creating: the USDC mint (devnet only), the worker
// directory config, the attestor key record, and optionally one advertiser's
// campaign plus its vault. Everything it prints is what goes into
// `netconfig.ts` and the admin's ads state.
//
//   GENKAKU_RPC_URL=https://api.devnet.solana.com \
//   SOLANA_KEYPAIR=~/.config/solana/team-dev.json \
//   GENKAKU_PROGRAM_KEYPAIR=~/.config/solana/genkaku-0.4-program.json \
//   npx tsx packages/protocol/scripts/init-cluster.ts
//
// Idempotent by construction: each step reads the account first and skips when
// it already exists, so a half-finished run is finished by running it again.
//
//   --mint-only            create/lookup the devnet mock mint and stop
//   --mint <pubkey>        use this existing mint instead of creating one
//   --skip-mint            never touch the mint (mainnet: Circle's USDC)
//   --attestor-key <path>  the key allowed to accrue/attest (default: the payer)
//   --campaign-index <n>   also create this index for the payer (default: none)
//   --rate <micro>         that campaign's price per sponsored minute (5000)
//   --min-claim <micro>    that campaign's claim threshold (50000)
//   --fund <micro>         amount to move from the payer's USDC into the vault

import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

import { Keypair, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
import { createMint, getMint } from '@solana/spl-token'

import {
  DECIMALS,
  associatedTokenAddress,
  campaignPda,
  connection,
  createIdempotentAtaIx,
  fundCampaignIx,
  initAttestorIx,
  initCampaignIx,
  initRegistryIx,
  readAttestor,
  readCampaign,
  readRegistry,
  registryPda,
  send,
  vaultAddress,
} from '../src/solana.ts'
import type { NetEnvironment } from '../src/netconfig.ts'

const RPC = process.env.GENKAKU_RPC_URL ?? 'https://api.devnet.solana.com'
const ENV: NetEnvironment = RPC.includes('mainnet') ? 'solana-mainnet' : 'solana-devnet'
const conn = connection(ENV, 'confirmed')

function arg(name: string): string | null {
  const index = process.argv.indexOf(name)
  return index === -1 ? null : (process.argv[index + 1] ?? null)
}

function flag(name: string): boolean {
  return process.argv.includes(name)
}

function keypair(path: string): Keypair {
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(path, 'utf8')) as number[]))
}

function ok(line: string): void {
  console.log(`  ✓ ${line}`)
}

async function main(): Promise<void> {
  const payer = keypair(process.env.SOLANA_KEYPAIR ?? join(homedir(), '.config/solana/team-dev.json'))
  console.log(`cluster ${ENV} (${RPC})`)
  console.log(`payer   ${payer.publicKey.toBase58()}`)

  const balance = await conn.getBalance(payer.publicKey)
  console.log(`balance ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`)
  if (balance === 0) throw new Error('the payer has no SOL on this cluster')

  // ── mint ────────────────────────────────────────────────────────────────
  let mint: PublicKey | null = null

  if (!flag('--skip-mint')) {
    const given = arg('--mint')
    if (given != null) {
      mint = new PublicKey(given)
      ok(`using mint ${mint.toBase58()}`)
    } else {
      const mintKey = keypair(process.env.GENKAKU_MINT_KEYPAIR ?? join(homedir(), '.config/solana/genkaku-devnet-mint.json'))
      try {
        const info = await getMint(conn, mintKey.publicKey)
        mint = mintKey.publicKey
        ok(`mint exists at ${mint.toBase58()} (${info.decimals} decimals)`)
      } catch {
        mint = await createMint(conn, payer, payer.publicKey, null, DECIMALS, mintKey)
        ok(`mint created at ${mint.toBase58()} (tx confirmed)`)
      }
      if (flag('--mint-only')) {
        console.log(`\nGENKAKU_DEVNET_MINT=${mint.toBase58()}`)
        return
      }
    }
  } else if (arg('--mint') != null) {
    mint = new PublicKey(arg('--mint')!)
    ok(`using mint ${mint.toBase58()}`)
  }

  // ── registry ────────────────────────────────────────────────────────────
  console.log('\nregistry')
  if ((await readRegistry(conn)) != null) {
    ok(`exists at ${registryPda().toBase58()}`)
  } else {
    const sig = await send(conn, payer, [initRegistryIx(payer.publicKey)])
    ok(`created at ${registryPda().toBase58()} (tx ${sig})`)
  }

  // ── attestor ────────────────────────────────────────────────────────────
  console.log('\nattestor')
  const attestorPath = arg('--attestor-key')
  const attestorKey = attestorPath == null ? payer : keypair(attestorPath)

  const existingAttestor = await readAttestor(conn)
  if (existingAttestor != null) {
    ok(`exists, attestor ${existingAttestor.attestor.toBase58()}`)
    if (existingAttestor.attestor.toBase58() !== attestorKey.publicKey.toBase58()) {
      console.warn(`  ! the requested key ${attestorKey.publicKey.toBase58()} is NOT the on-chain attestor`)
      console.warn('    rotate it with set_attestor, or pass the key that is already installed')
    }
  } else {
    const sig = await send(conn, payer, [initAttestorIx(payer.publicKey, attestorKey.publicKey)])
    ok(`created, attestor ${attestorKey.publicKey.toBase58()} (tx ${sig})`)
  }

  // ── campaign (optional) ─────────────────────────────────────────────────
  const indexText = arg('--campaign-index')
  if (indexText != null && mint != null) {
    const index = Number(indexText)
    if (!Number.isInteger(index) || index < 0) throw new Error('--campaign-index must be an integer')
    const rate = BigInt(arg('--rate') ?? '5000')
    const minClaim = BigInt(arg('--min-claim') ?? '50000')
    const fund = BigInt(arg('--fund') ?? '0')

    console.log('\ncampaign')
    const campaign = campaignPda(payer.publicKey, index)
    const vault = vaultAddress(mint, campaign)

    if ((await readCampaign(conn, campaign)) != null) {
      ok(`exists at ${campaign.toBase58()}`)
    } else {
      const sig = await send(conn, payer, [
        createIdempotentAtaIx(payer.publicKey, campaign, mint),
        initCampaignIx({ owner: payer.publicKey, index, mint, vault, minClaim, ratePerMinute: rate }),
      ])
      ok(`created ${campaign.toBase58()} rate ${rate} min ${minClaim} (tx ${sig})`)
    }

    if (fund > 0n) {
      const sig = await send(conn, payer, [
        createIdempotentAtaIx(payer.publicKey, payer.publicKey, mint),
        fundCampaignIx({
          campaign,
          owner: payer.publicKey,
          ownerAta: associatedTokenAddress(payer.publicKey, mint),
          mint,
          amount: fund,
        }),
      ])
      ok(`funded ${fund} micro-USDC (tx ${sig})`)
    }

    const state = await readCampaign(conn, campaign)
    console.log(`  campaign       ${campaign.toBase58()}`)
    console.log(`  vault          ${vault.toBase58()}`)
    if (state != null) {
      console.log(`  funded/accrued ${state.funded} / ${state.accrued}`)
      console.log(`  rate           ${state.ratePerMinute} micro-USDC / minute`)
      console.log(`  min claim      ${state.minClaim} micro-USDC`)
    }
  }

  console.log('\nnext:')
  console.log(`  GENKAKU_NET_ENV=${ENV}`)
  if (mint != null) console.log(`  usdc mint       ${mint.toBase58()}`)
  console.log(`  registry        ${registryPda().toBase58()}`)
  console.log(`  attestor        ${(await readAttestor(conn))?.attestor.toBase58() ?? attestorKey.publicKey.toBase58()}`)
  console.log('  admin: GENKAKU_ADS_STATE + GENKAKU_ATTESTOR_KEY as above')
}

main().catch((error) => {
  console.error(`init failed: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
