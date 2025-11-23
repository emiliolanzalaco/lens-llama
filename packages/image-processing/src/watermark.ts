import sharp from 'sharp';
import { INTER_BOLD_BASE64 } from './inter-font';

const WATERMARK_TEXT = 'LensLlama';
const WATERMARK_OPACITY = 0.3;

export async function addWatermark(imageBuffer: Buffer): Promise<Buffer> {
  // .rotate() without args auto-rotates based on EXIF orientation
  const image = sharp(imageBuffer).rotate();
  const metadata = await image.metadata();

  const width = metadata.width || 800;
  const height = metadata.height || 600;

  // Calculate font size based on image dimensions
  const fontSize = Math.max(Math.min(width, height) / 10, 24);

  // Embed font directly in SVG for serverless compatibility
  const fontFace = `@font-face { font-family: 'InterBold'; src: url(data:font/woff2;base64,${INTER_BOLD_BASE64}) format('woff2'); }`;

  // Create diagonal watermark SVG
  const svgText = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <style>${fontFace}</style>
        <pattern id="watermark" patternUnits="userSpaceOnUse" width="${fontSize * 8}" height="${fontSize * 4}" patternTransform="rotate(-30)">
          <text x="0" y="${fontSize}" font-family="InterBold, sans-serif" font-size="${fontSize}" font-weight="bold" fill="white" opacity="${WATERMARK_OPACITY}">
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
