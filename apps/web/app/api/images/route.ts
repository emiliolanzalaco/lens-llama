import { NextResponse } from 'next/server';
import { db } from '@lens-llama/database';
import { z } from 'zod';

// Disable caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

const querySchema = z.object({
  page: z
    .string()
    .optional()
    .default('1')
    .transform((val, ctx) => {
      const num = parseInt(val);
      if (isNaN(num) || num < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Page must be a positive integer',
        });
        return z.NEVER;
      }
      return num;
    }),
  limit: z
    .string()
    .optional()
    .default('25')
    .transform((val, ctx) => {
      const num = parseInt(val);
      if (isNaN(num) || num < 1 || num > 100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Limit must be between 1 and 100',
        });
        return z.NEVER;
      }
      return num;
    }),
});

/**
 * GET /api/images
 * Returns all images with watermarked previews for homepage grid
 * Ordered by created_at DESC (newest first)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const result = querySchema.safeParse({
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
    });

    if (!result.success) {
      const firstError = result.error.errors[0];
      throw new ValidationError(firstError.message);
    }

    const { page, limit } = result.data;
    const offset = (page - 1) * limit;

    const allImages = await db.query.images.findMany({
      orderBy: (images, { desc }) => [desc(images.createdAt)],
      limit: limit,
      offset: offset,
    });

    return NextResponse.json({
      images: allImages,
      count: allImages.length,
    });
  } catch (error) {
    console.error('Error fetching images:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch images';
    const status = error instanceof ValidationError ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
