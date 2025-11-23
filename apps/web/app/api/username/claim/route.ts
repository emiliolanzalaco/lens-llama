import { NextRequest, NextResponse } from 'next/server';
import { validateUsername } from '@lens-llama/shared';
import { db, usernames, images } from '@lens-llama/database';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';

interface ClaimUsernameRequest {
  username: string;
  userAddress: string;
  firstImageId?: string;
}

/**
 * Claim a username
 * POST /api/username/claim
 */
export async function POST(request: NextRequest) {
  try {
    const body: ClaimUsernameRequest = await request.json();
    const { username, userAddress, firstImageId } = body;

    if (!username || !userAddress) {
      return NextResponse.json(
        { error: 'Username and userAddress are required' },
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

    // Validate username format
    const validation = validateUsername(username);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Check if user already has a username
    const existingUserUsername = await db
      .select()
      .from(usernames)
      .where(eq(usernames.userAddress, userAddress.toLowerCase()))
      .limit(1);

    if (existingUserUsername.length > 0) {
      return NextResponse.json(
        {
          error: 'User already has a username',
          existingUsername: existingUserUsername[0].username,
        },
        { status: 409 }
      );
    }

    // Check if username is already taken in database
    const existingUsername = await db
      .select()
      .from(usernames)
      .where(eq(usernames.username, username.toLowerCase()))
      .limit(1);

    if (existingUsername.length > 0) {
      return NextResponse.json(
        { error: 'Username is already taken' },
        { status: 409 }
      );
    }

    // Store username in database
    const [newUsername] = await db
      .insert(usernames)
      .values({
        userAddress: userAddress.toLowerCase(),
        username: username.toLowerCase(),
        firstImageId: firstImageId || null,
      })
      .returning();

    // Update all images from this photographer to include the username
    if (newUsername) {
      await db
        .update(images)
        .set({ photographerUsername: username.toLowerCase() })
        .where(eq(images.photographerAddress, userAddress.toLowerCase()));
    }

    return NextResponse.json(
      {
        success: true,
        username: newUsername.username,
        claimedAt: newUsername.claimedAt,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error claiming username:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to claim username',
      },
      { status: 500 }
    );
  }
}
