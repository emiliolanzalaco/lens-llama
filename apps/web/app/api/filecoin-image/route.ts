import { NextResponse } from 'next/server';
import { downloadFromFilecoin } from '@lens-llama/storage';

export const dynamic = 'force-dynamic';

/**
 * GET /api/filecoin-image?cid=xxx
 * Downloads an image from Filecoin using Synapse SDK and returns it
 * Used as a Next.js Image loader for server-side Filecoin retrieval
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cid = searchParams.get('cid');

    if (!cid) {
      return NextResponse.json(
        { error: 'CID parameter is required' },
        { status: 400 }
      );
    }

    console.log('Downloading image from Filecoin, CID:', cid);

    const imageData = await downloadFromFilecoin(cid);

    // Auto-detect content type from file signature
    let contentType = 'image/jpeg';
    if (imageData.length > 2) {
      if (imageData[0] === 0x89 && imageData[1] === 0x50 && imageData[2] === 0x4e) {
        contentType = 'image/png';
      } else if (imageData[0] === 0x47 && imageData[1] === 0x49 && imageData[2] === 0x46) {
        contentType = 'image/gif';
      } else if (imageData[0] === 0x52 && imageData[1] === 0x49 && imageData[2] === 0x46) {
        contentType = 'image/webp';
      }
    }

    const imageBuffer = new Uint8Array(imageData);

    // Return the image with aggressive caching headers
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Length': imageData.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error downloading image from Filecoin:', error);
    return new NextResponse('Failed to download image', { status: 500 });
  }
}
