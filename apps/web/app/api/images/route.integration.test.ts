import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GET } from './route';
import { NextRequest } from 'next/server';
import { db, images } from '@lens-llama/database';
import { eq, inArray } from 'drizzle-orm';

function createRequest(queryParams: Record<string, string> = {}) {
  const url = new URL('http://localhost/api/images');
  Object.entries(queryParams).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  return new NextRequest(url.toString(), {
    method: 'GET',
  });
}

describe('GET /api/images integration', () => {
  const testImageIds: string[] = [];

  beforeEach(async () => {
    // Create test images in database
    const testImages = [
      {
        encryptedCid: 'bafytest1',
        watermarkedCid: 'QmTest1',
        encryptionKey: 'encrypted-key-1',
        photographerAddress: '0x1111111111111111111111111111111111111111',
        title: 'Test Image 1',
        description: 'First test image',
        tags: ['test', 'integration'],
        priceUsdc: '5.00',
        width: 1920,
        height: 1080,
      },
      {
        encryptedCid: 'bafytest2',
        watermarkedCid: 'QmTest2',
        encryptionKey: 'encrypted-key-2',
        photographerAddress: '0x2222222222222222222222222222222222222222',
        title: 'Test Image 2',
        description: 'Second test image',
        tags: ['test', 'api'],
        priceUsdc: '3.50',
        width: 3840,
        height: 2160,
      },
      {
        encryptedCid: 'bafytest3',
        watermarkedCid: 'QmTest3',
        encryptionKey: 'encrypted-key-3',
        photographerAddress: '0x3333333333333333333333333333333333333333',
        title: 'Test Image 3',
        description: 'Third test image',
        tags: ['test', 'endpoint'],
        priceUsdc: '10.00',
        width: 2560,
        height: 1440,
      },
    ];

    const inserted = await db.insert(images).values(testImages).returning({ id: images.id });
    testImageIds.push(...inserted.map((img) => img.id));
  });

  afterEach(async () => {
    // Clean up test images
    if (testImageIds.length > 0) {
      await db.delete(images).where(inArray(images.id, testImageIds));
      testImageIds.length = 0;
    }
  });

  it('returns all images from database', async () => {
    const request = createRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.images).toBeInstanceOf(Array);
    expect(data.count).toBeGreaterThanOrEqual(3);

    // Find our test images in the response
    const testImages = data.images.filter((img: any) =>
      testImageIds.includes(img.id)
    );
    expect(testImages).toHaveLength(3);
  });

  it('orders images by created_at DESC', async () => {
    const request = createRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);

    // Get our test images (they should be the most recent)
    const testImages = data.images
      .filter((img: any) => testImageIds.includes(img.id))
      .slice(0, 3);

    expect(testImages).toHaveLength(3);

    // Verify they appear in reverse order of insertion
    expect(testImages[0].title).toBe('Test Image 3');
    expect(testImages[1].title).toBe('Test Image 2');
    expect(testImages[2].title).toBe('Test Image 1');
  });

  it('returns only safe fields and excludes sensitive data', async () => {
    const request = createRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);

    const testImage = data.images.find((img: any) => img.title === 'Test Image 1');
    expect(testImage).toBeDefined();

    // Should have these fields
    expect(testImage).toHaveProperty('id');
    expect(testImage).toHaveProperty('watermarkedCid');
    expect(testImage).toHaveProperty('title');
    expect(testImage).toHaveProperty('priceUsdc');
    expect(testImage).toHaveProperty('photographerAddress');

    // Should NOT have these sensitive fields
    expect(testImage).not.toHaveProperty('encryptedCid');
    expect(testImage).not.toHaveProperty('encryptionKey');
    expect(testImage).not.toHaveProperty('description');
    expect(testImage).not.toHaveProperty('tags');
    expect(testImage).not.toHaveProperty('width');
    expect(testImage).not.toHaveProperty('height');
    expect(testImage).not.toHaveProperty('createdAt');
  });

  it('supports pagination with limit parameter', async () => {
    const request = createRequest({ limit: '2' });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.images.length).toBeLessThanOrEqual(2);
    expect(data.count).toBeLessThanOrEqual(2);
  });

  it('supports pagination with page parameter', async () => {
    const page1Request = createRequest({ limit: '1', page: '1' });
    const page1Response = await GET(page1Request);
    const page1Data = await page1Response.json();

    const page2Request = createRequest({ limit: '1', page: '2' });
    const page2Response = await GET(page2Request);
    const page2Data = await page2Response.json();

    expect(page1Response.status).toBe(200);
    expect(page2Response.status).toBe(200);

    // Images should be different
    if (page1Data.images.length > 0 && page2Data.images.length > 0) {
      expect(page1Data.images[0].id).not.toBe(page2Data.images[0].id);
    }
  });

  it('validates page parameter (rejects negative)', async () => {
    const request = createRequest({ page: '-1' });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Page must be a positive integer');
  });

  it('validates page parameter (rejects zero)', async () => {
    const request = createRequest({ page: '0' });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Page must be a positive integer');
  });

  it('validates limit parameter (rejects values over 100)', async () => {
    const request = createRequest({ limit: '101' });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Limit must be between 1 and 100');
  });

  it('validates limit parameter (rejects zero)', async () => {
    const request = createRequest({ limit: '0' });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Limit must be between 1 and 100');
  });

  it('accepts valid boundary values for limit', async () => {
    const request1 = createRequest({ limit: '1' });
    const response1 = await GET(request1);
    expect(response1.status).toBe(200);

    const request100 = createRequest({ limit: '100' });
    const response100 = await GET(request100);
    expect(response100.status).toBe(200);
  });

  it('returns correct data types and formats', async () => {
    const request = createRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);

    const testImage = data.images.find((img: any) => img.title === 'Test Image 1');
    expect(testImage).toBeDefined();

    expect(typeof testImage.id).toBe('string');
    expect(typeof testImage.watermarkedCid).toBe('string');
    expect(typeof testImage.title).toBe('string');
    expect(typeof testImage.priceUsdc).toBe('string');
    expect(typeof testImage.photographerAddress).toBe('string');

    // Verify price format
    expect(testImage.priceUsdc).toMatch(/^\d+\.\d{2}$/);

    // Verify Ethereum address format
    expect(testImage.photographerAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });

  it('handles empty result set gracefully', async () => {
    // Delete all test images
    await db.delete(images).where(inArray(images.id, testImageIds));
    testImageIds.length = 0;

    // Request with a high page number
    const request = createRequest({ page: '9999' });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.images).toEqual([]);
    expect(data.count).toBe(0);
  });

  it('returns consistent field structure across all images', async () => {
    const request = createRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);

    const testImages = data.images.filter((img: any) =>
      testImageIds.includes(img.id)
    );

    const expectedFields = ['id', 'watermarkedCid', 'title', 'priceUsdc', 'photographerAddress'];

    testImages.forEach((image: any) => {
      expectedFields.forEach((field) => {
        expect(image).toHaveProperty(field);
      });

      // Ensure no extra fields
      const actualFields = Object.keys(image);
      expect(actualFields.sort()).toEqual(expectedFields.sort());
    });
  });

  it('calculates correct offset for pagination', async () => {
    // Create enough images to test pagination
    const additionalImages = Array.from({ length: 15 }, (_, i) => ({
      encryptedCid: `bafytest-extra-${i}`,
      watermarkedCid: `QmTestExtra${i}`,
      encryptionKey: `encrypted-key-extra-${i}`,
      photographerAddress: '0x4444444444444444444444444444444444444444',
      title: `Extra Image ${i}`,
      description: `Extra test image ${i}`,
      tags: ['pagination', 'test'],
      priceUsdc: '1.00',
      width: 1920,
      height: 1080,
    }));

    const inserted = await db.insert(images).values(additionalImages).returning({ id: images.id });
    testImageIds.push(...inserted.map((img) => img.id));

    // Get page 2 with limit 5
    const request = createRequest({ page: '2', limit: '5' });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.images.length).toBeLessThanOrEqual(5);

    // Verify these are different from page 1
    const page1Request = createRequest({ page: '1', limit: '5' });
    const page1Response = await GET(page1Request);
    const page1Data = await page1Response.json();

    if (data.images.length > 0 && page1Data.images.length > 0) {
      const page2Ids = data.images.map((img: any) => img.id);
      const page1Ids = page1Data.images.map((img: any) => img.id);

      // Should have no overlap
      const overlap = page2Ids.filter((id: string) => page1Ids.includes(id));
      expect(overlap).toHaveLength(0);
    }
  });
});
