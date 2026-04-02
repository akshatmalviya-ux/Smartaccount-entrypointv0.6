import hre from "hardhat";
import axios from "axios";

const ENTRYPOINT = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";
const FACTORY = "0x3DFB913bB784E50B553D32b2Bb49481c05b0D03B";
const PAYMASTER_ADDRESS = "0xe9577aF5555C37f56216172D83756183c1A9FD89";

// 👉 your bundler RPC (Skandha)
const SKANDHA_URL = "0x19e698269244b33239a00b4eee73ffc3ea589f502950a802df40b35d8d243488";

const SALT = 1;

function toHex(value: bigint | number) {
  return "0x" + BigInt(value).toString(16);
}

async function main() {
  const { ethers } = await hre.network.connect();
  const [owner] = await ethers.getSigners();

  console.log("EOA:", owner.address);

  const validUntil = Math.floor(Date.now() / 1000) + 600;
  const validAfter = 0;

  // contracts
  const factory = await ethers.getContractAt(
    "SmartAccountFactory",
    FACTORY
  );

  const entryPoint = await ethers.getContractAt(
    "IEntryPoint",
    ENTRYPOINT
  );

  const paymaster = await ethers.getContractAt(
    "ERC20Paymaster",
    PAYMASTER_ADDRESS
  );

  // smart account
  const smartAccountAddress = await factory.getFunction("getAddress")(
    owner.address,
    SALT
  );

  console.log("SmartAccount:", smartAccountAddress);

  const code = await ethers.provider.getCode(smartAccountAddress);
  if (code === "0x") throw Error("SmartAccount not deployed");

  const smartAccount = await ethers.getContractAt(
    "SmartAccount",
    smartAccountAddress
  );

  // =========================================================
  // SIMPLE TX
  // =========================================================
  const callData = smartAccount.interface.encodeFunctionData(
    "execute",
    [owner.address, 0, "0x"]
  );

  const nonce = await entryPoint.getNonce(
    smartAccountAddress,
    0
  );

  console.log("Nonce:", nonce.toString());

  const fee = await ethers.provider.getFeeData();

  // =========================================================
  // BUILD USER OP
  // =========================================================
  let userOp: any = {
    sender: smartAccountAddress,
    nonce: toHex(nonce),
    initCode: "0x",
    callData,
    callGasLimit: toHex(500000),
    verificationGasLimit: toHex(500000),
    preVerificationGas: toHex(100000),
    maxFeePerGas: toHex(fee.maxFeePerGas!),
    maxPriorityFeePerGas: toHex(fee.maxPriorityFeePerGas!),
    paymasterAndData: "0x",
    signature: "0x",
  };

  // =========================================================
  // 🔥 PAYMASTER SIGNATURE
  // =========================================================

  // ⚠️ IMPORTANT FIX: use EXACT same userOp structure
  const paymasterHash = await paymaster.getHash(
    userOp,
    validUntil,
    validAfter
  );

  const paymasterSignature = await owner.signMessage(
    ethers.getBytes(paymasterHash)
  );

  const encodedTimeBounds = ethers.solidityPacked(
    ["uint48", "uint48"],
    [validUntil, validAfter]
  );

  userOp.paymasterAndData = ethers.concat([
    PAYMASTER_ADDRESS,
    encodedTimeBounds,
    paymasterSignature,
  ]);

  // =========================================================
  // 🔥 ACCOUNT SIGNATURE
  // =========================================================
  const userOpHash = await entryPoint.getUserOpHash(userOp);

  userOp.signature = await owner.signMessage(
    ethers.getBytes(userOpHash)
  );

  console.log("UserOp signed");

  // =========================================================
  // 🚀 SEND TO BUNDLER
  // =========================================================
  const res = await axios.post(
    SKANDHA_URL,
    {
      jsonrpc: "2.0",
      id: 1,
      method: "eth_sendUserOperation",
      params: [userOp, ENTRYPOINT],
    },
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  console.log("UserOp hash:", res.data.result);
}

main().catch(console.error);