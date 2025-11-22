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

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

interface UploadRequest {
  file: File;
  title: string;
  description: string | null;
  tags: string[];
  price: number;
  photographerAddress: string;
}

function validateRequest(formData: FormData): UploadRequest {
  const file = formData.get('file') as File | null;
  const title = formData.get('title') as string | null;
  const description = formData.get('description') as string | null;
  const tagsRaw = formData.get('tags') as string | null;
  const priceRaw = formData.get('price') as string | null;
  const photographerAddress = formData.get('photographerAddress') as string | null;

  if (!file) throw new ValidationError('File is required');
  if (!title) throw new ValidationError('Title is required');
  if (!priceRaw) throw new ValidationError('Price is required');
  if (!photographerAddress) throw new ValidationError('Photographer address is required');

  if (file.size > MAX_FILE_SIZE) {
    throw new ValidationError(`File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new ValidationError('Invalid file type. Allowed: JPEG, PNG, WebP');
  }

  const price = parseFloat(priceRaw);
  if (isNaN(price) || price <= 0) {
    throw new ValidationError('Invalid price');
  }

  const tags = tagsRaw
    ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean)
    : [];

  return { file, title, description, tags, price, photographerAddress };
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
