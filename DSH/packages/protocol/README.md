# @genkaku/protocol

Chain bindings, escrow billing, the libp2p sidecar and the Ollama bridge for
[GenKaKu](https://staging.genkaku.app/en/) — a peer-to-peer market for AI
compute settled in USDC on Base.

The protocol core has no dependency on DeepSeek Harness. The two plugins are
adapters on top of it; another harness should not require touching this
package.

## Status

Experimental. **Base Sepolia only, chain ID 84532.** Write paths for mainnet
throw on purpose: canonical USDC and a multisig treasury are a separate launch,
not a configuration flag. There is no GenKaKu token and no staking.

## What is in here

| Module | What it does |
| --- | --- |
| `chain.ts` | WorkerRegistry / JobEscrow / USDC bindings, receipts, claims |
| `netconfig.ts` | Network constants, contract addresses, baked seed |
| `rpc.ts` | Zero-config public RPC fallback list |
| `offer.ts` | Offer board rows, hourly quote, started-minute billing |
| `capabilities.ts` | Ollama capability → model tier (`agent` / `light` / `chat`) |
| `p2pNode.ts` | Worker libp2p node and `/genkaku/*` protocols |
| `bridge.ts` | User-side bridge: discovery, escrow, streaming, settlement |
| `dial.ts` | Dialling, relay usage, seed peer discovery |
| `walletControl.ts` | Local wallet actions: export, import, rotate, claim |
| `status.ts` | Local status server (panel + JSON) |

## Contracts (Base Sepolia)

| Contract | Address |
| --- | --- |
| WorkerRegistry | `0xFbE9FF497dC24bD69d13E4201418938Df7435Ff6` |
| JobEscrow | `0x8175df796A659681009BeDa4609a3cFe9d281D82` |
| MockUSDC (test only) | `0xEb33DFC0424810039337a38510ef522e9E7F9727` |

Treasury: `0x639a2B713041e15B0c5C18710536b661d5265b48`. The worker/treasury
split is 99/1 and is a contract constant.

## Billing

```
pricePerHour : 6-decimal USDC, set by the worker
unit         : 1 minute (60 units per hour)
billed       : ceil(elapsed / 1min) × ceil(pricePerHour / 60)
```

A quote of `0` means free: no escrow, no gas, no transaction. A paid session is
two transactions — open escrow, then settle.

## Use

This package is not meant to be installed directly. Use one of the plugins:

```bash
dsh plugin add @genkaku/dsh-worker-plugin   # share this machine's models
dsh plugin add @genkaku/dsh-user-plugin     # use network models
```

## Documentation

<https://staging.genkaku.app/docs/>

## License

MIT
