import { NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { db, images, usernames } from '@lens-llama/database';
import { z } from 'zod';
import { eq } from 'drizzle-orm';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const metadataSchema = z.object({
  type: z.enum(['original', 'watermarked']),
  title: z.string().min(1, 'Title is required'),
  description: z.string().nullable(),
  tags: z.string().transform((val) =>
    val ? val.split(',').map((t) => t.trim()).filter(Boolean) : []
  ),
  price: z.string().transform((val, ctx) => {
    const num = parseFloat(val);
    if (isNaN(num) || num <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Price must be a positive number',
      });
      return z.NEVER;
    }
    return num;
  }),
  photographerAddress: z.string().regex(
    /^0x[a-fA-F0-9]{40}$/,
    'Invalid Ethereum address'
  ),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

// Track uploads in memory (in production, use Redis or similar)
const uploadSessions = new Map<string, {
  originalUrl?: string;
  watermarkedUrl?: string;
  metadata: z.infer<typeof metadataSchema>;
  timestamp: number;
}>();

// Clean up old sessions (older than 5 minutes)
function cleanupSessions() {
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  for (const [key, session] of uploadSessions.entries()) {
    if (session.timestamp < fiveMinutesAgo) {
      uploadSessions.delete(key);
    }
  }
}

export async function POST(request: Request): Promise<Response> {
  cleanupSessions();

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
          tokenPayload: clientPayload,
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        if (!tokenPayload) {
          throw new Error('Missing token payload');
        }

        const metadata = JSON.parse(tokenPayload);
        const data = metadataSchema.parse(metadata);

        // Create session key from photographer address and title
        const sessionKey = `${data.photographerAddress}-${data.title}`;

        // Get or create session
        let session = uploadSessions.get(sessionKey);
        if (!session) {
          session = {
            metadata: data,
            timestamp: Date.now(),
          };
          uploadSessions.set(sessionKey, session);
        }

        // Store URL based on type
        if (data.type === 'original') {
          session.originalUrl = blob.url;
        } else {
          session.watermarkedUrl = blob.url;
        }

        // If both uploads are complete, save to database
        if (session.originalUrl && session.watermarkedUrl) {
          console.log('[Upload] Both files uploaded, saving to database...');

          // Check for existing username
          const [existingUsername] = await db
            .select()
            .from(usernames)
            .where(eq(usernames.userAddress, data.photographerAddress.toLowerCase()))
            .limit(1);

          // Save to database
          const [image] = await db
            .insert(images)
            .values({
              originalBlobUrl: session.originalUrl,
              watermarkedBlobUrl: session.watermarkedUrl,
              photographerAddress: data.photographerAddress,
              photographerUsername: existingUsername?.username || null,
              title: data.title,
              description: data.description,
              tags: data.tags,
              priceUsdc: data.price.toFixed(2),
              width: data.width,
              height: data.height,
            })
            .returning({ id: images.id });

          console.log('[Upload] Complete! ID:', image.id);

          // Clean up session
          uploadSessions.delete(sessionKey);
        }
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
