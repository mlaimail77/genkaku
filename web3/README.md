# web3 — settlement layer

Solidity contracts behind the GenKaKu marketplace. Zero external dependencies
(no OpenZeppelin); every risk that matters is documented rather than papered
over. Licensed under the same dual license as the rest of the repository — see
[`../LICENSING.md`](../LICENSING.md).

## Deployed (Base Sepolia, chain 84532)

```
MockUSDC        0xEb33DFC0424810039337a38510ef522e9E7F9727   test only
WorkerRegistry  0xFbE9FF497dC24bD69d13E4201418938Df7435Ff6   v0.2 — on-chain directory
JobEscrow       0x8175df796A659681009BeDa4609a3cFe9d281D82   v0.2 — 1% fee
treasury        0x639a2B713041e15B0c5C18710536b661d5265b48   single wallet; Safe multisig before launch
```

Machine-readable record: [`deployments/base-sepolia.json`](./deployments/base-sepolia.json).

`WorkerRegistry` was redeployed as **v0.2** (`DeployRegistryV2.s.sol`, block
55900292, tx `0xc31a7a0a21ae23f547aa8380ed4e04430ef1adbcf4215cb8d790051eb0f63a79`)
when discovery moved off the bootstrap seed to the chain. The registry is not
upgradeable, so v0.1 (`0x2d589D5962d2AE75d1C661036046DB3ec699FF7C`) stays
on-chain as a fossil holding the pre-directory bindings; clients are pinned to
v0.2 from `DSH/packages/protocol/src/netconfig.ts`.

JobEscrow was redeployed the same day as **v0.2** when the fee changed
**3% → 1%**. The superseded escrow `0xA8a1F6Ae3F1CebB4B3aeb9ad5D75b9081bF6f228`
(3%) stays on-chain as a fossil with no entitlement; do not route sessions to it.

### v0.2 directory semantics

* `register(peerId, policyHash)` — binding only; the worker stays private
  (invite-link mode: no address ever touches the chain).
* `registerWithLocator(peerId, policyHash, locator)` — binding + first locator
  in one transaction.
* `advertise(locator)` — new locator for an already-active worker; call only
  when the announced address set changes.
* `selfDeactivate()` — tombstone. Readers drop the wallet's locators once this
  is the wallet's latest directory event; the event itself is never removed.
* The **locator lives only in the `WorkerLocated` log** (≤256 bytes, ~32k gas) —
  never in storage. The directory is rebuilt by scanning logs from
  `REGISTRY_DEPLOY_BLOCK`, so storage would only add cost.

Live smoke: registry-registered worker, $10 escrow, $4 metered settle →
treasury +$0.04 (1%), worker accrued $3.96 (99%), $6.00 refunded; worker
`claim()` executed after the 10-minute lock, self-paid gas.

## Layout

```
src/JobEscrow.sol        per-session USDC escrow; ONE settle per session;
                         99% worker accrual + 1% treasury, constants in bytecode;
                         worker claim() is batched and self-paid
src/WorkerRegistry.sol   wallet ↔ libp2p PeerId binding (wallet side verified here;
                         PeerId side verified by peers in the data plane)
src/IERC20.sol           minimal USDC surface
script/                  Deploy, DeployRegistryV2, Smoke
test/                    forge tests
```

## Split (locked)

- `99 / 100` of metered `spend` → worker (credited to accrual, claimed in batches)
- `1 / 100` of metered `spend` → treasury, sent at settle time
- unused escrow remainder → refunded to user at settle
- claim gas: paid by the worker, out of its 99% — the protocol never subsidizes gas

## Toolchain

```bash
git submodule update --init --recursive
forge build
forge test
```

`foundry.toml` is prepared for Base Sepolia (`base_sepolia`) and Base mainnet.
USDC addresses: **testnet** `0x036CbD53842c5426634e7929541eC2318f3dCF7e`,
**mainnet** `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`. Confirm against
Circle's published addresses before any deploy.

## Deploy order

1. `WorkerRegistry` (no constructor args) → note the address
2. `JobEscrow(<USDC>, <TREASURY>)` → note the address
3. Publish both addresses; the data plane refuses unregistered workers, and the
   client refuses to settle against any other escrow.

```bash
forge script script/Deploy.s.sol --rpc-url base_sepolia --broadcast --slow
forge verify-contract <address> src/JobEscrow.sol:JobEscrow --chain base-sepolia
```

## Backlog

- EIP-3009 `transferWithAuthorization` adapter for gasless top-up
- EIP-712 domain separator for `workerSignature` instead of the packed hash
- Stake + slash hook on WorkerRegistry (parked)

## Mainnet

Not configured. `MockUSDC` is test-only; mainnet must use canonical USDC, a
multisig treasury and a fresh deploy. The plugin's mainnet write path throws on
purpose so a configuration mistake cannot move real funds.
