// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.24;

/// @title Minimal ERC20 surface used by GenKaKu settlement (USDC on Base)
interface IERC20 {
    function approve(address spender, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}
