
import React from 'react';
import ImageCard from './ui/image-card';
import { ImageWithSize } from './types';

interface ImageGridProps {
    images: ImageWithSize[];
    onImageClick: (image: ImageWithSize) => void;
}

const ImageGrid: React.FC<ImageGridProps> = ({ images, onImageClick }) => {
    return (
        <div className="w-full px-2 md:px-4 mx-auto pb-20">
            {/* 
        CSS Grid with Dense packing to fill holes. 
        auto-rows defines the base height unit.
        minmax(200px, 1fr) ensures responsive column widths.
      */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 grid-flow-dense auto-rows-[180px]">
                {images.map((image) => (
                    <ImageCard key={image.id} image={image} onClick={onImageClick} />
                ))}
            </div>
        </div>
    );
};

export default ImageGrid;
