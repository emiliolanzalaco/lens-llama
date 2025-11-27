'use client';

import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useMemo, useCallback } from 'react';

export function useAuth() {
  const {
    ready,
    authenticated,
    user,
    login,
    logout,
    linkEmail,
    linkGoogle,
    linkWallet,
    getAccessToken,
  } = usePrivy();

  const { wallets } = useWallets();

  // Get the first wallet (embedded or connected)
  const wallet = useMemo(() => {
    return wallets[0] || null;
  }, [wallets]);

  // Get the wallet address
  const walletAddress = useMemo(() => {
    return wallet?.address || null;
  }, [wallet]);

  // Check if wallet is an embedded wallet (email/google users)
  const isEmbeddedWallet = useMemo(() => {
    return wallet?.walletClientType === 'privy';
  }, [wallet]);

  // Sign message with invisible signing for embedded wallets
  const signMessage = useCallback(async (message: string): Promise<string | null> => {
    if (!wallet) return null;

    try {
      const provider = await wallet.getEthereumProvider();

      // For embedded wallets, sign without UI confirmation
      if (isEmbeddedWallet) {
        const signature = await provider.request({
          method: 'personal_sign',
          params: [message, wallet.address],
        });
        return signature as string;
      }

      // For external wallets, use normal signing flow
      const signature = await provider.request({
        method: 'personal_sign',
        params: [message, wallet.address],
      });
      return signature as string;
    } catch (error) {
      console.error('Failed to sign message:', error);
      return null;
    }
  }, [wallet, isEmbeddedWallet]);

  return {
    // Auth state
    ready,
    authenticated,
    user,

    // Wallet info
    wallet,
    walletAddress,
    isEmbeddedWallet,

    // Auth actions
    login,
    logout,
    linkEmail,
    linkGoogle,
    linkWallet,

    // Token
    getAccessToken,

    // Signing
    signMessage,
  };
}

export type UseAuthReturn = ReturnType<typeof useAuth>;
