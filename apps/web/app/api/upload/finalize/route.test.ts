import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@vercel/blob', () => ({
  del: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@lens-llama/database', () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'test-uuid' }]),
      }),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
  },
  images: {},
  usernames: {},
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

// Mock fetch for blob URL
const mockFetch = vi.fn();
global.fetch = mockFetch;

function createRequest(body: object) {
  return new NextRequest('http://localhost/api/upload/finalize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function createValidBody(overrides: Record<string, unknown> = {}) {
  return {
    blobUrl: 'https://blob.vercel-storage.com/test-image.jpg',
    title: 'Test Image',
    description: 'A test description',
    tags: 'nature, landscape',
    price: '10.00',
    photographerAddress: '0x1234567890123456789012345678901234567890',
    ...overrides,
  };
}

describe('POST /api/upload/finalize', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MASTER_ENCRYPTION_KEY = '0'.repeat(64);

    // Mock successful blob fetch
    mockFetch.mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
    });
  });

  it('returns 500 when MASTER_ENCRYPTION_KEY is not set', async () => {
    delete process.env.MASTER_ENCRYPTION_KEY;

    const response = await POST(createRequest(createValidBody()));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Server configuration error');
  });

  it('returns 400 when blobUrl is missing', async () => {
    const body = createValidBody();
    delete (body as Record<string, unknown>).blobUrl;

    const response = await POST(createRequest(body));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Required');
  });

  it('returns 400 when title is missing', async () => {
    const response = await POST(createRequest(createValidBody({ title: '' })));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Title is required');
  });

  it('returns 400 for invalid price', async () => {
    const response = await POST(createRequest(createValidBody({ price: '-5' })));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Price must be a positive number');
  });

  it('returns 400 for invalid photographer address', async () => {
    const response = await POST(createRequest(createValidBody({
      photographerAddress: 'invalid-address'
    })));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid Ethereum address');
  });

  it('returns 400 when blob fetch fails', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    const response = await POST(createRequest(createValidBody()));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Failed to fetch image from blob storage');
    expect(data.error).toContain('404');
  });

  it('successfully finalizes upload and returns CIDs', async () => {
    const response = await POST(createRequest(createValidBody()));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe('test-uuid');
    expect(data.encryptedCid).toBe('test-cid');
    expect(data.watermarkedCid).toBe('test-cid');
    expect(data.hasUsername).toBe(false);
    expect(data.isFirstUpload).toBe(true);
  });

  it('cleans up blob after successful processing', async () => {
    const { del } = await import('@vercel/blob');

    await POST(createRequest(createValidBody()));

    expect(del).toHaveBeenCalledWith('https://blob.vercel-storage.com/test-image.jpg');
  });

  it('cleans up blob on error', async () => {
    const { del } = await import('@vercel/blob');

    // Make image processing fail
    const imageProcessing = await import('@lens-llama/image-processing');
    vi.mocked(imageProcessing.getImageDimensions).mockRejectedValueOnce(new Error('Processing failed'));

    await POST(createRequest(createValidBody()));

    expect(del).toHaveBeenCalledWith('https://blob.vercel-storage.com/test-image.jpg');
  });

  it('returns hasUsername true when user has existing username', async () => {
    const database = await import('@lens-llama/database');
    vi.mocked(database.db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ username: 'testuser' }]),
        }),
      }),
    } as unknown as ReturnType<typeof database.db.select>);

    const response = await POST(createRequest(createValidBody()));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.hasUsername).toBe(true);
    expect(data.isFirstUpload).toBe(false);
  });
});
