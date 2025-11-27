import React from 'react';
import ImageCard from './ui/image-card';
import { Image } from './types';

interface ImageGridProps {
    images: Image[];
    onImageClick: (image: Image) => void;
}

const ImageGrid: React.FC<ImageGridProps> = ({ images, onImageClick }) => {
    return (
        <div className="w-full">
            {/* CSS Columns masonry layout - equal column widths, natural heights */}
            <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-2">
                {images.map((image) => (
                    <ImageCard key={image.id} image={image} onClick={onImageClick} />
                ))}
            </div>
        </div>
    );
};

export default ImageGrid;
