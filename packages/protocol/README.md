# @genkaku/protocol

Solana bindings, tips and sponsored minutes, the libp2p sidecar and the Ollama bridge for
[GenKaKu](https://genkaku.app/en/) — a peer-to-peer network for AI compute
settled in USDC on Solana.

The protocol core has no dependency on DeepSeek Harness. The two plugins are
adapters on top of it; another harness should not require touching this
package.

## Status

0.3. One Solana program runs on devnet (a 6-decimal test token) and will run on
mainnet-beta (Circle's USDC) at the same address; the account graph is identical
because the program id is. Inference is free to the user: the program holds a
campaign's USDC, pays a worker for sponsored minutes, records a daily
reputation, and never holds a user's money. There is no GenKaKu token and no
staking.

## What is in here

| Module | What it does |
| --- | --- |
| `chain.ts` | Directory, tips, campaign accrual and claims — the product's verbs |
| `solana.ts` | Byte layouts, instruction encoding, account decoding |
| `netconfig.ts` | Cluster constants, program id, USDC mint, baked seed |
| `rpc.ts` | Zero-config public RPC probe |
| `offer.ts` | Offer board rows, hourly quote, started-minute billing |
| `capabilities.ts` | Ollama capability → model tier (`agent` / `light` / `chat`) |
| `privacy.ts` | One-time pairing codes, wallet allowlist, `accessFor()` |
| `userPrefs.ts` | Search, sort, ticked `(worker, model)` keys, cap of ten |
| `p2pNode.ts` | Worker libp2p node and `/genkaku/*` protocols |
| `bridge.ts` | User-side bridge: discovery, streaming, tips, placements |
| `dial.ts` | Dialling, relay usage, seed peer discovery |
| `walletControl.ts` | Local wallet actions: export, import, rotate, claim |
| `status.ts` | Local status server (panel + JSON) |

## On-chain

One program, deployed at the same address on both clusters:

| Thing | Address |
| --- | --- |
| Program | `HNhLkDSqLdsqW5jp53iDcvxQrdqwTvr3N5F72MQNcjtx` |
| USDC (mainnet) | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` |
| USDC (devnet, test) | `4X61aN7pu93j7KkTJByu6GDGU6kj8PbyPSUghoZzP4yu` |
| Registry config | `["registry"]` PDA |
| Attestor config | `["attestor"]` PDA |
| Campaign | `["campaign"]` PDA |
| Worker accrual | `["accrual", wallet]` PDA |
| Reputation | `["rep", wallet, day]` PDA |

The worker/treasury split is 99/1 and is a program constant. Addresses are
derived from the program id, so they are the same on devnet and mainnet; only
the USDC mint difference matters to a user.

## Billing

```
pricePerHour : 6-decimal USDC, set by the worker
unit         : 1 minute (60 units per hour)
billed       : ceil(elapsed / 1min) × ceil(pricePerHour / 60)
```

A quote of `0` means free: no session, no fee, no transaction. A paid session is
two transactions — the user opens and funds it, the worker settles it — plus the
worker's claim ten minutes after the last settlement.

## Private workers

A worker is public (directory + seed announcement) or private (neither, plus an
allowlist of wallets). Visibility is a worker property, not a program one: the
chain row always exists, because settlement needs an account to pay, and a
private worker keeps `active = 1` with an empty locator — `open_session` refuses
an inactive worker.

Access is granted by single-use pairing codes:

```
genkaku1.<base64url({ peerId, wallet, name, addrs, relay, secret, exp })>
```

Only `sha256(secret)` is stored, with a 15-minute expiry and a `usedAt` stamp.
Redeeming binds the redeemer's wallet, and the check on later connections runs
on the transport-authenticated `connection.remotePeer` converted by
`walletOfPeerId()` — no bearer token, no second signature.

## Client preferences

`userPrefs.ts` owns what the user chose: `selected` (ticked `(worker, model)`
keys, at most `MAX_SELECTED_MODELS` = 10), `seeded` (false until the list has
been materialised once), `sort` (one of six orders) and `privatePeers` (paired
private workers). The bridge is the only writer and enforces the cap; `status()`
and `models()` share the same `sortRows`. A chat model id is
`gk.<sha8 of peer id>.<model>`.

## Use

This package is not meant to be installed directly. Use one of the plugins:

```bash
dsh plugin add @genkaku/dsh-worker-plugin   # share this machine's models
dsh plugin add @genkaku/dsh-user-plugin     # use network models
```

## Testing

Three levels, each cheaper to run than the next one is convincing:

```bash
pnpm test                     # unit tests, no network
pnpm cluster:smoke            # the deployed program on GENKAKU_RPC_URL
pnpm e2e:pairing              # pairing code → allowlist → private dial over libp2p
pnpm e2e:claim                # settle, wait out the 10-minute delay, claim 99/1
pnpm e2e:session              # both plugins over real libp2p, then settle/1
```

`cluster:init` creates a fresh cluster's accounts (devnet only: it also creates
the test mint) and prints the addresses to bake into `netconfig.ts` and the
website. `e2e:chain` runs the whole lifecycle against `solana-test-validator`.
`e2e:claim` takes about ten minutes because it waits out the real payout delay;
`treasury_accrued` is a running total across sessions, so its assertions are on
deltas.

`e2e:session` needs **Node 22** — libp2p's dependencies use
`Promise.withResolvers`. It builds a sidecar with a scripted token stream, dials
it from a user node, streams an answer, has the worker sign `settle`, and closes
the session: the parts a chain-only test cannot reach.

## Documentation

<https://genkaku.app/docs/>

## License

Dual licensed: **AGPL-3.0-or-later** for open-source use, or a **commercial
license** for use that cannot accept AGPL's copyleft terms. See `LICENSE` in
this package and <https://github.com/mlaimail77/genkaku/blob/main/LICENSING.md>.

Versions published to npm before this change (protocol 0.1.24, dsh-runtime
0.1.32, worker 0.1.39, user 0.1.35) remain available under MIT.
