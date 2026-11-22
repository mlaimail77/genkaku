# @genkaku/dsh-user-plugin

Add the GenKaKu network as a model provider inside DeepSeek Harness, so an
ordinary agent session can use a peer's Ollama model while a sponsored
placement covers the cost.

GenKaKu is a peer-to-peer compute network: no account, no API key, no central
orchestrator, and no GenKaKu token.

## Install

Requires DeepSeek Harness `0.2.2-rc.1` or newer and Node 22+.

In DeepSeek Harness open **Plugins → Add plugin**, paste the package name below,
leave the install source on **Default registry** (`registry.npmjs.org`), and
restart DSH.

```
@genkaku/dsh-user-plugin@0.5.0-rc.8
```

Or from a shell:

```bash
dsh plugin add @genkaku/dsh-user-plugin@0.5.0-rc.8
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
| Inference | Nobody — a session is free |
| Sponsored placement | The advertiser, per impression |
| Tip to a worker | You, straight to the worker's wallet |
| Network fee for a tip | You, a fraction of a cent in SOL |

There is no platform fee and no escrow on this path: the advertiser's campaign
pays the worker for the minute its placement was shown, and a tip is a plain
transfer from your wallet to the worker's. GenKaKu never holds either. On devnet
the panel can mint test USDC, which has no value; on mainnet USDC is Circle's
token and SOL covers fees.

## Agent Routes

Agent Routes turns one model picker row into a small team: a main model plus up
to eight specialists, each on a model you choose. It is off by default and
changes nothing until you turn it on **and** pick `GenKaKu · Agent Routes` in
the chat model picker — every other row behaves exactly as before.

- **Main model** — answers you. It may be a cloud model the harness already has
  configured (the panel never sees an API key) or a model on the network. An
  empty local choice means "any worker", resolved at call time so a worker going
  away does not break the team.
- **Specialists** — a name, when the main model should hand work over, when it
  should not, optional examples, a model, and role instructions. They are full
  agents: they can read files and use tools. They cannot delegate further, so
  the tree is one level deep.
- **Who picks** — `model-decides` gives the main model one `delegate` tool whose
  enum is your specialists, so a tool-capable model chooses. `router-decides`
  picks with a local heuristic before the main call; it is also selected
  automatically when the main model is chat-only or the tools box is unticked.
  That is what lets a weak model still run a team.
- **Delegation record** — the last twenty handoffs are listed in the panel with
  the specialist, the model that actually ran, how long it took, and any error.

The config lives in `~/.dsh/genkaku/team.json` and the record in
`team-decisions.json`, both mode `0600` next to the wallet. A save takes effect
on the next turn: the panel, the bridge and the model adapter share one process.
Nothing in this feature touches money — sessions stay free and tips stay direct.

### Setting a team up

The hard part is not routing, it is that most people have no words for how
their own work divides. The panel offers three ways in:

- **Templates** — four filled-in specialists (translation, research, editing,
  code). One click, no model call, translated into the panel's language.
- **Advisor** — describe what you actually ask an AI to do, in a few sentences.
  The advisor proposes at most four specialists, each with a `whenToUse`, a
  `whenNotToUse`, three examples and role instructions, and the panel applies
  the ones you accept. It is one model call: free on the network, or your own
  key on a cloud model. It can also **review** an existing team and point out
  overlapping specialists, a description that is too broad, or a chat-only
  model given file work. The advisor never routes to `genkaku/team` itself.
- **Cards** — a specialist as a portable file or code.

The advisor sees your real route list and the engine's real limits (a
`whenToUse` over 400 characters is cut before the main model sees it; the
router only reads the prose fields), so its advice matches the code rather
than a generic article about agents. A suggested route that is not in your
list is re-resolved against your own board and shown as adjusted.

### Cards

A card is one specialist as a file: `{"genkaku":"agent-card/1", …}`. It carries
the prose, the examples and the role instructions — **not** a model id, because
`gk.w1.llama3` names a worker that exists on the sender's board and nowhere
else. Instead it carries a hint ("any agent-capable local worker", "the fastest
one", "a DeepSeek model") that the receiving machine resolves against its own
catalog. The panel shows the resolved model before the card joins the team, and
says so when it had to substitute.

- **Import** — paste a card, a pack, or a share code; or drop a `.json` file.
- **Share** — a specialist you wrote, or a card in the library, becomes
  `gkcard1.…` (gzip + base64url, ~450 characters for one card) and a link
  `https://genkaku.app/c/#gkcard1.…`. The payload lives in the fragment, so the
  site never receives it; the page is a viewer, not a host.
- **Library** — `~/.dsh/genkaku/cards.json` (mode `0600`), an inbox of up to 64
  cards. Importing does not change the team: applying does, through the same
  draft-and-save as the form.

A card can only carry specialist fields. It cannot set `enabled`, `main` or a
delegation limit, and it never contains executable code or a URL fetched at
runtime. It is still instructions for an agent that can read files, so read the
role text before applying a card from someone you do not know — the panel shows
it for exactly that reason.

### The registry

`https://seed.genkaku.app/cards/v1/index.json` is a small curated list, served
from the seed host next to the ad catalog. The panel shows it under **From the
network**, with a search box and tag chips.

- **Read-only.** There is no upload endpoint, no account and no rating. Those
  three turn a list into a marketplace, and a marketplace needs moderation the
  operator did not ask for.
- **Hash-checked.** The index names a size and a sha256 for every card; a file
  that does not match is refused rather than run. A card edited on the server
  without the index being rebuilt does not reach anyone.
- **Fail-safe.** An unreachable or unparsable index is an empty list marked
  `offline`; the local library and the import box keep working. The index is
  cached for ten minutes, so a stale entry costs nothing.
- **Publishing is a pull request.** The panel's **Submit to the registry**
  button opens a prefilled GitHub issue with the card JSON and a four-line
  checklist; a maintainer turns it into a card file under `cards/`.

The list itself lives in the public repository (`cards/`), where
`scripts/build-cards.mjs` validates each file with the plugin's own reader and
regenerates the index, and `scripts/publish-cards.sh` uploads it to the seed
host. The `cardsUrl` setting points the plugin somewhere else if you run your
own registry.

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
