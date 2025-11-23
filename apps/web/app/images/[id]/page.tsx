'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/hooks/use-auth';
import { useX402Payment } from '@/lib/hooks/use-x402-payment';

interface ImageMetadata {
  id: string;
  title: string;
  description: string;
  watermarkedCid: string;
  priceUsdc: string;
  photographerAddress: string;
  width: number;
  height: number;
  paymentRequirements: {
    maxAmountRequired: string;
    payTo: string;
    resource: string;
    description: string;
  };
}

export default function ImageDetailPage() {
  const params = useParams();
  const imageId = params.id as string;

  const [image, setImage] = useState<ImageMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  const { authenticated, login, walletAddress } = useAuth();
  const { purchaseImage, hasWallet } = useX402Payment();

  // Fetch image metadata (will return 402 with payment requirements)
  useEffect(() => {
    async function fetchImage() {
      try {
        const response = await fetch(`/api/images/${imageId}`);

        if (response.status === 404) {
          setError('Image not found');
          return;
        }

        // 402 response contains metadata + payment requirements
        if (response.status === 402) {
          const data = await response.json();
          setImage(data);
          return;
        }

        // If 200, user already owns it - could redirect to download
        if (response.ok) {
          // Already licensed - show download option
          setError('You already own this image');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load image');
      } finally {
        setLoading(false);
      }
    }

    fetchImage();
  }, [imageId]);

  const handlePurchase = async () => {
    if (!authenticated) {
      login();
      return;
    }

    if (!hasWallet) {
      setError('No wallet available. Please connect a wallet.');
      return;
    }

    if (!image) return;

    setPurchasing(true);
    setError(null);

    try {
      const result = await purchaseImage(imageId, image.paymentRequirements);

      if (result.success && result.imageBlob) {
        // Download the purchased image
        const url = URL.createObjectURL(result.imageBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${image.title}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // Show specific error reason
        const errorMsg = result.error || 'Purchase failed';
        if (errorMsg.includes('insufficient_funds')) {
          setError('Insufficient USDC balance');
        } else {
          setError(errorMsg);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Purchase failed');
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-500">Loading...</p>
      </div>
    );
  }

  if (!image) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-red-500">{error || 'Image not found'}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Watermarked preview */}
        <div className="overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
          <img
            src={`/api/images/${imageId}/preview`}
            alt={image.title}
            className="w-full object-contain"
            style={{ maxHeight: '600px' }}
          />
        </div>

        <div className="mt-6">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
            {image.title}
          </h1>

          {image.description && (
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">
              {image.description}
            </p>
          )}

          <div className="mt-4 flex items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400">
            <span>
              {image.width} x {image.height}
            </span>
            <span>
              By: {image.photographerAddress.slice(0, 6)}...
              {image.photographerAddress.slice(-4)}
            </span>
          </div>

          <div className="mt-6 rounded-lg bg-white p-6 shadow dark:bg-zinc-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                  ${image.priceUsdc} USDC
                </p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Full resolution, no watermark
                </p>
              </div>

              {!authenticated ? (
                <button
                  onClick={() => login()}
                  className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
                >
                  Connect Wallet to Buy
                </button>
              ) : (
                <button
                  onClick={handlePurchase}
                  disabled={purchasing}
                  className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700 disabled:bg-zinc-300 disabled:text-zinc-500"
                >
                  {purchasing ? 'Processing...' : `Buy for $${image.priceUsdc}`}
                </button>
              )}
            </div>

            {authenticated && (
              <p className="mt-2 text-right text-xs text-zinc-400">
                {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
              </p>
            )}
          </div>

          {error && (
            <div className="mt-4 rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
