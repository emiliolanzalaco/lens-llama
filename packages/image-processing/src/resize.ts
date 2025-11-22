import sharp from 'sharp';

const MAX_WIDTH = 1200;

export async function resizeForPreview(imageBuffer: Buffer): Promise<Buffer> {
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();

  // Only resize if larger than max width
  if (metadata.width && metadata.width > MAX_WIDTH) {
    return image
      .resize(MAX_WIDTH, null, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .toBuffer();
  }

  return imageBuffer;
}

export async function getImageDimensions(imageBuffer: Buffer): Promise<{ width: number; height: number }> {
  const metadata = await sharp(imageBuffer).metadata();
  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
  };
}
