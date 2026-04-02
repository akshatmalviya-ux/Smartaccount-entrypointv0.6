// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./BaseAccount.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";


contract SmartAccount is BaseAccount {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;


    address public owner;
    IEntryPoint private immutable _entryPoint;

    constructor(address entryPoint_, address _owner) {
        _entryPoint = IEntryPoint(entryPoint_);
        owner = _owner;
    }

    function entryPoint() public view override returns (IEntryPoint) {
        return _entryPoint;
    }

    
    function _validateSignature(
        UserOperation calldata userOp,
        bytes32 userOpHash
    ) internal view override returns (uint256) {

        bytes32 hash = userOpHash.toEthSignedMessageHash();

        address signer = hash.recover(userOp.signature);

        if (signer != owner) {
            return SIG_VALIDATION_FAILED;
        }

        return 0;
    }

    function execute(
        address to,
        uint256 value,
        bytes calldata data
    ) external {
        require(msg.sender == address(_entryPoint), "not entrypoint");

        (bool success, ) = to.call{value: value}(data);
        require(success, "tx failed");
    }

    receive() external payable {}
}