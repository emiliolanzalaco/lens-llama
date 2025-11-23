import { NextRequest, NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // Validate file extension from pathname
        const ext = pathname.split('.').pop()?.toLowerCase();
        const validExtensions = ['jpg', 'jpeg', 'png', 'webp'];

        if (!ext || !validExtensions.includes(ext)) {
          throw new Error('Invalid file type. Allowed: JPEG, PNG, WebP');
        }

        return {
          allowedContentTypes: ALLOWED_TYPES,
          maximumSizeInBytes: MAX_FILE_SIZE,
          tokenPayload: JSON.stringify({
            timestamp: Date.now(),
          }),
        };
      },
      onUploadCompleted: async ({ blob }) => {
        // This runs after the blob is uploaded
        // We don't need to do anything here since finalize handles processing
        console.log('[Blob Upload] Completed:', blob.url);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate upload URL';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
