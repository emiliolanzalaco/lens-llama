import { put } from '@vercel/blob';

export interface UploadResult {
  url: string;
  size: number;
}

/**
 * Upload to Vercel Blob storage
 */
export async function uploadToBlob(
  data: Buffer,
  filename: string
): Promise<UploadResult> {
  const blob = await put(filename, data, {
    access: 'public',
  });

  return {
    url: blob.url,
    size: data.length,
  };
}
