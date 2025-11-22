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
    it('resizes image larger than 1200px width', async () => {
      const input = await createTestImage(2400, 1600);
      const output = await resizeForPreview(input);

      const meta = await sharp(output).metadata();
      expect(meta.width).toBe(1200);
      expect(meta.height).toBe(800); // Maintains aspect ratio
    });

    it('does not resize image smaller than 1200px width', async () => {
      const input = await createTestImage(800, 600);
      const output = await resizeForPreview(input);

      expect(output).toEqual(input);
    });

    it('does not resize image exactly 1200px width', async () => {
      const input = await createTestImage(1200, 900);
      const output = await resizeForPreview(input);

      expect(output).toEqual(input);
    });

    it('maintains aspect ratio for portrait images', async () => {
      const input = await createTestImage(1600, 2400);
      const output = await resizeForPreview(input);

      const meta = await sharp(output).metadata();
      // Width > MAX_WIDTH, so resized to 1200 width with proportional height
      expect(meta.width).toBe(1200);
      expect(meta.height).toBe(1800);
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
  });
});
