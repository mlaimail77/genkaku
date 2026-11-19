//! GenKaKu program (0.3): the worker directory and the pool that pays for
//! sponsored minutes.
//!
//! ```text
//!   ["registry"]                 RegistryConfig   worker count, owner, paused
//!   ["worker", wallet]           Worker           price, peer id, locator
//!   ["attestor"]                 Attestor         who may accrue and attest
//!   ["campaign"]                 Campaign         funded / accrued / claimed
//!   ["accrual", wallet]          Accrual          what a worker may claim
//!   ["rep", wallet, day_le_u32]  Reputation       one day of one wallet
//! ```
//!
//! There is no escrow in 0.3: a user pays nothing, so the program never holds a
//! user's money. The only money it moves is the campaign's, and only twice — a
//! worker claiming what was accrued to it, and the owner withdrawing what was
//! never promised. `Campaign`'s three counters make that a guarantee:
//! `accrue` cannot book more than `funded - accrued`, and `close` cannot
//! withdraw more than the same number.
//!
//! Built on `pinocchio` rather than `solana-program` or Anchor. That is a size
//! decision, not a taste one: this program has to fit in the rent budget of a
//! single SOL, which is about 94 KiB, and only the lean framework gets there.
//! The consequence is that program addresses are never derived on-chain — the
//! client supplies the bump and the runtime verifies it when the program signs.

#![cfg_attr(all(not(test), not(feature = "host-test")), no_std)]

pub mod error;
pub mod processor;
pub mod state;
pub mod token;

use pinocchio::{
    account_info::AccountInfo, program_error::ProgramError, pubkey::Pubkey, ProgramResult,
};

/// The address this program is deployed to on both clusters.
///
/// 0.3 replaced the instruction set rather than extending it, and the escrow
/// program was never on mainnet, so the address is new. A client that speaks the
/// old layout fails at the first instruction instead of half-working.
pub const PROGRAM_ID: Pubkey = [
    63, 162, 96, 3, 28, 59, 249, 221, 74, 12, 174, 33, 156, 241, 14, 55, 112, 136, 6, 220, 133, 38, 93, 173, 246, 231, 77, 169, 57, 75, 77, 210,
];

/// The one key allowed to run `init_registry`, `init_attestor` and
/// `init_campaign`.
///
/// Baked in rather than stored, because initialisation has to be gated before
/// any account exists that could hold an owner. This is the same key that owns
/// both configs once they exist; ownership is then transferable in two steps.
pub const INIT_AUTHORITY: Pubkey = [
    83, 183, 61, 183, 201, 191, 243, 213, 5, 57, 246, 77, 159, 162, 254, 14, 65, 105, 139, 7, 246,
    232, 30, 118, 111, 48, 55, 110, 54, 102, 180, 34,
];

pinocchio::program_entrypoint!(process_instruction);
pinocchio::default_allocator!();

/// A panic is a bug, never an expected path; report the file and abort without
/// pulling in the formatting machinery `default_panic_handler!` would link.
#[cfg(target_os = "solana")]
#[panic_handler]
fn panic(_info: &core::panic::PanicInfo) -> ! {
    const FILE: &[u8] = b"genkaku/solana/src";
    unsafe {
        pinocchio::syscalls::sol_panic_(FILE.as_ptr(), FILE.len() as u64, 0, 0);
    }
}

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    data: &[u8],
) -> ProgramResult {
    if program_id != &PROGRAM_ID {
        return Err(ProgramError::IncorrectProgramId);
    }
    processor::process(program_id, accounts, data)
}
