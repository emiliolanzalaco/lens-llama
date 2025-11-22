import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying contracts with the account:", deployer.address);

  const PaymentToken = await ethers.getContractFactory("PaymentToken");
  const token = await PaymentToken.deploy();
  await token.waitForDeployment();

  console.log("PaymentToken deployed to:", await token.getAddress());

  const PaymentProcessor = await ethers.getContractFactory("PaymentProcessor");
  const processor = await PaymentProcessor.deploy();
  await processor.waitForDeployment();

  console.log("PaymentProcessor deployed to:", await processor.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
