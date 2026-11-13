// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {JobEscrow} from "../src/JobEscrow.sol";
import {WorkerRegistry} from "../src/WorkerRegistry.sol";
import {MockUSDC} from "./MockUSDC.sol";

contract JobEscrowTest is Test {
    MockUSDC usdc;
    JobEscrow escrow;
    WorkerRegistry registry;

    address user    = makeAddr("user");
    address treasury = makeAddr("treasury");
    uint256 workerPk = 0xA11CE;
    address worker;

    function setUp() public {
        worker = vm.addr(workerPk);
        usdc = new MockUSDC();
        registry = new WorkerRegistry();
        escrow = new JobEscrow(address(usdc), treasury);
        usdc.mint(user, 1_000_000e6); // $1,000,000
    }

    function _sign(uint128 spend, uint256 id, bytes32 receiptHash) internal view returns (bytes memory) {
        bytes32 digest = keccak256(abi.encodePacked(id, receiptHash, spend));
        bytes32 ethSigned = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", digest));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(workerPk, ethSigned);
        return abi.encodePacked(r, s, v);
    }

    function _open(uint128 amount) internal returns (uint256 id) {
        vm.startPrank(user);
        usdc.approve(address(escrow), amount);
        id = escrow.openSession(worker, amount);
        vm.stopPrank();
    }

    // 99/1 split on spend; unused escrow refunded; fee leaves immediately
    function test_Settle_SplitConstants() public {
        (uint256 num, uint256 den) = escrow.feeBpsConstants();
        assertEq(num, 1); assertEq(den, 100);

        uint128 amount = 50_000_000;   // $50.00 escrow
        uint128 spend  = 5_000_000;    // $5.00 actually metered
        uint256 id = _open(amount);

        escrow.settle(id, keccak256("receipt"), spend, _sign(spend, id, keccak256("receipt")));

        assertEq(usdc.balanceOf(treasury), 50_000);    // 1% of $5 = $0.05
        assertEq(escrow.accrued(worker), 4_950_000);   // 99% of $5 = $4.95
        assertEq(usdc.balanceOf(user), 1_000_000e6 - 5_000_000); // $45 escrow remainder back
    }

    function test_Settle_RequiresWorkerSignature() public {
        uint256 id = _open(5_000_000);
        bytes32 receiptHash = keccak256("receipt");
        // signed with a DIFFERENT key → must revert BadSignature()
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(0xBEEF, keccak256(abi.encodePacked(
            "\x19Ethereum Signed Message:\n32",
            keccak256(abi.encodePacked(id, receiptHash, uint128(5_000_000)))
        )));
        bytes memory wrongSig = abi.encodePacked(r, s, v);
        vm.expectRevert();
        escrow.settle(id, receiptHash, 5_000_000, wrongSig);
    }

    function test_Settle_OverspendReverts() public {
        uint256 id = _open(5_000_000);
        bytes32 receiptHash = keccak256("receipt");
        vm.expectRevert();
        escrow.settle(id, receiptHash, 6_000_000, _sign(6_000_000, id, receiptHash));
    }

    function test_Claim_LockThenRelease() public {
        uint256 id = _open(50_000_000);
        uint128 spend = 50_000_000;
        escrow.settle(id, keccak256("receipt"), spend, _sign(spend, id, keccak256("receipt")));

        // 10-minute lock: worker cannot claim yet
        vm.expectRevert();
        vm.prank(worker);
        escrow.claim();

        vm.warp(block.timestamp + 11 minutes);
        uint256 before = usdc.balanceOf(worker);
        vm.prank(worker);
        escrow.claim();
        assertEq(usdc.balanceOf(worker), before + 49_500_000); // 99% of $50
        assertEq(escrow.totalClaimed(), 49_500_000);
    }

    function test_Refund_UnsettledSession() public {
        uint256 id = _open(5_000_000);
        uint256 before = usdc.balanceOf(user);
        escrow.refund(id);
        assertEq(usdc.balanceOf(user), before + 5_000_000);
        vm.expectRevert(); // cannot settle a refunded session
        escrow.settle(id, keccak256("receipt"), 5_000_000, _sign(5_000_000, id, keccak256("receipt")));
    }

    function test_WorkerRegistry_BindAndDeactivate() public {
        bytes32 peerId = keccak256("12D3KooW...");
        vm.prank(worker);
        registry.register(peerId, keccak256("policy-v1"));
        assertTrue(registry.isActive(worker));
        assertEq(registry.count(), 1);

        vm.prank(makeAddr("outsider"));  // NOT an operator → must revert
        vm.expectRevert(); // only operator can kick (v1 social enforcement)
        registry.deactivate(worker, "fraud");
        vm.prank(registry.owner());
        registry.deactivate(worker, "fraud");
        assertFalse(registry.isActive(worker));
        assertEq(registry.count(), 0);
    }
}
