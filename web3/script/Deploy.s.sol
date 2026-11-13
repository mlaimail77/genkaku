// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {JobEscrow} from "../src/JobEscrow.sol";
import {WorkerRegistry} from "../src/WorkerRegistry.sol";
import {MockUSDC} from "../test/MockUSDC.sol";

/// @notice Deploys the P1 settlement triad to Base Sepolia.
///         Treasury: single wallet 0x639a2B713041e15B0c5C18710536b661d5265b48
///         (multisig parked until P6 — locked decision 2026-11-05).
///         Token: testnet uses our MockUSDC (mintable) because canonical USDC
///         needs Circle-faucet auth; MAINNET deployment MUST swap to canonical
///         USDC 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913.
contract Deploy is Script {
    function run() external {
        address treasury = vm.envAddress("TREASURY_ADDRESS");
        uint256 deployerPk = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPk);

        MockUSDC usdc = new MockUSDC();
        WorkerRegistry registry = new WorkerRegistry();
        JobEscrow escrow = new JobEscrow(address(usdc), treasury);

        // pre-lease test tokens: treasury 100k, deployer 10k (for user-side tests)
        usdc.mint(treasury, 100_000e6);
        usdc.mint(vm.addr(deployerPk), 10_000e6);

        // registry approved operator = deployer runs heartbeats in the demo period
        registry.setOperator(vm.addr(deployerPk), true);

        vm.stopBroadcast();

        console2.log("MockUSDC        : ", address(usdc));
        console2.log("WorkerRegistry  : ", address(registry));
        console2.log("JobEscrow       : ", address(escrow));
        console2.log("treasury        : ", treasury);
    }
}
