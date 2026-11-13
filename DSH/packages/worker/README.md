# @genkaku/dsh-worker-plugin

Share the Ollama models already installed on this machine on the GenKaKu
network, at a price you set. Payments settle in USDC on Base, per started
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
@genkaku/dsh-worker-plugin
```

Or from a shell:

```bash
dsh plugin add @genkaku/dsh-worker-plugin
```

## What it does

- Finds Ollama at `http://127.0.0.1:11434`, or starts `ollama serve` itself.
- Lists every local model on the offer board when the catalog is empty.
- Quotes an hourly price per model. **A price of `0` is free**: the model is
  served without opening escrow, spending gas, or writing anything on-chain.
- Registers the worker in `WorkerRegistry` when you turn on **Publish this
  worker on-chain** — opt-in, off by default, and only possible when the machine
  has a globally dialable address.
- Settles paid sessions with a signed receipt: 99% to the worker, 1% to the
  treasury, accrued inside `JobEscrow` until you press **Claim**.

Billing accrues per **started minute** of a session, so a two-minute job pays
two minutes at the hourly rate, not a full hour.

## Wallet

The plugin generates a Base Sepolia wallet on first use. It needs a little test
ETH for gas; USDC is what it earns.

The private key is stored in plain text, mode `0600`, at
`~/.dsh/genkaku/genkaku.keys.json`. Back it up before moving the machine, and
treat anyone who can read that file as the owner of the wallet.

## Model tiers

The marketplace labels models from Ollama's capabilities and parameter count:

- `agent` — has `tools`, at least 9B parameters
- `light` — has `tools`, small or unknown size
- `chat` — no `tools`; **not suitable for agents**

The label never blocks a listing.

## Requirements and ports

- A worker also needs a little Base Sepolia ETH for gas.
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
