import hre from "hardhat";
import axios from "axios";

const ENTRYPOINT = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";
const FACTORY = "0x7b8d4353c006A5Ab39D63766B46Dd379Fb7cF988";
const PAYMASTER = "0x8db6835D2566783dA02D529e193aDAC89d364E9E";

const SALT = 2;
const SKANDHA_URL = "http://127.0.0.1:14337/rpc";

function toHex(value: bigint) {
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

  // ✅ Check Paymaster balance
  const paymasterBalanceBefore = await entryPoint.balanceOf(PAYMASTER);
  console.log(
    "Paymaster balance BEFORE:",
    ethers.formatEther(paymasterBalanceBefore)
  );

  if (paymasterBalanceBefore === 0n) {
    throw Error("❌ Paymaster has no deposit. Fund it first.");
  }

  const smartAccount = await ethers.getContractAt(
    "SmartAccount",
    smartAccountAddress
  );

  // ✅ Dummy tx
  const callData = smartAccount.interface.encodeFunctionData("execute", [
    owner.address,
    0,
    "0x",
  ]);

  // ✅ FIXED NONCE (key = 0)
  const nonce = await entryPoint.getNonce(smartAccountAddress, 0);
  console.log("nonce:", nonce.toString());

  const fee = await ethers.provider.getFeeData();

  // ✅ FIXED paymasterAndData encoding
  const paymasterAndData = ethers.solidityPacked(
    ["address", "uint48", "uint48"],
    [PAYMASTER, 86400,0 ]
  );

  // ✅ Build UserOp
  let userOp: any = {
    sender: smartAccountAddress,
    nonce: toHex(nonce),
    initCode: "0x",
    callData,
    callGasLimit: toHex(300000n),
    verificationGasLimit: toHex(300000n),
    preVerificationGas: toHex(80000n),
    maxFeePerGas: toHex(BigInt(fee.maxFeePerGas!)),
    maxPriorityFeePerGas: toHex(BigInt(fee.maxPriorityFeePerGas!)),
    paymasterAndData,
    signature: "0x",
  };

  // ✅ Sign UserOp
  const userOpHash = await entryPoint.getUserOpHash(userOp);

  const signature = await owner.signMessage(
    ethers.getBytes(userOpHash)
  );

  userOp.signature = signature;

  console.log("userOpHash:", userOpHash);
  console.log("UserOp:", JSON.stringify(userOp, null, 2));

  // ✅ IMPORTANT: simulate first
  try {
    await entryPoint.simulateValidation(userOp);
    console.log("✅ Simulation passed");
  } catch (err: any) {
    console.error("❌ Simulation failed:");
    console.error(err);
    return;
  }

  // ✅ send to bundler
  let userOpHashSent;

  try {
    const res = await axios.post(
      SKANDHA_URL,
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

    userOpHashSent = res.data.result;
    console.log("UserOp sent:", userOpHashSent);
  } catch (err: any) {
    console.error("❌ Error sending UserOp:", err.message);

    if (err.response) {
      console.error("Bundler response:", err.response.data);
    }
    return;
  }

  // ✅ wait for execution
  async function waitForUserOp(provider: any, hash: any) {
    while (true) {
      const receipt = await provider.send(
        "eth_getUserOperationReceipt",
        [hash]
      );

      if (receipt) return receipt;

      console.log("⏳ Waiting...");
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  const receipt = await waitForUserOp(ethers.provider, userOpHashSent);

  console.log("✅ Executed!");
  console.log("Tx Hash:", receipt.receipt.transactionHash);

  // ✅ Check AFTER balance
  const paymasterBalanceAfter = await entryPoint.balanceOf(PAYMASTER);

  console.log(
    "Paymaster balance AFTER:",
    ethers.formatEther(paymasterBalanceAfter)
  );

  const diff = paymasterBalanceBefore - paymasterBalanceAfter;

  console.log(
    "Gas paid by Paymaster:",
    ethers.formatEther(diff)
  );
}

main().catch(console.error);