import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from './route';
import { db } from '@lens-llama/database';

// Mock the database
vi.mock('@lens-llama/database', () => ({
  db: {
    query: {
      images: {
        findMany: vi.fn(),
      },
    },
  },
  images: {
    id: 'id',
    watermarkedCid: 'watermarkedCid',
    title: 'title',
    priceUsdc: 'priceUsdc',
    photographerAddress: 'photographerAddress',
    width: 'width',
    height: 'height',
    tags: 'tags',
    createdAt: 'createdAt',
  },
}));

describe('GET /api/images', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns all images ordered by created_at DESC', async () => {
    const mockImages = [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        watermarkedCid: 'QmYxT4LnK8sqLupjbS6eRvu1si7Ly2wFQAqFebxhWntcf6',
        title: 'Sunset over Mountains',
        priceUsdc: '5.00',
        photographerAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        width: 3840,
        height: 2160,
        tags: ['nature', 'landscape', 'sunset'],
        createdAt: new Date('2024-01-02'),
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        watermarkedCid: 'QmS4ustL54uo8FzR9455qaxZwuMiUhyvMcX9Ba8nUH4uVv',
        title: 'Ocean Waves',
        priceUsdc: '3.50',
        photographerAddress: '0x3f17f1962B36e491b30A40b2405849e597Ba5Fb5',
        width: 4096,
        height: 2730,
        tags: ['ocean', 'water', 'nature'],
        createdAt: new Date('2024-01-01'),
      },
    ];

    (db.query.images.findMany as any).mockResolvedValue(mockImages);

    const request = new Request('http://localhost:3000/api/images');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.images).toHaveLength(2);
    expect(data.count).toBe(2);
    expect(data.images[0].title).toBe('Sunset over Mountains');
    expect(db.query.images.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 25,
        offset: 0,
      })
    );
  });

  it('returns empty array when no images exist', async () => {
    (db.query.images.findMany as any).mockResolvedValue([]);

    const request = new Request('http://localhost:3000/api/images');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.images).toEqual([]);
    expect(data.count).toBe(0);
  });

  it('returns 500 error when database query fails', async () => {
    (db.query.images.findMany as any).mockRejectedValue(new Error('Database error'));

    const request = new Request('http://localhost:3000/api/images');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch images');
  });

  it('supports pagination parameters', async () => {
    const mockImages = [
      {
        id: '550e8400-e29b-41d4-a716-446655440003',
        title: 'Page 2 Image',
      }
    ];

    (db.query.images.findMany as any).mockResolvedValue(mockImages);

    const request = new Request('http://localhost:3000/api/images?page=2&limit=5');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.images).toHaveLength(1);

    expect(db.query.images.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 5,
        offset: 5, // (page 2 - 1) * 5
      })
    );
  });
});
