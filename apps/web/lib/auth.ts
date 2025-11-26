import { PrivyClient } from '@privy-io/server-auth';

/**
 * Server-side authentication utilities
 */

// Initialize Privy client
const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
);

export interface VerifiedUser {
  userId: string;
  walletAddress: string;
}

/**
 * Verify Privy access token and extract user information
 * @throws Error if token is invalid or expired
 */
export async function verifyAccessToken(token: string): Promise<VerifiedUser> {
  try {
    const claims = await privy.verifyAuthToken(token);

    // Get the user's linked wallets
    const user = await privy.getUser({ idToken: claims.userId });

    // Find the first embedded or external wallet
    const wallet = user.linkedAccounts.find(
      (account) => account.type === 'wallet'
    );

    if (!wallet || !('address' in wallet)) {
      throw new Error('No wallet found for user');
    }

    return {
      userId: claims.userId,
      walletAddress: wallet.address,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Authentication failed: ${error.message}`);
    }
    throw new Error('Authentication failed');
  }
}

/**
 * Extract access token from Authorization header
 */
export function extractTokenFromHeader(authHeader: string | null): string {
  if (!authHeader) {
    throw new Error('Missing Authorization header');
  }

  if (!authHeader.startsWith('Bearer ')) {
    throw new Error('Invalid Authorization header format');
  }

  return authHeader.substring(7);
}
