import { describe, it, expect, vi, beforeEach } from 'vitest';
import { uploadToBlob } from './upload';

// Mock @vercel/blob
vi.mock('@vercel/blob', () => ({
  put: vi.fn(),
}));

import { put } from '@vercel/blob';

describe('uploadToBlob', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uploads data and returns url and size', async () => {
    const mockUrl = 'https://blob.vercel-storage.com/test-file-abc123.jpg';
    vi.mocked(put).mockResolvedValue({
      url: mockUrl,
      pathname: 'test-file.jpg',
      contentType: 'image/jpeg',
      contentDisposition: 'inline',
    } as any);

    const data = Buffer.from('test image data');
    const result = await uploadToBlob(data, 'test-file.jpg');

    expect(result.url).toBe(mockUrl);
    expect(result.size).toBe(data.length);
  });

  it('calls put with correct parameters', async () => {
    vi.mocked(put).mockResolvedValue({
      url: 'https://blob.vercel-storage.com/test.jpg',
      pathname: 'test.jpg',
      contentType: 'image/jpeg',
      contentDisposition: 'inline',
    } as any);

    const data = Buffer.from('image content');
    await uploadToBlob(data, 'my-image.jpg');

    expect(put).toHaveBeenCalledWith('my-image.jpg', data, { access: 'public' });
  });

  it('propagates errors from put', async () => {
    const error = new Error('Upload failed');
    vi.mocked(put).mockRejectedValue(error);

    const data = Buffer.from('test');
    await expect(uploadToBlob(data, 'test.jpg')).rejects.toThrow('Upload failed');
  });

  it('returns correct size for various buffer sizes', async () => {
    vi.mocked(put).mockResolvedValue({
      url: 'https://blob.vercel-storage.com/large.jpg',
      pathname: 'large.jpg',
      contentType: 'image/jpeg',
      contentDisposition: 'inline',
    } as any);

    const largeData = Buffer.alloc(1024 * 1024); // 1MB
    const result = await uploadToBlob(largeData, 'large.jpg');

    expect(result.size).toBe(1024 * 1024);
  });
});
