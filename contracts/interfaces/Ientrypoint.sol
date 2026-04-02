// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../core/UserOperation.sol"; // if you have a struct definition;

interface IEntryPoint {
    function handleOps(UserOperation[] calldata ops, address payable beneficiary) external;
    function depositTo(address account) external payable;
    function balanceOf(address account) external view returns (uint256);
    function getNonce(address sender, uint192 key) external view returns (uint256);

    // ✅ Add this function
    function getUserOpHash(UserOperation calldata userOp) external view returns (bytes32);
}