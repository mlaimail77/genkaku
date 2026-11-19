//! Instruction processing (0.3).
//!
//! Two responsibilities share one binary because rent is charged per deployed
//! byte: the worker directory, and the pool that pays workers for sponsored
//! minutes. They are separate PDAs under separate owners, so the coupling is
//! deployment-level only.
//!
//! There is no escrow. A user pays nothing, so the program never holds a user's
//! money. What it does hold is the campaign's USDC, and the only two ways it
//! leaves are `claim` (a worker taking what was promised) and `close_campaign`
//! (the owner taking back what was never promised). The arithmetic in
//! `Campaign` is what makes that a guarantee rather than policy:
//!
//! ```text
//!   accrue  refuses to book more than  funded - accrued
//!   close   refuses to withdraw more than funded - accrued
//! ```
//!
//! So a minute that has been accrued can never be taken back, and a minute that
//! has not been accrued can never be paid. What this program cannot promise is
//! that the attestor accrues at all — that is a daily operational duty, and the
//! public report at `/ads/v1/report` is how it is checked.
//!
//! Two things differ from the `solana-program` reference implementation, both
//! forced by the size budget:
//!
//!   * Program addresses are never derived here. The client passes the bump in
//!     the instruction, and the runtime checks it when `invoke_signed` signs for
//!     the new account. The bump is then stored so clients can re-derive the
//!     address without a round trip.
//!   * Token accounts are not checked against a derived associated address. The
//!     token program already records the mint and the owner in the account, so
//!     checking those two fields proves the same property.
//!
//! Instruction table (accounts are positional; `w` = writable, `s` = signer):
//!
//! ```text
//!  0 init_registry           [registry w, payer s, system, rent]            bump
//!  1 register_worker         [worker w, wallet s, registry w, sys, rent]    price, active, peer, locator, bump
//!  2 update_worker           [worker w, wallet s]                           price, active, locator
//!  3 transfer_registry_owner [registry w, owner s, next]                    next
//!  4 accept_registry_owner   [registry w, next s]
//!  5 set_registry_paused     [registry w, owner s]                          paused
//!  6 init_attestor           [attestor w, payer s, system, rent]            attestor, bump
//!  7 set_attestor            [attestor w, owner s]                          attestor
//!  8 set_attestor_paused     [attestor w, owner s]                          paused
//!  9 init_campaign           [campaign w, payer s, mint, vault, sys, rent]  min_claim, rate, bump
//! 10 fund_campaign           [campaign w, owner s, owner_ata w, vault w, mint, token]
//! 11 set_min_claim           [campaign w, owner s]                          min_claim
//! 12 set_campaign_rate       [campaign w, owner s]                          rate
//! 13 set_campaign_paused     [campaign w, owner s]                          paused
//! 14 accrue                  [attestor, attestor s, campaign w, accrual w, worker,
//!                             sys, rent, clock]                           minutes, day, bump
//! 15 claim                   [campaign w, accrual w, worker s, worker_ata w,
//!                             vault w, mint, token]
//! 16 close_campaign          [campaign w, owner s, owner_ata w, vault w, mint, token]
//!                                                                           amount
//! 17 transfer_campaign_owner [campaign w, owner s, next]                    next
//! 18 accept_campaign_owner   [campaign w, next s]
//! 19 attest                  [attestor, attestor s, rep w, wallet, sys, rent]
//!                                                                           day, minutes,
//!                             sessions, tip_micro, tip_count, tippers, nonce, root, bump
//! ```

use pinocchio::{
    account_info::AccountInfo,
    program_error::ProgramError,
    pubkey::Pubkey,
    sysvars::{clock::Clock, rent::Rent},
    ProgramResult,
};

use crate::{
    error::GenkakuError,
    state::{
        score_of, Accrual, Attestor, Campaign, RegistryConfig, Reputation, Worker, ACCRUAL_LEN,
        ATTESTOR_LEN, CAMPAIGN_LEN, LOCATOR_MAX, PEER_MAX, REGISTRY_LEN, REPUTATION_LEN,
        WORKER_LEN,
    },
    token, INIT_AUTHORITY,
};

/// Sanity bound on a quote: 1 USDC per started minute.
pub const MAX_PRICE_PER_MIN: u64 = 1_000_000;

/// Sanity bound on what one sponsored minute may be worth. The ads service pays
/// 0.005 USDC; the ceiling only stops a typo from turning into 500 USDC a minute.
pub const MAX_RATE_PER_MIN: u64 = 1_000_000;

/// How many minutes one `accrue` may book. A day is the honest maximum: the
/// attestor reports once a day, and a larger number is a bug or an attack.
pub const MAX_ACCRUE_MINUTES: u32 = 1_440;

/// How long a paused campaign must sit before its owner can take unspent money
/// back. One day is the settlement window: the attestor books a day at a time,
/// so anything shown before the pause is already on chain by then.
pub const CLOSE_COOLDOWN_SECONDS: i64 = 86_400;

/// Ceiling on the claim threshold, so a mistyped `min_claim` cannot strand a
/// worker's money forever.
pub const MAX_MIN_CLAIM: u64 = 100_000_000;

pub fn process(program_id: &Pubkey, accounts: &[AccountInfo], data: &[u8]) -> ProgramResult {
    let (tag, rest) = data
        .split_first()
        .ok_or(GenkakuError::BadInstructionData)?;
    match tag {
        0 => init_registry(program_id, accounts, rest),
        1 => register_worker(program_id, accounts, rest),
        2 => update_worker(program_id, accounts, rest),
        3 => transfer_registry_owner(program_id, accounts, rest),
        4 => accept_registry_owner(program_id, accounts),
        5 => set_registry_paused(program_id, accounts, rest),
        6 => init_attestor(program_id, accounts, rest),
        7 => set_attestor(program_id, accounts, rest),
        8 => set_attestor_paused(program_id, accounts, rest),
        9 => init_campaign(program_id, accounts, rest),
        10 => fund_campaign(program_id, accounts, rest),
        11 => set_min_claim(program_id, accounts, rest),
        12 => set_campaign_rate(program_id, accounts, rest),
        13 => set_campaign_paused(program_id, accounts, rest),
        14 => accrue(program_id, accounts, rest),
        15 => claim(program_id, accounts),
        16 => close_campaign(program_id, accounts, rest),
        17 => transfer_campaign_owner(program_id, accounts, rest),
        18 => accept_campaign_owner(program_id, accounts),
        19 => attest(program_id, accounts, rest),
        20 => settle_day(program_id, accounts, rest),
        _ => Err(GenkakuError::BadInstructionData.into()),
    }
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

/// Reads instruction data left to right, refusing to overrun.
struct Reader<'a> {
    data: &'a [u8],
    at: usize,
}

impl<'a> Reader<'a> {
    fn new(data: &'a [u8]) -> Self {
        Self { data, at: 0 }
    }

    fn take(&mut self, n: usize) -> Result<&'a [u8], ProgramError> {
        let end = self
            .at
            .checked_add(n)
            .ok_or(GenkakuError::BadInstructionData)?;
        let out = self
            .data
            .get(self.at..end)
            .ok_or(GenkakuError::BadInstructionData)?;
        self.at = end;
        Ok(out)
    }

    fn u8(&mut self) -> Result<u8, ProgramError> {
        Ok(self.take(1)?[0])
    }

    fn u32(&mut self) -> Result<u32, ProgramError> {
        let b = self.take(4)?;
        let mut a = [0u8; 4];
        a.copy_from_slice(b);
        Ok(u32::from_le_bytes(a))
    }

    fn u64(&mut self) -> Result<u64, ProgramError> {
        let b = self.take(8)?;
        let mut a = [0u8; 8];
        a.copy_from_slice(b);
        Ok(u64::from_le_bytes(a))
    }

    fn pubkey(&mut self) -> Result<Pubkey, ProgramError> {
        let b = self.take(32)?;
        let mut a = [0u8; 32];
        a.copy_from_slice(b);
        Ok(a)
    }

    fn bytes32(&mut self) -> Result<[u8; 32], ProgramError> {
        let b = self.take(32)?;
        let mut a = [0u8; 32];
        a.copy_from_slice(b);
        Ok(a)
    }

    fn finished(&self) -> ProgramResult {
        if self.at == self.data.len() {
            Ok(())
        } else {
            Err(GenkakuError::BadInstructionData.into())
        }
    }

    /// The trailing bump byte carried by every instruction that creates an
    /// account. Trailing on purpose: it is metadata, not payload.
    fn bump(&mut self) -> Result<u8, ProgramError> {
        let bump = self.u8()?;
        self.finished()?;
        Ok(bump)
    }
}

fn read_account<T>(
    acc: &AccountInfo,
    f: impl FnOnce(&[u8]) -> Result<T, ProgramError>,
) -> Result<T, ProgramError> {
    let data = acc.try_borrow_data()?;
    f(&data[..])
}

fn write_account<T>(
    acc: &AccountInfo,
    f: impl FnOnce(&mut [u8]) -> Result<T, ProgramError>,
) -> Result<T, ProgramError> {
    let mut data = acc.try_borrow_mut_data()?;
    f(&mut data[..])
}

/// Confirm that an account was created by this program.
///
/// This is the replacement for address derivation. An account owned by this
/// program can only exist because this program signed for its creation, and
/// that creation path had its seeds verified by the runtime.
fn expect_owned(acc: &AccountInfo, program_id: &Pubkey) -> ProgramResult {
    if acc.owner() != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }
    Ok(())
}

fn create_pda(
    payer: &AccountInfo,
    target: &AccountInfo,
    rent: &AccountInfo,
    program_id: &Pubkey,
    seeds: &[pinocchio::instruction::Seed],
    space: usize,
) -> ProgramResult {
    let lamports = Rent::from_account_info(rent)?.minimum_balance(space);
    token::create_account(payer, target, lamports, space as u64, program_id, seeds)
}

fn check_token_program(acc: &AccountInfo) -> ProgramResult {
    if acc.key() != &token::TOKEN_PROGRAM_ID {
        return Err(ProgramError::IncorrectProgramId);
    }
    Ok(())
}

fn check_system_program(acc: &AccountInfo) -> ProgramResult {
    if acc.key() != &token::SYSTEM_PROGRAM_ID {
        return Err(ProgramError::IncorrectProgramId);
    }
    Ok(())
}

fn load_registry(acc: &AccountInfo, program_id: &Pubkey) -> Result<RegistryConfig, ProgramError> {
    expect_owned(acc, program_id)?;
    read_account(acc, RegistryConfig::load)
}

fn load_worker(acc: &AccountInfo, program_id: &Pubkey) -> Result<Worker, ProgramError> {
    expect_owned(acc, program_id)?;
    read_account(acc, Worker::load)
}

fn load_attestor(acc: &AccountInfo, program_id: &Pubkey) -> Result<Attestor, ProgramError> {
    expect_owned(acc, program_id)?;
    read_account(acc, Attestor::load)
}

fn load_campaign(acc: &AccountInfo, program_id: &Pubkey) -> Result<Campaign, ProgramError> {
    expect_owned(acc, program_id)?;
    read_account(acc, Campaign::load)
}

/// Who may spend the campaign: the owner key on the account.
fn check_owner(owner: &Pubkey, signer: &AccountInfo) -> ProgramResult {
    if !signer.is_signer() || signer.key() != owner {
        return Err(GenkakuError::Unauthorized.into());
    }
    Ok(())
}

/// The attestor config must exist and be unpaused, and the transaction must be
/// signed by the key it names.
///
/// The config account is data, never a signer: a PDA cannot sign a transaction,
/// so the attestor is an ordinary wallet key and pays for the accounts it
/// creates. That also means a leaked attestor key is a normal key rotation, not
/// a program upgrade.
fn check_attestor(
    cfg_acc: &AccountInfo,
    signer: &AccountInfo,
    program_id: &Pubkey,
) -> Result<Attestor, ProgramError> {
    let cfg = load_attestor(cfg_acc, program_id)?;
    if cfg.paused != 0 {
        return Err(GenkakuError::Paused.into());
    }
    if !signer.is_signer() || signer.key() != &cfg.attestor {
        return Err(GenkakuError::Unauthorized.into());
    }

    Ok(cfg)
}

/// Run `f` with one campaign PDA's signer seeds (`campaign, owner, index, bump`).
///
/// The seeds are the campaign's identity, so a campaign can only ever sign for
/// its own vault — even if two advertisers pass the same account by mistake.
fn campaign_sign_with<R>(
    owner: &Pubkey,
    index: u32,
    bump: u8,
    f: impl FnOnce(&[pinocchio::instruction::Seed]) -> R,
) -> R {
    let bump_array = [bump];
    let index_array = index.to_le_bytes();
    let seeds = pinocchio::seeds!(b"campaign", owner, &index_array, &bump_array);
    f(&seeds)
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

/// 0 — create the registry config. Runs once, and only from the key baked into
/// this binary (`INIT_AUTHORITY`); without that gate anyone could win the race
/// to initialise the program right after deployment and install themselves as
/// owner.
fn init_registry(program_id: &Pubkey, accounts: &[AccountInfo], data: &[u8]) -> ProgramResult {
    let [registry, payer, system_program, rent, ..] = accounts else {
        return Err(ProgramError::NotEnoughAccountKeys);
    };
    if !payer.is_signer() || payer.key() != &INIT_AUTHORITY {
        return Err(GenkakuError::Unauthorized.into());
    }
    check_system_program(system_program)?;
    if registry.lamports() != 0 {
        return Err(GenkakuError::AlreadyInitialized.into());
    }

    let mut r = Reader::new(data);
    let bump = r.bump()?;

    {
        let bump_array = [bump];
        let seeds = pinocchio::seeds!(b"registry", &bump_array);
        create_pda(payer, registry, rent, program_id, &seeds, REGISTRY_LEN)?;
    }

    let cfg = RegistryConfig {
        owner: *payer.key(),
        pending_owner: [0u8; 32],
        count: 0,
        bump,
        paused: 0,
    };
    write_account(registry, |d| cfg.store(d))
}

/// 1 — register or re-register this wallet's worker entry.
///
/// `price` and `active` travel with the registration so a worker can go from
/// free to paid, or take a listing down, without a second instruction. A price
/// of zero is the normal case in 0.3.
fn register_worker(program_id: &Pubkey, accounts: &[AccountInfo], data: &[u8]) -> ProgramResult {
    let [worker, wallet, registry, system_program, rent, ..] = accounts else {
        return Err(ProgramError::NotEnoughAccountKeys);
    };
    if !wallet.is_signer() {
        return Err(ProgramError::MissingRequiredSignature);
    }
    check_system_program(system_program)?;

    let mut r = Reader::new(data);
    let price = r.u64()?;
    let active = r.u8()?;
    let peer_len = r.u8()? as usize;
    let peer = r.take(peer_len)?;
    let loc_len = r.u8()? as usize;
    let locator = r.take(loc_len)?;
    let bump = r.bump()?;

    if peer_len == 0 || peer_len > PEER_MAX {
        return Err(GenkakuError::BadPeerId.into());
    }
    if loc_len > LOCATOR_MAX || core::str::from_utf8(locator).is_err() {
        return Err(GenkakuError::BadLocator.into());
    }
    if price > MAX_PRICE_PER_MIN {
        return Err(GenkakuError::PriceTooHigh.into());
    }
    if active > 1 {
        return Err(GenkakuError::BadInstructionData.into());
    }
    if worker.lamports() != 0 {
        return Err(GenkakuError::AlreadyInitialized.into());
    }

    let mut cfg = load_registry(registry, program_id)?;
    if cfg.paused != 0 {
        return Err(GenkakuError::Paused.into());
    }

    {
        let bump_array = [bump];
        let seeds = pinocchio::seeds!(b"worker", wallet.key(), &bump_array);
        create_pda(wallet, worker, rent, program_id, &seeds, WORKER_LEN)?;
    }

    let mut w = Worker {
        wallet: *wallet.key(),
        price_per_min: price,
        active,
        bump,
        peer_len: peer_len as u8,
        peer: [0u8; PEER_MAX],
        locator_len: loc_len as u8,
        locator: [0u8; LOCATOR_MAX],
    };
    w.peer[..peer_len].copy_from_slice(peer);
    w.locator[..loc_len].copy_from_slice(locator);
    write_account(worker, |d| w.store(d))?;

    cfg.count = cfg.count.checked_add(1).ok_or(GenkakuError::Overflow)?;
    write_account(registry, |d| cfg.store(d))
}

/// 2 — change price, availability or locator. The peer id is immutable: it is
/// the identity a user has already dialled.
fn update_worker(program_id: &Pubkey, accounts: &[AccountInfo], data: &[u8]) -> ProgramResult {
    let [worker, wallet, ..] = accounts else {
        return Err(ProgramError::NotEnoughAccountKeys);
    };

    let mut r = Reader::new(data);
    let price = r.u64()?;
    let active = r.u8()?;
    let loc_len = r.u8()? as usize;
    let locator = r.take(loc_len)?;
    r.finished()?;

    if loc_len > LOCATOR_MAX || core::str::from_utf8(locator).is_err() {
        return Err(GenkakuError::BadLocator.into());
    }
    if price > MAX_PRICE_PER_MIN {
        return Err(GenkakuError::PriceTooHigh.into());
    }
    if active > 1 {
        return Err(GenkakuError::BadInstructionData.into());
    }

    let mut w = load_worker(worker, program_id)?;
    if !wallet.is_signer() || wallet.key() != &w.wallet {
        return Err(GenkakuError::Unauthorized.into());
    }

    w.price_per_min = price;
    w.active = active;
    w.locator_len = loc_len as u8;
    w.locator = [0u8; LOCATOR_MAX];
    w.locator[..loc_len].copy_from_slice(locator);
    write_account(worker, |d| w.store(d))
}

/// 3 — start a two-step ownership handover.
fn transfer_registry_owner(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    data: &[u8],
) -> ProgramResult {
    let [registry, owner, ..] = accounts else {
        return Err(ProgramError::NotEnoughAccountKeys);
    };
    let mut r = Reader::new(data);
    let next = r.pubkey()?;
    r.finished()?;

    let mut cfg = load_registry(registry, program_id)?;
    check_owner(&cfg.owner, owner)?;
    cfg.pending_owner = next;
    write_account(registry, |d| cfg.store(d))
}

/// 4 — the second half: the named key claims ownership.
fn accept_registry_owner(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let [registry, next, ..] = accounts else {
        return Err(ProgramError::NotEnoughAccountKeys);
    };
    if !next.is_signer() {
        return Err(ProgramError::MissingRequiredSignature);
    }

    let mut cfg = load_registry(registry, program_id)?;
    if cfg.pending_owner == [0u8; 32] {
        return Err(GenkakuError::NoPendingOwner.into());
    }
    if next.key() != &cfg.pending_owner {
        return Err(GenkakuError::Unauthorized.into());
    }
    cfg.owner = cfg.pending_owner;
    cfg.pending_owner = [0u8; 32];
    write_account(registry, |d| cfg.store(d))
}

/// 5 — stop or resume new registrations.
///
/// A pause only blocks registration. Listings that exist stay readable and
/// spendable: freezing the directory is not something a pause should be able to
/// do by accident.
fn set_registry_paused(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    data: &[u8],
) -> ProgramResult {
    let [registry, owner, ..] = accounts else {
        return Err(ProgramError::NotEnoughAccountKeys);
    };
    let mut r = Reader::new(data);
    let paused = r.u8()?;
    r.finished()?;
    if paused > 1 {
        return Err(GenkakuError::BadInstructionData.into());
    }

    let mut cfg = load_registry(registry, program_id)?;
    check_owner(&cfg.owner, owner)?;
    cfg.paused = paused;
    write_account(registry, |d| cfg.store(d))
}

// ---------------------------------------------------------------------------
// Attestor
// ---------------------------------------------------------------------------

/// 6 — create the attestor config. Once, from `INIT_AUTHORITY`, naming the key
/// that will accrue and attest.
fn init_attestor(program_id: &Pubkey, accounts: &[AccountInfo], data: &[u8]) -> ProgramResult {
    let [attestor, payer, system_program, rent, ..] = accounts else {
        return Err(ProgramError::NotEnoughAccountKeys);
    };
    if !payer.is_signer() || payer.key() != &INIT_AUTHORITY {
        return Err(GenkakuError::Unauthorized.into());
    }
    check_system_program(system_program)?;
    if attestor.lamports() != 0 {
        return Err(GenkakuError::AlreadyInitialized.into());
    }

    let mut r = Reader::new(data);
    let key = r.pubkey()?;
    let bump = r.bump()?;
    if key == [0u8; 32] {
        return Err(GenkakuError::Unauthorized.into());
    }

    {
        let bump_array = [bump];
        let seeds = pinocchio::seeds!(b"attestor", &bump_array);
        create_pda(payer, attestor, rent, program_id, &seeds, ATTESTOR_LEN)?;
    }

    let cfg = Attestor { owner: *payer.key(), attestor: key, paused: 0, bump };
    write_account(attestor, |d| cfg.store(d))
}

/// 7 — replace the attestor key. The old key stops working immediately, which is
/// the point: a leaked day key should cost at most the day it was leaked in.
fn set_attestor(program_id: &Pubkey, accounts: &[AccountInfo], data: &[u8]) -> ProgramResult {
    let [attestor, owner, ..] = accounts else {
        return Err(ProgramError::NotEnoughAccountKeys);
    };
    let mut r = Reader::new(data);
    let key = r.pubkey()?;
    r.finished()?;
    if key == [0u8; 32] {
        return Err(GenkakuError::Unauthorized.into());
    }

    let mut cfg = load_attestor(attestor, program_id)?;
    check_owner(&cfg.owner, owner)?;
    cfg.attestor = key;
    write_account(attestor, |d| cfg.store(d))
}

/// 8 — pause accruals and attestations without rotating the key. Claims keep
/// working: a pause must never strand money that has already been promised.
fn set_attestor_paused(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    data: &[u8],
) -> ProgramResult {
    let [attestor, owner, ..] = accounts else {
        return Err(ProgramError::NotEnoughAccountKeys);
    };
    let mut r = Reader::new(data);
    let paused = r.u8()?;
    r.finished()?;
    if paused > 1 {
        return Err(GenkakuError::BadInstructionData.into());
    }

    let mut cfg = load_attestor(attestor, program_id)?;
    check_owner(&cfg.owner, owner)?;
    cfg.paused = paused;
    write_account(attestor, |d| cfg.store(d))
}

// ---------------------------------------------------------------------------
// Campaign
// ---------------------------------------------------------------------------

/// 9 — create the campaign and bind it to a funded token account.
///
/// The vault is created by the operator beforehand (its address follows from the
/// campaign PDA, which is derivable before the account exists). Its owner must be
/// the campaign PDA, which is what lets `claim` move money out of it.
fn init_campaign(program_id: &Pubkey, accounts: &[AccountInfo], data: &[u8]) -> ProgramResult {
    let [campaign, payer, mint, vault, system_program, rent, ..] = accounts else {
        return Err(ProgramError::NotEnoughAccountKeys);
    };
    // 0.4: anyone may open a campaign for themselves. The original gate existed
    // so only the operator could create the one campaign 0.3 had; with one
    // campaign per advertiser, the payer IS the owner and the signer check is
    // the whole authorisation.
    if !payer.is_signer() {
        return Err(ProgramError::MissingRequiredSignature);
    }
    check_system_program(system_program)?;
    if campaign.lamports() != 0 {
        return Err(GenkakuError::AlreadyInitialized.into());
    }

    let mut r = Reader::new(data);
    let min_claim = r.u64()?;
    let rate = r.u64()?;
    let index = r.u32()?;
    let bump = r.bump()?;

    if min_claim > MAX_MIN_CLAIM {
        return Err(GenkakuError::CapTooLarge.into());
    }
    if rate > MAX_RATE_PER_MIN {
        return Err(GenkakuError::PriceTooHigh.into());
    }

    token::check_mint(mint)?;
    token::check_token_account(vault, mint.key(), campaign.key())?;

    {
        let bump_array = [bump];
        let index_array = index.to_le_bytes();
        let seeds = pinocchio::seeds!(b"campaign", payer.key(), &index_array, &bump_array);
        create_pda(payer, campaign, rent, program_id, &seeds, CAMPAIGN_LEN)?;
    }

    let cfg = Campaign {
        owner: *payer.key(),
        pending_owner: [0u8; 32],
        mint: *mint.key(),
        vault: *vault.key(),
        funded: 0,
        accrued: 0,
        claimed: 0,
        min_claim,
        rate_per_minute: rate,
        paused: 0,
        vault_bump: 0,
        bump,
        index,
        last_settled_day: 0,
        paused_at: 0,
    };
    write_account(campaign, |d| cfg.store(d))
}

/// 10 — put money in. The only path that increases `funded`.
fn fund_campaign(program_id: &Pubkey, accounts: &[AccountInfo], data: &[u8]) -> ProgramResult {
    let [campaign, owner, owner_ata, vault, mint, token_program, ..] = accounts else {
        return Err(ProgramError::NotEnoughAccountKeys);
    };
    check_token_program(token_program)?;

    let mut r = Reader::new(data);
    let amount = r.u64()?;
    r.finished()?;
    if amount == 0 {
        return Err(GenkakuError::BadInstructionData.into());
    }

    let mut cfg = load_campaign(campaign, program_id)?;
    check_owner(&cfg.owner, owner)?;
    if mint.key() != &cfg.mint {
        return Err(GenkakuError::WrongMint.into());
    }
    if vault.key() != &cfg.vault {
        return Err(GenkakuError::BadPda.into());
    }
    token::check_token_account(owner_ata, mint.key(), owner.key())?;
    token::check_token_account(vault, mint.key(), campaign.key())?;

    token::transfer_checked(owner_ata, mint, vault, owner, amount, None)?;

    cfg.funded = cfg.funded.checked_add(amount).ok_or(GenkakuError::Overflow)?;
    write_account(campaign, |d| cfg.store(d))
}

/// 11 — change the claim threshold. Lowering it lets a worker withdraw sooner;
/// raising it does not touch money already claimable.
fn set_min_claim(program_id: &Pubkey, accounts: &[AccountInfo], data: &[u8]) -> ProgramResult {
    let [campaign, owner, ..] = accounts else {
        return Err(ProgramError::NotEnoughAccountKeys);
    };
    let mut r = Reader::new(data);
    let value = r.u64()?;
    r.finished()?;
    if value > MAX_MIN_CLAIM {
        return Err(GenkakuError::CapTooLarge.into());
    }

    let mut cfg = load_campaign(campaign, program_id)?;
    check_owner(&cfg.owner, owner)?;
    cfg.min_claim = value;
    write_account(campaign, |d| cfg.store(d))
}

/// 12 — change what a sponsored minute is worth, for future accruals only.
fn set_campaign_rate(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    data: &[u8],
) -> ProgramResult {
    let [campaign, owner, ..] = accounts else {
        return Err(ProgramError::NotEnoughAccountKeys);
    };
    let mut r = Reader::new(data);
    let value = r.u64()?;
    r.finished()?;
    if value > MAX_RATE_PER_MIN {
        return Err(GenkakuError::PriceTooHigh.into());
    }

    let mut cfg = load_campaign(campaign, program_id)?;
    check_owner(&cfg.owner, owner)?;
    cfg.rate_per_minute = value;
    write_account(campaign, |d| cfg.store(d))
}

/// 13 — stop or resume accruals. Claims keep working.
///
/// The pause instant is recorded because a refund needs one full settlement
/// window after it: minutes shown before the pause may still be unbooked, and
/// they are the worker's.
fn set_campaign_paused(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    data: &[u8],
) -> ProgramResult {
    let [campaign, owner, clock, ..] = accounts else {
        return Err(ProgramError::NotEnoughAccountKeys);
    };
    let mut r = Reader::new(data);
    let paused = r.u8()?;
    r.finished()?;
    if paused > 1 {
        return Err(GenkakuError::BadInstructionData.into());
    }

    let mut cfg = load_campaign(campaign, program_id)?;
    check_owner(&cfg.owner, owner)?;
    cfg.paused = paused;
    cfg.paused_at = if paused == 1 {
        Clock::from_account_info(clock)?.unix_timestamp
    } else {
        0
    };
    write_account(campaign, |d| cfg.store(d))
}

/// 14 — book `minutes` of sponsored work to one worker.
///
/// This is the attestor's daily claim, and the only instruction that creates an
/// obligation. It moves no money: the transfer happens when the worker chooses
/// to claim, so a worker with an unspendable token account cannot block anyone.
///
/// Refuses to book more than the campaign holds un-accrued. That is the whole
/// safety argument: the program cannot promise money it does not have, and the
/// owner cannot withdraw money it has promised.
fn accrue(program_id: &Pubkey, accounts: &[AccountInfo], data: &[u8]) -> ProgramResult {
    let [attestor, payer, campaign, accrual, worker, system_program, rent, clock, ..] = accounts
    else {
        return Err(ProgramError::NotEnoughAccountKeys);
    };
    check_attestor(attestor, payer, program_id)?;
    check_system_program(system_program)?;

    let mut r = Reader::new(data);
    let minutes = r.u32()?;
    let day = r.u32()?;
    let bump = r.bump()?;

    if minutes == 0 || minutes > MAX_ACCRUE_MINUTES {
        return Err(GenkakuError::BadInstructionData.into());
    }

    let w = load_worker(worker, program_id)?;
    let mut cfg = load_campaign(campaign, program_id)?;
    if cfg.paused != 0 {
        return Err(GenkakuError::Paused.into());
    }

    let amount = (minutes as u64)
        .checked_mul(cfg.rate_per_minute)
        .ok_or(GenkakuError::Overflow)?;
    if amount == 0 {
        return Err(GenkakuError::NothingToClaim.into());
    }
    // Funded-but-not-promised is the ceiling. Checked before anything is
    // written, so a failed accrue leaves no trace.
    if cfg.withdrawable()? < amount {
        return Err(GenkakuError::CampaignUnderfunded.into());
    }

    let created = accrual.lamports() == 0;
    if created {
        let bump_array = [bump];
        let seeds = pinocchio::seeds!(b"accrual", campaign.key(), w.wallet.as_ref(), &bump_array);
        create_pda(payer, accrual, rent, program_id, &seeds, ACCRUAL_LEN)?;
    }

    let mut row = if created {
        Accrual {
            wallet: w.wallet,
            campaign: *campaign.key(),
            claimable: 0,
            lifetime: 0,
            last_accrued_at: 0,
            last_day: 0,
            bump,
        }
    } else {
        read_account(accrual, Accrual::load)?
    };
    if row.wallet != w.wallet || row.campaign != *campaign.key() {
        return Err(GenkakuError::WrongWorker.into());
    }

    row.claimable = row.claimable.checked_add(amount).ok_or(GenkakuError::Overflow)?;
    row.lifetime = row.lifetime.checked_add(amount).ok_or(GenkakuError::Overflow)?;
    row.last_accrued_at = Clock::from_account_info(clock)?.unix_timestamp;
    row.last_day = day;
    write_account(accrual, |d| row.store(d))?;

    cfg.accrued = cfg.accrued.checked_add(amount).ok_or(GenkakuError::Overflow)?;
    write_account(campaign, |d| cfg.store(d))
}

/// 15 — a worker takes what it is owed.
///
/// Permissionless in the sense that matters: the worker signs, nobody else has
/// to approve, and the campaign's state cannot refuse a payment it already
/// booked. The threshold is the only gate, and it exists so a claim's fee is
/// never larger than the claim.
fn claim(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let [campaign, accrual, worker, worker_ata, vault, mint, token_program, ..] = accounts else {
        return Err(ProgramError::NotEnoughAccountKeys);
    };
    check_token_program(token_program)?;

    if !worker.is_signer() {
        return Err(ProgramError::MissingRequiredSignature);
    }

    let mut row = read_account(accrual, Accrual::load)?;
    if row.wallet != *worker.key() || row.campaign != *campaign.key() {
        return Err(GenkakuError::WrongWorker.into());
    }

    let mut cfg = load_campaign(campaign, program_id)?;
    if row.claimable == 0 {
        return Err(GenkakuError::NothingToClaim.into());
    }
    if row.claimable < cfg.min_claim {
        return Err(GenkakuError::ClaimTooSmall.into());
    }
    if mint.key() != &cfg.mint {
        return Err(GenkakuError::WrongMint.into());
    }
    if vault.key() != &cfg.vault {
        return Err(GenkakuError::BadPda.into());
    }
    token::check_token_account(worker_ata, mint.key(), worker.key())?;

    let amount = row.claimable;
    row.claimable = 0;
    write_account(accrual, |d| row.store(d))?;

    cfg.claimed = cfg.claimed.checked_add(amount).ok_or(GenkakuError::Overflow)?;
    write_account(campaign, |d| cfg.store(d))?;

    campaign_sign_with(&cfg.owner, cfg.index, cfg.bump, |seeds| {
        token::transfer_checked(vault, mint, worker_ata, campaign, amount, Some(seeds))
    })
}

/// 16 — the owner takes back money that was never promised.
///
/// The ceiling is `funded - accrued`, not the vault's balance: a minute that has
/// been accrued is the worker's, whether or not it has been claimed yet.
fn close_campaign(program_id: &Pubkey, accounts: &[AccountInfo], data: &[u8]) -> ProgramResult {
    let [campaign, owner, owner_ata, vault, mint, token_program, clock, ..] = accounts else {
        return Err(ProgramError::NotEnoughAccountKeys);
    };
    check_token_program(token_program)?;

    let mut r = Reader::new(data);
    let amount = r.u64()?;
    r.finished()?;

    let mut cfg = load_campaign(campaign, program_id)?;
    check_owner(&cfg.owner, owner)?;

    // A refund takes money out of the pool that pays workers, so it waits for
    // the window in which a placement could still be unbooked to close:
    // the campaign must be paused, the pause must be a full day old, and the
    // attestor must have booked the day it paused.
    if cfg.paused == 0 || cfg.paused_at == 0 {
        return Err(GenkakuError::CloseNotAllowed.into());
    }
    let now = Clock::from_account_info(clock)?.unix_timestamp;
    if now < cfg.paused_at.saturating_add(CLOSE_COOLDOWN_SECONDS) {
        return Err(GenkakuError::ClaimTooEarly.into());
    }
    let paused_day = (cfg.paused_at / 86_400) as u32;
    if cfg.last_settled_day < paused_day {
        return Err(GenkakuError::CloseNotAllowed.into());
    }

    if amount == 0 || amount > cfg.withdrawable()? {
        return Err(GenkakuError::NothingToClaim.into());
    }
    if mint.key() != &cfg.mint {
        return Err(GenkakuError::WrongMint.into());
    }
    if vault.key() != &cfg.vault {
        return Err(GenkakuError::BadPda.into());
    }
    token::check_token_account(owner_ata, mint.key(), owner.key())?;

    // Reduce the promise-free balance first: if the transfer fails, the books
    // still describe the vault.
    cfg.funded = cfg.funded.checked_sub(amount).ok_or(GenkakuError::Overflow)?;
    write_account(campaign, |d| cfg.store(d))?;

    campaign_sign_with(&cfg.owner, cfg.index, cfg.bump, |seeds| {
        token::transfer_checked(vault, mint, owner_ata, campaign, amount, Some(seeds))
    })
}

/// 17 — start a campaign ownership handover.
fn transfer_campaign_owner(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    data: &[u8],
) -> ProgramResult {
    let [campaign, owner, ..] = accounts else {
        return Err(ProgramError::NotEnoughAccountKeys);
    };
    let mut r = Reader::new(data);
    let next = r.pubkey()?;
    r.finished()?;

    let mut cfg = load_campaign(campaign, program_id)?;
    check_owner(&cfg.owner, owner)?;
    cfg.pending_owner = next;
    write_account(campaign, |d| cfg.store(d))
}

/// 18 — the second half of a campaign handover.
fn accept_campaign_owner(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let [campaign, next, ..] = accounts else {
        return Err(ProgramError::NotEnoughAccountKeys);
    };
    if !next.is_signer() {
        return Err(ProgramError::MissingRequiredSignature);
    }

    let mut cfg = load_campaign(campaign, program_id)?;
    if cfg.pending_owner == [0u8; 32] {
        return Err(GenkakuError::NoPendingOwner.into());
    }
    if next.key() != &cfg.pending_owner {
        return Err(GenkakuError::Unauthorized.into());
    }
    cfg.owner = cfg.pending_owner;
    cfg.pending_owner = [0u8; 32];
    write_account(campaign, |d| cfg.store(d))
}

/// 20 — record that the attestor has booked through `day`.
///
/// It moves no money and creates no account; it is the one fact `close_campaign`
/// needs to know before it lets an owner take unspent budget back.
fn settle_day(program_id: &Pubkey, accounts: &[AccountInfo], data: &[u8]) -> ProgramResult {
    let [attestor, payer, campaign, clock, ..] = accounts else {
        return Err(ProgramError::NotEnoughAccountKeys);
    };
    check_attestor(attestor, payer, program_id)?;

    let mut r = Reader::new(data);
    let day = r.u32()?;
    r.finished()?;

    let now = Clock::from_account_info(clock)?.unix_timestamp;
    let today = (now / 86_400) as u32;
    if day > today {
        return Err(GenkakuError::BadInstructionData.into());
    }

    let mut cfg = load_campaign(campaign, program_id)?;
    if day > cfg.last_settled_day {
        cfg.last_settled_day = day;
        write_account(campaign, |d| cfg.store(d))?;
    }

    Ok(())
}

// ---------------------------------------------------------------------------
// Reputation
// ---------------------------------------------------------------------------

/// 19 — write one day of one worker's record.
///
/// The attestor supplies the inputs (sponsored minutes, tips, distinct tippers)
/// and a Merkle root over the evidence it used; this program computes the score
/// from the published formula. Nobody can hand out a score that does not follow
/// from the numbers beside it, and any reader can recompute it.
///
/// `nonce` must increase, so a record can be corrected but never silently
/// reverted to an older one.
fn attest(program_id: &Pubkey, accounts: &[AccountInfo], data: &[u8]) -> ProgramResult {
    let [attestor, payer, rep, wallet, system_program, rent, ..] = accounts else {
        return Err(ProgramError::NotEnoughAccountKeys);
    };
    check_attestor(attestor, payer, program_id)?;
    check_system_program(system_program)?;

    let mut r = Reader::new(data);
    let day = r.u32()?;
    let minutes = r.u32()?;
    let sessions = r.u32()?;
    let tip_micro = r.u64()?;
    let tip_count = r.u32()?;
    let tippers = r.u32()?;
    let nonce = r.u32()?;
    let root = r.bytes32()?;
    let bump = r.bump()?;

    if minutes > 1_440 || sessions > 1_440 {
        return Err(GenkakuError::BadInstructionData.into());
    }
    if tip_count > 0 && tippers > tip_count {
        // More distinct tippers than tips would mean the evidence contradicts
        // itself, which is the one thing an attestation must never do.
        return Err(GenkakuError::BadInstructionData.into());
    }

    let created = rep.lamports() == 0;
    if created {
        let bump_array = [bump];
        let day_array = day.to_le_bytes();
        let seeds = pinocchio::seeds!(b"rep", wallet.key(), &day_array, &bump_array);
        create_pda(payer, rep, rent, program_id, &seeds, REPUTATION_LEN)?;
    }

    let previous = if created {
        None
    } else {
        Some(read_account(rep, Reputation::load)?)
    };

    if let Some(old) = &previous {
        if old.wallet != *wallet.key() || old.day != day {
            return Err(GenkakuError::WrongWorker.into());
        }
        if nonce <= old.nonce {
            return Err(GenkakuError::StaleAttestation.into());
        }
    }

    let row = Reputation {
        wallet: *wallet.key(),
        attestor: *payer.key(),
        day,
        sponsored_minutes: minutes,
        sponsored_sessions: sessions,
        tip_micro,
        tip_count,
        distinct_tippers: tippers,
        score: score_of(tip_micro, minutes, tippers),
        nonce,
        evidence_root: root,
        bump: if created { bump } else { previous.map(|p| p.bump).unwrap_or(bump) },
    };

    write_account(rep, |d| row.store(d))
}
