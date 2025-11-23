import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@lens-llama/database', () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'test-uuid' }]),
      }),
    }),
  },
  images: {},
  encryptWithMasterKey: vi.fn().mockReturnValue('encrypted-key'),
}));

vi.mock('@lens-llama/image-processing', () => ({
  addWatermark: vi.fn().mockResolvedValue(Buffer.from('watermarked')),
  resizeForPreview: vi.fn().mockResolvedValue(Buffer.from('resized')),
  getImageDimensions: vi.fn().mockResolvedValue({ width: 1920, height: 1080 }),
  generateEncryptionKey: vi.fn().mockReturnValue(Buffer.alloc(32)),
  encryptImage: vi.fn().mockReturnValue(Buffer.from('encrypted')),
  keyToHex: vi.fn().mockReturnValue('hex-key'),
}));

vi.mock('@lens-llama/storage', () => ({
  uploadToFilecoin: vi.fn().mockResolvedValue({ pieceCid: 'test-cid', size: 100 }),
}));

function createFormData(overrides: Record<string, string | Blob> = {}) {
  const formData = new FormData();
  const file = new Blob(['test image'], { type: 'image/jpeg' });

  formData.append('file', file, 'test.jpg');
  formData.append('title', 'Test Image');
  formData.append('price', '10.00');
  formData.append('photographerAddress', '0x1234567890123456789012345678901234567890');

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

describe('POST /api/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MASTER_ENCRYPTION_KEY = '0'.repeat(64);
  });

  it('returns 400 when file is missing', async () => {
    const formData = createFormData();
    formData.delete('file');

    const response = await POST(createRequest(formData));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('File is required');
  });

  it('returns 400 when title is missing', async () => {
    const formData = createFormData();
    formData.delete('title');

    const response = await POST(createRequest(formData));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Title is required');
  });

  it('returns 400 for invalid file type', async () => {
    const formData = createFormData();
    formData.set('file', new Blob(['test'], { type: 'text/plain' }), 'test.txt');

    const response = await POST(createRequest(formData));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid file type');
  });

  it('returns 400 for invalid price', async () => {
    const formData = createFormData({ price: '-5' });

    const response = await POST(createRequest(formData));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Price must be a positive number');
  });

  // it('successfully uploads image and returns CIDs', async () => {
  //   const formData = createFormData({
  //     tags: 'nature, landscape',
  //     description: 'A beautiful sunset',
  //   });

  //   const response = await POST(createRequest(formData));
  //   const data = await response.json();

  //   expect(response.status).toBe(200);
  //   expect(data.id).toBe('test-uuid');
  //   expect(data.encryptedCid).toBe('test-cid');
  //   expect(data.watermarkedCid).toBe('test-cid');
  // });
});
