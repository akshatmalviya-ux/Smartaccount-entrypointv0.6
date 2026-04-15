
import hre from "hardhat";
import axios from "axios";

const ENTRYPOINT = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";
const FACTORY = "0x7b8d4353c006A5Ab39D63766B46Dd379Fb7cF988";
const PAYMASTER_ADDRESS = "0xD34EeD3E64D4e73852F9231B55f8DF7bB3d22Fdf";
const TOKEN_ADDRESS = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
const SALT = 2;

const SKANDHA_URL = "http://127.0.0.1:14337/rpc";

function toHex(value: bigint | number) {
  return "0x" + value.toString(16);
}

async function main() {
  const { ethers } = await hre.network.connect();
  const [owner] = await ethers.getSigners();

  console.log("EOA:", owner.address);

  const token = await ethers.getContractAt("IERC20", TOKEN_ADDRESS);
  const factory = await ethers.getContractAt("SmartAccountFactory", FACTORY);
  const entryPoint = await ethers.getContractAt("IEntryPoint", ENTRYPOINT);
  const paymaster = await ethers.getContractAt("Paymaster", PAYMASTER_ADDRESS);

  // -----------------------------
  // 1. Smart Account
  // -----------------------------
  const smartAccountAddress = await factory.getFunction("getAddress")(owner.address, SALT);
  console.log("SmartAccount:", smartAccountAddress);

  const smartAccount = await ethers.getContractAt("SmartAccount", smartAccountAddress);

  // -----------------------------
  // 2. Fund SmartAccount with tokens
  // -----------------------------
  const smartBalance = await token.balanceOf(smartAccountAddress);

  if (smartBalance === 0n) {
    console.log("Sending tokens to SmartAccount...");
    const tx = await token.transfer(smartAccountAddress, ethers.parseUnits("50", 6));
    await tx.wait();
  }

  console.log("SmartAccount Token Balance:",
    (await token.balanceOf(smartAccountAddress)).toString()
  );

  // -----------------------------
  // 3. APPROVE PAYMASTER (UserOp #1)
  // -----------------------------
  console.log("Sending approval UserOp...");

  const approveAmount = ethers.parseUnits("100", 6);

  const approveData = token.interface.encodeFunctionData("approve", [
    PAYMASTER_ADDRESS,
    approveAmount,
  ]);

  const approveCallData = smartAccount.interface.encodeFunctionData("execute", [
    TOKEN_ADDRESS,
    0,
    approveData,
  ]);

  let nonce = await entryPoint.getNonce(smartAccountAddress, 0);
  const fee = await ethers.provider.getFeeData();

  let approveUserOp: any = {
    sender: smartAccountAddress,
    nonce: toHex(BigInt(nonce)),
    initCode: "0x",
    callData: approveCallData,
    callGasLimit: toHex(200000n),
    verificationGasLimit: toHex(100000n),
    preVerificationGas: toHex(80000n),
    maxFeePerGas: toHex(BigInt(fee.maxFeePerGas!)),
    maxPriorityFeePerGas: toHex(BigInt(fee.maxPriorityFeePerGas!)),
    paymasterAndData: "0x", // ❌ no paymaster for approval
    signature: "0x",
  };

  const approveHash = await entryPoint.getUserOpHash(approveUserOp);
  approveUserOp.signature = await owner.signMessage(ethers.getBytes(approveHash));

  await axios.post(SKANDHA_URL, {
    jsonrpc: "2.0",
    id: 1,
    method: "eth_sendUserOperation",
    params: [approveUserOp, ENTRYPOINT],
  });

  console.log("Approval UserOp sent. Waiting...");
  await new Promise((r) => setTimeout(r, 8000));

  // -----------------------------
  // 4. MAIN TX WITH PAYMASTER
  // -----------------------------
  console.log("Sending main UserOp with Paymaster...");

  const callData = smartAccount.interface.encodeFunctionData("execute", [
    owner.address,
    0,
    "0x",
  ]);

  nonce = await entryPoint.getNonce(smartAccountAddress, 0);

  let userOp: any = {
    sender: smartAccountAddress,
    nonce: toHex(BigInt(nonce)),
    initCode: "0x",
    callData,
    callGasLimit: toHex(200000n),
    verificationGasLimit: toHex(150000n),
    preVerificationGas: toHex(80000n),
    maxFeePerGas: toHex(BigInt(fee.maxFeePerGas!)),
    maxPriorityFeePerGas: toHex(BigInt(fee.maxPriorityFeePerGas!)),
    paymasterAndData: "0x",
    signature: "0x",
  };

  // -------- PAYMASTER SIGN --------
  const validUntil = Math.floor(Date.now() / 1000) + 600;
  const validAfter = 0;

  const paymasterHash = await paymaster.getHash(
    { ...userOp, paymasterAndData: PAYMASTER_ADDRESS },
    validUntil,
    validAfter
  );

  const paymasterSignature = await owner.signMessage(
    ethers.getBytes(paymasterHash)
  );

  const timeRange = ethers.solidityPacked(
    ["uint48", "uint48"],
    [validUntil, validAfter]
  );

  userOp.paymasterAndData = ethers.concat([
    PAYMASTER_ADDRESS,
    timeRange,
    paymasterSignature,
  ]);

  // -------- USER SIGN --------
  const userOpHash = await entryPoint.getUserOpHash(userOp);
  userOp.signature = await owner.signMessage(ethers.getBytes(userOpHash));

  const res = await axios.post(SKANDHA_URL, {
    jsonrpc: "2.0",
    id: 2,
    method: "eth_sendUserOperation",
    params: [userOp, ENTRYPOINT],
  });

  console.log("Final UserOp sent:", res.data.result);
}

main().catch(console.error);

