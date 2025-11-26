import { NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { metadataSchema } from '@/lib/upload-validation';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Upload handler - validates metadata and generates upload tokens
export async function POST(request: Request): Promise<Response> {
  let body: HandleUploadBody;

  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        // Validate metadata from client
        if (!clientPayload) {
          throw new Error('Missing upload metadata');
        }

        const metadata = JSON.parse(clientPayload);
        const result = metadataSchema.safeParse(metadata);

        if (!result.success) {
          const firstError = result.error.errors[0];
          throw new Error(firstError.message);
        }

        return {
          allowedContentTypes: ALLOWED_TYPES,
          maximumSizeInBytes: MAX_FILE_SIZE,
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async () => {
        // No-op: Each file's completion is handled separately
        // Client calls /api/upload/complete once both uploads finish
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
