# @genkaku/dsh-user-plugin

Add the GenKaKu network as a model provider inside DeepSeek Harness, so an
ordinary agent session can use a peer's Ollama model and pay for it in USDC on
Solana.

GenKaKu is a peer-to-peer compute market: no account, no API key, no central
orchestrator, and no GenKaKu token.

## Install

Requires DeepSeek Harness `0.2.2-rc.1` or newer and Node 22+.

In DeepSeek Harness open **Plugins → Add plugin**, paste the package name below,
leave the install source on **Default registry** (`registry.npmjs.org`), and
restart DSH.

```
@genkaku/dsh-user-plugin@0.2.0-rc.7
```

Or from a shell:

```bash
dsh plugin add @genkaku/dsh-user-plugin@0.2.0-rc.7
```

## What it does

- Discovers workers from the on-chain directory and the seed relay.
- Shows each offer with model, worker, hourly quote, tier and measured latency.
- Registers the network as an LLM provider, so GenKaKu models appear in the
  normal model picker.
- Opens and funds a USDC escrow session for a paid model before the first
  token, streams the answer, then has the worker settle it and closes the
  session so the unused deposit comes back.
- Serves a free model (quote `0`) without any session or transaction at all.

## Models on the network

The panel is the market list, and everything in it is local to the profile:

- **Search** across model name, worker display name and worker wallet.
- **Sort** by recommended, price per hour, measured latency, sessions served,
  model name or worker name.
- **Tick** the models that should appear in the chat model picker. A tick is one
  `(worker, model)` pair, so the same model from two workers is two rows and the
  picker labels them `worker · model`.
- **Cap of ten** ticked rows (`MAX_SELECTED_MODELS`), enforced in the bridge as
  well as the UI.
- **Private workers** — paste a `genkaku1.…` pairing code from a worker operator
  and that worker is added to the list even though it never appears in the
  directory. Paired workers are probed in the background; an empty board means
  "refused", not "online with no models".

On the first run the bridge ticks the ten best rows by the current sort, so the
plugin works before anyone configures it. After that the list is exactly what
was ticked — including empty, which is remembered by storing `seeded` next to
`selected` in `~/.dsh/genkaku/user.json`.

## Costs

| Item | Who pays |
| --- | --- |
| Inference | You, in USDC, per started minute |
| Network fee to open | You, a fraction of a cent in SOL |
| Network fee to settle | The worker |
| Platform fee | 1% of the settlement |

A paid session is **two** chain transactions, one from each side. On devnet the
panel can mint test USDC, which has no value; on mainnet USDC is Circle's token
and SOL covers fees.

## Spending limits

The **Budget** card is the ceiling the agent cannot cross. It works like an
API-key budget:

| Field | Default |
| --- | --- |
| Name | `everyday` |
| Credit limit | `10` USDC |
| Reset | `never` — or daily (UTC midnight), weekly (Monday), monthly (1st) |
| Expires | off |
| Enabled | on |
| Per session | `2` USDC |
| Max price per hour | off (no filter) |

A blank amount means no limit for that field. Edits commit when you leave the
field; there is no Save button.

The check happens **before a transaction is built**. A session the policy does
not allow returns HTTP `402` with a code — `budget_exhausted`, `session_cap`,
`price_cap`, `policy_disabled` or `policy_expired` — so nothing is deposited, no
fee is paid and the wallet does not sign. Models above the price cap are removed
from the picker, and free models are never blocked.

The policy lives in `~/.dsh/genkaku/policy.json` (mode `0600`) next to the spend
log `spend.jsonl`. Both are local files: no worker can read them, and nothing on
the network can raise the limit. Opening a session reserves its deposit, settling
commits what the worker billed and releases the rest, and a reservation left open
for 30 minutes counts as spent. The card reports total, today, this week, this
month, a per-model table and the last twenty sessions. **Delete policy** restores
the defaults and leaves the wallet untouched.

## Wallet

The plugin generates an ed25519 wallet on first use, or imports a base58 key
(Phantom's format) or a `solana-keygen` JSON file. The key is stored in plain
text, mode `0600`, at
`~/.dsh/genkaku/genkaku.keys.json`. We never hold it and cannot recover it.

The worker and user plugins each own a separate wallet and settings document,
so they can be installed on the same machine without interfering.

## Ports

The local bridge binds the first free port in `47821–47826` and only accepts a
bridge that reports the `user` role. A worker status server on the same machine
is ignored, not mistaken for the bridge.

## Documentation

- [Use network models](https://staging.genkaku.app/docs/user-guide)
- [How it works](https://staging.genkaku.app/docs/how-it-works)

## License

Dual licensed: **AGPL-3.0-or-later** for open-source use, or a **commercial
license** for use that cannot accept AGPL's copyleft terms. See `LICENSE` in
this package and <https://github.com/mlaimail77/genkaku/blob/main/LICENSING.md>.

Versions published to npm before this change (protocol 0.1.24, dsh-runtime
0.1.32, worker 0.1.39, user 0.1.35) remain available under MIT.
