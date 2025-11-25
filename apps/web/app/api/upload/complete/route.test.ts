import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';

// Mock dependencies
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

describe('POST /api/upload/complete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('saves upload to database and returns ID', async () => {
    const request = new Request('http://localhost/api/upload/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        originalUrl: 'https://blob.vercel-storage.com/original.jpg',
        watermarkedUrl: 'https://blob.vercel-storage.com/watermarked.jpg',
        title: 'Test Image',
        description: null,
        tags: 'nature,landscape',
        price: '10.00',
        photographerAddress: '0x1234567890123456789012345678901234567890',
        width: 1920,
        height: 1080,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ id: 'test-uuid' });
  });

  it('returns 400 for invalid data', async () => {
    const request = new Request('http://localhost/api/upload/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        originalUrl: 'not-a-url',
        watermarkedUrl: 'https://blob.vercel-storage.com/watermarked.jpg',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
