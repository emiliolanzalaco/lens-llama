import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { resizeForPreview, getImageDimensions } from './resize';

describe('resize', () => {
  async function createTestImage(width: number, height: number): Promise<Buffer> {
    return sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 255, g: 255, b: 255 },
      },
    })
      .jpeg()
      .toBuffer();
  }

  describe('resizeForPreview', () => {
    it('resizes to 50% of original', async () => {
      const input = await createTestImage(800, 600);
      const output = await resizeForPreview(input);

      const meta = await sharp(output).metadata();
      expect(meta.width).toBe(400);
      expect(meta.height).toBe(300);
    });

    it('caps at max width for large images', async () => {
      const input = await createTestImage(4000, 3000);
      const output = await resizeForPreview(input);

      const meta = await sharp(output).metadata();
      // 50% = 2000x1500, capped to 1200 width
      expect(meta.width).toBe(1200);
      expect(meta.height).toBe(900);
    });

    it('maintains aspect ratio for portrait images', async () => {
      const input = await createTestImage(1600, 2400);
      const output = await resizeForPreview(input);

      const meta = await sharp(output).metadata();
      // 50% = 800x1200
      expect(meta.width).toBe(800);
      expect(meta.height).toBe(1200);
    });

    it('handles very large images with capping', async () => {
      const input = await createTestImage(6000, 4000);
      const output = await resizeForPreview(input);

      const meta = await sharp(output).metadata();
      // 50% = 3000x2000, capped to 1200 width with ratio
      expect(meta.width).toBe(1200);
      expect(meta.height).toBe(800);
    });
  });

  describe('getImageDimensions', () => {
    it('returns correct dimensions', async () => {
      const input = await createTestImage(800, 600);
      const dimensions = await getImageDimensions(input);

      expect(dimensions.width).toBe(800);
      expect(dimensions.height).toBe(600);
    });

    it('handles square images', async () => {
      const input = await createTestImage(500, 500);
      const dimensions = await getImageDimensions(input);

      expect(dimensions.width).toBe(500);
      expect(dimensions.height).toBe(500);
    });

    // Note: EXIF orientation handling is tested implicitly via real-world usage.
    // Synthetic EXIF tests would test sharp's implementation, not our behavior.
  });
});
