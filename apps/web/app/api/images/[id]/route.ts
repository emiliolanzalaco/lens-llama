import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db, images, licenses } from '@lens-llama/database';
import {
  X402_PAYMENT_HEADER,
  buildPaymentRequirements,
  verifyPayment,
  settlePayment,
  type PaymentPayload,
} from '@/lib/x402';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const baseUrl = new URL(request.url).origin;

  const image = await db.query.images.findFirst({
    where: eq(images.id, id),
  });

  if (!image) {
    return NextResponse.json({ error: 'Image not found' }, { status: 404 });
  }

  // Check if buyer already has a license
  const buyerAddress = request.nextUrl.searchParams.get('buyer');
  if (buyerAddress) {
    const existingLicense = await db.query.licenses.findFirst({
      where: and(
        eq(licenses.imageId, id),
        eq(licenses.buyerAddress, buyerAddress.toLowerCase())
      ),
    });

    if (existingLicense) {
      return returnOriginalImage(image);
    }
  }

  // Check for payment header
  const paymentHeader = request.headers.get(X402_PAYMENT_HEADER);

  if (!paymentHeader) {
    return return402Response(image, baseUrl);
  }

  // Process payment
  try {
    const paymentPayload = JSON.parse(
      Buffer.from(paymentHeader, 'base64').toString('utf-8')
    ) as PaymentPayload;

    // Validate payload structure
    if (
      !paymentPayload?.payload?.authorization?.from ||
      !paymentPayload?.payload?.signature
    ) {
      return NextResponse.json(
        { error: 'Malformed payment payload' },
        { status: 400 }
      );
    }

    const verifyResult = await verifyPayment(paymentPayload, image, baseUrl);
    if (!verifyResult.isValid) {
      return NextResponse.json(
        { error: 'Invalid payment', reason: verifyResult.invalidReason },
        { status: 402 }
      );
    }

    const settleResult = await settlePayment(paymentPayload, image, baseUrl);
    if (!settleResult.success || !settleResult.transaction) {
      return NextResponse.json(
        { error: 'Payment settlement failed', reason: settleResult.errorReason },
        { status: 500 }
      );
    }

    // Create license record
    await db.insert(licenses).values({
      imageId: id,
      buyerAddress: paymentPayload.payload.authorization.from.toLowerCase(),
      photographerAddress: image.photographerAddress,
      priceUsdc: image.priceUsdc,
      paymentTxHash: settleResult.transaction,
    });

    return returnOriginalImage(image);
  } catch (error) {
    console.error('Payment processing error:', error);
    return NextResponse.json(
      { error: 'Payment processing failed' },
      { status: 500 }
    );
  }
}

function return402Response(image: typeof images.$inferSelect, baseUrl: string) {
  const paymentRequirements = buildPaymentRequirements(image, baseUrl);

  return NextResponse.json(
    {
      id: image.id,
      title: image.title,
      description: image.description,
      photographerAddress: image.photographerAddress,
      photographerUsername: image.photographerUsername,
      priceUsdc: image.priceUsdc,
      watermarkedBlobUrl: image.watermarkedBlobUrl,
      width: image.width,
      height: image.height,
      paymentRequirements,
    },
    {
      status: 402,
      headers: {
        'X-Payment-Requirements': JSON.stringify(paymentRequirements),
      },
    }
  );
}

async function returnOriginalImage(image: typeof images.$inferSelect) {
  // Redirect to the original blob URL
  return NextResponse.redirect(image.originalBlobUrl);
}
