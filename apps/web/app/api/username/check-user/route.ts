import { NextRequest, NextResponse } from 'next/server';
import { db, usernames } from '@lens-llama/database';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';

/**
 * Check if a user already has a username
 * POST /api/username/check-user
 */
export async function POST(request: NextRequest) {
  try {
    const { userAddress } = await request.json();

    if (!userAddress) {
      return NextResponse.json(
        { error: 'userAddress is required' },
        { status: 400 }
      );
    }

    // Validate Ethereum address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
      return NextResponse.json(
        { error: 'Invalid Ethereum address format' },
        { status: 400 }
      );
    }

    // Check if user already has a username
    const existingUsername = await db
      .select()
      .from(usernames)
      .where(eq(usernames.userAddress, userAddress.toLowerCase()))
      .limit(1);

    return NextResponse.json(
      {
        hasUsername: existingUsername.length > 0,
        username: existingUsername[0]?.username || null,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error checking user username:', error);
    return NextResponse.json(
      { error: 'Failed to check user username' },
      { status: 500 }
    );
  }
}
