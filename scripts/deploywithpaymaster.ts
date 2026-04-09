import * as dotenv from "dotenv";
dotenv.config();

import hre from "hardhat";

const ENTRYPOINT = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";

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

  const paymaster = await Paymaster.deploy(ENTRYPOINT,paymasterSigner.address);

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
latest

EOA: 0xa5AF15Bd94616b226AC07637b2908FDa06BBdC2a
ENTRY_POINT: 0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789
Paymaster deployed at: 0x9Bc982384c5971E9484D9595271c209363f318c4
Depositing 0.01 ETH...
Deposit complete. Tx: 0xa355a3a024787717989b50a53bc6de276f5a12edd556cf9005e092ac48e47c34

--- DONE ---
Paymaster:            0x9Bc982384c5971E9484D9595271c209363f318c4
Balance after deposit: 0.01 ETH

*/
/*

EOA: 0xa5AF15Bd94616b226AC07637b2908FDa06BBdC2a
ENTRY_POINT: 0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789
Paymaster deployed at: 0xdCBc9A63F59E5ABD1Fd9e724113f57f4468DBe21
Depositing 0.01 ETH...
Deposit complete. Tx: 0x34ff43043f4eb678034848f6344248be39ce90b6cdcd81645749229badbf32e9

--- DONE ---
Paymaster:            0xdCBc9A63F59E5ABD1Fd9e724113f57f4468DBe21
Balance after deposit: 0.01 ETH
lovepreet@Rohit-Chandels-C07F5094PJH8 Smartaccount-entrypointv0.6 % 

*/

/*


EOA: 0xa5AF15Bd94616b226AC07637b2908FDa06BBdC2a
ENTRY_POINT: 0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789
Paymaster deployed at: 0x8db6835D2566783dA02D529e193aDAC89d364E9E
Depositing 0.01 ETH...
Deposit complete. Tx: 0xad4e9df78bd2ed5036ea9634f8f7ac88eb40f887f596336057f55829cb29e0c0

--- DONE ---
Paymaster:            0x8db6835D2566783dA02D529e193aDAC89d364E9E
Balance after deposit: 0.01 ETH
**/
/*
WITHOUT SIGNER VERIFICATION (FOR TESTING PURPOSES ONLY)
EOA: 0xa5AF15Bd94616b226AC07637b2908FDa06BBdC2a
ENTRY_POINT: 0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789
Paymaster deployed at: 0x3a978FE4B1d1035791713837d42c6E5Cb9135B91
Depositing 0.01 ETH...
Deposit complete. Tx: 0x3ecff95d4a2c99cd9cd29a46e00ac979f906ec751a08f4ae3e97a33e105764d9

--- DONE ---
Paymaster:            0x3a978FE4B1d1035791713837d42c6E5Cb9135B91
Balance after deposit: 0.01 ETH
*/