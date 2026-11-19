// The attestor's decision, with no I/O in it.
//
// `plan()` answers one question: given what the ads service says a day earned,
// given what this machine already booked, and given what a worker's wallet has
// received in tips — what should be written to chain?
//
// Keeping this pure is what makes the service testable without a cluster: every
// number that reaches `accrue` or `attest` is produced here, and the tests below
// pin the two rules that keep it honest (book the delta, not the total; never
// count a self-tip).

/** One campaign's row in the ads service's daily report. */
export type ReportCampaign = {
  /** the campaign account the minutes are payable from */
  campaign: string
  /** that campaign's price for one sponsored minute, as the operator sees it */
  ratePerMinuteMicro: string
  /** wallet → sponsored started minutes booked against this campaign */
  workers: Record<string, number>
}

export type DayReport = {
  day: string
  /**
   * 0.4 has one campaign per advertiser, so a day is a list. Each campaign pays
   * its own rate out of its own vault; nothing is pooled.
   */
  campaigns: ReportCampaign[]
}

/** What this machine already wrote for that day. */
export type DayLedger = {
  day: string
  /** wallet → minutes already accrued on chain */
  accrued: Record<string, number>
  /** wallet → the nonce last used for that day's attestation */
  nonce: Record<string, number>
}

export function emptyLedger(day: string): DayLedger {
  return { day, accrued: {}, nonce: {} }
}

export type AccrualPlan = {
  campaign: string
  wallet: string
  /** minutes to book now (the delta) */
  minutes: number
  /** minutes the report claims for the whole day, for this campaign */
  totalMinutes: number
}

export type AttestPlan = {
  wallet: string
  minutes: number
  sessions: number
  tipMicro: bigint
  tipCount: number
  tippers: number
  nonce: number
  evidenceRoot: Uint8Array
}

export type TipsForWorker = {
  totalMicro: bigint
  count: number
  distinctTippers: number
}

export type Plan = {
  day: string
  accruals: AccrualPlan[]
  attestations: AttestPlan[]
  /** wallets the report names, but which have no Worker account on chain */
  unregistered: string[]
  /** rows the report mentions but the campaign cannot cover; reported, not retried */
  skipped: Array<{ campaign?: string; wallet: string; minutes: number; reason: string }>
}

/** A single `accrue` may book at most this many minutes (the program's limit). */
export const MAX_ACCRUE_MINUTES = 1_440

/** Refuse to write a day whose report is older or newer than asked for. The
 *  service exists to settle one specific day; a mismatch is a bug upstream. */
export function plan(input: {
  report: DayReport
  ledger: DayLedger
  tips: Map<string, TipsForWorker>
  /** wallets that have a Worker account; `accrue` refuses the rest */
  registered?: ReadonlySet<string>
  /** campaigns the chain says are paused; accruals against them are skipped */
  paused?: ReadonlySet<string>
  rootOf: (evidence: string[]) => Uint8Array
}): Plan {
  const { report, ledger, tips, rootOf } = input

  if (report.day !== ledger.day) {
    throw new Error(`report day ${report.day} does not match ledger day ${ledger.day}`)
  }

  const accruals: AccrualPlan[] = []
  const attestations: AttestPlan[] = []
  const skipped: Plan['skipped'] = []
  const unregistered: string[] = []

  // Minutes summed across campaigns, because reputation is one row per wallet
  // per day: a worker should not get a better score by being spread over five
  // advertisers.
  const perWallet = new Map<string, number>()
  for (const campaign of report.campaigns) {
    for (const [wallet, minutes] of Object.entries(campaign.workers)) {
      perWallet.set(wallet, (perWallet.get(wallet) ?? 0) + minutes)
    }
  }

  for (const campaign of report.campaigns) {
    if (input.paused?.has(campaign.campaign) === true) {
      for (const [wallet, minutes] of Object.entries(campaign.workers)) {
        if (minutes > 0) skipped.push({ campaign: campaign.campaign, wallet, minutes, reason: 'campaign is paused' })
      }

      continue
    }

    for (const [wallet, total] of Object.entries(campaign.workers).sort(([a], [b]) => a.localeCompare(b))) {
      // `accrue` reads the Worker account and refuses a wallet without one, so a
      // listing that was never written (or was removed) is reported here instead
      // of failing the whole day on chain.
      if (input.registered != null && !input.registered.has(wallet)) {
        unregistered.push(wallet)

        continue
      }

      const key = `${campaign.campaign}:${wallet}`
      const booked = ledger.accrued[key] ?? 0
      const delta = total - booked

      if (delta < 0) {
        // The ads service lost minutes it had already reported. That is a bug or
        // a manual edit, and the chain cannot take a minute back — say so
        // instead of inventing an adjustment.
        skipped.push({
          campaign: campaign.campaign,
          wallet,
          minutes: total,
          reason: `report shrank from ${booked} to ${total}`,
        })

        continue
      }

      if (delta <= 0) continue

      if (delta > MAX_ACCRUE_MINUTES) {
        // Split rather than refuse: a worker cannot serve more than a day of
        // minutes, but a re-run after a long outage can owe more than one call.
        for (let left = delta; left > 0; left -= MAX_ACCRUE_MINUTES) {
          accruals.push({
            campaign: campaign.campaign,
            wallet,
            minutes: Math.min(left, MAX_ACCRUE_MINUTES),
            totalMinutes: total,
          })
        }
      } else {
        accruals.push({ campaign: campaign.campaign, wallet, minutes: delta, totalMinutes: total })
      }
    }
  }

  const wallets = new Set([...perWallet.keys(), ...Object.keys(ledger.accrued), ...tips.keys()])
  for (const wallet of [...wallets].sort()) {
    const total = perWallet.get(wallet) ?? 0

    // A day with no minutes and no tips has nothing to attest: a reputation row
    // full of zeroes would only cost rent.
    const tip = tips.get(wallet)
    const hasTips = tip != null && tip.count > 0

    if (total === 0 && !hasTips) continue

    const evidence = [
      `day:${report.day}`,
      `worker:${wallet}`,
      `minutes:${total}`,
      `sessions:${total}`,
      `tips:${tip?.totalMicro ?? 0n}`,
      `tipcount:${tip?.count ?? 0}`,
      `tippers:${tip?.distinctTippers ?? 0}`,
    ]

    attestations.push({
      wallet,
      minutes: total,
      // 0.3 sponsors at most one minute per session, so minutes and sessions are
      // the same number by construction. Kept as a separate field because the
      // program and the score treat them as separate facts.
      sessions: total,
      tipMicro: tip?.totalMicro ?? 0n,
      tipCount: tip?.count ?? 0,
      tippers: tip?.distinctTippers ?? 0,
      nonce: (ledger.nonce[wallet] ?? 0) + 1,
      evidenceRoot: rootOf(evidence),
    })
  }

  return { day: report.day, accruals, attestations, skipped, unregistered }
}

/** Apply a successful write to the ledger. Failing writes must not call this. */
export function record(
  ledger: DayLedger,
  done: { campaign?: string; wallet: string; minutes?: number; nonce?: number },
): DayLedger {
  const accrued = { ...ledger.accrued }
  const nonce = { ...ledger.nonce }

  // Accruals are keyed by campaign AND wallet; a reputation nonce is per wallet.
  if (done.minutes != null) {
    const key = done.campaign == null ? done.wallet : `${done.campaign}:${done.wallet}`
    accrued[key] = (accrued[key] ?? 0) + done.minutes
  }
  if (done.nonce != null) nonce[done.wallet] = Math.max(nonce[done.wallet] ?? 0, done.nonce)

  return { day: ledger.day, accrued, nonce }
}
