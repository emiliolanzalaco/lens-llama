/**
 * Client-side image processing utilities
 */

const PREVIEW_SCALE = 0.5; // 50% of original for watermarked preview
const MAX_DIMENSION = 1200; // Max width or height for watermarked preview
const MAX_FILE_SIZE = 500 * 1024; // 500KB maximum file size
const WATERMARK_TEXT = '© Lens Llama';
const WATERMARK_FONT_SIZE_RATIO = 0.03; // 3% of image width

export interface ImageDimensions {
  width: number;
  height: number;
}

/**
 * Calculate preview dimensions using combination of 50% scaling and max dimension limit
 * Uses whichever produces smaller dimensions
 */
function calculatePreviewDimensions(width: number, height: number): ImageDimensions {
  // Calculate 50% scaled dimensions
  const scaledWidth = Math.round(width * PREVIEW_SCALE);
  const scaledHeight = Math.round(height * PREVIEW_SCALE);

  // Calculate max-dimension-limited size
  const aspectRatio = width / height;
  let maxWidth, maxHeight;

  if (width > height) {
    maxWidth = Math.min(width, MAX_DIMENSION);
    maxHeight = Math.round(maxWidth / aspectRatio);
  } else {
    maxHeight = Math.min(height, MAX_DIMENSION);
    maxWidth = Math.round(maxHeight * aspectRatio);
  }

  // Use whichever is smaller
  return {
    width: Math.min(scaledWidth, maxWidth),
    height: Math.min(scaledHeight, maxHeight),
  };
}

/**
 * Compress canvas to target file size using iterative quality reduction
 * Starts at 80% quality and reduces by 10% steps until size target is met
 */
async function compressToTargetSize(
  canvas: HTMLCanvasElement,
  fileType: string,
  maxSize: number
): Promise<Blob> {
  let quality = 0.8; // Start at 80% instead of 90%
  const minQuality = 0.5; // Don't go below 50%
  const qualityStep = 0.1;

  while (quality >= minQuality) {
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Failed to create blob'))),
        fileType,
        quality
      );
    });

    if (blob.size <= maxSize) {
      return blob;
    }

    quality -= qualityStep;
  }

  // If still too large at minimum quality, return it anyway
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Failed to create blob'))),
      fileType,
      minQuality
    );
  });
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
 * Returns a new File with the watermarked image compressed to max 500KB
 */
export async function createWatermarkedPreview(
  file: File,
  dimensions: ImageDimensions
): Promise<File> {
  // Load the image
  const img = await loadImage(file);

  // Use smart dimension calculation (50% OR max 1200px, whichever is smaller)
  const targetDims = calculatePreviewDimensions(dimensions.width, dimensions.height);

  // Create canvas for watermarked image
  const canvas = document.createElement('canvas');
  canvas.width = targetDims.width;
  canvas.height = targetDims.height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Draw resized image
  ctx.drawImage(img, 0, 0, targetDims.width, targetDims.height);

  // Add watermark in tiled pattern
  const fontSize = Math.round(targetDims.width * WATERMARK_FONT_SIZE_RATIO);
  ctx.font = `${fontSize}px Arial`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Measure text for spacing
  const textMetrics = ctx.measureText(WATERMARK_TEXT);
  const spacing = Math.max(textMetrics.width * 1.5, 150);

  // Draw watermark in grid pattern
  for (let y = spacing / 2; y < targetDims.height; y += spacing) {
    for (let x = spacing / 2; x < targetDims.width; x += spacing) {
      ctx.fillText(WATERMARK_TEXT, x, y);
    }
  }

  // Compress to target size (iteratively reduces quality to fit within 500KB)
  const blob = await compressToTargetSize(canvas, file.type, MAX_FILE_SIZE);

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
