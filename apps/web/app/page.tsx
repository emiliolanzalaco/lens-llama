'use client';

import { useEffect, useState } from 'react';
import ImageGrid from '@/components/image-grid';
import { Image } from '@/components/types';

export default function Home() {
  const [images, setImages] = useState<Image[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchImages() {
      try {
        const response = await fetch('/api/images?limit=30');
        const data = await response.json();
        setImages(data.images);
      } catch (error) {
        console.error('Failed to fetch images:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchImages();
  }, []);

  const handleImageClick = (image: Image) => {
    console.log('Image clicked:', image);
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="w-full px-2 pt-2 md:px-4 mx-auto pb-20">
        {isLoading ? (
          <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-2">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="bg-gray-200 mb-2 break-inside-avoid"
                style={{ aspectRatio: i % 3 === 0 ? '3/4' : i % 3 === 1 ? '4/3' : '1/1' }}
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
