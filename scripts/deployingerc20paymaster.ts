import hre  from "hardhat";

const ENTRYPOINT = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789"; // Sepolia EntryPoint
const TOKEN = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"; // Your ERC20 (USDC/GasToken)
const PRICE_FEED = "0x694AA1769357215DE4FAC081bf1f309aDC325306"; // Chainlink ETH/USD (Sepolia)
const VERIFYING_SIGNER = "0xd99DD4bbc56Dd688D8426e7a64ea041899041171";

async function main() {
  const { ethers } = await hre.network.connect();

  const [owner] = await ethers.getSigners();
  console.log("EOA:", owner.address);

  // Deploy Paymaster
  const Paymaster = await ethers.getContractFactory("ERC20Paymaster");

  const paymaster = await Paymaster.deploy(
    ENTRYPOINT,
    TOKEN,
    PRICE_FEED,
    VERIFYING_SIGNER
  );

  await paymaster.waitForDeployment();

  const paymasterAddr = await paymaster.getAddress();
  console.log("Paymaster deployed at:", paymasterAddr);

  // Connect EntryPoint
  const entryPoint = await ethers.getContractAt(
    "IEntryPoint",
    ENTRYPOINT
  );

  // Check existing deposit
  const balance = await entryPoint.balanceOf(paymasterAddr);

  console.log("Current deposit:", ethers.formatEther(balance), "ETH");

  // Deposit if needed
  if (balance === 0n) {
    console.log("Depositing 0.01 ETH...");

    const tx = await entryPoint.depositTo(paymasterAddr, {
      value: ethers.parseEther("0.01"),
    });

    await tx.wait();

    console.log("Deposit successful:", tx.hash);
  } else {
    console.log("Already funded");
  }

  const finalBalance = await entryPoint.balanceOf(paymasterAddr);

  console.log("\n--- DONE ---");
  console.log("Paymaster:", paymasterAddr);
  console.log("Final Balance:", ethers.formatEther(finalBalance), "ETH");
}

main().catch((err) => {
  console.error(" ERROR:", err);
  process.exitCode = 1;
});
/*

EOA: 0xd99DD4bbc56Dd688D8426e7a64ea041899041171
Paymaster deployed at: 0xe9577aF5555C37f56216172D83756183c1A9FD89
Current deposit: 0.0 ETH
Depositing 0.01 ETH...
Deposit successful: 0x2a2eba78e375d43bc8bdbeb80ec5578a581808cecb425a035be19461f1ecb4ff

--- DONE ---
Paymaster: 0xe9577aF5555C37f56216172D83756183c1A9FD89
Final Balance: 0.01 ETH
*/