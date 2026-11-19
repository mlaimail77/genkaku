//! Fixed-layout account state (0.3).
//!
//! Every account is a flat byte buffer starting with an eight-byte
//! discriminator — the same convention Anchor uses, so a reader can identify a
//! program account by its first eight bytes without an IDL. The rest is
//! fixed-size on purpose: rent is then a constant that can be computed before
//! the account exists, and a reader never has to walk a variable-length field
//! to find a number it wants.
//!
//! What is here, and what is deliberately not:
//!
//! ```text
//!   ["registry"]                 RegistryConfig   workers ever registered, owner
//!   ["worker", wallet]           Worker           price, peer id, locator
//!   ["attestor"]                 Attestor         who may accrue and attest
//!   ["campaign"]                 Campaign         the pool that pays workers
//!   ["accrual", wallet]          Accrual          what a worker may claim
//!   ["rep", wallet, day_le_u32]  Reputation       one day of one wallet's record
//! ```
//!
//! There is no session account and no escrow: in 0.3 a user pays nothing, so
//! there is nothing to hold in trust. A tip is an SPL transfer the worker
//! receives directly, and the only money this program moves is the campaign's,
//! from its vault to a worker's token account.
//!
//! Offsets are part of the public interface. Three places repeat them and have
//! to change together:
//!
//!   * this file,
//!   * `solana/LAYOUT.md`,
//!   * `packages/protocol/src/solana.ts` (plugin) and `web/lib/site.ts` (site,
//!     which decodes two counters straight out of the RPC response).

use pinocchio::{program_error::ProgramError, pubkey::Pubkey};

/// sha256("account:RegistryConfig")[..8]
pub const REGISTRY_DISC: [u8; 8] = [23, 118, 10, 246, 173, 231, 243, 156];
/// sha256("account:Worker")[..8]
pub const WORKER_DISC: [u8; 8] = [224, 158, 97, 5, 224, 241, 67, 146];
/// sha256("account:Attestor")[..8]
pub const ATTESTOR_DISC: [u8; 8] = [253, 240, 76, 196, 16, 53, 239, 173];
/// sha256("account:Campaign")[..8]
pub const CAMPAIGN_DISC: [u8; 8] = [50, 40, 49, 11, 157, 220, 229, 192];
/// sha256("account:Accrual")[..8]
pub const ACCRUAL_DISC: [u8; 8] = [43, 96, 21, 63, 11, 129, 121, 168];
/// sha256("account:Reputation")[..8]
pub const REPUTATION_DISC: [u8; 8] = [55, 148, 90, 71, 68, 183, 193, 28];

/// Longest peer id accepted. A libp2p ed25519 peer id is 38 multihash bytes.
pub const PEER_MAX: usize = 64;
/// Longest locator accepted, in bytes of UTF-8.
pub const LOCATOR_MAX: usize = 255;

// ---------------------------------------------------------------------------
// Byte accessors. Every one is bounds-checked: an instruction can pass an
// account whose data is shorter than its discriminator claims, and that has to
// be an error rather than a panic.
// ---------------------------------------------------------------------------

pub fn u8_at(d: &[u8], off: usize) -> Result<u8, ProgramError> {
    d.get(off).copied().ok_or(ProgramError::InvalidAccountData)
}

pub fn u32_at(d: &[u8], off: usize) -> Result<u32, ProgramError> {
    let b = d
        .get(off..off + 4)
        .ok_or(ProgramError::InvalidAccountData)?;
    let mut a = [0u8; 4];
    a.copy_from_slice(b);
    Ok(u32::from_le_bytes(a))
}

pub fn u64_at(d: &[u8], off: usize) -> Result<u64, ProgramError> {
    let b = d
        .get(off..off + 8)
        .ok_or(ProgramError::InvalidAccountData)?;
    let mut a = [0u8; 8];
    a.copy_from_slice(b);
    Ok(u64::from_le_bytes(a))
}

pub fn i64_at(d: &[u8], off: usize) -> Result<i64, ProgramError> {
    let b = d
        .get(off..off + 8)
        .ok_or(ProgramError::InvalidAccountData)?;
    let mut a = [0u8; 8];
    a.copy_from_slice(b);
    Ok(i64::from_le_bytes(a))
}

pub fn pubkey_at(d: &[u8], off: usize) -> Result<Pubkey, ProgramError> {
    let b = d
        .get(off..off + 32)
        .ok_or(ProgramError::InvalidAccountData)?;
    let mut a = [0u8; 32];
    a.copy_from_slice(b);
    Ok(a)
}

fn put_u8(d: &mut [u8], off: usize, v: u8) -> Result<(), ProgramError> {
    *d.get_mut(off).ok_or(ProgramError::InvalidAccountData)? = v;
    Ok(())
}

fn put_u32(d: &mut [u8], off: usize, v: u32) -> Result<(), ProgramError> {
    d.get_mut(off..off + 4)
        .ok_or(ProgramError::InvalidAccountData)?
        .copy_from_slice(&v.to_le_bytes());
    Ok(())
}

fn put_u64(d: &mut [u8], off: usize, v: u64) -> Result<(), ProgramError> {
    d.get_mut(off..off + 8)
        .ok_or(ProgramError::InvalidAccountData)?
        .copy_from_slice(&v.to_le_bytes());
    Ok(())
}

fn put_i64(d: &mut [u8], off: usize, v: i64) -> Result<(), ProgramError> {
    d.get_mut(off..off + 8)
        .ok_or(ProgramError::InvalidAccountData)?
        .copy_from_slice(&v.to_le_bytes());
    Ok(())
}

fn put_pubkey(d: &mut [u8], off: usize, v: &Pubkey) -> Result<(), ProgramError> {
    d.get_mut(off..off + 32)
        .ok_or(ProgramError::InvalidAccountData)?
        .copy_from_slice(v);
    Ok(())
}

fn put_bytes(d: &mut [u8], off: usize, max: usize, v: &[u8]) -> Result<(), ProgramError> {
    let n = v.len().min(max);
    d.get_mut(off..off + max)
        .ok_or(ProgramError::InvalidAccountData)?[..n]
        .copy_from_slice(&v[..n]);
    Ok(())
}

pub fn has_disc(d: &[u8], disc: &[u8; 8]) -> bool {
    d.len() >= 8 && d.get(..8) == Some(disc.as_ref())
}

fn write_disc(d: &mut [u8], disc: &[u8; 8]) -> Result<(), ProgramError> {
    d.get_mut(..8)
        .ok_or(ProgramError::InvalidAccountData)?
        .copy_from_slice(disc);
    Ok(())
}

// ---------------------------------------------------------------------------
// RegistryConfig — one per program, seeds ["registry"].
//
//   0   disc            72  count      (u64, workers ever registered)
//   8   owner           80  bump
//   40  pending_owner   81  paused
// ---------------------------------------------------------------------------

pub const REGISTRY_LEN: usize = 82;
pub const REGISTRY_COUNT_OFFSET: usize = 72;

#[derive(Clone, Debug)]
pub struct RegistryConfig {
    pub owner: Pubkey,
    pub pending_owner: Pubkey,
    /// Workers ever registered. Never decremented: it is a counter for the
    /// marketing page, not a count of live listings.
    pub count: u64,
    pub bump: u8,
    /// Stops NEW registrations. Existing listings stay readable and spendable:
    /// a pause should not be able to freeze a directory by accident.
    pub paused: u8,
}

impl RegistryConfig {
    pub fn load(d: &[u8]) -> Result<Self, ProgramError> {
        if !has_disc(d, &REGISTRY_DISC) || d.len() < REGISTRY_LEN {
            return Err(ProgramError::InvalidAccountData);
        }
        Ok(Self {
            owner: pubkey_at(d, 8)?,
            pending_owner: pubkey_at(d, 40)?,
            count: u64_at(d, REGISTRY_COUNT_OFFSET)?,
            bump: u8_at(d, 80)?,
            paused: u8_at(d, 81)?,
        })
    }

    pub fn store(&self, d: &mut [u8]) -> Result<(), ProgramError> {
        if d.len() < REGISTRY_LEN {
            return Err(ProgramError::InvalidAccountData);
        }
        write_disc(d, &REGISTRY_DISC)?;
        put_pubkey(d, 8, &self.owner)?;
        put_pubkey(d, 40, &self.pending_owner)?;
        put_u64(d, REGISTRY_COUNT_OFFSET, self.count)?;
        put_u8(d, 80, self.bump)?;
        put_u8(d, 81, self.paused)
    }
}

// ---------------------------------------------------------------------------
// Worker — one per wallet, seeds ["worker", wallet].
//
// 0.3 dropped two fields that only the escrow could write (`earned`,
// `settlements`). What a worker has earned is now its own wallet history plus
// the Campaign's accruals, and what it has *done* is the Reputation PDAs.
//
//   0   disc            48  active
//   8   wallet          49  bump
//   40  price_per_min   50  peer_len
//                       51  peer[64]
//                       115 locator_len
//                       116 locator[255]
// ---------------------------------------------------------------------------

pub const WORKER_LEN: usize = 371;

#[derive(Clone, Debug)]
pub struct Worker {
    pub wallet: Pubkey,
    /// Micro-USDC per started minute. 0 means "free": such a worker serves
    /// without any payment, which is the default supply in 0.3.
    pub price_per_min: u64,
    pub active: u8,
    pub bump: u8,
    pub peer_len: u8,
    pub peer: [u8; PEER_MAX],
    pub locator_len: u8,
    pub locator: [u8; LOCATOR_MAX],
}

impl Worker {
    pub fn load(d: &[u8]) -> Result<Self, ProgramError> {
        if !has_disc(d, &WORKER_DISC) || d.len() < WORKER_LEN {
            return Err(ProgramError::InvalidAccountData);
        }
        let mut peer = [0u8; PEER_MAX];
        peer.copy_from_slice(
            d.get(51..51 + PEER_MAX)
                .ok_or(ProgramError::InvalidAccountData)?,
        );
        let mut locator = [0u8; LOCATOR_MAX];
        locator.copy_from_slice(
            d.get(116..116 + LOCATOR_MAX)
                .ok_or(ProgramError::InvalidAccountData)?,
        );
        Ok(Self {
            wallet: pubkey_at(d, 8)?,
            price_per_min: u64_at(d, 40)?,
            active: u8_at(d, 48)?,
            bump: u8_at(d, 49)?,
            peer_len: u8_at(d, 50)?,
            peer,
            locator_len: u8_at(d, 115)?,
            locator,
        })
    }

    pub fn store(&self, d: &mut [u8]) -> Result<(), ProgramError> {
        if d.len() < WORKER_LEN {
            return Err(ProgramError::InvalidAccountData);
        }
        write_disc(d, &WORKER_DISC)?;
        put_pubkey(d, 8, &self.wallet)?;
        put_u64(d, 40, self.price_per_min)?;
        put_u8(d, 48, self.active)?;
        put_u8(d, 49, self.bump)?;
        put_u8(d, 50, self.peer_len)?;
        put_bytes(d, 51, PEER_MAX, &self.peer)?;
        put_u8(d, 115, self.locator_len)?;
        put_bytes(d, 116, LOCATOR_MAX, &self.locator)
    }

    /// Peer id as it was registered, sliced to its recorded length.
    pub fn peer_id(&self) -> &[u8] {
        let n = (self.peer_len as usize).min(PEER_MAX);
        &self.peer[..n]
    }

    pub fn locator_str(&self) -> &[u8] {
        let n = (self.locator_len as usize).min(LOCATOR_MAX);
        &self.locator[..n]
    }
}

// ---------------------------------------------------------------------------
// Attestor — one per program, seeds ["attestor"].
//
// One key decides which sessions were sponsored and what a worker's day looked
// like. That is a real concentration of judgement, so the owner can replace it
// (`set_attestor`) and pause it, and everything it does is a public on-chain
// record that can be re-derived from the ads service's own ledger.
//
//   0   disc            40  attestor
//   8   owner           72  paused
//                       73  bump
// ---------------------------------------------------------------------------

pub const ATTESTOR_LEN: usize = 74;

#[derive(Clone, Debug)]
pub struct Attestor {
    pub owner: Pubkey,
    pub attestor: Pubkey,
    pub paused: u8,
    pub bump: u8,
}

impl Attestor {
    pub fn load(d: &[u8]) -> Result<Self, ProgramError> {
        if !has_disc(d, &ATTESTOR_DISC) || d.len() < ATTESTOR_LEN {
            return Err(ProgramError::InvalidAccountData);
        }
        Ok(Self {
            owner: pubkey_at(d, 8)?,
            attestor: pubkey_at(d, 40)?,
            paused: u8_at(d, 72)?,
            bump: u8_at(d, 73)?,
        })
    }

    pub fn store(&self, d: &mut [u8]) -> Result<(), ProgramError> {
        if d.len() < ATTESTOR_LEN {
            return Err(ProgramError::InvalidAccountData);
        }
        write_disc(d, &ATTESTOR_DISC)?;
        put_pubkey(d, 8, &self.owner)?;
        put_pubkey(d, 40, &self.attestor)?;
        put_u8(d, 72, self.paused)?;
        put_u8(d, 73, self.bump)
    }
}

// ---------------------------------------------------------------------------
// Campaign — one per program, seeds ["campaign"].
//
// The pool that pays workers for sponsored minutes. Three counters make the
// promise "accrued is never taken back" an arithmetic fact rather than a policy:
//
//   funded  — everything the owner has put in
//   accrued — everything booked to a worker, for all time
//   claimed — everything a worker has taken out
//
// Outstanding obligation is `accrued - claimed`; the owner may only withdraw
// `funded - accrued`, so withdrawing cannot touch a minute already promised.
// `accrue` refuses to book more than `funded - accrued`, so the program can
// never promise money the vault does not hold.
//
//   0    disc             136  funded
//   8    owner            144  accrued
//   40   pending_owner    152  claimed
//   72   mint             160  min_claim
//   104  vault            168  rate_per_minute
//                       176  paused
//                       177  vault_bump
//                       178  bump
//                       179  index (u32, the owner's own counter)
//                       183  last_settled_day (u32)
//                       187  paused_at (i64, unix seconds; 0 = live)
// ---------------------------------------------------------------------------

pub const CAMPAIGN_LEN: usize = 195;

#[derive(Clone, Debug)]
pub struct Campaign {
    pub owner: Pubkey,
    pub pending_owner: Pubkey,
    pub mint: Pubkey,
    pub vault: Pubkey,
    pub funded: u64,
    pub accrued: u64,
    pub claimed: u64,
    /// What a worker must have claimable before it may withdraw. A claim costs
    /// the worker a signature and a fee, so a dust threshold is a courtesy.
    pub min_claim: u64,
    /// Micro-USDC paid per sponsored started minute.
    pub rate_per_minute: u64,
    pub paused: u8,
    pub vault_bump: u8,
    pub bump: u8,
    /// Which of the owner's campaigns this is. The address is derived from it,
    /// so two advertisers can hold the same index without colliding.
    pub index: u32,
    /// The UTC day the attestor has booked through. Withdrawals require this to
    /// cover the day the campaign was paused: money that may still be owed to a
    /// worker is not the owner's to take back.
    pub last_settled_day: u32,
    /// When the campaign was paused. Refunds need a full settlement window
    /// after this instant; 0 means it is live.
    pub paused_at: i64,
}

impl Campaign {
    pub fn load(d: &[u8]) -> Result<Self, ProgramError> {
        if !has_disc(d, &CAMPAIGN_DISC) || d.len() < CAMPAIGN_LEN {
            return Err(ProgramError::InvalidAccountData);
        }
        Ok(Self {
            owner: pubkey_at(d, 8)?,
            pending_owner: pubkey_at(d, 40)?,
            mint: pubkey_at(d, 72)?,
            vault: pubkey_at(d, 104)?,
            funded: u64_at(d, 136)?,
            accrued: u64_at(d, 144)?,
            claimed: u64_at(d, 152)?,
            min_claim: u64_at(d, 160)?,
            rate_per_minute: u64_at(d, 168)?,
            paused: u8_at(d, 176)?,
            vault_bump: u8_at(d, 177)?,
            bump: u8_at(d, 178)?,
            index: u32_at(d, 179)?,
            last_settled_day: u32_at(d, 183)?,
            paused_at: i64_at(d, 187)?,
        })
    }

    pub fn store(&self, d: &mut [u8]) -> Result<(), ProgramError> {
        if d.len() < CAMPAIGN_LEN {
            return Err(ProgramError::InvalidAccountData);
        }
        write_disc(d, &CAMPAIGN_DISC)?;
        put_pubkey(d, 8, &self.owner)?;
        put_pubkey(d, 40, &self.pending_owner)?;
        put_pubkey(d, 72, &self.mint)?;
        put_pubkey(d, 104, &self.vault)?;
        put_u64(d, 136, self.funded)?;
        put_u64(d, 144, self.accrued)?;
        put_u64(d, 152, self.claimed)?;
        put_u64(d, 160, self.min_claim)?;
        put_u64(d, 168, self.rate_per_minute)?;
        put_u8(d, 176, self.paused)?;
        put_u8(d, 177, self.vault_bump)?;
        put_u8(d, 178, self.bump)?;
        put_u32(d, 179, self.index)?;
        put_u32(d, 183, self.last_settled_day)?;
        put_i64(d, 187, self.paused_at)
    }

    /// Money the owner may take back: funded but never promised.
    pub fn withdrawable(&self) -> Result<u64, ProgramError> {
        self.funded
            .checked_sub(self.accrued)
            .ok_or(ProgramError::InvalidAccountData)
    }

    /// Money promised to workers and not yet paid out.
    pub fn outstanding(&self) -> Result<u64, ProgramError> {
        self.accrued
            .checked_sub(self.claimed)
            .ok_or(ProgramError::InvalidAccountData)
    }
}

// ---------------------------------------------------------------------------
// Accrual — one per campaign per wallet, seeds ["accrual", campaign, wallet].
//
// The campaign is stored, not just implied by the address: the program cannot
// derive PDAs, so `claim` has to be able to reject an accrual that belongs to a
// different campaign before it touches this campaign's vault.
//
//   0   disc             72  claimable
//   8   wallet           80  lifetime
//   40  campaign         88  last_accrued_at (i64)
//                       96  last_day (u32)
//                      100  bump
// ---------------------------------------------------------------------------

pub const ACCRUAL_LEN: usize = 101;

#[derive(Clone, Debug)]
pub struct Accrual {
    pub wallet: Pubkey,
    /// The campaign this row is payable from.
    pub campaign: Pubkey,
    /// Owed to the worker and not yet withdrawn.
    pub claimable: u64,
    /// Everything ever accrued to this wallet.
    pub lifetime: u64,
    pub last_accrued_at: i64,
    pub last_day: u32,
    pub bump: u8,
}

impl Accrual {
    pub fn load(d: &[u8]) -> Result<Self, ProgramError> {
        if !has_disc(d, &ACCRUAL_DISC) || d.len() < ACCRUAL_LEN {
            return Err(ProgramError::InvalidAccountData);
        }
        Ok(Self {
            wallet: pubkey_at(d, 8)?,
            campaign: pubkey_at(d, 40)?,
            claimable: u64_at(d, 72)?,
            lifetime: u64_at(d, 80)?,
            last_accrued_at: i64_at(d, 88)?,
            last_day: u32_at(d, 96)?,
            bump: u8_at(d, 100)?,
        })
    }

    pub fn store(&self, d: &mut [u8]) -> Result<(), ProgramError> {
        if d.len() < ACCRUAL_LEN {
            return Err(ProgramError::InvalidAccountData);
        }
        write_disc(d, &ACCRUAL_DISC)?;
        put_pubkey(d, 8, &self.wallet)?;
        put_pubkey(d, 40, &self.campaign)?;
        put_u64(d, 72, self.claimable)?;
        put_u64(d, 80, self.lifetime)?;
        put_i64(d, 88, self.last_accrued_at)?;
        put_u32(d, 96, self.last_day)?;
        put_u8(d, 100, self.bump)
    }
}

// ---------------------------------------------------------------------------
// Reputation — one per (wallet, day), seeds ["rep", wallet, day.to_le_bytes()].
//
// The score is computed by THIS PROGRAM from the inputs the attestor reports,
// not passed in. That does not make the inputs true — the attestor is still
// trusted for them — but it does mean nobody can hand out a score that does not
// follow from the numbers next to it, and a client can recompute it.
//
//   0    disc                84   tip_micro (u64)
//   8    wallet              92   tip_count (u32)
//   40   attestor            96   distinct_tippers (u32)
//   72   day (u32)          100   nonce (u32)
//   76   sponsored_minutes  104   score
//   80   sponsored_sessions 105   evidence_root[32]
//                             137  bump
//
// score = min(100, isqrt(tip_micro / 1000 + sponsored_minutes * 2 + distinct_tippers * 25))
// ---------------------------------------------------------------------------

pub const REPUTATION_LEN: usize = 138;

#[derive(Clone, Debug)]
pub struct Reputation {
    pub wallet: Pubkey,
    pub attestor: Pubkey,
    pub day: u32,
    pub sponsored_minutes: u32,
    pub sponsored_sessions: u32,
    pub tip_micro: u64,
    pub tip_count: u32,
    pub distinct_tippers: u32,
    pub score: u8,
    pub nonce: u32,
    pub evidence_root: [u8; 32],
    pub bump: u8,
}

impl Reputation {
    pub fn load(d: &[u8]) -> Result<Self, ProgramError> {
        if !has_disc(d, &REPUTATION_DISC) || d.len() < REPUTATION_LEN {
            return Err(ProgramError::InvalidAccountData);
        }
        let mut root = [0u8; 32];
        root.copy_from_slice(
            d.get(105..137)
                .ok_or(ProgramError::InvalidAccountData)?,
        );
        Ok(Self {
            wallet: pubkey_at(d, 8)?,
            attestor: pubkey_at(d, 40)?,
            day: u32_at(d, 72)?,
            sponsored_minutes: u32_at(d, 76)?,
            sponsored_sessions: u32_at(d, 80)?,
            tip_micro: u64_at(d, 84)?,
            tip_count: u32_at(d, 92)?,
            distinct_tippers: u32_at(d, 96)?,
            nonce: u32_at(d, 100)?,
            score: u8_at(d, 104)?,
            evidence_root: root,
            bump: u8_at(d, 137)?,
        })
    }

    pub fn store(&self, d: &mut [u8]) -> Result<(), ProgramError> {
        if d.len() < REPUTATION_LEN {
            return Err(ProgramError::InvalidAccountData);
        }
        write_disc(d, &REPUTATION_DISC)?;
        put_pubkey(d, 8, &self.wallet)?;
        put_pubkey(d, 40, &self.attestor)?;
        put_u32(d, 72, self.day)?;
        put_u32(d, 76, self.sponsored_minutes)?;
        put_u32(d, 80, self.sponsored_sessions)?;
        put_u64(d, 84, self.tip_micro)?;
        put_u32(d, 92, self.tip_count)?;
        put_u32(d, 96, self.distinct_tippers)?;
        put_u32(d, 100, self.nonce)?;
        put_u8(d, 104, self.score)?;
        d.get_mut(105..137)
            .ok_or(ProgramError::InvalidAccountData)?
            .copy_from_slice(&self.evidence_root);
        put_u8(d, 137, self.bump)
    }
}

/// The published score formula, in one place.
///
/// Integer square root keeps it reproducible in any language (the site and the
/// plugin both re-implement this), and the caps keep one busy day from defining
/// a worker forever.
pub fn score_of(tip_micro: u64, sponsored_minutes: u32, distinct_tippers: u32) -> u8 {
    let tips = tip_micro / 1_000;
    let minutes = (sponsored_minutes as u64) * 2;
    let tippers = (distinct_tippers as u64) * 25;
    let raw = tips.saturating_add(minutes).saturating_add(tippers);
    let score = isqrt(raw);

    if score > 100 {
        100
    } else {
        score as u8
    }
}

/// Integer square root by Newton's method. Exact, no floats, no_std.
fn isqrt(n: u64) -> u64 {
    if n < 2 {
        return n;
    }
    let mut x = n;
    let mut y = (x + 1) / 2;
    while y < x {
        x = y;
        y = (x + n / x) / 2;
    }
    x
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn score_matches_the_published_formula() {
        assert_eq!(score_of(0, 0, 0), 0);
        // 1000 micro = 1 unit.
        assert_eq!(score_of(1_000, 0, 0), 1);
        // 60 sponsored minutes = 120 → isqrt = 10.
        assert_eq!(score_of(0, 60, 0), 10);
        // 16 distinct tippers = 400 → 20.
        assert_eq!(score_of(0, 0, 16), 20);
    }

    #[test]
    fn score_is_capped_at_one_hundred() {
        assert_eq!(score_of(100_000_000, 10_000, 10_000), 100);
    }

    #[test]
    fn isqrt_is_exact_at_boundaries() {
        assert_eq!(isqrt(0), 0);
        assert_eq!(isqrt(1), 1);
        assert_eq!(isqrt(99), 9);
        assert_eq!(isqrt(10_000), 100);
        assert_eq!(isqrt(10_001), 100);
    }
}
