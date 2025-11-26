import { NextResponse } from 'next/server';
import { db, images, usernames } from '@lens-llama/database';
import { eq } from 'drizzle-orm';
import { completeUploadSchema } from '@/lib/upload-validation';
import { withAuth, doWalletAddressesMatch } from '@/lib/api-auth';

export const POST = withAuth(async (request, user): Promise<Response> => {
  try {
    const body = await request.json();
    const data = completeUploadSchema.parse(body);

    // Verify the photographer address matches the authenticated user's wallet
    if (!doWalletAddressesMatch(user, data.photographerAddress)) {
      return NextResponse.json(
        { error: 'Photographer address does not match authenticated wallet' },
        { status: 403 }
      );
    }

    // Check for existing username
    const [existingUsername] = await db
      .select()
      .from(usernames)
      .where(eq(usernames.userAddress, data.photographerAddress.toLowerCase()))
      .limit(1);

    // Save to database
    const [image] = await db
      .insert(images)
      .values({
        originalBlobUrl: data.originalUrl,
        watermarkedBlobUrl: data.watermarkedUrl,
        photographerAddress: data.photographerAddress,
        photographerUsername: existingUsername?.username || null,
        title: data.title,
        description: data.description,
        tags: data.tags,
        priceUsdc: data.price.toFixed(2),
        width: data.width,
        height: data.height,
      })
      .returning({ id: images.id });

    return NextResponse.json({ id: image.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to complete upload';
    return NextResponse.json({ error: message }, { status: 400 });
  }
});
