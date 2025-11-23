import { NextRequest, NextResponse } from 'next/server';
import { del } from '@vercel/blob';
import { db, images, usernames, encryptWithMasterKey } from '@lens-llama/database';
import {
  addWatermark,
  resizeForPreview,
  getImageDimensions,
  generateEncryptionKey,
  encryptImage,
  keyToHex,
} from '@lens-llama/image-processing';
import { uploadToFilecoin } from '@lens-llama/storage';
import { z } from 'zod';
import { eq } from 'drizzle-orm';

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

const finalizeSchema = z.object({
  blobUrl: z.string().url('Invalid blob URL'),
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
});

async function processImage(imageBuffer: Buffer) {
  const dimensions = await getImageDimensions(imageBuffer);
  const resized = await resizeForPreview(imageBuffer);
  const watermarked = await addWatermark(resized);

  const encryptionKey = generateEncryptionKey();
  const encrypted = encryptImage(imageBuffer, encryptionKey);

  return { dimensions, watermarked, encrypted, encryptionKey };
}

export async function POST(request: NextRequest) {
  let blobUrl: string | null = null;

  try {
    console.log('[Finalize] Starting finalization...');

    // Fail fast if server is misconfigured
    const masterKey = process.env.MASTER_ENCRYPTION_KEY;
    if (!masterKey) {
      console.error('MASTER_ENCRYPTION_KEY not set');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    console.log('[Finalize] Parsing request body...');
    const body = await request.json();
    const result = finalizeSchema.safeParse(body);

    if (!result.success) {
      const firstError = result.error.errors[0];
      throw new ValidationError(firstError.message);
    }

    const data = result.data;
    blobUrl = data.blobUrl;

    console.log('[Finalize] Fetching image from blob storage...');
    const blobResponse = await fetch(data.blobUrl);
    if (!blobResponse.ok) {
      throw new ValidationError('Failed to fetch image from blob storage');
    }

    const imageBuffer = Buffer.from(await blobResponse.arrayBuffer());
    console.log('[Finalize] Image fetched, size:', imageBuffer.length);

    console.log('[Finalize] Processing image...');
    const { dimensions, watermarked, encrypted, encryptionKey } = await processImage(imageBuffer);

    console.log('[Finalize] Uploading to Filecoin...');
    const [encryptedResult, watermarkedResult] = await Promise.all([
      uploadToFilecoin(encrypted),
      uploadToFilecoin(watermarked),
    ]);
    console.log('[Finalize] Filecoin upload complete');

    const encryptedKey = encryptWithMasterKey(keyToHex(encryptionKey), masterKey);

    console.log('[Finalize] Checking for existing username...');
    const [existingUsername] = await db
      .select()
      .from(usernames)
      .where(eq(usernames.userAddress, data.photographerAddress.toLowerCase()))
      .limit(1);

    console.log('[Finalize] Saving to database...');
    const [image] = await db
      .insert(images)
      .values({
        encryptedCid: encryptedResult.pieceCid,
        watermarkedCid: watermarkedResult.pieceCid,
        encryptionKey: encryptedKey,
        photographerAddress: data.photographerAddress,
        photographerUsername: existingUsername?.username || null,
        title: data.title,
        description: data.description,
        tags: data.tags,
        priceUsdc: data.price.toFixed(2),
        width: dimensions.width,
        height: dimensions.height,
      })
      .returning({ id: images.id });
    console.log('[Finalize] Complete! ID:', image.id);

    // Clean up the blob after successful processing
    console.log('[Finalize] Cleaning up blob storage...');
    await del(data.blobUrl);

    return NextResponse.json({
      id: image.id,
      encryptedCid: encryptedResult.pieceCid,
      watermarkedCid: watermarkedResult.pieceCid,
      hasUsername: !!existingUsername,
      isFirstUpload: !existingUsername,
    });
  } catch (error) {
    // Try to clean up blob on error
    if (blobUrl) {
      try {
        await del(blobUrl);
      } catch (cleanupError) {
        console.error('[Finalize] Failed to clean up blob:', cleanupError);
      }
    }

    const message = error instanceof Error ? error.message : 'Finalization failed';
    const status = error instanceof ValidationError ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
