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

    console.log('[Finalize] Fetching image from blob storage:', data.blobUrl);

    // Retry logic to handle race condition where blob isn't immediately available
    let blobResponse: Response | null = null;
    let lastError = '';
    for (let attempt = 1; attempt <= 3; attempt++) {
      blobResponse = await fetch(data.blobUrl);
      if (blobResponse.ok) {
        break;
      }
      lastError = `${blobResponse.status} ${blobResponse.statusText}`;
      console.log(`[Finalize] Blob fetch attempt ${attempt} failed: ${lastError}`);
      if (attempt < 3) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // 1s, 2s delays
      }
    }

    if (!blobResponse || !blobResponse.ok) {
      console.error('[Finalize] Blob fetch failed after retries:', {
        status: blobResponse?.status,
        statusText: blobResponse?.statusText,
        url: data.blobUrl,
      });
      throw new ValidationError(`Failed to fetch image from blob storage: ${lastError}`);
    }

    const imageBuffer = Buffer.from(await blobResponse.arrayBuffer());
    console.log('[Finalize] Image fetched, size:', imageBuffer.length);

    // Validate that we actually got an image
    const contentType = blobResponse.headers.get('content-type');
    console.log('[Finalize] Content-Type:', contentType);

    // Check if it's an image by looking at magic bytes
    const isJpeg = imageBuffer[0] === 0xff && imageBuffer[1] === 0xd8;
    const isPng = imageBuffer[0] === 0x89 && imageBuffer[1] === 0x50;
    const isWebp = imageBuffer[8] === 0x57 && imageBuffer[9] === 0x45 && imageBuffer[10] === 0x42 && imageBuffer[11] === 0x50;

    if (!isJpeg && !isPng && !isWebp) {
      console.error('[Finalize] Invalid image format. First 20 bytes:', imageBuffer.slice(0, 20).toString('hex'));
      console.error('[Finalize] As text:', imageBuffer.slice(0, 100).toString('utf-8'));
      throw new ValidationError('Invalid image format received from blob storage');
    }

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
