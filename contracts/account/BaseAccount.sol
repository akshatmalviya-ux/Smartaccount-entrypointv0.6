// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import "@account-abstraction/contracts/interfaces/UserOperation.sol";

abstract contract BaseAccount {
    uint256 internal constant SIG_VALIDATION_FAILED = 1;

    function entryPoint() public view virtual returns (IEntryPoint);

    function validateUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) external virtual returns (uint256 validationData) {
        require(msg.sender == address(entryPoint()), "not EntryPoint");

        // 👇 calls child implementation
        validationData = _validateSignature(userOp, userOpHash);

        _validateNonce(userOp.nonce);

        _payPrefund(missingAccountFunds);
    }
    function _validateSignature(
        UserOperation calldata userOp,
        bytes32 userOpHash
    ) internal virtual returns (uint256);

    mapping(uint256 => bool) public usedNonce;

    function _validateNonce(uint256 nonce) internal {
        require(!usedNonce[nonce], "nonce used");
        usedNonce[nonce] = true;
    }

    function _payPrefund(uint256 missingAccountFunds) internal {
        if (missingAccountFunds > 0) {
            (bool success, ) = payable(msg.sender).call{
                value: missingAccountFunds
            }("");
            require(success, "prefund failed");
        }
    }
}