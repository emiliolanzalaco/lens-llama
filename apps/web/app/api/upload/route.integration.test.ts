import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from './route';
import { NextRequest } from 'next/server';
import { db, images } from '@lens-llama/database';
import { eq } from 'drizzle-orm';

// Only mock Filecoin - use real database and image processing
vi.mock('@lens-llama/storage', () => ({
  uploadToFilecoin: vi.fn().mockResolvedValue({ pieceCid: 'test-cid-123', size: 1000 }),
}));

function createFormData(overrides: Record<string, string | Blob> = {}) {
  const formData = new FormData();

  // Minimal valid 1x1 red JPEG that Sharp can process
  const jpegBytes = new Uint8Array([
    0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
    0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
    0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
    0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
    0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
    0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
    0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
    0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x14, 0x00, 0x01,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0xFF, 0xC4, 0x00, 0x14, 0x10, 0x01, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F, 0x00,
    0x7F, 0xFF, 0xD9
  ]);
  const file = new Blob([jpegBytes], { type: 'image/jpeg' });

  formData.append('file', file, 'test.jpg');
  formData.append('title', 'Integration Test Image');
  formData.append('price', '5.99');
  formData.append('photographerAddress', '0x1234567890123456789012345678901234567890');
  formData.append('description', 'Test description');
  formData.append('tags', 'test, integration');

  for (const [key, value] of Object.entries(overrides)) {
    formData.set(key, value);
  }

  return formData;
}

function createRequest(formData: FormData) {
  return new NextRequest('http://localhost/api/upload', {
    method: 'POST',
    body: formData,
  });
}

// Skip integration tests in CI (run locally with .env.local)
describe.skipIf(!process.env.POSTGRES_URL)('POST /api/upload integration', () => {
  let createdImageId: string | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MASTER_ENCRYPTION_KEY = '0'.repeat(64);
  });

  afterEach(async () => {
    // Clean up created image
    if (createdImageId) {
      await db.delete(images).where(eq(images.id, createdImageId));
      createdImageId = null;
    }
  });

  it('creates image record in database', async () => {
    const formData = createFormData();
    const response = await POST(createRequest(formData));
    const data = await response.json();

    if (response.status !== 200) {
      console.error('Error response:', data);
    }
    expect(response.status).toBe(200);
    expect(data.id).toBeDefined();
    createdImageId = data.id;

    // Verify record in database
    const [image] = await db
      .select()
      .from(images)
      .where(eq(images.id, data.id));

    expect(image).toBeDefined();
    expect(image.title).toBe('Integration Test Image');
    expect(image.priceUsdc).toBe('5.99');
    expect(image.photographerAddress).toBe('0x1234567890123456789012345678901234567890');
    expect(image.description).toBe('Test description');
    expect(image.tags).toEqual(['test', 'integration']);
    expect(image.encryptedCid).toBe('test-cid-123');
    expect(image.watermarkedCid).toBe('test-cid-123');
    expect(image.encryptionKey).toBeDefined();
    expect(image.width).toBeGreaterThan(0);
    expect(image.height).toBeGreaterThan(0);
  });

  it('encrypts the per-image key with master key', async () => {
    const formData = createFormData();
    const response = await POST(createRequest(formData));
    const data = await response.json();

    createdImageId = data.id;

    const [image] = await db
      .select()
      .from(images)
      .where(eq(images.id, data.id));

    // Encryption key should be in format: iv:authTag:encryptedData
    const parts = image.encryptionKey.split(':');
    expect(parts).toHaveLength(3);
    expect(parts[0]).toHaveLength(24); // 12 bytes hex = 24 chars (IV)
    expect(parts[1]).toHaveLength(32); // 16 bytes hex = 32 chars (auth tag)
    expect(parts[2].length).toBeGreaterThan(0); // encrypted key
  });
});
