/**
 * Client-side image processing utilities
 */

const PREVIEW_SCALE = 0.5;
const MAX_WIDTH = 1200;
const WATERMARK_TEXT = '© Lens Llama';
const WATERMARK_FONT_SIZE_RATIO = 0.03; // 3% of image width

export interface ImageDimensions {
  width: number;
  height: number;
}

/**
 * Get image dimensions from a File
 */
export async function getImageDimensions(file: File): Promise<ImageDimensions> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      img.onload = null;
      img.onerror = null;
    };

    img.onload = () => {
      cleanup();
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };
    img.onerror = () => {
      cleanup();
      reject(new Error('Failed to load image'));
    };
    img.src = objectUrl;
  });
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

  // Calculate preview dimensions (50% of original, capped at MAX_WIDTH)
  let targetWidth = Math.round(dimensions.width * PREVIEW_SCALE);
  let targetHeight = Math.round(dimensions.height * PREVIEW_SCALE);

  if (targetWidth > MAX_WIDTH) {
    const ratio = MAX_WIDTH / targetWidth;
    targetWidth = MAX_WIDTH;
    targetHeight = Math.round(targetHeight * ratio);
  }

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

  // Add watermark
  const fontSize = Math.round(targetWidth * WATERMARK_FONT_SIZE_RATIO);
  ctx.font = `${fontSize}px Arial`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Position watermark in center
  ctx.fillText(WATERMARK_TEXT, targetWidth / 2, targetHeight / 2);

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
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      img.onload = null;
      img.onerror = null;
    };

    img.onload = () => {
      cleanup();
      resolve(img);
    };
    img.onerror = () => {
      cleanup();
      reject(new Error('Failed to load image'));
    };
    img.src = objectUrl;
  });
}
