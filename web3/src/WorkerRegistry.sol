// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.24;

/// @title WorkerRegistry — binds a worker EVM wallet to its libp2p PeerId and
///        publishes a *locator* (multiaddr) so clients can dial it with no
///        bootstrap server.
/// @notice v0.2 adds the on-chain directory:
///
///         - the wallet ⇄ PeerId binding is still written by the worker wallet
///           itself (msg.sender), so the EVM half is proven on-chain;
///         - the locator is emitted as an EVENT ONLY (never stored). A 70-byte
///           multiaddr costs ~600 gas as a log and ~60k as storage — the
///           directory is rebuilt from logs, so storage buys nothing;
///         - `WorkerLocated` carries the wallet, its pinned peerId and the
///           locator, so a reader can (a) take the newest locator per wallet
///           and (b) check that the locator's `/p2p/<peerId>` matches the
///           on-chain digest without trusting the worker's own JSON.
///
/// @dev The PeerId half of the binding (the secp256k1 key behind the PeerId)
///      is verified off-chain: Noise proves key possession, the registry proves
///      the EVM wallet, and the handshake signature (see p2p handshake) proves
///      that *this* peer holds *that* wallet key. No stake/slashing yet
///      (P4.10); removal is self-deactivation or an operator kick.
contract WorkerRegistry {
    /// @dev A locator is a libp2p multiaddr list ("; "-joined or newline-joined).
    ///      256 bytes fits ~4 addresses (~60 bytes each) plus separators.
    uint256 public constant MAX_LOCATOR_BYTES = 256;

    address public owner;
    mapping(address => bool) public operators; // owner + bootstrap operators

    struct Worker {
        bytes32 peerId;      // keccak("genkaku.peer.v0:" + peerId string)
        bytes32 policyHash;  // content-policy build the worker pinned
        uint64 registeredAt;
        uint64 lastActiveAt; // refreshed by an operator heartbeat attestation
        bool active;
    }

    mapping(address => Worker) public workers;
    uint256 public count;

    event WorkerRegistered(address indexed wallet, bytes32 peerId, bytes32 policyHash);
    /// @notice Directory entry. Only the newest event per wallet matters; older
    ///         ones stay in history forever (that is the point — and the
    ///         privacy cost, which the UI must disclose before advertising).
    event WorkerLocated(
        address indexed wallet,
        bytes32 indexed peerId,
        string locator,
        uint64 updatedAt
    );
    event WorkerHeartbeat(address indexed wallet, uint64 ts);
    event WorkerDeactivated(address indexed wallet, string reason);
    event OperatorSet(address indexed who, bool enabled);

    error NotOwner();
    error NotOperator();
    error NotRegistered();
    error EmptyLocator();
    error LocatorTooLong();
    error ZeroPeerId();

    modifier onlyOwner() { if (msg.sender != owner) revert NotOwner(); _; }
    modifier onlyOperator() { if (!operators[msg.sender]) revert NotOperator(); _; }

    constructor() { owner = msg.sender; operators[msg.sender] = true; }

    // ── registration ────────────────────────────────────────────────────────

    /// @notice Register (or re-pin) the caller's wallet without a locator.
    ///         Use this for invite-link-only / private workers: their address
    ///         never touches the chain.
    function register(bytes32 peerId, bytes32 policyHash) external {
        _upsert(msg.sender, peerId, policyHash);
    }

    /// @notice Register (or re-pin) AND publish the first locator in one tx.
    ///         Saves the second transaction a fresh worker would otherwise pay.
    function registerWithLocator(
        bytes32 peerId,
        bytes32 policyHash,
        string calldata locator
    ) external {
        _upsert(msg.sender, peerId, policyHash);
        _advertise(msg.sender, locator);
    }

    /// @notice Publish a new locator for the caller's active worker.
    ///         Call it when the listen addresses change (debounced by the
    ///         client), not on a timer: each call is a chain write.
    function advertise(string calldata locator) external {
        Worker storage w = workers[msg.sender];
        if (!w.active) revert NotRegistered();
        _advertise(msg.sender, locator);
    }

    function selfDeactivate() external {
        Worker storage w = workers[msg.sender];
        if (!w.active) revert NotRegistered();
        w.active = false;
        unchecked { count--; }
        emit WorkerDeactivated(msg.sender, "self");
        // Directory readers must drop the wallet's locators once this fires;
        // the event is the tombstone (no storage write needed).
    }

    // ── operator actions (bootstrap era) ───────────────────────────────────

    /// @notice Operator kick (evidence-backed; stake+slash lands in P4.10).
    function deactivate(address wallet, string calldata reason) external onlyOperator {
        Worker storage w = workers[wallet];
        if (!w.active) revert NotRegistered();
        w.active = false;
        unchecked { count--; }
        emit WorkerDeactivated(wallet, reason);
    }

    /// @notice Data-plane liveness attestation (operator-signed, cheap write).
    function heartbeat(address wallet) external onlyOperator {
        Worker storage w = workers[wallet];
        if (!w.active) revert NotRegistered();
        w.lastActiveAt = uint64(block.timestamp);
        emit WorkerHeartbeat(wallet, w.lastActiveAt);
    }

    function setOperator(address who, bool enabled) external onlyOwner {
        operators[who] = enabled;
        emit OperatorSet(who, enabled);
    }

    function isActive(address wallet) external view returns (bool) {
        return workers[wallet].active;
    }

    // ── internals ──────────────────────────────────────────────────────────

    function _upsert(address wallet, bytes32 peerId, bytes32 policyHash) internal {
        if (peerId == bytes32(0)) revert ZeroPeerId();
        Worker storage w = workers[wallet];
        if (w.active) {
            w.peerId = peerId;
            w.policyHash = policyHash;
            w.lastActiveAt = uint64(block.timestamp);
        } else {
            w.peerId = peerId;
            w.policyHash = policyHash;
            w.registeredAt = uint64(block.timestamp);
            w.lastActiveAt = uint64(block.timestamp);
            w.active = true;
            unchecked { count++; }
        }
        emit WorkerRegistered(wallet, peerId, policyHash);
    }

    function _advertise(address wallet, string calldata locator) internal {
        uint256 len = bytes(locator).length;
        if (len == 0) revert EmptyLocator();
        if (len > MAX_LOCATOR_BYTES) revert LocatorTooLong();
        emit WorkerLocated(wallet, workers[wallet].peerId, locator, uint64(block.timestamp));
    }
}
