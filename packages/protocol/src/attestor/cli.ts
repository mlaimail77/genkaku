// The daily attestor: ads ledger → on-chain accrual + reputation.
//
//   node packages/protocol/dist/attestor/cli.js [--day YYYY-MM-DD] [--dry-run]
//
// One run settles one UTC day. It reads what the ads service recorded, compares
// it with what this machine already booked, and writes only the difference. In
// between there is one key — the attestor's — and no other moving part, because
// the moment this job grows a queue or a database it becomes a service nobody
// can audit.
//
// Failure policy: stop at the first write error, keep the ledger honest (it is
// only advanced after a confirmed transaction), and exit non-zero so a systemd
// timer or a cron mail reports it. A partly settled day is not a lost day: the
// next run picks up the rest.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

import {
  accrueMinutes,
  attestDay,
  keyOf,
  publicClientFor,
  readCampaignState,
  readWorker,
  readWorkerAccrual,
  settleCampaignDay,
  walletAddress,
  type GenkakuWallet,
} from '../chain.ts'
import type { NetEnvironment } from '../netconfig.ts'
import { keypairOf, normalizeKey } from '../keys.ts'
import { distinctTippers, readRecentTips } from '../tips.ts'

import { evidenceRoot } from './merkle.ts'
import {
  emptyLedger,
  plan,
  record,
  type DayLedger,
  type DayReport,
  type ReportCampaign,
  type TipsForWorker,
} from './plan.ts'

type Options = {
  day: string
  dryRun: boolean
  adsUrl: string
  env: NetEnvironment
  stateDir: string
  keyPath: string
}

function parseArgs(argv: string[]): Options {
  const flags = new Map<string, string>()
  const bools = new Set<string>()

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i] ?? ''
    if (!arg.startsWith('--')) continue
    const [key, inline] = arg.slice(2).split('=')
    if (inline == null && argv[i + 1] != null && !argv[i + 1]!.startsWith('--')) {
      flags.set(key!, argv[i + 1]!)
      i += 1
    } else if (inline != null) {
      flags.set(key!, inline)
    } else {
      bools.add(key!)
    }
  }

  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)

  return {
    day: flags.get('day') ?? yesterday,
    dryRun: bools.has('dry-run'),
    adsUrl: (flags.get('ads-url') ?? process.env.GENKAKU_ADS_URL ?? 'https://seed.genkaku.app/ads/v1').replace(/\/+$/, ''),
    env: (flags.get('env') ?? process.env.GENKAKU_NET_ENV ?? 'solana-devnet') as NetEnvironment,
    stateDir: flags.get('state') ?? process.env.GENKAKU_ATTESTOR_STATE ?? join(homedir(), '.dsh', 'genkaku', 'attestor'),
    keyPath: flags.get('key') ?? process.env.GENKAKU_ATTESTOR_KEY ?? join(homedir(), '.config', 'solana', 'genkaku-attestor-devnet.json'),
  }
}

function loadKey(path: string): GenkakuWallet {
  if (!existsSync(path)) {
    throw new Error(`attestor key not found at ${path}; set GENKAKU_ATTESTOR_KEY`)
  }

  // normalizeKey accepts the JSON array solana-keygen writes and a base58 secret
  // a panel exports, so an operator never has to convert a key by hand.
  return keypairOf(normalizeKey(readFileSync(path, 'utf8')))
}

function ledgerPath(stateDir: string, day: string): string {
  return join(stateDir, `${day}.json`)
}

function readLedger(path: string, day: string): DayLedger {
  if (!existsSync(path)) return emptyLedger(day)

  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as DayLedger

    return {
      day: parsed.day ?? day,
      accrued: parsed.accrued ?? {},
      nonce: parsed.nonce ?? {},
    }
  } catch {
    throw new Error(`the ledger at ${path} is unreadable; refusing to guess what was already booked`)
  }
}

function writeLedger(path: string, ledger: DayLedger): void {
  mkdirSync(join(path, '..'), { recursive: true })
  writeFileSync(path, `${JSON.stringify(ledger, null, 2)}\n`)
}

/** Every campaign the ads service lists, for the settlement stamp. */
async function fetchCampaigns(base: string, day: string): Promise<string[]> {
  try {
    const res = await fetch(`${base}/campaigns`, { signal: AbortSignal.timeout(10_000) })
    if (!res.ok) return []
    const doc = await res.json() as { campaigns?: Array<{ campaign?: unknown }> }

    return (doc.campaigns ?? []).flatMap(row => typeof row.campaign === 'string' ? [row.campaign] : [])
  } catch {
    return []
  }
}

async function fetchReport(base: string, day: string): Promise<DayReport> {
  const res = await fetch(`${base}/report?day=${day}`, { signal: AbortSignal.timeout(15_000) })

  if (!res.ok) throw new Error(`ads service answered ${res.status} for ${day}`)

  const doc = (await res.json()) as Partial<DayReport> & {
    workers?: Record<string, number>
    ratePerMinuteMicro?: string
    campaigns?: ReportCampaign[]
  }

  // 0.3 answered one global `workers` map and one rate. 0.4 answers a list of
  // campaigns; the old shape is still accepted so a half-upgraded service is
  // read as "one campaign" rather than as zero.
  const campaigns = Array.isArray(doc.campaigns)
    ? doc.campaigns
    : [{
      campaign: 'legacy',
      ratePerMinuteMicro: doc.ratePerMinuteMicro ?? '0',
      workers: doc.workers ?? {},
    }]

  return { day: doc.day ?? day, campaigns }
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2))
  const conn = publicClientFor(options.env)
  const attestor = loadKey(options.keyPath)
  const ledgerPathForDay = ledgerPath(options.stateDir, options.day)

  console.log(`day      ${options.day}`)
  console.log(`cluster  ${options.env}`)
  console.log(`attestor ${walletAddress(attestor)}`)
  console.log(`report   ${options.adsUrl}/report`)
  console.log(`ledger   ${ledgerPathForDay}\n`)

  const report = await fetchReport(options.adsUrl, options.day)
  const ledger = readLedger(ledgerPathForDay, options.day)

  const wallets = new Set(report.campaigns.flatMap(c => Object.keys(c.workers)))
  const minutes = report.campaigns.reduce(
    (sum, c) => sum + Object.values(c.workers).reduce((a, b) => a + b, 0),
    0,
  )
  console.log(`report: ${report.campaigns.length} campaign(s), ${wallets.size} wallet(s), ${minutes} minute(s) claimed`)

  // Tips are read per worker because the score includes them, and they are read
  // from the wallet's own history — never from the ads service.
  const tips = new Map<string, TipsForWorker>()
  for (const wallet of wallets) {
    const summary = await readRecentTips(conn, options.env, wallet).catch(() => null)

    if (summary == null) continue

    tips.set(wallet, {
      totalMicro: summary.totalMicro,
      count: summary.count,
      distinctTippers: distinctTippers(summary, wallet),
    })
  }

  // A wallet the report names but the chain has never heard of cannot be
  // accrued: `accrue` reads the Worker account. Checking first turns a failed
  // transaction into a line an operator can act on.
  const registered = new Set<string>()
  for (const wallet of new Set([...wallets, ...tips.keys()])) {
    const record = await readWorker(conn, options.env, wallet).catch(() => null)
    if (record != null) registered.add(wallet)
  }

  // A paused campaign refuses accruals on chain. Reading it here keeps the
  // failure a line in the report instead of a stopped settlement.
  const paused = new Set<string>()
  for (const campaign of report.campaigns) {
    if (campaign.campaign === 'legacy') continue
    const state = await readCampaignState(conn, keyOf(campaign.campaign)).catch(() => null)
    if (state?.paused === true) paused.add(campaign.campaign)
  }

  const work = plan({ report, ledger, tips, registered, paused, rootOf: lines => evidenceRoot(lines) })

  console.log(`plan: ${work.accruals.length} accrual(s), ${work.attestations.length} attestation(s)`)

  for (const skip of work.skipped) {
    console.warn(`  skipped ${skip.wallet}: ${skip.reason}`)
  }

  for (const wallet of work.unregistered) {
    console.warn(`  not a worker on this cluster, nothing accrued: ${wallet}`)
  }

  if (options.dryRun) {
    for (const row of work.accruals) {
      console.log(`  would accrue ${row.minutes} min → ${row.wallet} (day total ${row.totalMinutes})`)
    }
    for (const row of work.attestations) {
      console.log(`  would attest ${row.wallet}: ${row.minutes} min, ${row.tipMicro} micro tips, nonce ${row.nonce}`)
    }
    console.log('\ndry run: nothing was written')

    return
  }

  let next = ledger
  let written = 0

  for (const row of work.accruals) {
    const tx = await accrueMinutes(
      conn,
      attestor,
      keyOf(row.campaign),
      row.wallet,
      BigInt(row.minutes),
      dayIndex(options.day),
    )
    next = record(next, { campaign: row.campaign, wallet: row.wallet, minutes: row.minutes })
    writeLedger(ledgerPathForDay, next)
    written += 1
    console.log(`  accrued ${row.minutes} min → ${row.wallet} from ${row.campaign} (tx ${tx})`)
  }

  for (const row of work.attestations) {
    const tx = await attestDay(conn, attestor, {
      wallet: row.wallet,
      day: dayIndex(options.day),
      minutes: row.minutes,
      sessions: row.sessions,
      tipMicro: row.tipMicro,
      tipCount: row.tipCount,
      tippers: row.tippers,
      nonce: row.nonce,
      evidenceRoot: row.evidenceRoot,
    })
    next = record(next, { wallet: row.wallet, nonce: row.nonce })
    writeLedger(ledgerPathForDay, next)
    written += 1
    console.log(`  attested ${row.wallet} (tx ${tx})`)
  }

  // A wallet already claimable is worth saying out loud: it is the only number
  // in this output that a worker can act on.
  for (const row of work.accruals) {
    const accrual = await readWorkerAccrual(conn, keyOf(row.campaign), row.wallet).catch(() => null)
    if (accrual != null) console.log(`  ${row.wallet} now holds ${accrual.claimable} micro-USDC from ${row.campaign}`)
  }

  // The settlement stamp is what lets an advertiser take unspent money back
  // without touching a minute that has not been booked yet. Every campaign the
  // service knows about is stamped, including one that served nothing: an
  // advertiser closing an unused campaign still needs the stamp.
  const all = await fetchCampaigns(options.adsUrl, options.day)
  for (const campaign of new Set([...report.campaigns.map(c => c.campaign), ...all])) {
    if (campaign === 'legacy') continue
    const tx = await settleCampaignDay(conn, attestor, keyOf(campaign), dayIndex(options.day)).catch(() => null)
    if (tx != null) console.log(`  settled ${options.day} for ${campaign} (tx ${tx})`)
  }

  console.log(`\n${written} write(s) confirmed`)
}

/** Days on chain are a day index, not a date string: `floor(ms / 86_400_000)`. */
function dayIndex(day: string): number {
  return Math.floor(Date.parse(`${day}T00:00:00.000Z`) / 86_400_000)
}

main().catch((error) => {
  console.error(`attestor failed: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
