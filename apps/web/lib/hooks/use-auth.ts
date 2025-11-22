'use client';

import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useMemo } from 'react';

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

  return {
    // Auth state
    ready,
    authenticated,
    user,

    // Wallet info
    wallet,
    walletAddress,

    // Auth actions
    login,
    logout,
    linkEmail,
    linkGoogle,
    linkWallet,
  };
}

export type UseAuthReturn = ReturnType<typeof useAuth>;
