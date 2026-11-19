# rc.05: the sponsor token

Status: **design, not built.** 0.3 as shipped has one honest gap, and this
document is the plan for closing it.

## The gap

A worker with `price_per_min > 0` is supposed to serve only while the platform
can pay for the session. Today it cannot tell, so it serves everyone:

* the user is never charged (correct for 0.3),
* the platform accrues at most one minute per session, and only when a placement
  was shown (correct),
* but a session that showed no placement still consumed a paid worker's GPU and
  earns that worker nothing.

Money is safe — `accrue` cannot promise what the campaign does not hold — but the
worker is doing unpaid work, and the ads-budget pause cannot reach it.

## Why not the old paywall

`paywall.ts` (deleted in rc.04) read the user's escrow session off chain and
refused unless it covered the price. There is no user session any more: the user
pays nothing. The gate has to be about **who is paying for this minute**, and the
only party that can is the campaign.

## The design: a signed grant per session

```
user bridge                         ads service                 worker
    │  POST /genkaku/grant           │                            │
    │  {worker, model, pricePerMin}  │                            │
    ├───────────────────────────────>│  1. is the catalog active?
    │                                │  2. is the day's budget left?
    │                                │  3. is the price ≤ rate cap?
    │<───────────────────────────────┤  4. sign {worker, model,   │
    │  {grant: base64, exp}          │     minute, day, exp}      │
    │                                                             │
    │  open/1 envelope: grant = <base64>                          │
    ├────────────────────────────────────────────────────────────>│
    │                                        verify ed25519 with │
    │                                        the ads service key │
    │                                        (baked in the plugin)│
```

* **One grant = one sponsored minute.** The worker refuses a session whose grant
  is missing, expired (five minutes), for a different wallet, or for a price
  above the campaign rate. A grant is not replayable across workers.
* **The ads service key is public.** It is published next to the catalog
  (`/ads/v1/key`), so the worker needs no configuration: fetch-and-pin at
  startup, refetch on rotation.
* **No new on-chain account.** Verification is local ed25519; the grant is
  evidence, not money. What it changes is only whether the worker starts.
* **The bridge asks before dialing.** If the grant is refused, the panel says
  "this worker is not sponsored right now" and falls back to a free worker. That
  is the behaviour 0.3 already promises; this makes it true.

## What has to change

| Where | Change |
| --- | --- |
| `ads` service | ed25519 keypair; `GET /ads/v1/key`; `POST /genkaku/grant`; sign `{worker, model, priceMicro, day, exp}`; count grants against the day's budget, not impressions |
| `protocol/ads.ts` | `parseGrant` / `verifyGrant` (ed25519 over the same canonical bytes the service signs) |
| `protocol/bridge.ts` | ask for a grant before a priced dial; put it in the open envelope; on refusal, return 402 with a reason the panel can show |
| `protocol/p2pNode.ts` | `sponsor?: (grant) => boolean` option; refuse a priced session without a valid grant |
| `dsh-runtime` | pass the verifier and the ads service URL to the worker sidecar |
| panels | user: "no sponsorship right now" instead of a generic failure; worker: a switch that says whether priced models require a grant (default on) |

## The budget moves from impressions to grants

Today one impression books one minute. With grants, the ads service decides
*before* the work whether it can pay for it:

```
grant issued ⟺ catalog active ∧ day budget ≥ rate ∧ price ≤ rate cap
```

An impression then records that the ad was *seen* (for the advertiser), while the
grant records that the minute is *owed* (for the worker). Two counters, two
purposes, one budget. The attestor keeps reading `/ads/v1/report`, which should
report granted minutes as the thing it pays for.

## What this deliberately does not do

* No on-chain grant account: the chain already caps what it can be asked to pay,
  and a per-minute account would cost rent per session.
* No user signature: the user has nothing at stake, so asking them to sign would
  be theatre.
* No revocation list: a five-minute expiry is the revocation.
