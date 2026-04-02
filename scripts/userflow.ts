import hre from "hardhat";
const {ethers}=await hre.network.connect();
const ENTRYPOINT =
"0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";

const SALT = 1;

async function main() {
  const { ethers } = await hre.network.connect();
  const [owner] = await ethers.getSigners();

  console.log("EOA:", owner.address);

  // Deploy Factory
  const Factory = await ethers.getContractFactory("SmartAccountFactory");
  const factory = await Factory.deploy(ENTRYPOINT);
  await factory.waitForDeployment();

  const factoryAddr = await factory.getAddress();
  console.log("Factory:", factoryAddr);

  // Predict SmartAccount
  const smartAccount = await factory.getFunction("getAddress")(owner.address, SALT);
  console.log("SmartAccount:", smartAccount);

  // Deploy if not exists
  const code = await ethers.provider.getCode(smartAccount);

  if (code === "0x") {
    console.log("Deploying SmartAccount...");
    const tx = await factory.createAccount(owner.address, SALT);
    await tx.wait();
    console.log("SmartAccount deployed");
  } else {
    console.log("Already deployed");
  }

  // Deposit ETH
  const entryPoint = await ethers.getContractAt(
    [
      "function balanceOf(address) view returns (uint256)",
      "function depositTo(address) payable"
    ],
    ENTRYPOINT
  );

  const balance = await entryPoint.balanceOf(smartAccount);

  if (balance === 0n) {
    console.log("Depositing...");
    const tx = await entryPoint.depositTo(smartAccount, {
      value: ethers.parseEther("0.01")
    });
    await tx.wait();
    console.log("Deposit done");
  }

  console.log("\nSETUP DONE");
}

main().catch(console.error);



/**
 
EOA: 0xd99DD4bbc56Dd688D8426e7a64ea041899041171
Factory: 0x3DFB913bB784E50B553D32b2Bb49481c05b0D03B
SmartAccount: 0x97f7b7a5E152D78871E74Ec9F84fB9a905F2374C
Deploying SmartAccount...
SmartAccount deployed
Depositing...
Deposit done

SETUP DONE
 */