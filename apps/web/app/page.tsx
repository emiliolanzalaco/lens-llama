'use client';

import { useEffect, useState } from 'react';
import ImageGrid from '@/components/image-grid';

type ImageSize = 'tall' | 'wide' | 'large' | 'small';

interface ImageData {
  id: string;
  watermarkedCid: string;
  title: string;
  priceUsdc: string;
  photographerAddress: string;
}

interface ImageWithSize extends ImageData {
  size: ImageSize;
}

export default function Home() {
  const [images, setImages] = useState<ImageWithSize[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchImages() {
      try {
        const response = await fetch('/api/images?limit=30');
        const data = await response.json();

        // Assign bento sizes in a repeating pattern
        const sizes: ImageSize[] = ['large', 'small', 'tall', 'wide', 'small', 'small'];
        const imagesWithSizes = data.images.map((img: ImageData, index: number) => ({
          ...img,
          size: sizes[index % sizes.length],
        }));

        setImages(imagesWithSizes);
      } catch (error) {
        console.error('Failed to fetch images:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchImages();
  }, []);

  const handleImageClick = (image: ImageWithSize) => {
    console.log('Image clicked:', image);
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="w-full px-2 md:px-4 mx-auto pb-20">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 grid-flow-dense auto-rows-[180px]">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="bg-gray-200"
              />
            ))}
          </div>
        ) : (
          <div className="animate-in fade-in duration-500">
            <ImageGrid images={images} onImageClick={handleImageClick} />
          </div>
        )}
      </div>
    </div>
  );
}
