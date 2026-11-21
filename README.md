# GenKaKu — DSH worker and user plugins

**GenKaKu** is a peer-to-peer AI compute network for **[DeepSeek Harness (DSH)](https://www.deepseek.com/en/harness/)**.
Workers serve their local Ollama models over libp2p. Users pay nothing; a clearly
labelled sponsored placement at the end of an answer pays the worker, and an
optional tip goes straight from the user's wallet to the worker's.

This repository starts at **0.5.0-rc.2**. Earlier revisions are not part of this
history. It contains:

| Path | What it is |
| --- | --- |
| `packages/protocol` | Solana client, campaign accounting, attestor, libp2p sidecar, ad feed, wallet policy |
| `packages/dsh-runtime` | The DeepSeek Harness adapter shared by both plugins |
| `packages/worker` | DSH worker plugin: serves local Ollama models |
| `packages/user` | DSH user plugin: uses the network inside DSH, ads and wallet panel |
| `packages/*/src/client` | The two DSH panels, nine locales |
| `solana/` | The Rust program: directory, campaigns, accruals, claims, reputation |

Keywords: `DeepSeek Harness`, `DSH`, `DSH plugin`, `libp2p`, `Ollama`,
`peer-to-peer`, `Solana`, `USDC`, `AI compute`, `sponsored placements`,
`advertising`, `TypeScript`, `Rust`.

## Install

Inside DeepSeek Harness: **Plugins → Add plugin**, then paste one package name.

```
@genkaku/dsh-worker-plugin@0.5.0-rc.8   # serve this machine's models
@genkaku/dsh-user-plugin@0.5.0-rc.8     # use the network inside DSH
```

From a shell:

```bash
dsh plugin add @genkaku/dsh-worker-plugin@0.5.0-rc.8
dsh plugin add @genkaku/dsh-user-plugin@0.5.0-rc.8
```

The user panel follows DSH's language (Chinese, English, Japanese, Spanish,
French, German, Russian, Portuguese) and also offers Korean.

## How the money moves

- **Users pay nothing.** Inference is covered by sponsored placements.
- **Advertisers** fund their own campaign account on Solana. The program can
  never promise more than the campaign holds.
- **Workers** earn one sponsored minute per impression and can claim from the
  panel. The claim is signed by the worker; the platform never holds the money.
- **Tips** are direct SPL transfers from a user to a worker, with no platform
  cut.
- **Agents** are denied wallet access by default. An owner can choose Ask
  (approve each request) or Capped (spend within per-request/per-day limits);
  key export, import and rotation stay owner-only.

## Smart contract

The program lives in `solana/` and is written with `pinocchio`:

```bash
cd solana
cargo test
sh scripts/build.sh       # SBF build
sh scripts/deploy.sh      # devnet by default
```

Layout and account offsets: [`solana/LAYOUT.md`](solana/LAYOUT.md). The devnet
program is `5HQHqUxNzyfJxQGADFMhVFh1aAe9nZFC2mWvPTEQ12CZ`; mainnet is not
deployed yet.

## Development

```bash
pnpm install
pnpm -r build
pnpm -r test
```

Package layout mirrors what is published to npm. `scripts/build-client.mjs`
bundles each panel into `lib/client.js`; `scripts/gen-plugin-locales.mjs`
regenerates the nine locale dictionaries from `scripts/i18n/*.json`.

## License

AGPL-3.0-or-later for open-source use, or a commercial license for integrations
that cannot accept AGPL's copyleft terms. See [LICENSING.md](LICENSING.md).
