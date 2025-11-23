'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/use-auth';
import { useX402Payment } from '@/lib/hooks/use-x402-payment';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface ImageMetadata {
  id: string;
  title: string;
  description: string;
  watermarkedCid: string;
  priceUsdc: string;
  photographerAddress: string;
  photographerUsername: string;
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
  const [purchased, setPurchased] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  const { authenticated, login } = useAuth();
  const { purchaseImage, hasWallet } = useX402Payment();

  useEffect(() => {
    async function fetchImage() {
      try {
        const response = await fetch(`/api/images/${imageId}`);

        if (response.status === 404) {
          setError('Image not found');
          return;
        }

        if (response.status === 402) {
          const data = await response.json();
          setImage(data);
          return;
        }

        if (response.ok) {
          setPurchased(true);
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
      setError('No wallet available');
      return;
    }

    if (!image) return;

    setPurchasing(true);
    setError(null);

    try {
      const result = await purchaseImage(imageId, image.paymentRequirements);

      if (result.success && result.imageBlob) {
        const url = URL.createObjectURL(result.imageBlob);
        setDownloadUrl(url);
        setPurchased(true);

        // Auto-download
        const a = document.createElement('a');
        a.href = url;
        a.download = `${image.title}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
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

  const handleDownload = () => {
    if (downloadUrl && image) {
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${image.title}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12 md:px-12">
          <div className="grid gap-12 md:grid-cols-2">
            <div className="aspect-square bg-[#FDF6E3]" />
            <div className="space-y-6">
              <div className="h-8 w-3/4 bg-[#FDF6E3]" />
              <div className="h-4 w-1/2 bg-[#FDF6E3]" />
              <div className="h-12 w-1/3 bg-[#FDF6E3]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!image) {
    return (
      <div className="min-h-screen bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12 md:px-12">
          <p className="text-red-600">{error || 'Image not found'}</p>
          <Link href="/" className="mt-4 inline-block text-neutral-600 hover:text-neutral-950">
            Back to gallery
          </Link>
        </div>
      </div>
    );
  }


  console.log(image);
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-7xl px-6 py-12 md:px-12">
        <div className="grid gap-12 md:grid-cols-2">
          {/* Image - left column */}
          <div className="relative">
            {!imageLoaded && <LoadingSpinner size="md" />}
            <img
              src={`/api/images/${imageId}/preview`}
              alt={image.title}
              className={`w-full transition-opacity duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setImageLoaded(true)}
            />
          </div>

          {/* Details - right column */}
          <div className="flex flex-col">
            <h1 className="text-4xl font-medium text-neutral-950">
              {image.title}
            </h1>

            {image.description && (
              <p className="mt-4 text-neutral-600">
                {image.description}
              </p>
            )}

            {image.photographerUsername && (
              <p className="mt-4 text-neutral-600">
                {image.photographerUsername}.lensllama.eth
              </p>
            )}

            {/* Price */}
            <p className="mt-8 text-2xl font-medium text-neutral-950">
              ${image.priceUsdc} USDC
            </p>

            {/* Action button */}
            <div className="mt-8">
              {purchased ? (
                <button
                  onClick={handleDownload}
                  className="bg-[#FDF6E3] px-6 py-4 text-base font-medium text-neutral-950 hover:bg-[#f5edd8]"
                >
                  Download
                </button>
              ) : !authenticated ? (
                <button
                  onClick={() => login()}
                  className="bg-[#FDF6E3] px-6 py-4 text-base font-medium text-neutral-950 hover:bg-[#f5edd8]"
                >
                  Sign In to Buy
                </button>
              ) : (
                <button
                  onClick={handlePurchase}
                  disabled={purchasing}
                  className="bg-[#FDF6E3] px-6 py-4 text-base font-medium text-neutral-950 hover:bg-[#f5edd8] disabled:bg-neutral-200 disabled:text-neutral-400"
                >
                  {purchasing ? 'Completing purchase...' : 'Buy License'}
                </button>
              )}
            </div>

            {/* Error */}
            {error && (
              <p className="mt-4 text-red-600">
                {error}
              </p>
            )}

            {/* Success message */}
            {purchased && !error && (
              <p className="mt-4 text-green-600">
                License purchased successfully
              </p>
            )}

            {/* Metadata - tertiary */}
            <div className="mt-auto pt-12">
              <p className="text-xs text-neutral-400">
                {image.width} x {image.height} px
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
