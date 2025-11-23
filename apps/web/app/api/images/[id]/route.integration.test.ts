import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GET } from './route';
import { NextRequest } from 'next/server';
import { db, images, licenses, encryptWithMasterKey } from '@lens-llama/database';
import { eq, and, inArray } from 'drizzle-orm';
import {
  generateEncryptionKey,
  encryptImage,
  keyToHex,
} from '@lens-llama/image-processing';

// Mock viem to avoid actual blockchain calls
vi.mock('viem', async () => {
  const actual = await vi.importActual('viem');
  return {
    ...actual,
    createPublicClient: vi.fn(() => ({
      readContract: vi.fn().mockResolvedValue(BigInt(0)),
      waitForTransactionReceipt: vi.fn().mockResolvedValue({ status: 'success' }),
    })),
    createWalletClient: vi.fn(() => ({
      writeContract: vi.fn().mockResolvedValue('0xmocktxhash'),
    })),
  };
});

vi.mock('viem/accounts', () => ({
  privateKeyToAccount: vi.fn(() => ({
    address: '0x5555555555555555555555555555555555555555',
  })),
}));

// Mock storage to avoid Filecoin calls
vi.mock('@lens-llama/storage', () => ({
  downloadFromFilecoin: vi.fn(async () => {
    // Return a mock encrypted buffer (IV + encrypted data)
    const key = generateEncryptionKey();
    const testImage = Buffer.from('test-image-data');
    return encryptImage(testImage, key);
  }),
}));

function createRequest(id: string, headers: Record<string, string> = {}) {
  const url = new URL(`http://localhost/api/images/${id}`);

  return new NextRequest(url.toString(), {
    method: 'GET',
    headers,
  });
}

function createContext(id: string) {
  return {
    params: { id },
  };
}

function createPaymentProof(payload: {
  signer: string;
  amount: string;
  recipient: string;
  imageId: string;
}) {
  const proof = {
    x402Version: '1.0',
    scheme: 'eip712',
    network: 'base-sepolia',
    payload: {
      signature: '0xdeadbeef',
      signer: payload.signer,
      amount: payload.amount,
      recipient: payload.recipient,
      imageId: payload.imageId,
    },
  };

  return Buffer.from(JSON.stringify(proof)).toString('base64');
}

describe('GET /api/images/[id] integration', () => {
  const testImageIds: string[] = [];
  const testLicenseIds: string[] = [];
  const masterKey = process.env.MASTER_ENCRYPTION_KEY || 'a'.repeat(64);

  beforeEach(async () => {
    // Set env vars for tests
    process.env.MASTER_ENCRYPTION_KEY = masterKey;
    process.env.FACILITATOR_PRIVATE_KEY = '0x' + 'a'.repeat(64);
    process.env.NEXT_PUBLIC_REVENUE_DISTRIBUTOR_ADDRESS = '0x9FBa4d8090E825d311982273D1bb77f5c46C9afa';
    process.env.NEXT_PUBLIC_BASE_RPC_URL = 'https://sepolia.base.org';

    // Create test image with real encryption
    const testImageBuffer = Buffer.from('test-image-content');
    const encryptionKey = generateEncryptionKey();
    const encryptedBuffer = encryptImage(testImageBuffer, encryptionKey);
    const encryptedKey = encryptWithMasterKey(keyToHex(encryptionKey), masterKey);

    const [insertedImage] = await db
      .insert(images)
      .values({
        encryptedCid: 'bafyintegrationtest',
        watermarkedCid: 'QmIntegrationTest',
        encryptionKey: encryptedKey,
        photographerAddress: '0x1111111111111111111111111111111111111111',
        title: 'Integration Test Image',
        description: 'For integration testing',
        tags: ['test', 'integration'],
        priceUsdc: '7.50',
        width: 2048,
        height: 1536,
      })
      .returning({ id: images.id });

    testImageIds.push(insertedImage.id);
  });

  afterEach(async () => {
    // Clean up test data
    if (testLicenseIds.length > 0) {
      await db.delete(licenses).where(inArray(licenses.id, testLicenseIds));
      testLicenseIds.length = 0;
    }

    if (testImageIds.length > 0) {
      await db.delete(images).where(inArray(images.id, testImageIds));
      testImageIds.length = 0;
    }
  });

  describe('Path 1: No payment proof - returns 402', () => {
    it('returns 402 with full payment requirements for existing image', async () => {
      const imageId = testImageIds[0];
      const request = createRequest(imageId);
      const context = createContext(imageId);

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(402);
      expect(data.x402Version).toBe('1.0');
      expect(data.accepts).toHaveLength(1);
      expect(data.accepts[0]).toMatchObject({
        scheme: 'eip712',
        network: 'base-sepolia',
        recipient: '0x1111111111111111111111111111111111111111',
        resource: `/api/images/${imageId}`,
        description: 'Purchase license for: Integration Test Image',
      });
      expect(data.image).toMatchObject({
        id: imageId,
        title: 'Integration Test Image',
        description: 'For integration testing',
        watermarkedCid: 'QmIntegrationTest',
        priceUsdc: '7.50',
        width: 2048,
        height: 1536,
      });
    });

    it('returns 404 for non-existent image', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const request = createRequest(fakeId);
      const context = createContext(fakeId);

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Image not found');
    });
  });

  describe('Path 2: Valid payment proof - first purchase', () => {
    it('creates license and returns decrypted image on valid payment', async () => {
      const imageId = testImageIds[0];
      const buyerAddress = '0x3333333333333333333333333333333333333333';

      const paymentProof = createPaymentProof({
        signer: buyerAddress,
        amount: '7.50',
        recipient: '0x1111111111111111111111111111111111111111',
        imageId,
      });

      const request = createRequest(imageId, { 'X-PAYMENT': paymentProof });
      const context = createContext(imageId);

      const response = await GET(request, context);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('image/jpeg');
      expect(response.headers.get('Content-Disposition')).toContain('Integration_Test_Image.jpg');
      expect(response.headers.get('X-License-Id')).toBeTruthy();
      expect(response.headers.get('X-Payment-Response')).toBeTruthy();

      // Verify payment response header
      const paymentResponse = JSON.parse(
        Buffer.from(response.headers.get('X-Payment-Response')!, 'base64').toString('utf-8')
      );
      expect(paymentResponse).toMatchObject({
        txHash: expect.any(String),
        licenseId: expect.any(String),
        network: 'base-sepolia',
      });

      // Verify license was created in database
      const [createdLicense] = await db
        .select()
        .from(licenses)
        .where(
          and(
            eq(licenses.imageId, imageId),
            eq(licenses.buyerAddress, buyerAddress)
          )
        )
        .limit(1);

      expect(createdLicense).toBeDefined();
      expect(createdLicense.photographerAddress).toBe('0x1111111111111111111111111111111111111111');
      expect(createdLicense.priceUsdc).toBe('7.50');
      expect(createdLicense.paymentTxHash).toBeTruthy();

      testLicenseIds.push(createdLicense.id);
    });

    it('rejects payment with incorrect amount', async () => {
      const imageId = testImageIds[0];
      const buyerAddress = '0x3333333333333333333333333333333333333333';

      const paymentProof = createPaymentProof({
        signer: buyerAddress,
        amount: '1.00', // Wrong amount
        recipient: '0x1111111111111111111111111111111111111111',
        imageId,
      });

      const request = createRequest(imageId, { 'X-PAYMENT': paymentProof });
      const context = createContext(imageId);

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(402);
      expect(data.error).toContain('amount mismatch');

      // Verify no license was created
      const licenseCheck = await db
        .select()
        .from(licenses)
        .where(
          and(
            eq(licenses.imageId, imageId),
            eq(licenses.buyerAddress, buyerAddress)
          )
        )
        .limit(1);

      expect(licenseCheck).toHaveLength(0);
    });

    it('rejects payment with incorrect recipient', async () => {
      const imageId = testImageIds[0];
      const buyerAddress = '0x3333333333333333333333333333333333333333';

      const paymentProof = createPaymentProof({
        signer: buyerAddress,
        amount: '7.50',
        recipient: '0x9999999999999999999999999999999999999999', // Wrong recipient
        imageId,
      });

      const request = createRequest(imageId, { 'X-PAYMENT': paymentProof });
      const context = createContext(imageId);

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(402);
      expect(data.error).toContain('recipient mismatch');
    });
  });

  describe('Path 3: License exists - re-download', () => {
    it('returns decrypted image for existing license without creating duplicate', async () => {
      const imageId = testImageIds[0];
      const buyerAddress = '0x4444444444444444444444444444444444444444';

      // Create existing license
      const [existingLicense] = await db
        .insert(licenses)
        .values({
          imageId,
          buyerAddress,
          photographerAddress: '0x1111111111111111111111111111111111111111',
          priceUsdc: '7.50',
          paymentTxHash: '0xexistingtxhash',
        })
        .returning({ id: licenses.id });

      testLicenseIds.push(existingLicense.id);

      const paymentProof = createPaymentProof({
        signer: buyerAddress,
        amount: '7.50',
        recipient: '0x1111111111111111111111111111111111111111',
        imageId,
      });

      const request = createRequest(imageId, { 'X-PAYMENT': paymentProof });
      const context = createContext(imageId);

      const response = await GET(request, context);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('image/jpeg');
      expect(response.headers.get('X-License-Id')).toBe(existingLicense.id);
      expect(response.headers.get('X-Payment-Response')).toBeFalsy();

      // Verify no duplicate license was created
      const allLicenses = await db
        .select()
        .from(licenses)
        .where(
          and(
            eq(licenses.imageId, imageId),
            eq(licenses.buyerAddress, buyerAddress)
          )
        );

      expect(allLicenses).toHaveLength(1);
      expect(allLicenses[0].id).toBe(existingLicense.id);
    });
  });

  describe('Error handling', () => {
    it('returns 400 for invalid UUID format', async () => {
      const request = createRequest('not-a-uuid');
      const context = createContext('not-a-uuid');

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid image ID format');
    });

    it('handles malformed payment proof header', async () => {
      const imageId = testImageIds[0];
      const request = createRequest(imageId, {
        'X-PAYMENT': 'not-valid-base64!!!',
      });
      const context = createContext(imageId);

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('payment proof');
    });

    it('handles payment proof with missing required fields', async () => {
      const imageId = testImageIds[0];
      const invalidProof = {
        x402Version: '1.0',
        scheme: 'eip712',
        // Missing network and payload
      };

      const request = createRequest(imageId, {
        'X-PAYMENT': Buffer.from(JSON.stringify(invalidProof)).toString('base64'),
      });
      const context = createContext(imageId);

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid payment proof format');
    });
  });
});
