import { NextRequest, NextResponse } from 'next/server';
import { db, images, encryptWithMasterKey } from '@lens-llama/database';
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

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
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

  const encryptionKey = generateEncryptionKey();
  const encrypted = encryptImage(imageBuffer, encryptionKey);

  return { dimensions, watermarked, encrypted, encryptionKey };
}

export async function POST(request: NextRequest) {
  try {
    // Fail fast if server is misconfigured
    const masterKey = process.env.MASTER_ENCRYPTION_KEY;
    if (!masterKey) {
      throw new Error('Server configuration error: MASTER_ENCRYPTION_KEY not set');
    }

    const formData = await request.formData();
    const data = validateRequest(formData);

    const imageBuffer = Buffer.from(await data.file.arrayBuffer());
    const { dimensions, watermarked, encrypted, encryptionKey } = await processImage(imageBuffer);

    const [encryptedResult, watermarkedResult] = await Promise.all([
      uploadToFilecoin(encrypted),
      uploadToFilecoin(watermarked),
    ]);

    const encryptedKey = encryptWithMasterKey(keyToHex(encryptionKey), masterKey);

    const [image] = await db
      .insert(images)
      .values({
        encryptedCid: encryptedResult.pieceCid,
        watermarkedCid: watermarkedResult.pieceCid,
        encryptionKey: encryptedKey,
        photographerAddress: data.photographerAddress,
        title: data.title,
        description: data.description,
        tags: data.tags,
        priceUsdc: data.price.toFixed(2),
        width: dimensions.width,
        height: dimensions.height,
      })
      .returning({ id: images.id });

    return NextResponse.json({
      id: image.id,
      encryptedCid: encryptedResult.pieceCid,
      watermarkedCid: watermarkedResult.pieceCid,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    const status = error instanceof ValidationError ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
