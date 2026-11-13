// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {JobEscrow} from "../src/JobEscrow.sol";
import {WorkerRegistry} from "../src/WorkerRegistry.sol";
import {IERC20} from "../src/IERC20.sol";

/// @notice End-to-end smoke on a LIVE network (Base Sepolia):
///         register worker → open escrow → settle with worker co-signature.
///         claim() runs later as the worker (10-min release lock + worker-paid gas).
contract Smoke is Script {
    function run() external {
        uint256 workerPk = vm.envUint("WORKER_PRIVATE_KEY");
        address worker = vm.addr(workerPk);
        address escrowAddr = vm.envAddress("ESCROW_ADDRESS");
        address registryAddr = vm.envAddress("REGISTRY_ADDRESS");
        address usdcAddr = vm.envAddress("USDC_ADDRESS");
        uint256 deployerPk = vm.envUint("PRIVATE_KEY");

        JobEscrow escrow = JobEscrow(escrowAddr);
        WorkerRegistry registry = WorkerRegistry(registryAddr);
        IERC20 usdc = IERC20(usdcAddr);

        // 0. fund the worker so it can pay its own claim gas later
        vm.startBroadcast(deployerPk);
        (bool ok,) = worker.call{value: 0.0003 ether}("");
        require(ok, "fund worker failed");
        vm.stopBroadcast();

        // 1. worker registers (peerId placeholder digest + policy pin)
        vm.startBroadcast(workerPk);
        registry.register(keccak256(abi.encodePacked("12D3KooWGenKaKuSmokeWorker")), keccak256("policy-smoke-v1"));
        vm.stopBroadcast();

        // 2. open escrow: user=deployer, $10 escrow
        vm.startBroadcast(deployerPk);
        uint128 amount = 10e6;
        usdc.approve(escrowAddr, amount);
        uint256 id = escrow.openSession(worker, amount);

        // 3. settle: client-metered spend $4.00, worker co-signs
        uint128 spend = 4e6;
        bytes memory sig = _workerSig(workerPk, keccak256(abi.encodePacked("genkaku-smoke-receipt-1")), spend, id);
        escrow.settle(id, keccak256(abi.encodePacked("genkaku-smoke-receipt-1")), spend, sig);
        vm.stopBroadcast();

        console2.log("session id      :", id);
        console2.log("worker          :", worker);
        console2.log("== expected ==");
        console2.log("fee to treasury : 120000 (3% of $4 = $0.12)");
        console2.log("worker accrual  : 3880000 ($3.88)");
        console2.log("refund to user  : 6000000 ($6.00)");
    }

    function _workerSig(uint256 workerPk, bytes32 receiptHash, uint128 spend, uint256 id) internal pure returns (bytes memory) {
        bytes32 digest = keccak256(abi.encodePacked(id, receiptHash, spend));
        bytes32 ethSigned = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", digest));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(workerPk, ethSigned);
        return abi.encodePacked(r, s, v);
    }
}
