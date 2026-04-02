import * as dotenv from "dotenv";
dotenv.config();

import hre from "hardhat";

const ENTRYPOINT = process.env.ENTRY_POINT;

async function main() {
  // Guard: fail fast with a clear message
  if (!ENTRYPOINT) {
    throw new Error(
      "ENTRY_POINT is not set in your .env file. Add: ENTRY_POINT=0x..."
    );
  }

  const { ethers } = await hre.network.connect();

  const [owner] = await ethers.getSigners();
  const paymasterSigner = owner;
  console.log("EOA:", owner.address);
  console.log("ENTRY_POINT:", ENTRYPOINT);

  const Paymaster = await ethers.getContractFactory("Paymaster");

  const paymaster = await Paymaster.deploy(ENTRYPOINT, paymasterSigner.address);

  await paymaster.waitForDeployment();

  const paymasterAddr = await paymaster.getAddress();

  console.log("Paymaster deployed at:", paymasterAddr);

  const entryPoint = await ethers.getContractAt("IEntryPoint", ENTRYPOINT);

  const balance = await entryPoint.balanceOf(paymasterAddr);

  if (balance === 0n) {
 console.log("Depositing 0.01 ETH...");

    const tx = await entryPoint.depositTo(paymasterAddr, {
      value: ethers.parseEther("0.01"),
    });

    await tx.wait();

    console.log("Deposit complete. Tx:", tx.hash);
  } else {
    console.log("Already funded:", ethers.formatEther(balance), "ETH");
  }

  const balanceAfter = await entryPoint.balanceOf(paymasterAddr);

  console.log("\n--- DONE ---");
  console.log("Paymaster:           ", paymasterAddr);
  console.log("Balance after deposit:", ethers.formatEther(balanceAfter), "ETH");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
/*
EOA: 0xd99DD4bbc56Dd688D8426e7a64ea041899041171
ENTRY_POINT: 0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789
Paymaster deployed at: 0x2cFd0CA417C9beFe91C269476c43EB2b91ed9244
Depositing 0.01 ETH...
Deposit complete. Tx: 0x82b8cc0c0a28eda178ef8709f42165681f629354293687507b4e78d0a4d8054b

--- DONE ---
Paymaster:            0x2cFd0CA417C9beFe91C269476c43EB2b91ed9244
Balance after deposit: 0.01 ETH
**/