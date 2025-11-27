import { NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { metadataSchema } from '@/lib/upload-validation';
import { verifyAccessToken } from '@/lib/auth';
import { doWalletAddressesMatch } from '@/lib/api-auth';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

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
          throw new ValidationError('Missing upload metadata');
        }

        const metadata = JSON.parse(clientPayload);
        const result = metadataSchema.safeParse(metadata);

        if (!result.success) {
          const firstError = result.error.errors[0];
          throw new ValidationError(firstError.message);
        }

        // Verify access token from clientPayload
        const user = await verifyAccessToken(result.data.accessToken);

        // Verify the photographer address matches the authenticated user's wallet
        if (!doWalletAddressesMatch(user, result.data.photographerAddress)) {
          throw new ValidationError('Photographer address does not match authenticated wallet');
        }

        return {
          allowedContentTypes: ALLOWED_TYPES,
          maximumSizeInBytes: MAX_FILE_SIZE,
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async () => {
        // No-op: Individual file completions are not tracked here.
        // The client calls /api/upload/complete after both uploads finish.
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Log internal errors for debugging but don't expose details to client
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
