import { NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { db, images, usernames } from '@lens-llama/database';
import {
  addWatermark,
  resizeForPreview,
  getImageDimensions,
} from '@lens-llama/image-processing';
import { uploadToBlob } from '@lens-llama/storage';
import { z } from 'zod';
import { eq } from 'drizzle-orm';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const metadataSchema = z.object({
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

export async function POST(request: Request): Promise<Response> {
  let body: HandleUploadBody;

  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        // Validate metadata from client
        if (!clientPayload) {
          throw new Error('Missing upload metadata');
        }

        const metadata = JSON.parse(clientPayload);
        const result = metadataSchema.safeParse(metadata);

        if (!result.success) {
          const firstError = result.error.errors[0];
          throw new Error(firstError.message);
        }

        return {
          allowedContentTypes: ALLOWED_TYPES,
          maximumSizeInBytes: MAX_FILE_SIZE,
          addRandomSuffix: true,
          tokenPayload: clientPayload, // Pass metadata to onUploadCompleted
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // This runs after client uploads directly to Blob
        console.log('[Upload] Client upload completed:', blob.pathname);

        if (!tokenPayload) {
          throw new Error('Missing token payload');
        }

        const metadata = JSON.parse(tokenPayload);
        const data = metadataSchema.parse(metadata);

        // Fetch the uploaded image from Blob to process it
        console.log('[Upload] Fetching uploaded image for processing...');
        const imageResponse = await fetch(blob.url);
        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

        // Process image: get dimensions and create watermarked version
        console.log('[Upload] Processing image...');
        const dimensions = await getImageDimensions(imageBuffer);
        const resized = await resizeForPreview(imageBuffer);
        const watermarked = await addWatermark(resized);

        // Upload watermarked version
        const timestamp = Date.now();
        const watermarkedFilename = `watermarked-${timestamp}-${blob.pathname.split('/').pop()}`;
        console.log('[Upload] Uploading watermarked version...');
        const watermarkedResult = await uploadToBlob(watermarked, watermarkedFilename);

        // Check for existing username
        console.log('[Upload] Checking for existing username...');
        const [existingUsername] = await db
          .select()
          .from(usernames)
          .where(eq(usernames.userAddress, data.photographerAddress.toLowerCase()))
          .limit(1);

        // Save to database
        console.log('[Upload] Saving to database...');
        const [image] = await db
          .insert(images)
          .values({
            originalBlobUrl: blob.url,
            watermarkedBlobUrl: watermarkedResult.url,
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

        console.log('[Upload] Complete! ID:', image.id);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
