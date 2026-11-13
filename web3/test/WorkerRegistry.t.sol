// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {WorkerRegistry} from "../src/WorkerRegistry.sol";

contract WorkerRegistryTest is Test {
    WorkerRegistry registry;

    address operator = makeAddr("operator");
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    bytes32 constant PEER_A = keccak256("genkaku.peer.v0:16Uiu2HAmAlice");
    bytes32 constant PEER_B = keccak256("genkaku.peer.v0:16Uiu2HAmBob");
    bytes32 constant POLICY = keccak256("genkaku.policy.v0:smoke-v1");

    string constant LOC = "/ip4/203.0.113.42/tcp/4001/p2p/16Uiu2HAmAlice";

    event WorkerRegistered(address indexed wallet, bytes32 peerId, bytes32 policyHash);
    event WorkerLocated(
        address indexed wallet,
        bytes32 indexed peerId,
        string locator,
        uint64 updatedAt
    );
    event WorkerDeactivated(address indexed wallet, string reason);

    function setUp() public {
        registry = new WorkerRegistry();
        registry.setOperator(operator, true);
    }

    // ── register ───────────────────────────────────────────────────────────

    function test_register_setsBinding() public {
        vm.expectEmit(true, false, false, true, address(registry));
        emit WorkerRegistered(alice, PEER_A, POLICY);
        vm.prank(alice);
        registry.register(PEER_A, POLICY);

        (bytes32 peerId, bytes32 policyHash, uint64 registeredAt, uint64 lastActiveAt, bool active)
            = registry.workers(alice);
        assertEq(peerId, PEER_A);
        assertEq(policyHash, POLICY);
        assertEq(registeredAt, uint64(block.timestamp));
        assertEq(lastActiveAt, uint64(block.timestamp));
        assertTrue(active);
        assertEq(registry.count(), 1);
    }

    function test_register_rejectsZeroPeerId() public {
        vm.prank(alice);
        vm.expectRevert(WorkerRegistry.ZeroPeerId.selector);
        registry.register(bytes32(0), POLICY);
    }

    function test_register_reregisterKeepsRegistrationTime() public {
        vm.prank(alice);
        registry.register(PEER_A, POLICY);
        (, , uint64 registeredAt, , ) = registry.workers(alice);

        vm.warp(block.timestamp + 1 days);
        vm.prank(alice);
        registry.register(PEER_B, POLICY);

        (bytes32 peerId,, uint64 after_,, bool active) = registry.workers(alice);
        assertEq(peerId, PEER_B);
        assertEq(after_, registeredAt, "registeredAt must not move");
        assertTrue(active);
        assertEq(registry.count(), 1, "re-register must not double count");
    }

    // ── directory: registerWithLocator / advertise ─────────────────────────

    function test_registerWithLocator_emitsBothEvents() public {
        vm.expectEmit(true, false, false, true, address(registry));
        emit WorkerRegistered(alice, PEER_A, POLICY);
        vm.expectEmit(true, true, false, true, address(registry));
        emit WorkerLocated(alice, PEER_A, LOC, uint64(block.timestamp));

        vm.prank(alice);
        registry.registerWithLocator(PEER_A, POLICY, LOC);

        assertTrue(registry.isActive(alice));
        assertEq(registry.count(), 1);
    }

    function test_advertise_requiresRegistration() public {
        vm.prank(alice);
        vm.expectRevert(WorkerRegistry.NotRegistered.selector);
        registry.advertise(LOC);
    }

    function test_advertise_afterDeactivateReverts() public {
        vm.startPrank(alice);
        registry.registerWithLocator(PEER_A, POLICY, LOC);
        registry.selfDeactivate();
        vm.expectRevert(WorkerRegistry.NotRegistered.selector);
        registry.advertise(LOC);
        vm.stopPrank();
    }

    function test_advertise_emitsPinnedPeerId() public {
        vm.prank(alice);
        registry.register(PEER_A, POLICY);

        // The event must carry the *pinned* peerId, not one supplied by the
        // caller: readers cross-check it against the locator's /p2p/ suffix.
        vm.expectEmit(true, true, false, true, address(registry));
        emit WorkerLocated(alice, PEER_A, LOC, uint64(block.timestamp + 1 hours));
        vm.warp(block.timestamp + 1 hours);
        vm.prank(alice);
        registry.advertise(LOC);
    }

    function test_advertise_rejectsEmpty() public {
        vm.startPrank(alice);
        registry.register(PEER_A, POLICY);
        vm.expectRevert(WorkerRegistry.EmptyLocator.selector);
        registry.advertise("");
        vm.stopPrank();
    }

    function test_advertise_rejectsTooLong() public {
        bytes memory big = new bytes(257);
        for (uint256 i = 0; i < big.length; i++) big[i] = "a";
        string memory locator = string(big);

        vm.startPrank(alice);
        registry.register(PEER_A, POLICY);
        vm.expectRevert(WorkerRegistry.LocatorTooLong.selector);
        registry.advertise(locator);
        vm.stopPrank();
    }

    function test_advertise_acceptsMaxLength() public {
        bytes memory max = new bytes(256);
        for (uint256 i = 0; i < max.length; i++) max[i] = "a";
        string memory locator = string(max);

        vm.prank(alice);
        registry.register(PEER_A, POLICY);
        vm.prank(alice);
        registry.advertise(locator);
    }

    function test_advertise_multiAddrListUnderLimit() public {
        string memory list = string.concat(
            "/ip4/192.168.1.142/tcp/4001/p2p/16Uiu2HAmAlice;",
            "/ip4/203.0.113.42/tcp/4001/p2p/16Uiu2HAmAlice;",
            "/ip4/198.51.100.7/tcp/4001/p2p/QmRelay/p2p-circuit/p2p/16Uiu2HAmAlice"
        );
        assertLt(bytes(list).length, 257);
        vm.startPrank(alice);
        registry.register(PEER_A, POLICY);
        registry.advertise(list);
        vm.stopPrank();
    }

    // ── deactivation ───────────────────────────────────────────────────────

    function test_selfDeactivate_marksInactive() public {
        vm.startPrank(alice);
        registry.registerWithLocator(PEER_A, POLICY, LOC);
        vm.expectEmit(true, false, false, true, address(registry));
        emit WorkerDeactivated(alice, "self");
        registry.selfDeactivate();
        vm.stopPrank();

        assertFalse(registry.isActive(alice));
        assertEq(registry.count(), 0);
        // The binding itself is kept on purpose: a reader still needs the
        // historical wallet ⇄ peerId pair to explain old receipts.
        (bytes32 pinned, , , , ) = registry.workers(alice);
        assertEq(pinned, PEER_A);
    }

    function test_selfDeactivate_requiresRegistration() public {
        vm.prank(alice);
        vm.expectRevert(WorkerRegistry.NotRegistered.selector);
        registry.selfDeactivate();
    }

    function test_operatorDeactivate() public {
        vm.prank(alice);
        registry.registerWithLocator(PEER_A, POLICY, LOC);
        vm.prank(operator);
        registry.deactivate(alice, "abuse");
        assertFalse(registry.isActive(alice));
        assertEq(registry.count(), 0);
    }

    function test_operatorDeactivate_onlyOperator() public {
        vm.prank(alice);
        registry.register(PEER_A, POLICY);
        vm.prank(bob);
        vm.expectRevert(WorkerRegistry.NotOperator.selector);
        registry.deactivate(alice, "abuse");
    }

    function test_count_tracksActiveWorkers() public {
        vm.prank(alice);
        registry.registerWithLocator(PEER_A, POLICY, LOC);
        vm.prank(bob);
        registry.register(PEER_B, POLICY);
        assertEq(registry.count(), 2);

        vm.prank(alice);
        registry.selfDeactivate();
        assertEq(registry.count(), 1);

        // reactivation counts once again
        vm.prank(alice);
        registry.register(PEER_A, POLICY);
        assertEq(registry.count(), 2);
    }

    // ── fuzz the locator bound ─────────────────────────────────────────────

    function testFuzz_locatorBound(uint16 len) public {
        len = uint16(bound(len, 0, 512));
        bytes memory buf = new bytes(len);
        for (uint256 i = 0; i < len; i++) buf[i] = "a";
        string memory locator = string(buf);

        vm.startPrank(alice);
        registry.register(PEER_A, POLICY);
        if (len == 0) {
            vm.expectRevert(WorkerRegistry.EmptyLocator.selector);
            registry.advertise(locator);
        } else if (len > registry.MAX_LOCATOR_BYTES()) {
            vm.expectRevert(WorkerRegistry.LocatorTooLong.selector);
            registry.advertise(locator);
        } else {
            registry.advertise(locator);
        }
        vm.stopPrank();
    }

    /// @dev Reading the directory is a log scan; this pins the gas profile the
    ///      client budget assumes (a 71-byte locator must stay far below a
    ///      storage write).
    function test_gas_advertiseIsLogCheap() public {
        vm.prank(alice);
        registry.register(PEER_A, POLICY);

        vm.prank(alice);
        uint256 before = gasleft();
        registry.advertise(LOC);
        uint256 used = before - gasleft();

        emit log_named_uint("advertise gas (71-byte locator)", used);
        // ~32k including call overhead + calldata; a storage write of the same
        // string would add a 20k SSTORE plus per-word cost on every update.
        assertLt(used, 45_000);
    }
}
