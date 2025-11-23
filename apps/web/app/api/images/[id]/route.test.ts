import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@lens-llama/database', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
  images: {},
  licenses: {},
  eq: vi.fn(),
  and: vi.fn(),
  decryptWithMasterKey: vi.fn(),
}));

vi.mock('@lens-llama/image-processing', () => ({
  decryptImage: vi.fn(),
  hexToKey: vi.fn(),
}));

vi.mock('@lens-llama/storage', () => ({
  downloadFromFilecoin: vi.fn(),
}));

vi.mock('viem', () => ({
  createPublicClient: vi.fn(),
  createWalletClient: vi.fn(),
  http: vi.fn(),
  parseUnits: vi.fn(),
}));

vi.mock('viem/chains', () => ({
  baseSepolia: {},
}));

vi.mock('viem/accounts', () => ({
  privateKeyToAccount: vi.fn(),
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
  signature?: string;
}) {
  const proof = {
    x402Version: '1.0',
    scheme: 'eip712',
    network: 'base-sepolia',
    payload: {
      signature: payload.signature || '0xdeadbeef',
      signer: payload.signer,
      amount: payload.amount,
      recipient: payload.recipient,
      imageId: payload.imageId,
    },
  };

  return Buffer.from(JSON.stringify(proof)).toString('base64');
}

describe('GET /api/images/[id] - validation', () => {
  it('returns 400 for invalid UUID format', async () => {
    const request = createRequest('invalid-id');
    const context = createContext('invalid-id');

    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid image ID format');
  });

  it('returns 400 for malformed payment proof', async () => {
    const { db } = await import('@lens-llama/database');
    const imageId = '550e8400-e29b-41d4-a716-446655440000';

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            {
              id: imageId,
              priceUsdc: '5.00',
              photographerAddress: '0x1111111111111111111111111111111111111111',
              title: 'Test Image',
              description: 'Test',
              watermarkedCid: 'QmTest',
              width: 1920,
              height: 1080,
              encryptedCid: 'bafytest',
              encryptionKey: 'encrypted-key',
            },
          ]),
        }),
      }),
    } as any);

    const request = createRequest(imageId, {
      'X-PAYMENT': 'invalid-base64!!!',
    });
    const context = createContext(imageId);

    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('payment proof');
  });
});

describe('GET /api/images/[id] - Path 1: No payment proof', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 404 for non-existent image', async () => {
    const { db } = await import('@lens-llama/database');
    const imageId = '550e8400-e29b-41d4-a716-446655440000';

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    } as any);

    const request = createRequest(imageId);
    const context = createContext(imageId);

    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Image not found');
  });

  it('returns 402 with x402 payment requirements', async () => {
    const { db } = await import('@lens-llama/database');
    const imageId = '550e8400-e29b-41d4-a716-446655440000';

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            {
              id: imageId,
              priceUsdc: '5.00',
              photographerAddress: '0x1111111111111111111111111111111111111111',
              title: 'Test Image',
              description: 'A beautiful test image',
              watermarkedCid: 'QmTest123',
              width: 1920,
              height: 1080,
              encryptedCid: 'bafytest',
              encryptionKey: 'encrypted-key',
            },
          ]),
        }),
      }),
    } as any);

    const request = createRequest(imageId);
    const context = createContext(imageId);

    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(402);
    expect(data).toHaveProperty('x402Version');
    expect(data).toHaveProperty('accepts');
    expect(data).toHaveProperty('image');
    expect(data.accepts).toBeInstanceOf(Array);
    expect(data.accepts[0]).toMatchObject({
      scheme: 'eip712',
      network: 'base-sepolia',
      recipient: '0x1111111111111111111111111111111111111111',
      resource: `/api/images/${imageId}`,
    });
    expect(data.image).toMatchObject({
      id: imageId,
      title: 'Test Image',
      description: 'A beautiful test image',
      watermarkedCid: 'QmTest123',
      priceUsdc: '5.00',
    });
  });

  it('includes correct USDC asset details in payment requirements', async () => {
    const { db } = await import('@lens-llama/database');
    const imageId = '550e8400-e29b-41d4-a716-446655440000';

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            {
              id: imageId,
              priceUsdc: '10.50',
              photographerAddress: '0x2222222222222222222222222222222222222222',
              title: 'Premium Image',
              description: null,
              watermarkedCid: 'QmPremium',
              width: 3840,
              height: 2160,
              encryptedCid: 'bafypremium',
              encryptionKey: 'encrypted-key',
            },
          ]),
        }),
      }),
    } as any);

    const request = createRequest(imageId);
    const context = createContext(imageId);

    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(402);
    expect(data.accepts[0].asset).toMatchObject({
      type: 'erc20',
      symbol: 'USDC',
      decimals: 6,
    });
    expect(data.accepts[0].maxAmount).toBe(10.5 * 1e6);
  });
});

describe('GET /api/images/[id] - payment verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects payment with mismatched image ID', async () => {
    const { db } = await import('@lens-llama/database');
    const imageId = '550e8400-e29b-41d4-a716-446655440000';
    const wrongImageId = '660e8400-e29b-41d4-a716-446655440001';

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            {
              id: imageId,
              priceUsdc: '5.00',
              photographerAddress: '0x1111111111111111111111111111111111111111',
              title: 'Test Image',
              description: 'Test',
              watermarkedCid: 'QmTest',
              width: 1920,
              height: 1080,
              encryptedCid: 'bafytest',
              encryptionKey: 'encrypted-key',
            },
          ]),
        }),
      }),
    } as any);

    const paymentProof = createPaymentProof({
      signer: '0x3333333333333333333333333333333333333333',
      amount: '5.00',
      recipient: '0x1111111111111111111111111111111111111111',
      imageId: wrongImageId,
    });

    const request = createRequest(imageId, { 'X-PAYMENT': paymentProof });
    const context = createContext(imageId);

    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(402);
    expect(data.error).toContain('image ID mismatch');
  });

  it('rejects payment with mismatched amount', async () => {
    const { db } = await import('@lens-llama/database');
    const imageId = '550e8400-e29b-41d4-a716-446655440000';

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            {
              id: imageId,
              priceUsdc: '5.00',
              photographerAddress: '0x1111111111111111111111111111111111111111',
              title: 'Test Image',
              description: 'Test',
              watermarkedCid: 'QmTest',
              width: 1920,
              height: 1080,
              encryptedCid: 'bafytest',
              encryptionKey: 'encrypted-key',
            },
          ]),
        }),
      }),
    } as any);

    const paymentProof = createPaymentProof({
      signer: '0x3333333333333333333333333333333333333333',
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
  });

  it('rejects payment with mismatched recipient', async () => {
    const { db } = await import('@lens-llama/database');
    const imageId = '550e8400-e29b-41d4-a716-446655440000';

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            {
              id: imageId,
              priceUsdc: '5.00',
              photographerAddress: '0x1111111111111111111111111111111111111111',
              title: 'Test Image',
              description: 'Test',
              watermarkedCid: 'QmTest',
              width: 1920,
              height: 1080,
              encryptedCid: 'bafytest',
              encryptionKey: 'encrypted-key',
            },
          ]),
        }),
      }),
    } as any);

    const paymentProof = createPaymentProof({
      signer: '0x3333333333333333333333333333333333333333',
      amount: '5.00',
      recipient: '0x4444444444444444444444444444444444444444', // Wrong recipient
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

describe('GET /api/images/[id] - input validation', () => {
  it('validates signer address format in payment proof', async () => {
    const { db } = await import('@lens-llama/database');
    const imageId = '550e8400-e29b-41d4-a716-446655440000';

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            {
              id: imageId,
              priceUsdc: '5.00',
              photographerAddress: '0x1111111111111111111111111111111111111111',
              title: 'Test Image',
              description: 'Test',
              watermarkedCid: 'QmTest',
              width: 1920,
              height: 1080,
              encryptedCid: 'bafytest',
              encryptionKey: 'encrypted-key',
            },
          ]),
        }),
      }),
    } as any);

    const invalidProof = {
      x402Version: '1.0',
      scheme: 'eip712',
      network: 'base-sepolia',
      payload: {
        signature: '0xdeadbeef',
        signer: 'invalid-address',
        amount: '5.00',
        recipient: '0x1111111111111111111111111111111111111111',
        imageId,
      },
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
