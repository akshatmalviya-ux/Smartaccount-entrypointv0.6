
import hre from "hardhat";
import axios from "axios";

const ENTRYPOINT = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";
const FACTORY = "0x7b8d4353c006A5Ab39D63766B46Dd379Fb7cF988";
const SALT = 2;
const PAYMASTER_ADDRESS= "0x9Bc982384c5971E9484D9595271c209363f318c4";

const SKANDHA_URL = "http://127.0.0.1:14337/rpc"; // local Skandha v1 HTTP

function toHex(value: bigint | number) {
  return "0x" + value.toString(16);
}

async function main() {
  const { ethers } = await hre.network.connect();
  const [owner] = await ethers.getSigners();
const paymasterSigner = owner;
  console.log("EOA:", owner.address);
const validUntil = Math.floor(Date.now() / 1000) + 600; // 10 minutes---FOR PAYMASTER
  const validAfter = 0;
  const paymasterContract = await ethers.getContractAt("Paymaster", PAYMASTER_ADDRESS!);

  const factory = await ethers.getContractAt("SmartAccountFactory", FACTORY!);
  const smartAccountAddress = await factory.getFunction("getAddress")(
    owner.address,
    SALT
  );
  console.log("SmartAccount:", smartAccountAddress);

  const code = await ethers.provider.getCode(smartAccountAddress);
  if (code === "0x") throw Error("SmartAccount not deployed");

  const entryPoint = await ethers.getContractAt("IEntryPoint", ENTRYPOINT!);

  const deposit = await entryPoint.balanceOf(smartAccountAddress);
  console.log("deposit:", deposit.toString());

  if (deposit === 0n) {
    console.log("depositing 0.01 ETH");
    await entryPoint.depositTo(smartAccountAddress, {
      value: ethers.parseEther("0.01"),
    });
  }

  const smartAccount = await ethers.getContractAt(
    "SmartAccount",
    smartAccountAddress
  );
//sending 0 eth to the myself to create a UserOp with callData and execute handleOps flow in Skandha
  const callData = smartAccount.interface.encodeFunctionData("execute", [
    owner.address,
    0,
    "0x",
  ]);

  const nonce = await entryPoint.getNonce(smartAccountAddress, 0);
  console.log("nonce:", nonce.toString());

  const fee = await ethers.provider.getFeeData();

  // convert BigInts to hex strings
  const userOp = {
    sender: smartAccountAddress,
    nonce: toHex(BigInt(nonce)),
    initCode: "0x",
    callData,
    callGasLimit: toHex(500_000n),
    verificationGasLimit: toHex(500_000n),
    preVerificationGas: toHex(100_000n),
    maxFeePerGas: toHex(BigInt(fee.maxFeePerGas!)),
    maxPriorityFeePerGas: toHex(BigInt(fee.maxPriorityFeePerGas!)),
    paymasterAndData: "0x",
    signature: "0x",
  };

  const paymasterHash = await paymasterContract.getHash(
    { ...userOp, paymasterAndData: PAYMASTER_ADDRESS! },
    validUntil,
    validAfter
  );
  const paymasterSignature = await paymasterSigner.signMessage(ethers.getBytes(paymasterHash));
  // 4. Pack the paymasterAndData field
  // [20 bytes Address][6 bytes validUntil][6 bytes validAfter][Dynamic Signature]
  const encodedTimeBounds = ethers.solidityPacked(
    ["uint48", "uint48"],
    [validUntil, validAfter]
  );

  userOp.paymasterAndData = ethers.concat([
    PAYMASTER_ADDRESS!,
    encodedTimeBounds,
    paymasterSignature
  ]);
//Creates hash of UserOp
  const userOpHash = await entryPoint.getUserOpHash(userOp);
  //eoa signs the hash
  const signature = await owner.signMessage(ethers.getBytes(userOpHash));
  //attach signature to UserOp
  userOp.signature = signature;

  const recoveredAddress = ethers.verifyMessage(
    ethers.getBytes(userOpHash),
    signature
  );
  console.log("signed");
  console.log("userOpHash:", userOpHash);
  console.log("recovered address:", recoveredAddress);
  console.log("owner address:", owner.address);
  console.log("userOp:", JSON.stringify(userOp, null, 2));

  // send UserOp via axios to local Skandha
  try {
    const res = await axios.post(
      SKANDHA_URL!,
      {
        jsonrpc: "2.0",
        id: 1,
        method: "eth_sendUserOperation",
        params: [userOp, ENTRYPOINT],
      },
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    console.log("UserOp sent to Skandha:", res.data.result);
  } catch (err: any) {
    console.error("Error sending UserOp:", err.message ?? err);
    if (err.response) {
      console.error("Skandha response:", err.response.data);
    }
  }
}

main().catch(console.error);
/*
EOA: 0xa5AF15Bd94616b226AC07637b2908FDa06BBdC2a
SmartAccount: 0xC3BE27F8A5af091e1Af09397E892b746E069859E
deposit: 10000000000000000
nonce: 0
signed
userOpHash: 0x92ad86a83025d317d98a70c64339a61cb1261c8dc3ac53230e08a66f35ff9b58
recovered address: 0xa5AF15Bd94616b226AC07637b2908FDa06BBdC2a
owner address: 0xa5AF15Bd94616b226AC07637b2908FDa06BBdC2a
userOp: {
  "sender": "0xC3BE27F8A5af091e1Af09397E892b746E069859E",
  "nonce": "0x0",
  "initCode": "0x",
  "callData": "0xb61d27f6000000000000000000000000a5af15bd94616b226ac07637b2908fda06bbdc2a000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000000",
  "callGasLimit": "0x7a120",
  "verificationGasLimit": "0x7a120",
  "preVerificationGas": "0x186a0",
  "maxFeePerGas": "0x1dc85e58c",
  "maxPriorityFeePerGas": "0xf4b74",
  "paymasterAndData": "0x",
  "signature": "0x780ae605454b83fad486f2287b753b20fb3cbe4c7df321700d56abf93d0758577338e2176fc86eb9c8627c3cd2fd706e7c9cbcfd3960729b4998f29caef9cada1b"
}
UserOp sent to Skandha: 0x92ad86a83025d317d98a70c64339a61cb1261c8dc3ac53230e08a66f35ff9b58
*/
/*
🔹 Bundler flow (Skandha)
1. Receives UserOp
via RPC (eth_sendUserOperation)
2. Simulates it
EntryPoint.simulateValidation()

Checks:

signature ✅
nonce ✅
paymaster validation ✅
3. If valid → stores in mempool
4. Bundler creates a transaction
EntryPoint.handleOps([userOp], bundlerAddress)

👉 This is a real Ethereum transaction

5. Execution happens

Inside EntryPoint:

validateUserOp()
validatePaymasterUserOp()
execute()
postOp()
6. Gas paid
By:
Paymaster (if provided) ✅
Otherwise Smart Account deposit*/