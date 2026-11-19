# Account layout (0.3)

The program stores everything in fixed-size buffers with an eight-byte
discriminator, so a reader needs no IDL: `getAccountInfo` returns bytes, and
every field is at a known offset. Three files repeat these numbers and must be
changed together: `src/state.rs`, this file, and
`packages/protocol/src/solana.ts` (the site reads two of the counters straight
out of the RPC response, see `web/lib/site.ts`).

All integers are little-endian. All amounts are micro-USDC (`1e6` = 1 USDC).

## Accounts

| Seeds | Type | Length |
| --- | --- | --- |
| `["registry"]` | RegistryConfig | 82 |
| `["worker", wallet]` | Worker | 371 |
| `["attestor"]` | Attestor | 74 |
| `["campaign", owner, index_le_u32]` | Campaign | 195 |
| `["accrual", campaign, wallet]` | Accrual | 101 |
| `["rep", wallet, day_le_u32]` | Reputation | 138 |

The campaign's USDC token account (its vault) is the associated token account of
the `["campaign"]` PDA for the configured mint. Its address is stored in the
config and checked on every transfer.

0.4 has one campaign per advertiser, and one accrual row per campaign and
worker. The campaign address is `["campaign", owner, index]`, where `index` is
the advertiser's own counter; the accrual row stores its campaign so a claim can
never pay from the wrong vault. There is still no escrow and no session: a user
pays nothing, so the program holds no user money.

### Two consequences of the size budget

The program is a `pinocchio` build that has to fit under one SOL of deployment
rent, so it does not carry an ed25519 curve implementation. Two things follow:

* **Bumps are an instruction argument.** Every instruction that creates an
  account takes the PDA bump as its last byte. The runtime derives the address
  from the seeds and rejects a wrong bump, so the check still happens — just not
  in this code. Clients get the bump from `findProgramAddressSync`.
* **Token accounts are matched by their mint and owner fields**, not by
  deriving an associated address. Any token account of the right owner and mint
  is accepted, which is strictly more permissive and never less safe: the
  token program is the authority on both fields.

## RegistryConfig — 82 bytes

| Offset | Field | Type |
| --- | --- | --- |
| 0 | discriminator | `[u8; 8]` |
| 8 | owner | `Pubkey` |
| 40 | pending_owner | `Pubkey` |
| 72 | count | `u64` |
| 80 | bump | `u8` |
| 81 | paused | `u8` |

`count` is workers ever registered, never decremented. `paused` stops new
registrations only; existing listings stay readable and spendable.

## Worker — 371 bytes

| Offset | Field | Type |
| --- | --- | --- |
| 0 | discriminator | `[u8; 8]` |
| 8 | wallet | `Pubkey` |
| 40 | price_per_min | `u64` |
| 48 | active | `u8` |
| 49 | bump | `u8` |
| 50 | peer_len | `u8` |
| 51 | peer | `[u8; 64]` |
| 115 | locator_len | `u8` |
| 116 | locator | `[u8; 255]` |

`price_per_min` of 0 means free, which is the default supply in 0.3. A price
above 0 means the worker expects to be serving on sponsored minutes; it is not a
bill sent to the user, who is never charged.

0.3 removed `earned` and `settlements`. What a worker has been paid is the
Campaign's `accrued`/`claimed` and its own token history; what it has done is the
Reputation accounts.

## Attestor — 74 bytes

| Offset | Field | Type |
| --- | --- | --- |
| 0 | discriminator | `[u8; 8]` |
| 8 | owner | `Pubkey` |
| 40 | attestor | `Pubkey` |
| 72 | paused | `u8` |
| 73 | bump | `u8` |

One key decides which minutes were sponsored and what a worker's day looked
like. It must sign `accrue` and `attest`. The owner can replace it, and pausing
it stops new accruals while leaving `claim` working.

## Campaign — 179 bytes

| Offset | Field | Type |
| --- | --- | --- |
| 0 | discriminator | `[u8; 8]` |
| 8 | owner | `Pubkey` |
| 40 | pending_owner | `Pubkey` |
| 72 | mint | `Pubkey` |
| 104 | vault | `Pubkey` |
| 136 | funded | `u64` |
| 144 | accrued | `u64` |
| 152 | claimed | `u64` |
| 160 | min_claim | `u64` |
| 168 | rate_per_minute | `u64` |
| 176 | paused | `u8` |
| 177 | vault_bump | `u8` |
| 178 | bump | `u8` |
| 179 | index | `u32` |
| 183 | last_settled_day | `u32` |
| 187 | paused_at | `i64` |

Three counters, three guarantees:

```text
accrue  refuses  amount > funded - accrued     never promises money it lacks
close   refuses  amount > funded - accrued     never takes back a promised minute
claim   pays     accrual.claimable             always, once it is booked
```

Outstanding obligation to workers is `accrued - claimed`. `min_claim` is a dust
threshold — a worker's claim costs a fee, so the program refuses to pay one that
is smaller than it is worth. `vault_bump` is reserved and currently 0: transfers
out are signed with the campaign PDA's own seeds.

## Accrual — 101 bytes

| Offset | Field | Type |
| --- | --- | --- |
| 0 | discriminator | `[u8; 8]` |
| 8 | wallet | `Pubkey` |
| 40 | campaign | `Pubkey` |
| 72 | claimable | `u64` |
| 80 | lifetime | `u64` |
| 88 | last_accrued_at | `i64` |
| 96 | last_day | `u32` |
| 100 | bump | `u8` |

Created by `accrue` on first payment. `claimable` is what the worker may take
now; `lifetime` is everything ever booked to it.

## Reputation — 138 bytes

| Offset | Field | Type |
| --- | --- | --- |
| 0 | discriminator | `[u8; 8]` |
| 8 | wallet | `Pubkey` |
| 40 | attestor | `Pubkey` |
| 72 | day | `u32` |
| 76 | sponsored_minutes | `u32` |
| 80 | sponsored_sessions | `u32` |
| 84 | tip_micro | `u64` |
| 92 | tip_count | `u32` |
| 96 | distinct_tippers | `u32` |
| 100 | nonce | `u32` |
| 104 | score | `u8` |
| 105 | evidence_root | `[u8; 32]` |
| 137 | bump | `u8` |

`score` is computed by the program, not supplied:

```text
score = min(100, isqrt(tip_micro / 1000 + sponsored_minutes * 2 + distinct_tippers * 25))
```

The attestor supplies the inputs and a Merkle root over the evidence it used;
`nonce` must strictly increase, so a day can be corrected but never silently
reverted. Anyone can recompute the score from the fields beside it.

## Instructions

| Tag | Name | Accounts (positional) |
| --- | --- | --- |
| 0 | `init_registry` | registry w, payer s, system, rent |
| 1 | `register_worker` | worker w, wallet s, registry w, system, rent |
| 2 | `update_worker` | worker w, wallet s |
| 3 | `transfer_registry_owner` | registry w, owner s, next |
| 4 | `accept_registry_owner` | registry w, next s |
| 5 | `set_registry_paused` | registry w, owner s |
| 6 | `init_attestor` | attestor w, payer s, system, rent |
| 7 | `set_attestor` | attestor w, owner s |
| 8 | `set_attestor_paused` | attestor w, owner s |
| 9 | `init_campaign` | campaign w, payer s, mint, vault, system, rent |
| 10 | `fund_campaign` | campaign w, owner s, owner_ata w, vault w, mint, token |
| 11 | `set_min_claim` | campaign w, owner s |
| 12 | `set_campaign_rate` | campaign w, owner s |
| 13 | `set_campaign_paused` | campaign w, owner s |
| 14 | `accrue` | attestor, attestor s, campaign w, accrual w, worker, system, rent, clock |
| 15 | `claim` | campaign w, accrual w, worker s, worker_ata w, vault w, mint, token |
| 16 | `close_campaign` | campaign w, owner s, owner_ata w, vault w, mint, token |
| 17 | `transfer_campaign_owner` | campaign w, owner s, next |
| 18 | `accept_campaign_owner` | campaign w, next s |
| 19 | `attest` | attestor, attestor s, rep w, wallet, system, rent |
| 20 | `settle_day` | attestor, attestor s, campaign w, clock |

`s` on the second row of `accrue` and `attest` is the attestor's own wallet: a
config PDA cannot sign a transaction, so the key named in `["attestor"]` signs
and pays the rent for the accounts those instructions create.

### Instruction data

| Tag | Data |
| --- | --- |
| 0 | `bump` |
| 1 | `price u64, active u8, peer_len u8, peer[..], locator_len u8, locator[..], bump` |
| 2 | `price u64, active u8, locator_len u8, locator[..]` |
| 3, 17 | `next Pubkey` |
| 5, 8, 13 | `paused u8` |
| 6 | `attestor Pubkey, bump` |
| 7 | `attestor Pubkey` |
| 9 | `min_claim u64, rate_per_minute u64, index u32, bump` |
| 10, 16 | `amount u64` |
| 11 | `min_claim u64` |
| 12 | `rate_per_minute u64` |
| 14 | `minutes u32, day u32, bump` |
| 15 | *(empty)* |
| 19 | `day u32, minutes u32, sessions u32, tip_micro u64, tip_count u32, tippers u32, nonce u32, root[32], bump` |

## Program errors

| Code | Name | Meaning |
| --- | --- | --- |
| 1 | `Unauthorized` | wrong signer for this account |
| 2 | `AlreadyInitialized` | the PDA is already occupied |
| 3 | `NotInitialized` | missing or wrong discriminator |
| 4 | `Paused` | new accruals or registrations are paused |
| 5 | `NoPendingOwner` | no handover in flight |
| 6 | `PriceMismatch` | reserved |
| 7 | `WorkerInactive` | reserved |
| 8–13 | *(retired with the escrow)* | |
| 14 | `CapTooLarge` | a limit above the baked ceiling |
| 15 | `Overflow` | arithmetic overflow |
| 16 | `BadPeerId` | empty or longer than 64 bytes |
| 17 | `BadLocator` | longer than 255 bytes or not UTF-8 |
| 18 | `WrongMint` | token account of the wrong mint |
| 19 | `WrongTokenAccount` | token account of the wrong owner |
| 21 | `BadPda` | an address that does not match the stored one |
| 23 | `BadInstructionData` | malformed instruction data |
| 25 | `PriceTooHigh` | above 1 USDC per minute |
| 27 | `WrongWorker` | account does not belong to the named wallet |
| 28 | `ClaimTooSmall` | below the campaign's `min_claim` |
| 29 | `CampaignUnderfunded` | booking this would promise money the vault lacks |
| 30 | `StaleAttestation` | nonce did not advance |
