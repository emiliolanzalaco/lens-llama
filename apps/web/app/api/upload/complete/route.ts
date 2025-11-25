import { NextResponse } from 'next/server';
import { db, images, usernames } from '@lens-llama/database';
import { z } from 'zod';
import { eq } from 'drizzle-orm';

const completeUploadSchema = z.object({
  originalUrl: z.string().url(),
  watermarkedUrl: z.string().url(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().nullable(),
  tags: z.string().transform((val) =>
    val ? val.split(',').map((t) => t.trim()).filter(Boolean) : []
  ),
  price: z.string().transform((val, ctx) => {
    const num = parseFloat(val);
    if (isNaN(num) || num <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Price must be a positive number',
      });
      return z.NEVER;
    }
    return num;
  }),
  photographerAddress: z.string().regex(
    /^0x[a-fA-F0-9]{40}$/,
    'Invalid Ethereum address'
  ),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const data = completeUploadSchema.parse(body);

    console.log('[Upload Complete] Saving to database...');

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

    console.log('[Upload Complete] Saved! ID:', image.id);

    return NextResponse.json({ id: image.id });
  } catch (error) {
    console.error('[Upload Complete] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to complete upload';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
