'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { useAuth } from '@/lib/hooks/use-auth';
import { Button } from '@/components/ui/button';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const uploadSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  tags: z.string().optional(),
  price: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, 'Price must be a positive number'),
});

type FormErrors = {
  file?: string;
  title?: string;
  description?: string;
  tags?: string;
  price?: string;
};

export function UploadForm() {
  const router = useRouter();
  const { walletAddress } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    tags: '',
    price: '',
  });

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Invalid file type. Allowed: JPEG, PNG, WebP';
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`;
    }
    return null;
  };

  const handleFileSelect = useCallback((selectedFile: File) => {
    const error = validateFile(selectedFile);
    if (error) {
      setErrors((prev) => ({ ...prev, file: error }));
      return;
    }

    setFile(selectedFile);
    setErrors((prev) => ({ ...prev, file: undefined }));

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(selectedFile);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        handleFileSelect(droppedFile);
      }
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // Validate file
    if (!file) {
      setErrors((prev) => ({ ...prev, file: 'Image is required' }));
      return;
    }

    // Validate form data
    const result = uploadSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: FormErrors = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof FormErrors;
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    if (!walletAddress) {
      setSubmitError('Wallet not connected');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('file', file);
      formDataToSend.append('title', formData.title);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('tags', formData.tags);
      formDataToSend.append('price', formData.price);
      formDataToSend.append('photographerAddress', walletAddress);

      // Simulate progress for now (real progress would need XMLHttpRequest)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formDataToSend,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Upload failed');
      }

      setUploadProgress(100);

      // Redirect to homepage on success
      setTimeout(() => {
        router.push('/');
      }, 500);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'Upload failed'
      );
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* File Upload */}
      <div>
        <label className="block text-sm font-medium text-neutral-950 mb-2">
          Image
        </label>
        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
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
                JPEG, PNG, WebP up to 50MB
              </p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              const selectedFile = e.target.files?.[0];
              if (selectedFile) handleFileSelect(selectedFile);
            }}
            className="hidden"
          />
        </div>
        {errors.file && (
          <p className="mt-2 text-sm text-red-600">{errors.file}</p>
        )}
      </div>

      {/* Title */}
      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium text-neutral-950 mb-2"
        >
          Title
        </label>
        <input
          type="text"
          id="title"
          name="title"
          value={formData.title}
          onChange={handleInputChange}
          className="w-full bg-[#FDF6E3] px-4 py-3 text-neutral-950 placeholder-neutral-400 focus:outline-none"
          placeholder="Enter image title"
        />
        {errors.title && (
          <p className="mt-2 text-sm text-red-600">{errors.title}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-neutral-950 mb-2"
        >
          Description
          <span className="text-neutral-400 font-normal"> (optional)</span>
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          rows={3}
          className="w-full bg-[#FDF6E3] px-4 py-3 text-neutral-950 placeholder-neutral-400 focus:outline-none resize-none"
          placeholder="Describe your image"
        />
      </div>

      {/* Tags */}
      <div>
        <label
          htmlFor="tags"
          className="block text-sm font-medium text-neutral-950 mb-2"
        >
          Tags
          <span className="text-neutral-400 font-normal"> (optional)</span>
        </label>
        <input
          type="text"
          id="tags"
          name="tags"
          value={formData.tags}
          onChange={handleInputChange}
          className="w-full bg-[#FDF6E3] px-4 py-3 text-neutral-950 placeholder-neutral-400 focus:outline-none"
          placeholder="nature, landscape, sunset"
        />
      </div>

      {/* Price */}
      <div>
        <label
          htmlFor="price"
          className="block text-sm font-medium text-neutral-950 mb-2"
        >
          Price (USDC)
        </label>
        <input
          type="text"
          id="price"
          name="price"
          value={formData.price}
          onChange={handleInputChange}
          className="w-full bg-[#FDF6E3] px-4 py-3 text-neutral-950 placeholder-neutral-400 focus:outline-none"
          placeholder="9.99"
        />
        {errors.price && (
          <p className="mt-2 text-sm text-red-600">{errors.price}</p>
        )}
      </div>

      {/* Progress Bar */}
      {isUploading && (
        <div className="w-full bg-[#FDF6E3] h-2">
          <div
            className="bg-neutral-950 h-2 transition-all duration-200"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}

      {/* Submit Error */}
      {submitError && (
        <p className="text-sm text-red-600">{submitError}</p>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isUploading}
        className="w-full"
      >
        {isUploading ? 'Uploading...' : 'Upload Image'}
      </Button>
    </form>
  );
}
