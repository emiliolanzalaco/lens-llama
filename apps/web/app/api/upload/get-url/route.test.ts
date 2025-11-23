import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { NextRequest } from 'next/server';

// Mock @vercel/blob/client
vi.mock('@vercel/blob/client', () => ({
  handleUpload: vi.fn(),
}));

import { handleUpload } from '@vercel/blob/client';

function createRequest(body: object) {
  return new NextRequest('http://localhost/api/upload/get-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/upload/get-url', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns upload URL for valid request', async () => {
    const mockResponse = {
      type: 'blob.generate-client-token',
      clientToken: 'test-token',
    };

    vi.mocked(handleUpload).mockResolvedValue(mockResponse);

    const response = await POST(createRequest({
      type: 'blob.generate-client-token',
      payload: {
        pathname: 'test-image.jpg',
        callbackUrl: 'http://localhost/api/upload/get-url',
      },
    }));

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockResponse);
  });

  it('returns 400 for invalid file extension', async () => {
    vi.mocked(handleUpload).mockImplementation(async ({ onBeforeGenerateToken }) => {
      if (onBeforeGenerateToken) {
        await onBeforeGenerateToken('test-file.txt', {
          pathname: 'test-file.txt',
          callbackUrl: 'http://localhost',
          clientPayload: null,
          multipart: false,
        });
      }
      return {};
    });

    const response = await POST(createRequest({
      type: 'blob.generate-client-token',
      payload: {
        pathname: 'test-file.txt',
        callbackUrl: 'http://localhost/api/upload/get-url',
      },
    }));

    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid file type');
  });

  it('accepts jpeg file extension', async () => {
    let tokenPayload: string | undefined;

    vi.mocked(handleUpload).mockImplementation(async ({ onBeforeGenerateToken }) => {
      if (onBeforeGenerateToken) {
        const result = await onBeforeGenerateToken('photo.jpeg', {
          pathname: 'photo.jpeg',
          callbackUrl: 'http://localhost',
          clientPayload: null,
          multipart: false,
        });
        tokenPayload = result.tokenPayload;
      }
      return { type: 'blob.generate-client-token', clientToken: 'token' };
    });

    const response = await POST(createRequest({
      type: 'blob.generate-client-token',
      payload: {
        pathname: 'photo.jpeg',
        callbackUrl: 'http://localhost/api/upload/get-url',
      },
    }));

    expect(response.status).toBe(200);
    expect(tokenPayload).toBeDefined();
  });

  it('accepts png file extension', async () => {
    vi.mocked(handleUpload).mockImplementation(async ({ onBeforeGenerateToken }) => {
      if (onBeforeGenerateToken) {
        await onBeforeGenerateToken('photo.png', {
          pathname: 'photo.png',
          callbackUrl: 'http://localhost',
          clientPayload: null,
          multipart: false,
        });
      }
      return { type: 'blob.generate-client-token', clientToken: 'token' };
    });

    const response = await POST(createRequest({
      type: 'blob.generate-client-token',
      payload: {
        pathname: 'photo.png',
        callbackUrl: 'http://localhost/api/upload/get-url',
      },
    }));

    expect(response.status).toBe(200);
  });

  it('accepts webp file extension', async () => {
    vi.mocked(handleUpload).mockImplementation(async ({ onBeforeGenerateToken }) => {
      if (onBeforeGenerateToken) {
        await onBeforeGenerateToken('photo.webp', {
          pathname: 'photo.webp',
          callbackUrl: 'http://localhost',
          clientPayload: null,
          multipart: false,
        });
      }
      return { type: 'blob.generate-client-token', clientToken: 'token' };
    });

    const response = await POST(createRequest({
      type: 'blob.generate-client-token',
      payload: {
        pathname: 'photo.webp',
        callbackUrl: 'http://localhost/api/upload/get-url',
      },
    }));

    expect(response.status).toBe(200);
  });
});
