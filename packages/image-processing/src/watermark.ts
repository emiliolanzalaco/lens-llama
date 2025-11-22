import sharp from 'sharp';

const WATERMARK_TEXT = 'LensLlama';
const WATERMARK_OPACITY = 0.3;

export async function addWatermark(imageBuffer: Buffer): Promise<Buffer> {
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();

  const width = metadata.width || 800;
  const height = metadata.height || 600;

  // Calculate font size based on image dimensions
  const fontSize = Math.max(Math.min(width, height) / 10, 24);

  // Create diagonal watermark SVG
  const svgText = `
    <svg width="${width}" height="${height}">
      <defs>
        <pattern id="watermark" patternUnits="userSpaceOnUse" width="${fontSize * 8}" height="${fontSize * 4}" patternTransform="rotate(-30)">
          <text x="0" y="${fontSize}" font-family="Arial, sans-serif" font-size="${fontSize}" fill="white" opacity="${WATERMARK_OPACITY}">
            ${WATERMARK_TEXT}
          </text>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#watermark)"/>
    </svg>
  `;

  return image
    .composite([
      {
        input: Buffer.from(svgText),
        top: 0,
        left: 0,
      },
    ])
    .toBuffer();
}
