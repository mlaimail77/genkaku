# GenKaKu

Peer-to-peer AI compute for [DeepSeek Harness](https://www.deepseek.com/en/harness/).
A **worker** shares the Ollama models already installed on its machine; a **user**
points an ordinary agent session at one of those workers and pays in USDC on
Base, per started minute.

There is no central server in the request path. The directory is a smart
contract, the connection is libp2p, and settlement is an on-chain escrow
released against a signed receipt.

This repository is the production source: the two DeepSeek Harness plugins, the
seed relay, the operator console and the Solidity contracts. The website, the
documentation site and the legal pages are built from a separate, private
repository.

## Repository layout

| Path | What it is |
| --- | --- |
| `DSH/packages/protocol` | Chain bindings, escrow billing, libp2p sidecar, Ollama bridge |
| `DSH/packages/dsh-runtime` | The adapter both plugins share |
| `DSH/packages/worker` | Worker plugin — serves this machine's models |
| `DSH/packages/user` | User plugin — adds the network as a model provider |
| `seed/` | libp2p relay and peer discovery service |
| `admin/` | Operator console for the seed host (no wallet keys, no funds) |
| `web3/` | Foundry project: `WorkerRegistry`, `JobEscrow`, test `MockUSDC` |

## Install the plugins

Requires DeepSeek Harness `0.2.2-rc.1` or newer, Node 22+, and — for the worker
— Ollama with at least one model pulled.

```bash
dsh plugin add @genkaku/dsh-worker-plugin   # share this machine's models
dsh plugin add @genkaku/dsh-user-plugin     # use network models
```

In the harness UI: **Plugins → Add plugin**, paste the package name, leave the
install source on **Default registry** (`registry.npmjs.org`), then restart.

## Pricing

A worker sets an hourly quote; billing accrues per **started minute**, so a
two-minute job pays two minutes. A quote of `0` means **free**: the model is
listed and served with no escrow, no gas and no transaction.

A paid session costs the user two chain transactions: open escrow, then settle.
99% of the settlement goes to the worker, 1% to the treasury — both are contract
constants.

## Status

**Experimental, Base Sepolia only (chain ID 84532).** The plugin refuses a
mainnet chain ID; mainnet write paths throw on purpose. There is no GenKaKu
token, no sale and no staking.

Contracts in use on Base Sepolia:

| Contract | Address |
| --- | --- |
| WorkerRegistry | `0xFbE9FF497dC24bD69d13E4201418938Df7435Ff6` |
| JobEscrow | `0x8175df796A659681009BeDa4609a3cFe9d281D82` |
| MockUSDC (test only) | `0xEb33DFC0424810039337a38510ef522e9E7F9727` |

See [`web3/deployments/base-sepolia.json`](./web3/deployments/base-sepolia.json)
for the full record.

## Build

```bash
pnpm install
pnpm build          # every workspace package
pnpm typecheck
pnpm test
```

Contracts need [Foundry](https://book.getfoundry.sh/):

```bash
git submodule update --init --recursive
pnpm contracts:build
pnpm contracts:test
```

## Documentation

- Website: <https://staging.genkaku.app/en/>
- Docs: <https://staging.genkaku.app/docs/>
- Run a worker: <https://staging.genkaku.app/docs/worker-guide>
- Use network models: <https://staging.genkaku.app/docs/user-guide>

## Security

Wallets are generated locally. The private key is stored **in plain text**, mode
`0600`, at `~/.dsh/genkaku/genkaku.keys.json`, because DeepSeek Harness exposes
no keyring codec. Treat anyone who can read that file as the owner of the
wallet.

There is no automatic content filter in the protocol. Filtering, where it
exists, comes from the model publisher, the inference runtime and the worker
operator, who may refuse a request.

Report security issues to `security@genkaku.app`.

## License

Dual licensed: **AGPL-3.0-or-later** for open-source use, or a **commercial
license** for use that cannot accept AGPL's copyleft terms. See
[`LICENSING.md`](./LICENSING.md) and [`LICENSE`](./LICENSE).
