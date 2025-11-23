import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db, images, licenses, decryptWithMasterKey } from '@lens-llama/database';
import { decryptImage, hexToKey } from '@lens-llama/image-processing';
import { downloadFromFilecoin } from '@lens-llama/storage';
import { createPublicClient, http, type Hex } from 'viem';
import { baseSepolia } from 'viem/chains';

// x402 payment header name
const X402_PAYMENT_HEADER = 'X-Payment';

// Base Sepolia USDC address
const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

export async function GET(
  request: NextRequest,
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

  // Check for payment header
  const paymentHeader = request.headers.get(X402_PAYMENT_HEADER);

  // Get buyer address from query or header (in real app, from auth session)
  const buyerAddress = request.nextUrl.searchParams.get('buyer');

  // Check if buyer already has a license
  if (buyerAddress) {
    const existingLicense = await db.query.licenses.findFirst({
      where: and(
        eq(licenses.imageId, id),
        eq(licenses.buyerAddress, buyerAddress.toLowerCase())
      ),
    });

    if (existingLicense) {
      // License exists - return decrypted image
      return await returnDecryptedImage(image);
    }
  }

  // If no payment header, return 402 with payment requirements
  if (!paymentHeader) {
    return return402Response(image, request);
  }

  // Parse and verify payment
  try {
    const paymentPayload = JSON.parse(
      Buffer.from(paymentHeader, 'base64').toString('utf-8')
    );

    // Verify the payment with facilitator
    const verifyResult = await verifyPayment(paymentPayload, image);

    if (!verifyResult.isValid) {
      return NextResponse.json(
        { error: 'Invalid payment', reason: verifyResult.invalidReason },
        { status: 402 }
      );
    }

    // Settle the payment
    const settleResult = await settlePayment(paymentPayload, image);

    if (!settleResult.success || !settleResult.transaction) {
      return NextResponse.json(
        { error: 'Payment settlement failed', reason: settleResult.errorReason },
        { status: 500 }
      );
    }

    // Create license record
    const payerAddress = paymentPayload.payload.authorization.from.toLowerCase();

    await db.insert(licenses).values({
      imageId: id,
      buyerAddress: payerAddress,
      photographerAddress: image.photographerAddress,
      priceUsdc: image.priceUsdc,
      paymentTxHash: settleResult.transaction,
    });

    // Return decrypted image
    return await returnDecryptedImage(image);
  } catch (error) {
    console.error('Payment processing error:', error);
    return NextResponse.json(
      { error: 'Payment processing failed' },
      { status: 500 }
    );
  }
}

function return402Response(
  image: typeof images.$inferSelect,
  request: NextRequest
) {
  const baseUrl = new URL(request.url).origin;
  const priceInMicroUsdc = Math.round(parseFloat(image.priceUsdc) * 1_000_000);

  // x402 payment requirements
  const paymentRequirements = {
    scheme: 'exact',
    network: 'base-sepolia',
    maxAmountRequired: priceInMicroUsdc.toString(),
    resource: `${baseUrl}/api/images/${image.id}`,
    description: `License for: ${image.title}`,
    mimeType: 'image/jpeg',
    payTo: image.photographerAddress,
    maxTimeoutSeconds: 300,
    asset: USDC_ADDRESS,
  };

  return NextResponse.json(
    {
      id: image.id,
      title: image.title,
      description: image.description,
      photographerAddress: image.photographerAddress,
      priceUsdc: image.priceUsdc,
      watermarkedCid: image.watermarkedCid,
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

async function returnDecryptedImage(image: typeof images.$inferSelect) {
  const masterKey = process.env.MASTER_ENCRYPTION_KEY;

  if (!masterKey) {
    throw new Error('MASTER_ENCRYPTION_KEY not configured');
  }

  // Decrypt the per-image key
  const imageKeyHex = decryptWithMasterKey(image.encryptionKey, masterKey);
  const imageKey = hexToKey(imageKeyHex);

  // Download encrypted image from Filecoin
  const encryptedData = await downloadFromFilecoin(image.encryptedCid);

  // Decrypt the image
  const decryptedImage = decryptImage(encryptedData, imageKey);

  // Return image with appropriate headers
  return new NextResponse(new Uint8Array(decryptedImage), {
    headers: {
      'Content-Type': 'image/jpeg',
      'Content-Disposition': `attachment; filename="${image.title}.jpg"`,
      'Content-Length': decryptedImage.length.toString(),
    },
  });
}

async function verifyPayment(
  paymentPayload: any,
  image: typeof images.$inferSelect
): Promise<{ isValid: boolean; invalidReason?: string }> {
  const facilitatorUrl = process.env.FACILITATOR_URL;

  if (!facilitatorUrl) {
    // For development, do basic verification
    const client = createPublicClient({
      chain: baseSepolia,
      transport: http(),
    });

    // Basic checks
    const authorization = paymentPayload.payload.authorization;
    const priceInMicroUsdc = Math.round(parseFloat(image.priceUsdc) * 1_000_000);

    // Check amount
    if (BigInt(authorization.value) < BigInt(priceInMicroUsdc)) {
      return { isValid: false, invalidReason: 'insufficient_payment_amount' };
    }

    // Check recipient
    if (authorization.to.toLowerCase() !== image.photographerAddress.toLowerCase()) {
      return { isValid: false, invalidReason: 'invalid_recipient' };
    }

    // Check timing
    const now = Math.floor(Date.now() / 1000);
    if (BigInt(authorization.validBefore) < BigInt(now)) {
      return { isValid: false, invalidReason: 'authorization_expired' };
    }

    // Check USDC balance
    const balance = await client.readContract({
      address: USDC_ADDRESS,
      abi: [{
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
      }],
      functionName: 'balanceOf',
      args: [authorization.from as `0x${string}`],
    });

    if (balance < BigInt(priceInMicroUsdc)) {
      return { isValid: false, invalidReason: 'insufficient_funds' };
    }

    // Verify signature using viem
    try {
      const isValid = await client.verifyTypedData({
        address: authorization.from as Hex,
        domain: {
          name: 'USD Coin',
          version: '2',
          chainId: baseSepolia.id,
          verifyingContract: USDC_ADDRESS as Hex,
        },
        types: {
          TransferWithAuthorization: [
            { name: 'from', type: 'address' },
            { name: 'to', type: 'address' },
            { name: 'value', type: 'uint256' },
            { name: 'validAfter', type: 'uint256' },
            { name: 'validBefore', type: 'uint256' },
            { name: 'nonce', type: 'bytes32' },
          ],
        },
        primaryType: 'TransferWithAuthorization',
        message: {
          from: authorization.from,
          to: authorization.to,
          value: BigInt(authorization.value),
          validAfter: BigInt(authorization.validAfter),
          validBefore: BigInt(authorization.validBefore),
          nonce: authorization.nonce,
        },
        signature: paymentPayload.payload.signature as Hex,
      });

      return { isValid };
    } catch (error) {
      console.error('Signature verification failed:', error);
      return { isValid: false, invalidReason: 'invalid_signature' };
    }
  }

  // Call facilitator /verify endpoint
  const priceInMicroUsdc = Math.round(parseFloat(image.priceUsdc) * 1_000_000);
  const response = await fetch(`${facilitatorUrl}/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      paymentPayload,
      paymentRequirements: {
        scheme: 'exact',
        network: 'base-sepolia',
        maxAmountRequired: priceInMicroUsdc.toString(),
        resource: `http://localhost:3000/api/images/${image.id}`,
        description: `License for: ${image.title}`,
        mimeType: 'image/jpeg',
        payTo: image.photographerAddress,
        maxTimeoutSeconds: 300,
        asset: USDC_ADDRESS,
      },
    }),
  });

  return await response.json();
}

async function settlePayment(
  paymentPayload: any,
  image: typeof images.$inferSelect
): Promise<{ success: boolean; transaction?: string; errorReason?: string }> {
  const facilitatorUrl = process.env.FACILITATOR_URL;

  if (!facilitatorUrl) {
    // For development without facilitator, return mock success
    // In production, this would call the facilitator to execute the transfer
    console.warn('No FACILITATOR_URL configured - skipping actual settlement');
    return {
      success: true,
      transaction: '0x' + '0'.repeat(64), // Mock tx hash
    };
  }

  // Call facilitator /settle endpoint
  const priceInMicroUsdc = Math.round(parseFloat(image.priceUsdc) * 1_000_000);
  const response = await fetch(`${facilitatorUrl}/settle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      paymentPayload,
      paymentRequirements: {
        scheme: 'exact',
        network: 'base-sepolia',
        maxAmountRequired: priceInMicroUsdc.toString(),
        resource: `http://localhost:3000/api/images/${image.id}`,
        description: `License for: ${image.title}`,
        mimeType: 'image/jpeg',
        payTo: image.photographerAddress,
        maxTimeoutSeconds: 300,
        asset: USDC_ADDRESS,
      },
    }),
  });

  return await response.json();
}
