// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {WorkerRegistry} from "../src/WorkerRegistry.sol";

/// @notice P4.9a: deploys WorkerRegistry v0.2 (on-chain directory with
///         `registerWithLocator` / `advertise` / `WorkerLocated`).
///
///         The registry is not upgradeable, so v0.2 is a NEW deployment: the
///         old v0.1 address keeps the historical bindings, and clients are
///         pinned to v0.2 from the netconfig bump that ships with this script.
contract DeployRegistryV2 is Script {
    function run() external {
        uint256 deployerPk = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPk);
        WorkerRegistry registry = new WorkerRegistry();
        vm.stopBroadcast();

        console2.log("WorkerRegistry v0.2:", address(registry));
        console2.log("deployer             :", vm.addr(deployerPk));
    }
}
