import sharp from 'sharp';

const MAX_WIDTH = 1200;
const SCALE_FACTOR = 0.5;

export async function resizeForPreview(imageBuffer: Buffer): Promise<Buffer> {
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error('Unable to read image dimensions');
  }

  // Calculate 50% of original dimensions
  let targetWidth = Math.round(metadata.width * SCALE_FACTOR);
  let targetHeight = Math.round(metadata.height * SCALE_FACTOR);

  // Cap at max width while maintaining aspect ratio
  if (targetWidth > MAX_WIDTH) {
    const ratio = MAX_WIDTH / targetWidth;
    targetWidth = MAX_WIDTH;
    targetHeight = Math.round(targetHeight * ratio);
  }

  return image
    .resize(targetWidth, targetHeight, {
      fit: 'fill',
    })
    .toBuffer();
}

export async function getImageDimensions(imageBuffer: Buffer): Promise<{ width: number; height: number }> {
  const metadata = await sharp(imageBuffer).metadata();
  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
  };
}
