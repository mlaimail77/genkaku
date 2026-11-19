//! The two cross-program calls this program makes: system `CreateAccount` and
//! SPL Token `TransferChecked`.
//!
//! Both are built by hand. Pulling in `spl-token` or `pinocchio-system` would
//! add a dependency for forty lines of byte layout, and every byte of the
//! deployed binary is rent paid forever.
//!
//! Note what is *not* here: associated-token-account derivation. Deriving an
//! ATA needs an ed25519 curve check, which is tens of kilobytes of code. The
//! token program already stores its account's owner and mint in the account
//! data, so verifying those two fields proves the same thing — and costs eight
//! bytes of comparison.

use pinocchio::{
    account_info::AccountInfo,
    cpi::invoke_signed,
    instruction::{AccountMeta, Instruction, Seed, Signer},
    program_error::ProgramError,
    pubkey::Pubkey,
    ProgramResult,
};

use crate::error::GenkakuError;

/// SPL Token.
pub const TOKEN_PROGRAM_ID: Pubkey = [
    6, 221, 246, 225, 215, 101, 161, 147, 217, 203, 225, 70, 206, 235, 121, 172, 28, 180, 133, 237,
    95, 91, 55, 145, 58, 140, 245, 133, 126, 255, 0, 169,
];

/// The system program, whose address is all zeroes.
pub const SYSTEM_PROGRAM_ID: Pubkey = [0u8; 32];

/// USDC has six decimals on both clusters. A mint that disagrees is rejected, so
/// a 9-decimal token cannot be mistaken for USDC and mispriced a thousandfold.
pub const DECIMALS: u8 = 6;

const IX_CREATE_ACCOUNT: u32 = 0;
const IX_TRANSFER_CHECKED: u8 = 12;
const STATE_INITIALIZED: u8 = 1;
const TOKEN_ACCOUNT_LEN: usize = 165;
const MINT_LEN: usize = 82;
const MINT_DECIMALS_OFFSET: usize = 44;

/// Verify that `acc` is a live token account for `mint` held by `owner`.
///
/// The owner check is the load-bearing one: without it a caller could pass the
/// treasury's account where the vault belongs, and a "deposit" would land
/// somewhere this program cannot move it from.
pub fn check_token_account(acc: &AccountInfo, mint: &Pubkey, owner: &Pubkey) -> ProgramResult {
    if acc.owner() != &TOKEN_PROGRAM_ID {
        return Err(ProgramError::IncorrectProgramId);
    }
    let data = acc.try_borrow_data()?;
    if data.len() < TOKEN_ACCOUNT_LEN {
        return Err(ProgramError::InvalidAccountData);
    }
    if data.get(..32) != Some(mint.as_ref()) {
        return Err(GenkakuError::WrongMint.into());
    }
    if data.get(32..64) != Some(owner.as_ref()) {
        return Err(GenkakuError::WrongTokenAccount.into());
    }
    if data.get(108).copied() != Some(STATE_INITIALIZED) {
        return Err(ProgramError::UninitializedAccount);
    }
    Ok(())
}

/// Verify the mint's decimals. Called once, at escrow init: the mint key is
/// stored then, and every later transfer is checked against that key.
pub fn check_mint(mint: &AccountInfo) -> ProgramResult {
    if mint.owner() != &TOKEN_PROGRAM_ID {
        return Err(ProgramError::IncorrectProgramId);
    }
    let data = mint.try_borrow_data()?;
    if data.len() < MINT_LEN {
        return Err(ProgramError::InvalidAccountData);
    }
    if data.get(MINT_DECIMALS_OFFSET).copied() != Some(DECIMALS) {
        return Err(GenkakuError::WrongMint.into());
    }
    Ok(())
}

/// SPL `TransferChecked`.
///
/// `seeds` is `Some` when the authority is a PDA this program signs for — the
/// vault — and `None` when a user is paying directly. Both paths go through
/// `invoke_signed`; an empty signer list is an ordinary invoke.
pub fn transfer_checked(
    source: &AccountInfo,
    mint: &AccountInfo,
    destination: &AccountInfo,
    authority: &AccountInfo,
    amount: u64,
    seeds: Option<&[Seed]>,
) -> ProgramResult {
    if amount == 0 {
        return Ok(());
    }
    let mut data = [0u8; 10];
    data[0] = IX_TRANSFER_CHECKED;
    data[1..9].copy_from_slice(&amount.to_le_bytes());
    data[9] = DECIMALS;

    let metas = [
        AccountMeta::writable(source.key()),
        AccountMeta::readonly(mint.key()),
        AccountMeta::writable(destination.key()),
        AccountMeta::readonly_signer(authority.key()),
    ];
    let ix = Instruction {
        program_id: &TOKEN_PROGRAM_ID,
        data: &data,
        accounts: &metas,
    };
    let infos = [source, mint, destination, authority];

    match seeds {
        Some(s) => invoke_signed::<4>(&ix, &infos, &[Signer::from(s)]),
        None => invoke_signed::<4>(&ix, &infos, &[]),
    }
}

/// System `CreateAccount`, signed by a PDA of this program.
///
/// The runtime derives the account address from `seeds` and refuses the call if
/// it does not match `target`. That check is why this program never needs to
/// compute a program address itself: a wrong bump fails here, atomically.
pub fn create_account(
    payer: &AccountInfo,
    target: &AccountInfo,
    lamports: u64,
    space: u64,
    owner: &Pubkey,
    seeds: &[Seed],
) -> ProgramResult {
    let mut data = [0u8; 52];
    data[..4].copy_from_slice(&IX_CREATE_ACCOUNT.to_le_bytes());
    data[4..12].copy_from_slice(&lamports.to_le_bytes());
    data[12..20].copy_from_slice(&space.to_le_bytes());
    data[20..52].copy_from_slice(owner);

    let metas = [
        AccountMeta::writable_signer(payer.key()),
        AccountMeta::writable_signer(target.key()),
    ];
    let ix = Instruction {
        program_id: &SYSTEM_PROGRAM_ID,
        data: &data,
        accounts: &metas,
    };
    invoke_signed::<2>(&ix, &[payer, target], &[Signer::from(seeds)])
}
