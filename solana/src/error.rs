//! Program errors.
//!
//! These are `ProgramError::Custom` codes, which is what a client sees in the
//! RPC error log when a simulation fails. Keeping them small and distinct is
//! what makes a failed settlement diagnosable from the plugin.

use pinocchio::program_error::ProgramError;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[repr(u32)]
pub enum GenkakuError {
    /// The signer is not the account's owner, or not the worker this session
    /// belongs to.
    Unauthorized = 1,
    /// The PDA is already occupied.
    AlreadyInitialized = 2,
    /// The account does not carry the expected discriminator.
    NotInitialized = 3,
    /// New deposits are paused. Settles and claims still work on purpose: a
    /// pause must never strand money that is already in the vault.
    Paused = 4,
    /// No ownership transfer is in flight.
    NoPendingOwner = 5,
    /// The price in the instruction does not match the worker's advertised
    /// price. This is what stops a worker from quoting one price and being paid
    /// another.
    PriceMismatch = 6,
    /// The worker has deregistered.
    WorkerInactive = 7,
    /// The deposit does not cover a single minute.
    DepositTooSmall = 8,
    /// The deposit exceeds the configured cap.
    DepositTooLarge = 9,
    /// The session is no longer open.
    SessionClosed = 10,
    /// The session was already paid out.
    SessionClaimed = 11,
    /// There is nothing to pay.
    NothingToClaim = 12,
    /// The payout delay has not elapsed. Gives the user a window in which to
    /// close a session before the worker takes the accrued amount.
    ClaimTooEarly = 13,
    /// The requested cap is above the ceiling baked into the program.
    CapTooLarge = 14,
    /// Arithmetic overflow.
    Overflow = 15,
    /// Peer id is empty or longer than 64 bytes.
    BadPeerId = 16,
    /// Locator is longer than 128 bytes or is not valid UTF-8.
    BadLocator = 17,
    /// The token account does not hold the configured mint.
    WrongMint = 18,
    /// The token account is not owned by the expected party.
    WrongTokenAccount = 19,
    /// The session id is not the one the escrow expects next.
    BadSessionId = 20,
    /// An address derivation did not produce the account that was passed.
    BadPda = 21,
    /// A close was attempted by someone without the right to close yet.
    CloseNotAllowed = 22,
    /// Instruction data is malformed.
    BadInstructionData = 23,
    /// The treasury is already the requested address.
    BadTreasury = 24,
    /// The quoted price is above the program's sanity ceiling (1 USDC/min).
    PriceTooHigh = 25,
    /// Honouring this settlement would overdraw the session deposit. The worker
    /// has served more minutes than the user paid for.
    SessionExhausted = 26,
    /// The worker account passed does not belong to the wallet the session was
    /// opened against.
    WrongWorker = 27,
    /// A claim below the campaign's threshold. Not an error in the arithmetic,
    /// only in the timing: wait until it is worth the fee.
    ClaimTooSmall = 28,
    /// The campaign does not hold enough un-accrued USDC to book this many
    /// minutes. The program never promises money it does not have.
    CampaignUnderfunded = 29,
    /// An attestation with a nonce that does not advance the record.
    StaleAttestation = 30,
}

impl From<GenkakuError> for ProgramError {
    fn from(e: GenkakuError) -> Self {
        ProgramError::Custom(e as u32)
    }
}
