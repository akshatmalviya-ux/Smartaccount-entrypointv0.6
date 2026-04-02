import hre from "hardhat";
const ENTRYPOINT =
"0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";

const FACTORY =
"0x3DFB913bB784E50B553D32b2Bb49481c05b0D03B";

const SALT = 1;

async function main() {

 const { ethers } =
   await hre.network.connect();

 const [owner] =
   await ethers.getSigners();

 console.log("EOA:", owner.address);

 /*
 factory instance
 */

 const factory =
   await ethers.getContractAt(
     "SmartAccountFactory",
     FACTORY
   );

 /*
 get smart account address
 */

 const smartAccountAddress =
   await factory
   .getFunction("getAddress")(
     owner.address,
     SALT
   );

 console.log(
   "SmartAccount:",
   smartAccountAddress
 );

 /*
 check deployed
 */

 const code =
   await ethers.provider.getCode(
     smartAccountAddress
   );

 if (code === "0x") {

   throw Error(
     "SmartAccount not deployed"
   );

 }

 /*
 entrypoint
 */

 const entryPoint =
   await ethers.getContractAt(
     "IEntryPoint",
     ENTRYPOINT
   );
   const paymasterAddress = "0x0E4611C1581e4b130b77B8803a778D417F1B3961";
   const paymaster= await ethers.getContractAt(
    "Paymaster",
    paymasterAddress
   );

 /*
 ensure deposit exists
 */

 const deposit =
   await entryPoint.balanceOf(
     paymasterAddress
   );

 console.log(
   "deposit:",
   deposit.toString()
 );

 if (deposit === 0n) {

   console.log(
     "depositing 0.01 ETH"
   );

   await entryPoint.depositTo(
     paymasterAddress,
     {
       value:
       ethers.parseEther("0.01")
     }
   );

 }

 /*
 encode call
 */

 const smartAccount =
   await ethers.getContractAt(
     "SmartAccount",
     smartAccountAddress
   );

 const callData =
   smartAccount.interface
   .encodeFunctionData(
     "execute",
     [
       owner.address,
       0,
       "0x"
     ]
   );

 /*
 nonce
 */

 const nonce =
   await entryPoint.getNonce(
     smartAccountAddress,
     0
   );

 console.log(
   "nonce:",
   nonce.toString()
 );

 /*
 fees
 */

 const fee =
   await ethers.provider
   .getFeeData();

 /*
 userOp
 */

 const userOp = {

   sender:
     smartAccountAddress,

   nonce,

   initCode: "0x",

   callData,

   callGasLimit: 500000,

   verificationGasLimit:
     500000,

   preVerificationGas:
     100000,

   maxFeePerGas:
     fee.maxFeePerGas!,

   maxPriorityFeePerGas:
     fee.maxPriorityFeePerGas!,

   paymasterAndData:
     "0x0E4611C1581e4b130b77B8803a778D417F1B3961",

   signature: "0x"

 };

 /*
 sign
 */


   const validateUntil =Math.floor(Date.now() / 1000) + 3600; // valid for 1 hour
   const validateAfter = 0; // valid immediately
   const paymasterHash= 
    await paymaster.getHash(
      userOp,
      validateUntil,
      validateAfter
    );
    const paymasterSignature = await owner.signMessage(ethers.getBytes(paymasterHash));
    const encodeTimeRange = ethers.solidityPacked(
      ["uint256", "uint256"],
      [validateUntil, validateAfter]  
    );
    userOp.paymasterAndData =
    ethers.concat([
      "0x0E4611C1581e4b130b77B8803a778D417F1B3961",
      encodeTimeRange,
      paymasterSignature
    ]);
  
    const userOpHash= await entryPoint.getUserOpHash(
      userOp
    );
    const signature =
   await owner.signMessage(
     ethers.getBytes(
       userOpHash
     )
   );


 userOp.signature =
   signature;

 console.log("signed");

 /*
 send
 */

 const tx =
   await entryPoint.handleOps(
     [userOp],
     owner.address
   );

 await tx.wait();

 console.log(
   "UserOp SUCCESS"
 );

}

main().catch(console.error);
