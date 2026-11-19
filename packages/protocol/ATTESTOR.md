# The daily attestor

The one job that turns advertising revenue into a worker's income.

0.3 pays a worker for **sponsored minutes**: one placement shown ⇒ one started
minute accrued to the wallet that served that session. The ads service already
records those minutes in its own daily ledger (`/ads/v1/report`). This service
is what puts them on chain:

```text
  GET  /ads/v1/report?day=YYYY-MM-DD      (public, the arithmetic)
        │
        ├── accrue(worker, minutes, day)  → campaign pays, worker can claim
        └── attest(worker, day, …)        → reputation PDA, score computed on chain
```

It lives in this package because it uses this package's chain verbs, but it is
not part of what a plugin install runs. It holds the attestor key, which can
spend a campaign's money, so it runs on the operator's machine next to the seed
and nowhere else.

## Why it is a separate service

`accrue` is the only instruction that creates an obligation, and it is signed by
one key. Keeping that key out of the plugin, out of the web app and out of the
admin console means the blast radius of a compromise is "a day of campaign
budget", and rotating it is `set_attestor` rather than a release.

What the program guarantees regardless of this service: an accrued minute cannot
be withdrawn by the operator, and `accrue` refuses to book more than the campaign
holds un-accrued. What it cannot guarantee is that this service runs — that is
what a systemd timer and the public report are for.

## Running it

```bash
# what would happen, with no transactions sent
npx tsx packages/protocol/scripts/attest.ts --day 2026-11-18 --dry-run

# or through the package script
pnpm --filter @genkaku/protocol attest --day 2026-11-18

# the real thing (defaults to yesterday, UTC)
GENKAKU_ATTESTOR_KEY=$HOME/.config/solana/genkaku-attestor-devnet.json \
GENKAKU_ADS_URL=https://seed.genkaku.app/ads/v1 \
npx tsx packages/protocol/scripts/attest.ts
```

| Flag / env | Meaning |
| --- | --- |
| `--day YYYY-MM-DD` | UTC day to settle; defaults to yesterday |
| `--dry-run` | read, plan, print — no transactions |
| `GENKAKU_ATTESTOR_KEY` | base58 secret or a keypair file (required) |
| `GENKAKU_ADS_URL` | ads service base, default `https://seed.genkaku.app/ads/v1` |
| `GENKAKU_NET_ENV` | `solana-devnet` (default) or `solana-mainnet` |
| `GENKAKU_ATTESTOR_STATE` | where the local ledger lives, default `~/.dsh/genkaku/attestor` |

## Running it twice is safe

A day can be re-run: the ads service's ledger grows during the day, a first run
can fail halfway, and an operator will always want to re-run after fixing
something. So the service keeps a local ledger of what it already booked
(`<state>/YYYY-MM-DD.json`) and accrues only the **delta**:

```text
  report says 40 minutes for W   ledger says 25 booked   → accrue 15
  report says 40 minutes for W   ledger says 40 booked   → nothing
```

Reputation is not delta-based; it is rewritten with a higher `nonce`, which is
what the program requires. A failed write leaves the ledger untouched, so the
next run retries the same delta.

## What it refuses to do

* Book minutes to a wallet that is not a registered worker — `accrue` reads the
  Worker account, and a wallet without one fails.
* Book more than the campaign holds — the program returns
  `CampaignUnderfunded`; the run reports it and leaves the ledger unadvanced.
* Count a worker's own tip as a distinct tipper — the score's only available
  anti-Sybil rule, applied when tips are read.
* Pretend it ran: every write prints its signature, and `--dry-run` prints the
  plan with no side effects.
