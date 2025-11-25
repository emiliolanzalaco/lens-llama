import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';

// Mock dependencies
vi.mock('@vercel/blob/client', () => ({
  handleUpload: vi.fn(),
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
}));


import { handleUpload } from '@vercel/blob/client';

describe('POST /api/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls handleUpload with correct configuration', async () => {
    vi.mocked(handleUpload).mockResolvedValue({
      type: 'blob.generate-client-token',
      clientToken: 'test-token',
    } as any);

    const request = new Request('http://localhost/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'blob.generate-client-token' }),
    });

    await POST(request);

    expect(handleUpload).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.any(Object),
        request: expect.any(Request),
        onBeforeGenerateToken: expect.any(Function),
        onUploadCompleted: expect.any(Function),
      })
    );
  });

  it('returns error for invalid JSON', async () => {
    const request = new Request('http://localhost/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid json',
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  describe('onBeforeGenerateToken', () => {
    it('validates metadata and returns upload config', async () => {
      let capturedOnBeforeGenerateToken: any;

      vi.mocked(handleUpload).mockImplementation(async (options: any) => {
        capturedOnBeforeGenerateToken = options.onBeforeGenerateToken;
        return { type: 'blob.generate-client-token', clientToken: 'test' };
      });

      const request = new Request('http://localhost/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      await POST(request);

      const metadata = {
        type: 'original',
        title: 'Test Image',
        description: null,
        tags: 'nature',
        width: 1920,
        height: 1080,
        price: '10.00',
        photographerAddress: '0x1234567890123456789012345678901234567890',
      };

      const result = await capturedOnBeforeGenerateToken(
        'test.jpg',
        JSON.stringify(metadata)
      );

      expect(result).toEqual({
        allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp'],
        maximumSizeInBytes: 50 * 1024 * 1024,
        addRandomSuffix: true,
        tokenPayload: JSON.stringify(metadata),
      });
    });

    it('throws error when metadata is missing', async () => {
      let capturedOnBeforeGenerateToken: any;

      vi.mocked(handleUpload).mockImplementation(async (options: any) => {
        capturedOnBeforeGenerateToken = options.onBeforeGenerateToken;
        return { type: 'blob.generate-client-token', clientToken: 'test' };
      });

      const request = new Request('http://localhost/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      await POST(request);

      await expect(
        capturedOnBeforeGenerateToken('test.jpg', null)
      ).rejects.toThrow('Missing upload metadata');
    });

    it('throws error for invalid metadata', async () => {
      let capturedOnBeforeGenerateToken: any;

      vi.mocked(handleUpload).mockImplementation(async (options: any) => {
        capturedOnBeforeGenerateToken = options.onBeforeGenerateToken;
        return { type: 'blob.generate-client-token', clientToken: 'test' };
      });

      const request = new Request('http://localhost/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      await POST(request);

      const invalidMetadata = {
        type: 'original',
        title: '', // Empty title
        description: null,
        tags: '',
        price: '10.00',
        photographerAddress: '0x1234567890123456789012345678901234567890',
        width: 1920,
        height: 1080,
      };

      await expect(
        capturedOnBeforeGenerateToken('test.jpg', JSON.stringify(invalidMetadata))
      ).rejects.toThrow('Title is required');
    });

    it('throws error for invalid price', async () => {
      let capturedOnBeforeGenerateToken: any;

      vi.mocked(handleUpload).mockImplementation(async (options: any) => {
        capturedOnBeforeGenerateToken = options.onBeforeGenerateToken;
        return { type: 'blob.generate-client-token', clientToken: 'test' };
      });

      const request = new Request('http://localhost/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      await POST(request);

      const invalidMetadata = {
        type: 'original',
        title: 'Test',
        description: null,
        tags: '',
        price: '-5',
        photographerAddress: '0x1234567890123456789012345678901234567890',
        width: 1920,
        height: 1080,
      };

      await expect(
        capturedOnBeforeGenerateToken('test.jpg', JSON.stringify(invalidMetadata))
      ).rejects.toThrow('Price must be a positive number');
    });
  });
});
