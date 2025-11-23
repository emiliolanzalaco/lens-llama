'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { Image as ImagePin } from '../types';

interface ImageCardProps {
  image: ImagePin,
  onClick: (image: ImagePin) => void;
}

const getGridClasses = (size: ImagePin['size']): string => {
  switch (size) {
    case 'tall':
      return 'row-span-2 col-span-1';
    case 'wide':
      return 'row-span-1 col-span-2';
    case 'large':
      return 'row-span-2 col-span-2';
    case 'small':
    default:
      return 'row-span-1 col-span-1';
  }
};

const ImageCard: React.FC<ImageCardProps> = ({ image, onClick }: ImageCardProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const imageUrl = `/api/filecoin-image?cid=${image.watermarkedCid}`;

  // Don't render the card if image failed to load
  if (imageError) {
    return null;
  }

  return (
    <Link
      href={`/image/${image.id}`}
      className={`relative group overflow-hidden bg-gray-200 cursor-pointer ${getGridClasses(image.size)}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onClick(image)}
      data-testid="image-card"
    >
      <div className="relative h-full w-full">
        <Image
          src={imageUrl}
          alt={image.title}
          fill
          className={`w-full h-full object-cover transition-all duration-700 ${imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
            } group-hover:scale-110`}
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
          onLoad={() => setImageLoaded(true)}
          onError={() => {
            console.error('Failed to load image:', image.watermarkedCid);
            setImageError(true);
          }}
          loading="lazy"
          unoptimized
        />
      </div>
      {/* Overlay */}
      <div className={`absolute inset-0 bg-black/30 transition-opacity duration-200 flex flex-col justify-between p-3 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex justify-between items-end">
          {/* Optional: Minimal Text on hover if space allows */}
          <div className="text-white opacity-90 hidden sm:block pr-2">
            <p className="text-xs font-bold truncate w-24">{image.title}</p>
          </div>

          <div className="flex gap-2 ml-auto">
            <p className="text-xs font-bold truncate w-24">{image.priceUsdc}</p>
          </div>
        </div>
      </div>
    </Link >
  );
}

export default ImageCard;

