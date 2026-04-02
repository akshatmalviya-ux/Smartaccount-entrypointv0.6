
import hre from "hardhat";
import axios from "axios";

const ENTRYPOINT = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";
const FACTORY = "0x3DFB913bB784E50B553D32b2Bb49481c05b0D03B";
const SALT = 1;

const SKANDHA_URL = "https://unpawned-hydrographically-rihanna.ngrok-free.dev/rpc"; // local Skandha v1 HTTP

function toHex(value: bigint | number) {
  return "0x" + value.toString(16);
}

async function main() {
  const { ethers } = await hre.network.connect();
  const [owner] = await ethers.getSigners();

  console.log("EOA:", owner.address);

  const factory = await ethers.getContractAt("SmartAccountFactory", FACTORY);
  const smartAccountAddress = await factory.getFunction("getAddress")(
    owner.address,
    SALT
  );
  console.log("SmartAccount:", smartAccountAddress);

  const code = await ethers.provider.getCode(smartAccountAddress);
  if (code === "0x") throw Error("SmartAccount not deployed");

  const entryPoint = await ethers.getContractAt("IEntryPoint", ENTRYPOINT);

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

  const userOpHash = await entryPoint.getUserOpHash(userOp);
  const signature = await owner.signMessage(ethers.getBytes(userOpHash));
  userOp.signature = signature;

  console.log("signed");

  // send UserOp via axios to local Skandha
  try {
 const res = await axios.post(SKANDHA_URL, {
  jsonrpc: "2.0",
  id: 1,
  method: "eth_sendUserOperation",
  params: [userOp, ENTRYPOINT],
}, {
  headers: { 'Content-Type': 'application/json' }
});

    console.log("UserOp sent to Skandha:", res.data.result);
  } catch (err) {
    console.error("Error sending UserOp:", err);
  }
}

main().catch(console.error);
/*

EOA: 0xd99DD4bbc56Dd688D8426e7a64ea041899041171
SmartAccount: 0x97f7b7a5E152D78871E74Ec9F84fB9a905F2374C
deposit: 29999531465125928
nonce: 4
signed
UserOp sent to Skandha: 0x19e698269244b33239a00b4eee73ffc3ea589f502950a802df40b35d8d243488*/