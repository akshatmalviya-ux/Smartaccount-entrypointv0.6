// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../account/SmartAccount.sol";

contract SmartAccountFactory {

    address public immutable entryPoint;

    constructor(address _entryPoint) {
        entryPoint = _entryPoint;
    }

    /**
     * @notice Deploy a SmartAccount using CREATE2
     * @param owner Owner of the smart account
     * @param salt Salt for deterministic address
     */
    function createAccount(address owner, uint256 salt)
        public
        returns (address)
    {
        address addr = getAddress(owner, salt);

        // if already deployed, return existing
        if (addr.code.length > 0) {
            return addr;
        }

        // deploy using CREATE2
        SmartAccount account = new SmartAccount{salt: bytes32(salt)}(
            entryPoint,
            owner
        );

        return address(account);
    }

    /**
     * @notice Get deterministic address before deployment
     */
    function getAddress(address owner, uint256 salt)
        public
        view
        returns (address)
    {
        bytes memory bytecode = abi.encodePacked(
            type(SmartAccount).creationCode,
            abi.encode(entryPoint, owner)
        );

        bytes32 hash = keccak256(
            abi.encodePacked(
                bytes1(0xff),
                address(this),
                bytes32(salt),
                keccak256(bytecode)
            )
        );

        return address(uint160(uint256(hash)));
    }
}