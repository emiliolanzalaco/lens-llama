'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@/lib/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { UploadForm, type UploadFormData } from '@/components/upload-form';
import { ImageCarousel, type CarouselImage } from '@/components/image-carousel';
import { FileDropzone } from '@/components/ui/file-dropzone';

interface UploadItem {
  id: string;
  file: File;
  previewUrl: string;
  data: UploadFormData;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function UploadPage() {
  const { ready, authenticated, login } = useAuth();

  const [items, setItems] = useState<UploadItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = useCallback((file: File) => {
    // Validate
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Invalid file type. Allowed: JPEG, PNG, WebP');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError(`File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
      return;
    }

    const id = crypto.randomUUID();
    const previewUrl = URL.createObjectURL(file);

    const newItem: UploadItem = {
      id,
      file,
      previewUrl,
      data: {
        title: file.name.split('.')[0],
        description: '',
        tags: '',
        price: '',
      },
    };

    setItems((prev) => [...prev, newItem]);
    setSelectedId(id);
    setError(null);
  }, []);

  const handleFormDataChange = (id: string, newData: UploadFormData) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, data: newData } : item
      )
    );
  };

  const handleUploadSuccess = (id: string) => {
    // Remove uploaded item
    setItems((prev) => {
      const newItems = prev.filter((item) => item.id !== id);
      // Select next item if available
      if (newItems.length > 0 && selectedId === id) {
        setSelectedId(newItems[0].id);
      } else if (newItems.length === 0) {
        setSelectedId(null);
      }
      return newItems;
    });
  };

  const handleAddImage = () => {
    // Trigger file input click - simple way is to use a hidden input or reuse dropzone logic
    // For now, we rely on the main dropzone if list is empty, or the carousel add button
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = ALLOWED_TYPES.join(',');
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) handleFileSelect(file);
    };
    input.click();
  };

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-200 border-t-neutral-950" />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="flex h-screen flex-col items-center justify-center px-6">
        <h1 className="mb-4 text-3xl font-medium text-neutral-950">
          Sign in to Upload
        </h1>
        <p className="mb-8 text-neutral-600">
          You need to be signed in to upload images to LensLlama.
        </p>
        <Button onClick={login}>Sign In</Button>
      </div>
    );
  }

  const selectedItem = items.find((item) => item.id === selectedId);

  // Initial Empty State
  if (items.length === 0) {
    return (
      <div className="px-6 py-12 md:px-12">
        <div className="mx-auto max-w-xl">
          <FileDropzone
            onFileSelect={handleFileSelect}
            error={error || undefined}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col bg-white">
      <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
        {/* Left Column - Preview (75%) */}
        <div className="relative flex items-center justify-center bg-neutral-100 p-8 md:w-3/4">
          {selectedItem ? (
            <div className="relative h-full w-full">
              <img
                src={selectedItem.previewUrl}
                alt={selectedItem.data.title}
                className="h-full w-full object-contain"
              />
            </div>
          ) : (
            <div className="text-neutral-400">Select an image to edit</div>
          )}
        </div>

        {/* Right Column - Form (25%) */}
        <div className="flex flex-col overflow-y-auto border-l border-neutral-200 bg-white p-6 md:w-1/4">
          <div className="mb-6">
            <h2 className="text-xl font-medium text-neutral-950">Edit Details</h2>
            <p className="text-sm text-neutral-500">
              {items.length} image{items.length !== 1 ? 's' : ''} selected
            </p>
          </div>

          {selectedItem && (
            <UploadForm
              key={selectedItem.id} // Force re-mount on switch to reset internal form state if any
              file={selectedItem.file}
              data={selectedItem.data}
              onChange={(data) => handleFormDataChange(selectedItem.id, data)}
              onUploadSuccess={() => handleUploadSuccess(selectedItem.id)}
            />
          )}
        </div>
      </div>

      {/* Bottom Carousel */}
      <ImageCarousel
        images={items.map(item => ({ id: item.id, url: item.previewUrl }))}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onAdd={handleAddImage}
        onRemove={(id) => {
          setItems(prev => prev.filter(i => i.id !== id));
          if (selectedId === id) setSelectedId(null);
        }}
      />
    </div>
  );
}
