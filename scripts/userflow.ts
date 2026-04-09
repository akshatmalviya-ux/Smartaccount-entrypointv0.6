import hre from "hardhat";
const {ethers}=await hre.network.connect();
const ENTRYPOINT =
"0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";

const SALT = 2;

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


/*

EOA: 0xa5AF15Bd94616b226AC07637b2908FDa06BBdC2a
Factory: 0x7b8d4353c006A5Ab39D63766B46Dd379Fb7cF988
SmartAccount: 0x0ab8EFB25DA7E6464b13B84D3D9638737Eb065C5
Deploying SmartAccount...
SmartAccount deployed
Depositing...
Deposit done

SETUP DONE
*/
/*

EOA: 0xa5AF15Bd94616b226AC07637b2908FDa06BBdC2a
Factory: 0x97EE26469ABCC80caAf615E5b98c6eC2348c38Aa
SmartAccount: 0xEb217134ebEaC9a340a9925a98B77b4f4B6be71C
Deploying SmartAccount...
SmartAccount deployed
Depositing...
Deposit done

SETUP DONE
*/
///
/*
EOA: 0xa5AF15Bd94616b226AC07637b2908FDa06BBdC2a
Factory: 0x97EE26469ABCC80caAf615E5b98c6eC2348c38Aa
SmartAccount: 0xEb217134ebEaC9a340a9925a98B77b4f4B6be71C
Deploying SmartAccount...
SmartAccount deployed
Depositing...
Deposit done

SETUP DONE
lovepreet@Rohit-Chandels-C07F5094PJH8 Smartaccount-entrypointv0.6 % 
*/