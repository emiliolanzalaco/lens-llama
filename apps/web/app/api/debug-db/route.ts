import { NextResponse } from 'next/server';
import { db } from '@lens-llama/database';
import { images } from '@lens-llama/database';

export const dynamic = 'force-dynamic';

/**
 * GET /api/debug-db
 * Debug route to check database connection and count images
 */
export async function GET() {
  try {
    console.log('POSTGRES_URL:', process.env.POSTGRES_URL);

    // Query all images directly
    const allImages = await db.select().from(images);

    return NextResponse.json({
      success: true,
      postgresUrl: process.env.POSTGRES_URL,
      totalImages: allImages.length,
      images: allImages.map((img) => ({
        id: img.id,
        title: img.title,
        watermarkedCid: img.watermarkedCid,
        createdAt: img.createdAt,
      })),
    });
  } catch (error) {
    console.error('Database query failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        postgresUrl: process.env.POSTGRES_URL,
      },
      { status: 500 }
    );
  }
}
