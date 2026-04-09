import hre from "hardhat";

const FACTORY = "0x3DFB913bB784E50B553D32b2Bb49481c05b0D03B";
const SALT = 1;

async function main() {
  const { ethers } = await hre.network.connect();
  const [owner] = await ethers.getSigners();

  console.log("EOA:", owner.address);

  const factory = await ethers.getContractAt(
    "SmartAccountFactory",
    FACTORY
  );

  //  Deploy smart account
  const tx = await factory.createAccount(owner.address, SALT);
  await tx.wait();

  console.log("SmartAccount deployed!");

  // Get address
  const smartAccountAddress = await factory.getFunction("getAddress")(
    owner.address,
    SALT
  );

  console.log("SmartAccount:", smartAccountAddress);
}

main().catch(console.error);