# @genkaku/dsh-runtime

The DeepSeek Harness adapter that both GenKaKu plugins share. It wires the
`@genkaku/protocol` sidecar into a DSH plugin: settings, wallet vault, mode
management, discovery, the local status server and clean teardown.

Install a plugin, not this package:

```bash
dsh plugin add @genkaku/dsh-worker-plugin   # supply side
dsh plugin add @genkaku/dsh-user-plugin     # demand side
```

## What it provides

- `defineGenkakuPlugin()` — builds the exact shape DSH expects (`name`,
  `inject`, `Config`, `apply`) for a given role.
- A settings document per plugin (`genkaku-worker`, `genkaku-user`), so the
  two halves never overwrite each other.
- A local wallet vault under `keyDir` (default `~/.dsh/genkaku`).
- Startup that never blocks the harness: chain sync, Ollama discovery and the
  paywall report failures in the panel instead of preventing the UI from
  booting.

## Configuration

| Key | Default | Meaning |
| --- | --- | --- |
| `mode` | `user` | `user`, `localPlusSharing` or `workerDedicated` |
| `env` | `base-sepolia` | `base` exists but its write paths throw |
| `port` | `47821` | first status-server port to try |
| `workers` | `[]` | manually pinned worker multiaddrs |
| `settle` | `true` | open escrow for paid sessions |
| `paywall` | `true` | worker may refuse unpaid sessions |
| `keyDir` | `~/.dsh/genkaku` | wallet and state directory |
| `catalog` | `[]` | explicit model/price rows |
| `autoCatalog` | `true` | list every local model when the catalog is empty |
| `defaultPricePerHour` | `0` | price used by `autoCatalog`; 0 is free |
| `listen` | `/ip4/0.0.0.0/tcp/4001`, `/ip6/::/tcp/4002` | libp2p binds |
| `publishAddress` | `false` | opt in to writing a public locator on-chain |
| `workerName` | `dsh-genkaku` | name on the offer board |
| `spawnOllama` | `true` | start `ollama serve` if it is installed |
| `ollamaHost` | `http://127.0.0.1:11434` | local Ollama base URL |

The status server binds the first free port in **47821–47826**. Two DSH
profiles on one machine each need their own port.

## Keys

DeepSeek Harness exposes no keyring codec, so the vault is a plaintext
pass-through: signing keys sit unencrypted in `keyDir` with mode `0600`. The
plugin warns about this at startup. Restrict the directory.

## Documentation

<https://staging.genkaku.app/docs/>

## License

Dual licensed: **AGPL-3.0-or-later** for open-source use, or a **commercial
license** for use that cannot accept AGPL's copyleft terms. See `LICENSE` in
this package and <https://github.com/mlaimail77/genkaku/blob/main/LICENSING.md>.

Versions published to npm before this change (protocol 0.1.24, dsh-runtime
0.1.32, worker 0.1.39, user 0.1.35) remain available under MIT.
