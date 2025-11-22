/**
 * One-time setup script to approve USDFC for Synapse storage
 *
 * Run with:
 * SYNAPSE_PRIVATE_KEY=... FILECOIN_RPC_URL=... npx tsx src/setup.ts
 */

import { Synapse } from '@filoz/synapse-sdk';

async function setup() {
  const privateKey = process.env.SYNAPSE_PRIVATE_KEY;
  const rpcURL = process.env.FILECOIN_RPC_URL;

  if (!privateKey || !rpcURL) {
    console.error('Missing SYNAPSE_PRIVATE_KEY or FILECOIN_RPC_URL');
    process.exit(1);
  }

  console.log('Creating Synapse client...');
  const synapse = await Synapse.create({ privateKey, rpcURL });

  console.log('Getting storage info...');
  const info = await synapse.getStorageInfo();

  console.log('Warm Storage Address:', info.serviceParameters.warmStorageAddress);
  console.log('Payments Address:', info.serviceParameters.paymentsAddress);

  if (info.allowances) {
    console.log('Current allowances:', {
      rateAllowance: info.allowances.rateAllowance.toString(),
      lockupAllowance: info.allowances.lockupAllowance.toString(),
      isApproved: info.allowances.isApproved,
    });
  } else {
    console.log('No allowances set up yet');
  }

  // Approve service with generous allowances
  const rateAllowance = BigInt('1000000000000000000'); // 1 USDFC
  const lockupAllowance = BigInt('1000000000000000000'); // 1 USDFC
  const maxLockupPeriod = BigInt(2880 * 30); // 30 days in epochs

  console.log('Approving service...');
  const tx = await synapse.payments.approveService(
    info.serviceParameters.warmStorageAddress,
    rateAllowance,
    lockupAllowance,
    maxLockupPeriod
  );

  console.log('Transaction hash:', tx.hash);
  console.log('Waiting for confirmation...');
  await tx.wait();

  console.log('Setup complete!');
}

setup().catch(console.error);
