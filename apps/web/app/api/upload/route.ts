import { NextRequest, NextResponse } from 'next/server';
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

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

const uploadSchema = z.object({
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

type UploadRequest = z.infer<typeof uploadSchema> & { file: File };

function validateRequest(formData: FormData): UploadRequest {
  const file = formData.get('file') as File | null;

  if (!file) {
    throw new ValidationError('File is required');
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new ValidationError(`File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new ValidationError('Invalid file type. Allowed: JPEG, PNG, WebP');
  }

  const result = uploadSchema.safeParse({
    title: formData.get('title') ?? '',
    description: formData.get('description') ?? null,
    tags: formData.get('tags') ?? '',
    price: formData.get('price') ?? '',
    photographerAddress: formData.get('photographerAddress') ?? '',
  });

  if (!result.success) {
    const firstError = result.error.errors[0];
    throw new ValidationError(firstError.message);
  }

  return { file, ...result.data };
}

async function processImage(imageBuffer: Buffer) {
  const dimensions = await getImageDimensions(imageBuffer);
  const resized = await resizeForPreview(imageBuffer);
  const watermarked = await addWatermark(resized);

  return { dimensions, watermarked };
}

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[/\\]/g, '-')
    .replace(/\.\./g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '_');
}

export async function POST(request: NextRequest) {
  try {
    console.log('[Upload] Starting upload...');

    console.log('[Upload] Parsing form data...');
    const formData = await request.formData();
    const data = validateRequest(formData);

    console.log('[Upload] Processing image...');
    const imageBuffer = Buffer.from(await data.file.arrayBuffer());
    const { dimensions, watermarked } = await processImage(imageBuffer);

    // Generate unique filenames with sanitization to prevent path traversal
    const timestamp = Date.now();
    const safeName = sanitizeFilename(data.file.name);
    const originalFilename = `original-${timestamp}-${safeName}`;
    const watermarkedFilename = `watermarked-${timestamp}-${safeName}`;

    console.log('[Upload] Uploading to Vercel Blob...');
    const [originalResult, watermarkedResult] = await Promise.all([
      uploadToBlob(imageBuffer, originalFilename),
      uploadToBlob(watermarked, watermarkedFilename),
    ]);
    console.log('[Upload] Blob upload complete');

    console.log('[Upload] Checking for existing username...');
    const [existingUsername] = await db
      .select()
      .from(usernames)
      .where(eq(usernames.userAddress, data.photographerAddress.toLowerCase()))
      .limit(1);

    console.log('[Upload] Saving to database...');
    const [image] = await db
      .insert(images)
      .values({
        originalBlobUrl: originalResult.url,
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

    return NextResponse.json({
      id: image.id,
      originalBlobUrl: originalResult.url,
      watermarkedBlobUrl: watermarkedResult.url,
      hasUsername: !!existingUsername,
      isFirstUpload: !existingUsername,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    const status = error instanceof ValidationError ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
