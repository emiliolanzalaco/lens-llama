import { NextResponse } from 'next/server';
import { db } from '@lens-llama/database';

/**
 * GET /api/images
 * Returns all images with watermarked previews for homepage grid
 * Ordered by created_at DESC (newest first)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');
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
    return NextResponse.json({ error: 'Failed to fetch images' }, { status: 500 });
  }
}
