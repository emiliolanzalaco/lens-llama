import { createPublicClient, createWalletClient, http } from 'viem';
import { mainnet, sepolia } from 'viem/chains';

const chain = process.env.NEXT_PUBLIC_CHAIN === 'mainnet' ? mainnet : sepolia;

export const publicClient = createPublicClient({
  chain,
  transport: http(process.env.NEXT_PUBLIC_RPC_URL),
});

export const walletClient = createWalletClient({
  chain,
  transport: http(process.env.NEXT_PUBLIC_RPC_URL),
});

export { chain };
