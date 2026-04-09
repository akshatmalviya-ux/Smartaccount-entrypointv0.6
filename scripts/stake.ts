import hre from "hardhat";

const PAYMASTER_ADDRESS = "0x9Bc982384c5971E9484D9595271c209363f318c4";

// how long funds stay locked before unstake (in seconds)
const UNSTAKE_DELAY = 10; // 1 hour

async function main() {
  const { ethers } = await hre.network.connect();
  const [signer] = await ethers.getSigners();

  console.log("Signer:", signer.address);

  const paymaster = await ethers.getContractAt(
    "Paymaster",
    PAYMASTER_ADDRESS
  );

  // amount to stake
  const stakeAmount = ethers.parseEther("0.01");

  console.log("Adding stake...");
  console.log("Amount:", ethers.formatEther(stakeAmount), "ETH");
  console.log("Unstake delay:", UNSTAKE_DELAY, "seconds");

  const tx = await paymaster.addStake(UNSTAKE_DELAY, {
    value: stakeAmount,
  });

  console.log("Tx sent:", tx.hash);

  const receipt = await tx.wait();

  console.log("✅ Stake added successfully");
  console.log("Block:", receipt?.blockNumber);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
/**
 * 
Signer: 0xa5AF15Bd94616b226AC07637b2908FDa06BBdC2a
Adding stake...
Amount: 0.01 ETH
Unstake delay: 10 seconds
Tx sent: 0xe54c589b2518de2b4596e49feb5e971960bb59b064807270f04cece8b110bd06
✅ Stake added successfully
Block: 10622035
 */