import { NextResponse } from 'next/server';
import { verifyAccessToken, extractTokenFromHeader, type VerifiedUser } from '@/lib/auth';

/**
 * Higher-order function that wraps API route handlers with authentication
 *
 * @example
 * export const POST = withAuth(async (request, user) => {
 *   // user.userId and user.walletAddress are available
 *   return NextResponse.json({ success: true });
 * });
 */
export function withAuth<T extends any[]>(
  handler: (request: Request, user: VerifiedUser, ...args: T) => Promise<Response>
) {
  return async (request: Request, ...args: T): Promise<Response> => {
    try {
      // Extract and verify access token
      const authHeader = request.headers.get('authorization');
      const token = extractTokenFromHeader(authHeader);
      const user = await verifyAccessToken(token);

      // Call the actual handler with verified user
      return await handler(request, user, ...args);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication failed';
      return NextResponse.json({ error: message }, { status: 401 });
    }
  };
}

/**
 * Check if a wallet address matches the authenticated user's wallet
 * Pure function - returns boolean without side effects
 */
export function doWalletAddressesMatch(user: VerifiedUser, address: string): boolean {
  return user.walletAddress.toLowerCase() === address.toLowerCase();
}
