import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, images } from '@lens-llama/database';
import { downloadFromFilecoin } from '@lens-llama/storage';

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

  try {
    // Download watermarked image from Filecoin
    const imageData = await downloadFromFilecoin(image.watermarkedCid);

    return new NextResponse(new Uint8Array(imageData), {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error fetching preview:', error);
    return NextResponse.json(
      { error: 'Failed to fetch preview' },
      { status: 500 }
    );
  }
}
