import { expect } from "chai";
import { ethers } from "hardhat";

describe("PaymentToken", function () {
  it("Should deploy successfully and mint initial supply", async function () {
    const [owner] = await ethers.getSigners();
    
    const PaymentToken = await ethers.getContractFactory("PaymentToken");
    const token = await PaymentToken.deploy();
    await token.waitForDeployment();

    const totalSupply = await token.totalSupply();
    const expectedSupply = ethers.parseUnits("1000000", 18);
    
    expect(totalSupply).to.equal(expectedSupply);
    
    const ownerBalance = await token.balanceOf(owner.address);
    expect(ownerBalance).to.equal(expectedSupply);
  });

  it("Should allow owner to mint new tokens", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    const PaymentToken = await ethers.getContractFactory("PaymentToken");
    const token = await PaymentToken.deploy();
    await token.waitForDeployment();

    const mintAmount = ethers.parseUnits("1000", 18);
    await token.mint(addr1.address, mintAmount);

    const balance = await token.balanceOf(addr1.address);
    expect(balance).to.equal(mintAmount);
  });
});

describe("PaymentProcessor", function () {
  it("Should deploy successfully", async function () {
    const PaymentProcessor = await ethers.getContractFactory("PaymentProcessor");
    const processor = await PaymentProcessor.deploy();
    await processor.waitForDeployment();

    const balance = await processor.getBalance();
    expect(balance).to.equal(0);
  });

  it("Should process payments", async function () {
    const [owner] = await ethers.getSigners();
    
    const PaymentProcessor = await ethers.getContractFactory("PaymentProcessor");
    const processor = await PaymentProcessor.deploy();
    await processor.waitForDeployment();

    const paymentId = ethers.id("payment-123");
    const paymentAmount = ethers.parseEther("1.0");

    await expect(
      processor.processPayment(paymentId, { value: paymentAmount })
    ).to.emit(processor, "PaymentReceived");

    const balance = await processor.getBalance();
    expect(balance).to.equal(paymentAmount);
  });
});
