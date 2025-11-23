import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

const WATERMARK_TEXT = 'LensLlama';
const WATERMARK_OPACITY = 0.3;

// Load font as base64 for embedding in SVG
let fontBase64: string | null = null;
function getFontBase64(): string {
  if (fontBase64) return fontBase64;

  // Try to load Inter font from node_modules
  const fontPaths = [
    path.join(__dirname, '..', 'fonts', 'Inter-Bold.woff2'),
    path.join(process.cwd(), 'node_modules', '@fontsource', 'inter', 'files', 'inter-latin-700-normal.woff2'),
  ];

  for (const fontPath of fontPaths) {
    if (fs.existsSync(fontPath)) {
      const fontBuffer = fs.readFileSync(fontPath);
      fontBase64 = fontBuffer.toString('base64');
      return fontBase64;
    }
  }

  // Fallback - return empty string, will use system fonts
  return '';
}

export async function addWatermark(imageBuffer: Buffer): Promise<Buffer> {
  // .rotate() without args auto-rotates based on EXIF orientation
  const image = sharp(imageBuffer).rotate();
  const metadata = await image.metadata();

  const width = metadata.width || 800;
  const height = metadata.height || 600;

  // Calculate font size based on image dimensions
  const fontSize = Math.max(Math.min(width, height) / 10, 24);

  const font64 = getFontBase64();
  const fontFace = font64
    ? `@font-face { font-family: 'WatermarkFont'; src: url(data:font/woff2;base64,${font64}) format('woff2'); }`
    : '';
  const fontFamily = font64 ? 'WatermarkFont' : 'sans-serif';

  // Create diagonal watermark SVG
  const svgText = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <style>${fontFace}</style>
        <pattern id="watermark" patternUnits="userSpaceOnUse" width="${fontSize * 8}" height="${fontSize * 4}" patternTransform="rotate(-30)">
          <text x="0" y="${fontSize}" font-family="${fontFamily}, sans-serif" font-size="${fontSize}" font-weight="bold" fill="white" opacity="${WATERMARK_OPACITY}">
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
