import sharp from 'sharp';

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

  // Create a single watermark text using Sharp's native text API
  const textImage = await sharp({
    text: {
      text: WATERMARK_TEXT,
      font: 'sans-serif',
      dpi: Math.round(fontSize * 3), // Scale DPI for size
      rgba: true,
    },
  })
    .png()
    .toBuffer();

  // Get dimensions of the text image
  const textMeta = await sharp(textImage).metadata();
  const textWidth = textMeta.width || 100;
  const textHeight = textMeta.height || 30;

  // Create a tiled pattern with rotation
  // Calculate pattern dimensions for diagonal tiling
  const patternWidth = textWidth * 2;
  const patternHeight = textHeight * 4;

  // Create pattern cell with centered text
  const patternCell = await sharp({
    create: {
      width: patternWidth,
      height: patternHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: textImage,
        top: Math.round(patternHeight / 2 - textHeight / 2),
        left: Math.round(patternWidth / 2 - textWidth / 2),
      },
    ])
    .png()
    .toBuffer();

  // Create full-size overlay with tiled pattern
  // Need larger canvas to account for rotation
  const diagonal = Math.ceil(Math.sqrt(width * width + height * height));

  const tiledOverlay = await sharp({
    create: {
      width: diagonal,
      height: diagonal,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: patternCell,
        tile: true,
        blend: 'over',
      },
    ])
    .rotate(-30, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extract({
      left: Math.round((diagonal - width) / 2),
      top: Math.round((diagonal - height) / 2),
      width,
      height,
    })
    // Apply opacity
    .ensureAlpha()
    .modulate({ lightness: 1 })
    .toBuffer();

  // Apply opacity to the overlay
  const overlayWithOpacity = await sharp(tiledOverlay)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Modify alpha channel for opacity
  const { data, info } = overlayWithOpacity;
  for (let i = 3; i < data.length; i += 4) {
    data[i] = Math.round(data[i] * WATERMARK_OPACITY);
  }

  const finalOverlay = await sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: info.channels as 4,
    },
  })
    .png()
    .toBuffer();

  return image
    .composite([
      {
        input: finalOverlay,
        top: 0,
        left: 0,
      },
    ])
    .toBuffer();
}
