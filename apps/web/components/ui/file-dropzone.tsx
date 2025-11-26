'use client';

import { useCallback, useRef, useState } from 'react';
import { Plus, UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileDropzoneProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  className?: string;
  preview?: string | null;
  error?: string;
}

export function FileDropzone({
  onFileSelect,
  accept = 'image/jpeg,image/png,image/webp',
  className,
  error,
}: FileDropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        onFileSelect(droppedFile);
      }
    },
    [onFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  return (
    <div className={className}>
      <div
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        data-testid="dropzone"
        data-dragging={isDragging}
        className={cn(
          "group relative flex min-h-[400px] cursor-pointer flex-col items-center justify-center rounded-[2.5rem] border-2 border-dashed transition-all duration-300 ease-in-out",
          isDragging
            ? "border-neutral-800 bg-neutral-50/50 scale-[0.99]"
            : "border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50/50",
          error ? "border-red-500 bg-red-50" : ""
        )}
      >
        <DotBackground isDragging={isDragging} />
        <div className="relative z-10 flex flex-col items-center gap-6 p-10 text-center transition-transform duration-300 group-hover:scale-105">
          <Plus
            className={cn(
              "h-24 w-24 transition-colors duration-300",
              isDragging ? "text-neutral-400" : "text-neutral-300 group-hover:text-neutral-400"
            )}
            strokeWidth={1}
          />

          <div className="space-y-2">
            <p className="text-xl font-medium text-neutral-950">
              Upload an image
            </p>
            <p className="text-base text-neutral-500">
              Drag and drop or click to browse
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-full bg-neutral-100 px-4 py-1.5 text-xs font-medium text-neutral-500">
            <UploadCloud className="h-3.5 w-3.5" />
            <span>JPEG, PNG, WebP up to 50MB</span>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={(e) => {
            const selectedFile = e.target.files?.[0];
            if (selectedFile) onFileSelect(selectedFile);
          }}
          className="hidden"
        />
      </div>
      {
        error && (
          <p className="mt-3 text-center text-sm font-medium text-red-600 animate-in fade-in slide-in-from-top-1">
            {error}
          </p>
        )
      }
    </div >
  );
}

const DOTS = Array.from({ length: 500 }).map((_, i) => {
  // Create a grid of 25x20
  const col = i % 25;
  const row = Math.floor(i / 25);

  // Deterministic perturbation
  const dx = (Math.sin(i * 13.37) * 4);
  const dy = (Math.cos(i * 12.34) * 4);

  return {
    left: `${(col * 4) + dx}%`,
    top: `${(row * 5) + dy}%`,
    size: (Math.abs(Math.sin(i * 1.23)) * 3) + 2 + 'px', // 2-5px
    opacity: (Math.abs(Math.cos(i * 2.34)) * 0.5) + 0.4,
  };
});

function DotBackground({ isDragging }: { isDragging: boolean }) {
  return (
    <div
      className={cn(
        "absolute inset-0 overflow-hidden pointer-events-none transition-opacity duration-300",
        isDragging ? "opacity-30" : "opacity-100"
      )}
      style={{
        maskImage: 'radial-gradient(circle at center, transparent 35%, black 60%)',
        WebkitMaskImage: 'radial-gradient(circle at center, transparent 35%, black 60%)'
      }}
    >
      <div className="absolute -inset-[100%] w-[300%] h-[300%] transition-transform duration-[20s] ease-linear group-hover:animate-[spin_20s_linear_infinite]">
        {DOTS.map((dot, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-neutral-400"
            style={{
              left: dot.left,
              top: dot.top,
              width: dot.size,
              height: dot.size,
              opacity: dot.opacity,
            }}
          />
        ))}
      </div>
    </div>
  );
}
