import hre  from "hardhat";

const ENTRYPOINT = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789"; // Sepolia EntryPoint
const TOKEN = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"; // Your ERC20 (USDC/GasToken)
const PRICE_FEED = "0x694AA1769357215DE4FAC081bf1f309aDC325306"; // Chainlink ETH/USD (Sepolia)
const VERIFYING_SIGNER = "0xa5AF15Bd94616b226AC07637b2908FDa06BBdC2a";


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

EOA: 0xa5AF15Bd94616b226AC07637b2908FDa06BBdC2a
Paymaster deployed at: 0xD34EeD3E64D4e73852F9231B55f8DF7bB3d22Fdf
Current deposit: 0.0 ETH
Depositing 0.01 ETH...
Deposit successful: 0x7731b022ea09165815e04d634827529e08e0407b900a759848c7ee703d590b66

--- DONE ---
Paymaster: 0xD34EeD3E64D4e73852F9231B55f8DF7bB3d22Fdf
Final Balance: 0.01 ETH
lovepreet@Rohit-Chandels-C07F5094PJH8 Smartaccount-entrypointv0.6 %             
*/