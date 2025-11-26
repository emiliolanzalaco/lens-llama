/**
 * Client-side image processing utilities
 */

const PREVIEW_SCALE = 0.5;
const WATERMARK_TEXT = '© Lens Llama';
const WATERMARK_FONT_SIZE_RATIO = 0.03; // 3% of image width

export interface ImageDimensions {
  width: number;
  height: number;
}

/**
 * Get image dimensions from a File
 * Handles EXIF orientation by using createImageBitmap
 */
export async function getImageDimensions(file: File): Promise<ImageDimensions> {
  try {
    // createImageBitmap respects EXIF orientation
    const bitmap = await createImageBitmap(file, {
      imageOrientation: 'from-image',
    });

    const dimensions = {
      width: bitmap.width,
      height: bitmap.height,
    };

    bitmap.close();
    return dimensions;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to load image: ${message}`);
  }
}

/**
 * Create a watermarked preview version of the image
 * Returns a new File with the watermarked image
 */
export async function createWatermarkedPreview(
  file: File,
  dimensions: ImageDimensions
): Promise<File> {
  // Load the image
  const img = await loadImage(file);

  // Calculate preview dimensions (50% of original)
  const targetWidth = Math.round(dimensions.width * PREVIEW_SCALE);
  const targetHeight = Math.round(dimensions.height * PREVIEW_SCALE);

  // Create canvas for watermarked image
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Draw resized image
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  // Add watermark in tiled pattern
  const fontSize = Math.round(targetWidth * WATERMARK_FONT_SIZE_RATIO);
  ctx.font = `${fontSize}px Arial`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Measure text for spacing
  const textMetrics = ctx.measureText(WATERMARK_TEXT);
  const spacing = Math.max(textMetrics.width * 1.5, 150);

  // Draw watermark in grid pattern
  for (let y = spacing / 2; y < targetHeight; y += spacing) {
    for (let x = spacing / 2; x < targetWidth; x += spacing) {
      ctx.fillText(WATERMARK_TEXT, x, y);
    }
  }

  // Convert canvas to Blob
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob'));
        }
      },
      file.type,
      0.9 // Quality
    );
  });

  // Create File from Blob
  const filename = file.name.replace(/(\.[^.]+)$/, '-watermarked$1');
  return new File([blob], filename, { type: file.type });
}

/**
 * Helper to load an image from a File
 * Handles EXIF orientation by using createImageBitmap
 */
async function loadImage(file: File): Promise<ImageBitmap> {
  try {
    // createImageBitmap respects EXIF orientation
    return await createImageBitmap(file, {
      imageOrientation: 'from-image',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to load image: ${message}`);
  }
}
