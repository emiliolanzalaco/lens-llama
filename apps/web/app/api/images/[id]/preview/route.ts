import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, images } from '@lens-llama/database';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Get image from database
  const image = await db.query.images.findFirst({
    where: eq(images.id, id),
  });

  if (!image) {
    return NextResponse.json({ error: 'Image not found' }, { status: 404 });
  }

  // Redirect to the watermarked blob URL
  return NextResponse.redirect(image.watermarkedBlobUrl);
}
