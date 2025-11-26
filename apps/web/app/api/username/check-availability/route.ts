import { NextRequest, NextResponse } from 'next/server';
import { validateUsername } from '@lens-llama/shared';
import { db, usernames } from '@lens-llama/database';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';

/**
 * Check if a username is available
 * GET /api/username/check-availability?username=alice
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json(
        { error: 'Username parameter is required' },
        { status: 400 }
      );
    }

    // Validate username format
    const validation = validateUsername(username);
    if (!validation.valid) {
      return NextResponse.json(
        {
          available: false,
          error: validation.error,
        },
        { status: 200 }
      );
    }

    // Check if username exists in our database
    const existingUsername = await db
      .select()
      .from(usernames)
      .where(eq(usernames.username, username.toLowerCase()))
      .limit(1);

    return NextResponse.json(
      {
        available: existingUsername.length === 0,
        error: existingUsername.length > 0 ? 'Username is already taken' : undefined,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error checking username availability:', error);
    return NextResponse.json(
      { error: 'Failed to check username availability' },
      { status: 500 }
    );
  }
}
