// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.24;

import {IERC20} from "./IERC20.sol";

/// @title JobEscrow — per-session USDC escrow with a hardcoded 97/3 split.
/// @notice The ONLY fund path in the GenKaKu network: user escrow → settle →
///         worker accrual (+claim) + treasury. The company cannot change the split
///         (constants), cannot touch user funds (non-custodial by construction), and
///         pooling never occurs (each session is isolated, released in minutes).
///         Split rationale & risks: protocol/GENKAKU-P1.md §3.1/§6.
/// @dev v0.1: no upgradeability; EIP-3009 support lands as an adapter in v0.2.
contract JobEscrow {
    uint256 internal constant PROTOCOL_NUM = 1;   // 1
    uint256 internal constant PROTOCOL_DEN = 100; // /100  → 99% worker / 1% fee
    uint32  internal constant CLAIM_LOCK = 10 minutes;

    IERC20 public immutable token;      // canonical USDC on Base — no setter
    address public immutable treasury;  // 3-of-5 multisig — the only fee recipient

    struct Session {
        address user;
        address worker;
        uint128 amount;    // escrowed USDC (6 decimals)
        uint64 openedAt;
        bool settled;
        bool refunded;
    }

    uint256 public nextSessionId = 1;
    mapping(uint256 => Session) public sessions;
    // worker accrual account — balance claimed in worker-paid batches
    mapping(address => uint128) public accrued;
    mapping(address => uint64) public lastCreditAt;
    uint128 public totalClaimed;

    event SessionOpened(uint256 indexed id, address indexed user, address indexed worker, uint128 amount);
    event SessionSettled(uint256 indexed id, address indexed worker, address indexed user,
                         uint128 spend, uint128 fee, uint128 refund, bytes32 receiptHash);
    event SessionRefunded(uint256 indexed id, address indexed user, uint128 amount);
    event WorkerClaimed(address indexed worker, uint128 amount, uint128 remaining);

    error BadToken();
    error BadTreasury();
    error NotFound();
    error AlreadySettled();
    error AlreadyRefunded();
    error Overspend();
    error NotUser();
    error BadSignature();
    error ClaimLocked();

    constructor(address token_, address treasury_) {
        if (token_ == address(0) || treasury_ == address(0)) revert BadToken();
        token = IERC20(token_);
        treasury = treasury_;
    }

    // ---------------------------------------------------------------- escrow
    /// @notice Open a session escrow. Pre-approval of USDC for this contract is
    ///         assumed (EIP-3009 adapter comes later; see README).
    function openSession(address worker, uint128 amount) external returns (uint256 id) {
        if (worker == address(0) || amount == 0) revert BadToken();
        id = nextSessionId++;
        sessions[id] = Session({user: msg.sender, worker: worker, amount: amount,
                               openedAt: uint64(block.timestamp), settled: false, refunded: false});
        token.transferFrom(msg.sender, address(this), amount);
        emit SessionOpened(id, msg.sender, worker, amount);
    }

    // ---------------------------------------------------------------- settle
    /// @notice One settlement per session, at most. `spend` is computed by the CLIENT
    ///         from the registry rate table — the worker never self-reports spend
    ///         (anti-inflation: GENKAKU-P1 §8).
    /// @param receiptHash  keccak of the ABI-packed receipt the client holds
    /// @param workerSig    EIP-191 signature by the WORKER over (sessionId, receiptHash, spend)
    function settle(uint256 id, bytes32 receiptHash, uint128 spend, bytes calldata workerSig) external {
        Session storage s = sessions[id];
        if (s.user == address(0)) revert NotFound();
        if (s.settled || s.refunded) revert AlreadySettled();

        // worker must co-sign the metered claim — client and worker must agree
        bytes32 digest = keccak256(abi.encodePacked(id, receiptHash, spend));
        if (!_verify(digest, workerSig, s.worker)) revert BadSignature();

        s.settled = true;
        if (spend > s.amount) revert Overspend();

        uint128 fee = uint128((uint256(spend) * PROTOCOL_NUM) / PROTOCOL_DEN); // 3%
        uint128 workerShare = spend - fee;                                     // 97%
        uint128 leftover = s.amount - spend;                                   // unused escrow → back to user

        if (workerShare > 0) {
            accrued[s.worker] += workerShare;         // claimed later, gas paid by worker
            lastCreditAt[s.worker] = uint64(block.timestamp);
        }
        token.transfer(treasury, fee);                // fee leaves immediately — no pooling
        if (leftover > 0) token.transfer(s.user, leftover);

        emit SessionSettled(id, s.worker, s.user, spend, fee, leftover, receiptHash);
    }

    // ---------------------------------------------------------------- refund
    /// @notice The user can always reclaim an unsettled session (self-custody friendly).
    function refund(uint256 id) external {
        Session storage s = sessions[id];
        if (s.user == address(0)) revert NotFound();
        if (s.settled) revert AlreadySettled();
        if (s.refunded) revert AlreadyRefunded();
        s.refunded = true;
        token.transfer(s.user, s.amount);
        emit SessionRefunded(id, s.user, s.amount);
    }

    // ---------------------------------------------------------------- claim
    /// @notice Worker batched withdrawal. Gas is paid by the worker — out of its
    ///         own 97% share (locked design decision). 10-minute release lock
    ///         after the last settled credit; v1 has no on-chain arbitration.
    function claim() external {
        uint128 balance = accrued[msg.sender];
        if (balance == 0) revert NotFound();
        if (block.timestamp < lastCreditAt[msg.sender] + CLAIM_LOCK) revert ClaimLocked();
        accrued[msg.sender] = 0;
        totalClaimed += balance;
        token.transfer(msg.sender, balance);
        emit WorkerClaimed(msg.sender, balance, accrued[msg.sender]);
    }

    // ---------------------------------------------------------------- crypto
    function _verify(bytes32 digest, bytes calldata sig, address expected) internal pure returns (bool) {
        if (sig.length != 65) return false;
        bytes32 r; bytes32 s; bytes32 vB;
        assembly { // solhint-disable-line
            r := calldataload(sig.offset)
            s := calldataload(add(sig.offset, 32))
            vB := calldataload(add(sig.offset, 64))
        }
        uint8 v = uint8(uint256(vB) >> 248); // v is the last byte of a 65-byte sig
        if (v < 27) v += 27;
        if (v != 27 && v != 28) return false;
        address rec = ecrecover(keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", digest)), v, r, s);
        return rec == expected;
    }

    function feeBpsConstants() external pure returns (uint256 numerator, uint256 denominator) {
        return (PROTOCOL_NUM, PROTOCOL_DEN);
    }
}
