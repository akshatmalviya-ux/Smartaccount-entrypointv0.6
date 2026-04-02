import hre from "hardhat";

const ENTRYPOINT = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";
const PAYMASTER = "0x2cFd0CA417C9beFe91C269476c43EB2b91ed9244";

// ✅ Use deployed Smart Account directly
const SMART_ACCOUNT = "0x97f7b7a5E152D78871E74Ec9F84fB9a905F2374C";

async function main() {
  const { ethers } = await hre.network.connect();
  const [owner] = await ethers.getSigners();

  console.log("EOA:", owner.address);
  console.log("SmartAccount:", SMART_ACCOUNT);

  // -----------------------------
  // 1. Check Smart Account deployed
  // -----------------------------
  const code = await ethers.provider.getCode(SMART_ACCOUNT);

  if (code === "0x") {
    throw new Error("❌ SmartAccount NOT deployed");
  }

  console.log("✅ SmartAccount is deployed");

  // -----------------------------
  // 2. EntryPoint + Paymaster
  // -----------------------------
  const entryPoint = await ethers.getContractAt(
    "IEntryPoint",
    ENTRYPOINT
  );

  const paymaster = await ethers.getContractAt(
    "Paymaster",
    PAYMASTER
  );

  // -----------------------------
  // 3. Ensure Paymaster deposit
  // -----------------------------
  const deposit = await entryPoint.balanceOf(PAYMASTER);

  console.log("Deposit:", ethers.formatEther(deposit));

  if (deposit === 0n) {
    console.log("Depositing 0.01 ETH...");

    const tx = await entryPoint.depositTo(PAYMASTER, {
      value: ethers.parseEther("0.01"),
    });

    await tx.wait();
  }

  // -----------------------------
  // 4. Encode call
  // -----------------------------
  const smartAccount = await ethers.getContractAt(
    "SmartAccount",
    SMART_ACCOUNT
  );

  const callData = smartAccount.interface.encodeFunctionData(
    "execute",
    [owner.address, 0, "0x"]
  );

  // -----------------------------
  // 5. Nonce
  // -----------------------------
  const nonce = await entryPoint.getNonce(
    SMART_ACCOUNT,
    0
  );

  console.log("Nonce:", nonce.toString());

  // -----------------------------
  // 6. Fees
  // -----------------------------
  const fee = await ethers.provider.getFeeData();

  // -----------------------------
  // 7. Build UserOp
  // -----------------------------
  let userOp: any = {
    sender: SMART_ACCOUNT,
    nonce,
    initCode: "0x",
    callData,
    callGasLimit: 500000,
    verificationGasLimit: 500000,
    preVerificationGas: 100000,
    maxFeePerGas: fee.maxFeePerGas!,
    maxPriorityFeePerGas: fee.maxPriorityFeePerGas!,
    paymasterAndData: "0x2cFd0CA417C9beFe91C269476c43EB2b91ed9244",
    signature: "0x",
  };

  // -----------------------------
  // 8. Paymaster Signing
  // -----------------------------
  const validUntil = Math.floor(Date.now() / 1000) + 3600;
  const validAfter = 0;

  const paymasterHash = await paymaster.getHash(
    userOp,
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
    PAYMASTER,
    timeRange,
    paymasterSignature,
  ]);

  console.log("✅ Paymaster signed");

  // -----------------------------
  // 9. UserOp Signature
  // -----------------------------
  const userOpHash = await entryPoint.getUserOpHash(userOp);

  const signature = await owner.signMessage(
    ethers.getBytes(userOpHash)
  );

  userOp.signature = signature;

  console.log("✅ UserOp signed");

  // -----------------------------
  // 10. Send
  // -----------------------------
  console.log("🚀 Sending UserOp...");

  const tx = await entryPoint.handleOps(
    [userOp],
    owner.address
  );

  await tx.wait();

  console.log("🎉 SUCCESS!",tx);
}

main().catch((err) => {
  console.error("ERROR:", err);
});

/*


EOA: 0xd99DD4bbc56Dd688D8426e7a64ea041899041171
SmartAccount: 0x97f7b7a5E152D78871E74Ec9F84fB9a905F2374C
✅ SmartAccount is deployed
Deposit: 0.01
Nonce: 3
✅ Paymaster signed
✅ UserOp signed
🚀 Sending UserOp...
🎉 SUCCESS!
*/
