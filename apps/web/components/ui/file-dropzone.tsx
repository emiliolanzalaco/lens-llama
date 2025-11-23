'use client';

import { useCallback, useRef, useState } from 'react';

interface FileDropzoneProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  preview?: string | null;
  error?: string;
}

export function FileDropzone({
  onFileSelect,
  accept = 'image/jpeg,image/png,image/webp',
  preview,
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
    <div>
      <label className="block text-sm font-medium text-neutral-950 mb-2">
        Image
      </label>
      <div
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        data-testid="dropzone"
        data-dragging={isDragging}
        className={`
          relative cursor-pointer bg-[#FDF6E3] p-8 text-center
          ${isDragging ? 'bg-[#F5EED6]' : ''}
          ${preview ? 'p-0' : 'min-h-[200px] flex items-center justify-center'}
        `}
      >
        {preview ? (
          <img
            src={preview}
            alt="Preview"
            className="w-full h-auto max-h-[400px] object-contain"
          />
        ) : (
          <div className="text-neutral-600">
            <p className="mb-2">Drag and drop or click to upload</p>
            <p className="text-sm text-neutral-400">
              JPEG, PNG, WebP up to 4MB
            </p>
          </div>
        )}
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
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
