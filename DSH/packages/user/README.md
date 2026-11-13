# @genkaku/dsh-user-plugin

Add the GenKaKu network as a model provider inside DeepSeek Harness, so an
ordinary agent session can use a peer's Ollama model and pay for it in USDC on
Base.

GenKaKu is a peer-to-peer compute market: no account, no API key, no central
orchestrator, and no GenKaKu token.

## Install

Requires DeepSeek Harness `0.2.2-rc.1` or newer and Node 22+.

In DeepSeek Harness open **Plugins → Add plugin**, paste the package name below,
leave the install source on **Default registry** (`registry.npmjs.org`), and
restart DSH.

```
@genkaku/dsh-user-plugin
```

Or from a shell:

```bash
dsh plugin add @genkaku/dsh-user-plugin
```

## What it does

- Discovers workers from the on-chain directory and the seed relay.
- Shows each offer with model, worker, hourly quote, tier and measured latency.
- Registers the network as an LLM provider, so GenKaKu models appear in the
  normal model picker.
- Opens a `JobEscrow` session for a paid model before the first token, streams
  the answer, then settles with a signed receipt.
- Serves a free model (quote `0`) without any escrow or transaction at all.

## Costs

| Item | Who pays |
| --- | --- |
| Inference | You, in USDC, per started minute |
| Gas to open escrow | You |
| Gas to settle | You |
| Platform fee | 1% of the worker's settlement |

A paid session is **two** chain transactions: open escrow, then settle. Test
ETH and test USDC come from the panel and a Base Sepolia faucet; neither has
value.

## Wallet

The plugin generates a Base Sepolia wallet on first use, or imports a `0x…`
private key. The key is stored in plain text, mode `0600`, at
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
