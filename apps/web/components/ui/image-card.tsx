'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { Image as ImagePin } from '../types';
import { LoadingSpinner } from './loading-spinner';

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

  const imageUrl = image.watermarkedBlobUrl;

  // Show error state if image failed to load
  if (imageError) {
    return (
      <div className={`relative bg-[#FDF6E3] flex items-center justify-center ${getGridClasses(image.size)}`}>
        <span className="text-xs text-neutral-400">Failed to load</span>
      </div>
    );
  }

  return (
    <Link
      href={`/images/${image.id}`}
      className={`relative group overflow-hidden cursor-pointer ${getGridClasses(image.size)}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onClick(image)}
      data-testid="image-card"
    >
      <div className="relative h-full w-full">
        {!imageLoaded && <LoadingSpinner size="sm" />}
        <Image
          src={imageUrl}
          alt={image.title}
          fill
          className={`w-full h-full object-cover transition-all duration-700 ${imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
            } group-hover:scale-105`}
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
          onLoad={() => setImageLoaded(true)}
          onError={() => {
            console.error('Failed to load image:', image.watermarkedBlobUrl);
            setImageError(true);
          }}
          loading="lazy"
          unoptimized
        />
      </div>
      {/* Overlay */}
      <div className={`absolute inset-0 bg-black/30 transition-opacity duration-200 flex items-end justify-between p-3 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
        <div className="text-white max-w-[60%]">
          <p className="text-xs font-bold truncate">{image.title}</p>
          {image.photographerUsername && (
            <p className="text-xs opacity-80 truncate">
              by {image.photographerUsername}.lensllama.eth
            </p>
          )}
        </div>
        <p className="text-white text-xs font-bold">${image.priceUsdc}</p>
      </div>
    </Link >
  );
}

export default ImageCard;

