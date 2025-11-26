'use client';

import { Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CarouselImage {
    id: string; // Can be a temp ID for new uploads
    url: string;
    file?: File; // Only for new uploads
}

interface ImageCarouselProps {
    images: CarouselImage[];
    selectedId: string | null;
    onSelect: (id: string) => void;
    onAdd: () => void;
    onRemove?: (id: string) => void;
}

export function ImageCarousel({
    images,
    selectedId,
    onSelect,
    onAdd,
    onRemove,
}: ImageCarouselProps) {
    if (images.length === 0) return null;

    return (
        <div className="flex h-full items-start gap-4 overflow-x-auto border-neutral-200 p-4">
            <div className="flex flex-col gap-4">
                {images.map((image) => (
                    <div
                        key={image.id}
                        className={cn(
                            "relative h-20 w-20 cursor-pointer overflow-hidden rounded-md border-2 transition-all hover:opacity-90",
                            selectedId === image.id
                                ? "border-green-500 ring-2 ring-green-500"
                                : "border-transparent opacity-70 hover:opacity-100"
                        )}
                        onClick={() => onSelect(image.id)}
                    >
                        <img
                            src={image.url}
                            alt="Thumbnail"
                            className="h-full w-full object-cover"
                        />
                        {onRemove && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRemove(image.id);
                                }}
                                className="absolute right-1 top-1 rounded-full bg-black/50 p-0.5 text-white hover:bg-black/70"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        )}
                    </div>
                ))}

                {/* Add Button */}
                <button
                    onClick={onAdd}
                    className="flex h-20 w-20 items-center justify-center rounded-md border-2 border-dashed border-neutral-300 bg-neutral-50 text-neutral-400 transition-colors hover:border-neutral-400 hover:text-neutral-600"
                >
                    <Plus className="h-6 w-6" />
                </button>
            </div>
        </div>
    );
}
