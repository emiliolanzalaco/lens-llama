import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';

// Test constants
const TEST_WALLET_ADDRESS = '0x1234567890123456789012345678901234567890';
const VALID_METADATA = {
  type: 'original' as const,
  title: 'Test Image',
  description: null,
  tags: 'nature',
  width: 1920,
  height: 1080,
  price: '10.00',
  photographerAddress: TEST_WALLET_ADDRESS,
};

// Mock dependencies
vi.mock('@vercel/blob/client', () => ({
  handleUpload: vi.fn(),
}));

// Mock api-auth to bypass authentication in tests
vi.mock('@/lib/api-auth', () => ({
  withAuth: (handler: any) => async (req: Request, ...args: any[]) => {
    // Mock user object for tests
    const mockUser = {
      userId: 'test-user-id',
      walletAddress: TEST_WALLET_ADDRESS,
    };
    return handler(req, mockUser, ...args);
  },
  doWalletAddressesMatch: vi.fn().mockReturnValue(true),
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

// Test helpers
const createRequest = (body: object = {}, token = 'test-token') => {
  return new Request('http://localhost/api/upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
};

const setupHandleUploadMock = () => {
  let capturedCallback: any;
  vi.mocked(handleUpload).mockImplementation(async (options: any) => {
    capturedCallback = options.onBeforeGenerateToken;
    return { type: 'blob.generate-client-token', clientToken: 'test' };
  });
  return () => capturedCallback;
};

describe('POST /api/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls handleUpload with correct configuration', async () => {
    // Arrange
    vi.mocked(handleUpload).mockResolvedValue({
      type: 'blob.generate-client-token',
      clientToken: 'test-token',
    } as any);
    const request = createRequest({ type: 'blob.generate-client-token' });

    // Act
    await POST(request);

    // Assert
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
    // Arrange
    const request = new Request('http://localhost/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid json',
    });

    // Act
    const response = await POST(request);

    // Assert
    expect(response.status).toBe(400);
  });

  describe('onBeforeGenerateToken', () => {
    it('validates metadata and returns upload config', async () => {
      // Arrange
      const getCallback = setupHandleUploadMock();
      await POST(createRequest());

      // Act
      const result = await getCallback()('test.jpg', JSON.stringify(VALID_METADATA));

      // Assert
      expect(result).toEqual({
        allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp'],
        maximumSizeInBytes: 50 * 1024 * 1024,
        addRandomSuffix: true,
      });
    });

    it('throws error when metadata is missing', async () => {
      // Arrange
      const getCallback = setupHandleUploadMock();
      await POST(createRequest());

      // Act & Assert
      await expect(
        getCallback()('test.jpg', null)
      ).rejects.toThrow('Missing upload metadata');
    });

    it('throws error for invalid metadata', async () => {
      // Arrange
      const getCallback = setupHandleUploadMock();
      await POST(createRequest());
      const invalidMetadata = { ...VALID_METADATA, title: '' };

      // Act & Assert
      await expect(
        getCallback()('test.jpg', JSON.stringify(invalidMetadata))
      ).rejects.toThrow('Title is required');
    });

    it('throws error for invalid price', async () => {
      // Arrange
      const getCallback = setupHandleUploadMock();
      await POST(createRequest());
      const invalidMetadata = { ...VALID_METADATA, price: '-5' };

      // Act & Assert
      await expect(
        getCallback()('test.jpg', JSON.stringify(invalidMetadata))
      ).rejects.toThrow('Price must be greater than zero');
    });
  });
});
