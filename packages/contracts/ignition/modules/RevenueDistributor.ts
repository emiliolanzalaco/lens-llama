import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

// Base Sepolia USDC address
const BASE_SEPOLIA_USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

export default buildModule("RevenueDistributorModule", (m) => {
  // Get parameters with defaults for Base Sepolia
  const usdcAddress = m.getParameter("usdcAddress", BASE_SEPOLIA_USDC);
  const treasuryAddress = m.getParameter("treasuryAddress");

  const revenueDistributor = m.contract("RevenueDistributor", [
    usdcAddress,
    treasuryAddress,
  ]);

  return { revenueDistributor };
});
