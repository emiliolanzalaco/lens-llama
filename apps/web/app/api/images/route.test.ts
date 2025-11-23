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
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        watermarkedCid: 'QmS4ustL54uo8FzR9455qaxZwuMiUhyvMcX9Ba8nUH4uVv',
        title: 'Ocean Waves',
        priceUsdc: '3.50',
        photographerAddress: '0x3f17f1962B36e491b30A40b2405849e597Ba5Fb5',
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
    expect(data.error).toBe('Database error');
  });

  it('supports pagination parameters', async () => {
    const mockImages = [
      {
        id: '550e8400-e29b-41d4-a716-446655440003',
        watermarkedCid: 'QmTestCid',
        title: 'Page 2 Image',
        priceUsdc: '2.50',
        photographerAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
      },
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

  it('uses default pagination values when not provided', async () => {
    (db.query.images.findMany as any).mockResolvedValue([]);

    const request = new Request('http://localhost:3000/api/images');
    await GET(request);

    expect(db.query.images.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 25,
        offset: 0,
      })
    );
  });

  it('does not expose encryption keys or encrypted CIDs', async () => {
    const mockImage = {
      id: '550e8400-e29b-41d4-a716-446655440001',
      watermarkedCid: 'QmYxT4LnK8sqLupjbS6eRvu1si7Ly2wFQAqFebxhWntcf6',
      title: 'Test Image',
      priceUsdc: '10.00',
      photographerAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
    };

    (db.query.images.findMany as any).mockResolvedValue([mockImage]);

    const request = new Request('http://localhost:3000/api/images');
    const response = await GET(request);
    const data = await response.json();

    const image = data.images[0];
    expect(image).not.toHaveProperty('encryptionKey');
    expect(image).not.toHaveProperty('encryptedCid');
    expect(image).not.toHaveProperty('description');
    expect(image).not.toHaveProperty('tags');
    expect(image).not.toHaveProperty('width');
    expect(image).not.toHaveProperty('height');
    expect(image).not.toHaveProperty('createdAt');
  });

  describe('Validation', () => {
    it('returns 400 for invalid page parameter (negative)', async () => {
      const request = new Request('http://localhost:3000/api/images?page=-1');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Page must be a positive integer');
    });

    it('returns 400 for invalid page parameter (zero)', async () => {
      const request = new Request('http://localhost:3000/api/images?page=0');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Page must be a positive integer');
    });

    it('returns 400 for invalid page parameter (non-numeric)', async () => {
      const request = new Request('http://localhost:3000/api/images?page=abc');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Page must be a positive integer');
    });

    it('returns 400 for invalid limit parameter (negative)', async () => {
      const request = new Request('http://localhost:3000/api/images?limit=-5');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Limit must be between 1 and 100');
    });

    it('returns 400 for invalid limit parameter (zero)', async () => {
      const request = new Request('http://localhost:3000/api/images?limit=0');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Limit must be between 1 and 100');
    });

    it('returns 400 for invalid limit parameter (too large)', async () => {
      const request = new Request('http://localhost:3000/api/images?limit=101');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Limit must be between 1 and 100');
    });

    it('returns 400 for invalid limit parameter (non-numeric)', async () => {
      const request = new Request('http://localhost:3000/api/images?limit=xyz');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Limit must be between 1 and 100');
    });

    it('accepts valid limit at boundary (1)', async () => {
      (db.query.images.findMany as any).mockResolvedValue([]);

      const request = new Request('http://localhost:3000/api/images?limit=1');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(db.query.images.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 1,
        })
      );
    });

    it('accepts valid limit at boundary (100)', async () => {
      (db.query.images.findMany as any).mockResolvedValue([]);

      const request = new Request('http://localhost:3000/api/images?limit=100');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(db.query.images.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 100,
        })
      );
    });
  });

  describe('Integration Tests', () => {
    it('correctly calculates offset for page 3 with limit 10', async () => {
      (db.query.images.findMany as any).mockResolvedValue([]);

      const request = new Request('http://localhost:3000/api/images?page=3&limit=10');
      await GET(request);

      expect(db.query.images.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 10,
          offset: 20, // (3 - 1) * 10
        })
      );
    });

    it('includes all required fields in response', async () => {
      const mockImage = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        watermarkedCid: 'QmYxT4LnK8sqLupjbS6eRvu1si7Ly2wFQAqFebxhWntcf6',
        title: 'Test Image',
        priceUsdc: '10.00',
        photographerAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
      };

      (db.query.images.findMany as any).mockResolvedValue([mockImage]);

      const request = new Request('http://localhost:3000/api/images');
      const response = await GET(request);
      const data = await response.json();

      const image = data.images[0];
      expect(image).toHaveProperty('id');
      expect(image).toHaveProperty('watermarkedCid');
      expect(image).toHaveProperty('title');
      expect(image).toHaveProperty('priceUsdc');
      expect(image).toHaveProperty('photographerAddress');
    });

    it('calls database with correct pagination parameters', async () => {
      (db.query.images.findMany as any).mockResolvedValue([]);

      const request = new Request('http://localhost:3000/api/images');
      await GET(request);

      expect(db.query.images.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 25,
          offset: 0,
        })
      );
    });
  });
});
