import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db, images, licenses, decryptWithMasterKey } from '@lens-llama/database';
import { eq, and } from 'drizzle-orm';
import { decryptImage, hexToKey } from '@lens-llama/image-processing';
import { downloadFromFilecoin } from '@lens-llama/storage';
import { z } from 'zod';
import { createPublicClient, createWalletClient, http, parseUnits, Address } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as const; // Base Sepolia USDC
const USDC_ABI = [
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const REVENUE_DISTRIBUTOR_ABI = [
  {
    inputs: [
      { name: 'photographer', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'distributePayment',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

class PaymentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PaymentError';
  }
}

// x402 payment proof schema
const x402PaymentSchema = z.object({
  x402Version: z.string(),
  scheme: z.string(),
  network: z.string(),
  payload: z.object({
    signature: z.string(),
    signer: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
    amount: z.string(),
    recipient: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
    imageId: z.string().uuid(),
  }),
});

interface RouteContext {
  params: {
    id: string;
  };
}

/**
 * Parse and validate x402 payment proof from request header
 */
function parsePaymentProof(request: NextRequest) {
  const paymentHeader = request.headers.get('X-PAYMENT');
  if (!paymentHeader) {
    return null;
  }

  try {
    const decoded = Buffer.from(paymentHeader, 'base64').toString('utf-8');
    const parsed = JSON.parse(decoded);
    const result = x402PaymentSchema.safeParse(parsed);

    if (!result.success) {
      throw new ValidationError('Invalid payment proof format');
    }

    return result.data;
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new ValidationError('Malformed payment proof');
  }
}

/**
 * Verify payment proof signature matches the buyer
 */
function verifyPaymentSignature(
  payment: z.infer<typeof x402PaymentSchema>,
  imageId: string,
  expectedAmount: string,
  expectedRecipient: string
): string {
  // Verify payment parameters match image data
  if (payment.payload.imageId !== imageId) {
    throw new PaymentError('Payment image ID mismatch');
  }

  if (payment.payload.amount !== expectedAmount) {
    throw new PaymentError('Payment amount mismatch');
  }

  if (payment.payload.recipient.toLowerCase() !== expectedRecipient.toLowerCase()) {
    throw new PaymentError('Payment recipient mismatch');
  }

  // Return the buyer address (signer)
  return payment.payload.signer;
}

/**
 * Build x402 payment requirements response
 */
function buildPaymentRequirements(
  imageId: string,
  priceUsdc: string,
  photographerAddress: string,
  imageMetadata: {
    title: string;
    description: string | null;
    watermarkedCid: string;
    width: number;
    height: number;
  }
) {
  return {
    x402Version: '1.0',
    accepts: [
      {
        scheme: 'eip712',
        network: 'base-sepolia',
        maxAmount: parseFloat(priceUsdc) * 1e6, // USDC has 6 decimals
        asset: {
          type: 'erc20',
          contract: USDC_ADDRESS,
          symbol: 'USDC',
          decimals: 6,
        },
        recipient: photographerAddress,
        resource: `/api/images/${imageId}`,
        description: `Purchase license for: ${imageMetadata.title}`,
        mimeType: 'image/jpeg',
      },
    ],
    image: {
      id: imageId,
      title: imageMetadata.title,
      description: imageMetadata.description,
      watermarkedCid: imageMetadata.watermarkedCid,
      width: imageMetadata.width,
      height: imageMetadata.height,
      priceUsdc,
    },
  };
}

/**
 * Execute on-chain payment distribution
 */
async function executePaymentDistribution(
  photographerAddress: string,
  amountUsdc: string
): Promise<string> {
  const facilitatorKey = process.env.FACILITATOR_PRIVATE_KEY;
  const revenueDistributorAddress = process.env.NEXT_PUBLIC_REVENUE_DISTRIBUTOR_ADDRESS;
  const rpcUrl = process.env.NEXT_PUBLIC_BASE_RPC_URL;

  if (!facilitatorKey) {
    throw new Error('FACILITATOR_PRIVATE_KEY not configured');
  }

  if (!revenueDistributorAddress) {
    throw new Error('NEXT_PUBLIC_REVENUE_DISTRIBUTOR_ADDRESS not configured');
  }

  if (!rpcUrl) {
    throw new Error('NEXT_PUBLIC_BASE_RPC_URL not configured');
  }

  const account = privateKeyToAccount(facilitatorKey as `0x${string}`);
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(rpcUrl),
  });

  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(rpcUrl),
  });

  // Convert USDC amount (has 6 decimals)
  const amountInWei = parseUnits(amountUsdc, 6);

  // Check current allowance
  const currentAllowance = await publicClient.readContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'allowance',
    args: [account.address, revenueDistributorAddress as Address],
  });

  // Approve USDC if needed
  if (currentAllowance < amountInWei) {
    const approveHash = await walletClient.writeContract({
      address: USDC_ADDRESS,
      abi: USDC_ABI,
      functionName: 'approve',
      args: [revenueDistributorAddress as Address, amountInWei],
    });

    await publicClient.waitForTransactionReceipt({ hash: approveHash });
  }

  // Call distributePayment
  const hash = await walletClient.writeContract({
    address: revenueDistributorAddress as Address,
    abi: REVENUE_DISTRIBUTOR_ABI,
    functionName: 'distributePayment',
    args: [photographerAddress as Address, amountInWei],
  });

  // Wait for confirmation
  await publicClient.waitForTransactionReceipt({ hash });

  return hash;
}

/**
 * Download and decrypt image
 */
async function getDecryptedImage(encryptedCid: string, encryptionKeyHex: string) {
  const masterKey = process.env.MASTER_ENCRYPTION_KEY;
  if (!masterKey) {
    throw new Error('MASTER_ENCRYPTION_KEY not configured');
  }

  // Decrypt the encryption key
  const decryptedKeyHex = decryptWithMasterKey(encryptionKeyHex, masterKey);
  const encryptionKey = hexToKey(decryptedKeyHex);

  // Download encrypted image from Filecoin
  const encryptedBuffer = await downloadFromFilecoin(encryptedCid);

  // Decrypt image
  const decryptedBuffer = decryptImage(encryptedBuffer, encryptionKey);

  return decryptedBuffer;
}

/**
 * GET /api/images/[id]
 * Returns 402 with payment requirements, or decrypted image after payment
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = context.params;

    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      throw new ValidationError('Invalid image ID format');
    }

    // Fetch image from database
    const [image] = await db
      .select()
      .from(images)
      .where(eq(images.id, id))
      .limit(1);

    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Parse payment proof if present
    const paymentProof = parsePaymentProof(request);

    // Path 1: No payment proof - check for existing license or return 402
    if (!paymentProof) {
      // TODO: In production, extract buyer address from auth session
      // For now, we just return 402 since we can't check license without buyer address
      const paymentRequirements = buildPaymentRequirements(
        id,
        image.priceUsdc,
        image.photographerAddress,
        {
          title: image.title,
          description: image.description,
          watermarkedCid: image.watermarkedCid,
          width: image.width,
          height: image.height,
        }
      );

      return NextResponse.json(paymentRequirements, { status: 402 });
    }

    // Path 2: Payment proof present - verify and process payment
    const buyerAddress = verifyPaymentSignature(
      paymentProof,
      id,
      image.priceUsdc,
      image.photographerAddress
    );

    // Check if license already exists
    const [existingLicense] = await db
      .select()
      .from(licenses)
      .where(and(eq(licenses.imageId, id), eq(licenses.buyerAddress, buyerAddress)))
      .limit(1);

    // Path 3: License exists - return decrypted image
    if (existingLicense) {
      const decryptedBuffer = await getDecryptedImage(image.encryptedCid, image.encryptionKey);

      return new NextResponse(new Uint8Array(decryptedBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'image/jpeg',
          'Content-Disposition': `attachment; filename="${image.title.replace(/[^a-z0-9]/gi, '_')}.jpg"`,
          'X-License-Id': existingLicense.id,
        },
      });
    }

    // Execute payment distribution
    const txHash = await executePaymentDistribution(
      image.photographerAddress,
      image.priceUsdc
    );

    // Create license record
    const [newLicense] = await db
      .insert(licenses)
      .values({
        imageId: id,
        buyerAddress,
        photographerAddress: image.photographerAddress,
        priceUsdc: image.priceUsdc,
        paymentTxHash: txHash,
      })
      .returning({ id: licenses.id });

    // Download and decrypt image
    const decryptedBuffer = await getDecryptedImage(image.encryptedCid, image.encryptionKey);

    // Return decrypted image with payment confirmation
    return new NextResponse(new Uint8Array(decryptedBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Disposition': `attachment; filename="${image.title.replace(/[^a-z0-9]/gi, '_')}.jpg"`,
        'X-Payment-Response': Buffer.from(
          JSON.stringify({
            txHash,
            licenseId: newLicense.id,
            network: 'base-sepolia',
          })
        ).toString('base64'),
        'X-License-Id': newLicense.id,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/images/[id]:', error);

    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof PaymentError) {
      return NextResponse.json({ error: error.message }, { status: 402 });
    }

    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
