'use client';

import { useCallback } from 'react';
import { useWallets } from '@privy-io/react-auth';
import { createWalletClient, custom, type Address, type Hex } from 'viem';
import { baseSepolia } from 'viem/chains';
import { USDC_ADDRESS, X402_PAYMENT_HEADER } from '@/lib/x402';

// EIP-712 domain for USDC (must match x402 facilitator config)
const USDC_DOMAIN = {
  name: 'USDC',
  version: '2',
  chainId: baseSepolia.id,
  verifyingContract: USDC_ADDRESS as Address,
};

// TransferWithAuthorization types
const AUTHORIZATION_TYPES = {
  TransferWithAuthorization: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'validAfter', type: 'uint256' },
    { name: 'validBefore', type: 'uint256' },
    { name: 'nonce', type: 'bytes32' },
  ],
} as const;

interface PaymentRequirements {
  maxAmountRequired: string;
  payTo: string;
  resource: string;
  description: string;
}

interface PurchaseResult {
  success: boolean;
  imageBlob?: Blob;
  error?: string;
}

export function useX402Payment() {
  const { wallets } = useWallets();

  const purchaseImage = useCallback(
    async (
      imageId: string,
      paymentRequirements: PaymentRequirements
    ): Promise<PurchaseResult> => {
      const wallet = wallets[0];
      if (!wallet) {
        return { success: false, error: 'No wallet connected' };
      }

      try {
        // Get the Ethereum provider from Privy wallet
        const provider = await wallet.getEthereumProvider();

        // Create viem wallet client
        const walletClient = createWalletClient({
          account: wallet.address as Address,
          chain: baseSepolia,
          transport: custom(provider),
        });

        // Generate random nonce
        const nonce = ('0x' +
          Array.from(crypto.getRandomValues(new Uint8Array(32)))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('')) as Hex;

        // Set validity window (5 minutes)
        const now = Math.floor(Date.now() / 1000);
        const validAfter = now - 60; // Valid from 1 minute ago
        const validBefore = now + 300; // Valid for 5 minutes

        // Create authorization message
        const authorization = {
          from: wallet.address as Address,
          to: paymentRequirements.payTo as Address,
          value: BigInt(paymentRequirements.maxAmountRequired),
          validAfter: BigInt(validAfter),
          validBefore: BigInt(validBefore),
          nonce,
        };

        // Sign typed data
        const signature = await walletClient.signTypedData({
          account: wallet.address as Address,
          domain: USDC_DOMAIN,
          types: AUTHORIZATION_TYPES,
          primaryType: 'TransferWithAuthorization',
          message: authorization,
        });

        // Create x402 payment payload
        const paymentPayload = {
          x402Version: 1,
          scheme: 'exact',
          network: 'base-sepolia',
          payload: {
            signature,
            authorization: {
              from: wallet.address,
              to: paymentRequirements.payTo,
              value: paymentRequirements.maxAmountRequired,
              validAfter: validAfter.toString(),
              validBefore: validBefore.toString(),
              nonce,
            },
          },
        };

        // Base64 encode the payload (using TextEncoder for Unicode support)
        const payloadString = JSON.stringify(paymentPayload);
        const encodedPayload = btoa(
          Array.from(new TextEncoder().encode(payloadString), (byte) =>
            String.fromCharCode(byte)
          ).join('')
        );

        // Make request with payment header
        const response = await fetch(`/api/images/${imageId}`, {
          headers: {
            [X402_PAYMENT_HEADER]: encodedPayload,
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          // Include reason if available
          const errorMsg = errorData.reason
            ? `${errorData.error}: ${errorData.reason}`
            : errorData.error || `Payment failed: ${response.status}`;
          return {
            success: false,
            error: errorMsg,
          };
        }

        // Get the decrypted image
        const imageBlob = await response.blob();

        return {
          success: true,
          imageBlob,
        };
      } catch (error) {
        console.error('Payment error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Payment failed',
        };
      }
    },
    [wallets]
  );

  return {
    purchaseImage,
    hasWallet: wallets.length > 0,
  };
}

export type UseX402PaymentReturn = ReturnType<typeof useX402Payment>;
