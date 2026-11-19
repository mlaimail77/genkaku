# @genkaku/dsh-worker-plugin

Share the Ollama models already installed on this machine on the GenKaKu
network, at a price you set. Payments settle in USDC on Solana, per started
minute.

GenKaKu is a peer-to-peer compute market for DeepSeek Harness: no account, no
central orchestrator, and no GenKaKu token.

## Install

Requires DeepSeek Harness `0.2.2-rc.1` or newer, Node 22+, and Ollama with at
least one model pulled.

In DeepSeek Harness open **Plugins → Add plugin**, paste the package name below,
leave the install source on **Default registry** (`registry.npmjs.org`), and
restart DSH.

```
@genkaku/dsh-worker-plugin@0.2.0-rc.7
```

Or from a shell:

```bash
dsh plugin add @genkaku/dsh-worker-plugin@0.2.0-rc.7
```

## What it does

- Finds Ollama at `http://127.0.0.1:11434`, or starts `ollama serve` itself.
- Lists every local model on the offer board when the catalog is empty.
- Quotes an hourly price per model. **A price of `0` is free**: the model is
  served without opening a session, paying a fee, or writing anything on-chain.
- Registers the worker on chain when you turn on **Publish this worker
  on-chain** — opt-in, off by default, and only possible when the machine has a
  globally dialable address. With settlement on, the worker's account is written
  even without an address, because the settlement instruction pays it.
- Settles paid sessions itself: its transaction signature is the proof it
  served, 99% accrues to the worker and 1% to the treasury, and a claim pays it
  out ten minutes after the last settlement.

Billing accrues per **started minute** of a session, so a two-minute job pays
two minutes at the hourly rate, not a full hour.

## Name and access

- **Display name** (`workerName`, default `dsh-genkaku`) — a personal name, an
  ID or a nickname. Users search and sort by it and it is how credit
  accumulates against a worker. It is not written on chain: the program stores
  the wallet, peer id, rate and locator only.
- **Public** — the worker is in the on-chain directory and announces to the
  seed, so any user who finds its peer id can dial it.
- **Private** — no seed announcement and no locator on chain, so there is
  nothing for a stranger to dial. The chain row stays **active**, because
  `open_session` refuses an inactive worker and settlement pays that account.

Switching to private gives you **one-time pairing codes** in the panel:

```
genkaku1.<base64url({ peerId, wallet, name, addrs, relay, secret, exp })>
```

Send one to the user you want to serve. They paste it into the user plugin
once; the code is spent and their **wallet** is added to the allowlist. The
allowlist is enforced on the transport-authenticated `connection.remotePeer`,
so no token travels with a request and a leaked code is worthless from another
machine. Codes expire after 15 minutes, redeeming from the same wallet again is
idempotent, and unpairing takes effect immediately.

Private does not mean free: a private worker sets a price like any other, and
`0` is still free.

## Wallet

The plugin generates an ed25519 wallet on first use. It needs a little SOL for
fees and rent; USDC is what it earns (SPL USDC on Solana — Circle's token on
mainnet, a valueless mock mint on devnet).

The private key is stored in plain text, mode `0600`, at
`~/.dsh/genkaku/genkaku.keys.json`. It is also the worker's libp2p PeerId, so
rotating it changes the identity as well as the payout address. Back it up
before moving the machine, and treat anyone who can read that file as the owner
of the wallet.

## Model tiers

The marketplace labels models from Ollama's capabilities and parameter count:

- `agent` — has `tools`, at least 9B parameters
- `light` — has `tools`, small or unknown size
- `chat` — no `tools`; **not suitable for agents**

The label never blocks a listing.

## Requirements and ports

- A worker also needs a little SOL for network fees and rent.
- libp2p listens on TCP `4001` (IPv4) and `4002` (IPv6) by default.
- The local status server uses the first free port in `47821–47826`.
- On Windows, allow Node through the firewall on first start.

## Documentation

- [Run a worker](https://staging.genkaku.app/docs/worker-guide)
- [How it works](https://staging.genkaku.app/docs/how-it-works)

## License

Dual licensed: **AGPL-3.0-or-later** for open-source use, or a **commercial
license** for use that cannot accept AGPL's copyleft terms. See `LICENSE` in
this package and <https://github.com/mlaimail77/genkaku/blob/main/LICENSING.md>.

Versions published to npm before this change (protocol 0.1.24, dsh-runtime
0.1.32, worker 0.1.39, user 0.1.35) remain available under MIT.
