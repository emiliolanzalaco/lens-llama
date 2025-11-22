import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { addWatermark } from './watermark';

describe('addWatermark', () => {
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

  it('adds watermark to image', async () => {
    const input = await createTestImage(800, 600);
    const output = await addWatermark(input);

    expect(output).toBeInstanceOf(Buffer);
    expect(output.length).toBeGreaterThan(0);
  });

  it('preserves image dimensions', async () => {
    const input = await createTestImage(800, 600);
    const output = await addWatermark(input);

    const inputMeta = await sharp(input).metadata();
    const outputMeta = await sharp(output).metadata();

    expect(outputMeta.width).toBe(inputMeta.width);
    expect(outputMeta.height).toBe(inputMeta.height);
  });

  it('handles small images', async () => {
    const input = await createTestImage(100, 100);
    const output = await addWatermark(input);

    expect(output).toBeInstanceOf(Buffer);
  });

  it('handles large images', async () => {
    const input = await createTestImage(4000, 3000);
    const output = await addWatermark(input);

    expect(output).toBeInstanceOf(Buffer);
  });

  it('handles different aspect ratios', async () => {
    const portrait = await createTestImage(600, 800);
    const landscape = await createTestImage(800, 600);
    const square = await createTestImage(500, 500);

    const portraitOut = await addWatermark(portrait);
    const landscapeOut = await addWatermark(landscape);
    const squareOut = await addWatermark(square);

    expect(portraitOut).toBeInstanceOf(Buffer);
    expect(landscapeOut).toBeInstanceOf(Buffer);
    expect(squareOut).toBeInstanceOf(Buffer);
  });
});
