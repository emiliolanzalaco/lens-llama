'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { useAuth } from '@/lib/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/progress-bar';
import { GradientAIButton } from '@/components/ui/ai-button';
import { generateDescription } from '@/app/actions/generate-description';
import { FileDropzone } from '@/components/ui/file-dropzone';
import { FormField } from '@/components/ui/form-field';
import { UsernameClaimModal } from '@/components/username-claim-modal';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const uploadSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  tags: z.string().optional(),
  price: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0.01;
  }, 'Price must be greater than 0.01'),
});

type FormErrors = {
  file?: string;
  title?: string;
  description?: string;
  tags?: string;
  price?: string;
};

export interface UploadFormData {
  title: string;
  description: string;
  tags: string;
  price: string;
}

interface UploadFormProps {
  file: File;
  data: UploadFormData;
  onChange: (data: UploadFormData) => void;
  onUploadSuccess: () => void;
}

export function UploadForm({ file, data, onChange, onUploadSuccess }: UploadFormProps) {
  const router = useRouter();
  const { walletAddress } = useAuth();
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [pendingUpload, setPendingUpload] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Invalid file type. Allowed: JPEG, PNG, WebP';
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`;
    }
    return null;
  };

  // const handleFileSelect = useCallback((selectedFile: File) => {
  //   const error = validateFile(selectedFile);
  //   if (error) {
  //     setErrors((prev) => ({ ...prev, file: error }));
  //     return;
  //   }

  //   setErrors((prev) => ({ ...prev, file: undefined })

  //   const reader = new FileReader();
  //   reader.onload = (e) => {
  //     setPreview(e.target?.result as string);
  //   };
  //   reader.readAsDataURL(selectedFile);
  // }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    onChange({ ...data, [name]: value });
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleGenerateDescription = async () => {
    setIsGeneratingAI(true);
    try {
      // Create a temporary URL for the file to send to the server (or handle upload there)
      // For the skeleton/mock, we just pass a string. In reality, we might need to upload to blob storage first
      // or send the file content. For now, we'll simulate it.
      const imageUrl = URL.createObjectURL(file!);
      const description = await generateDescription(imageUrl);
      onChange({ ...data, description });
    } catch (err) {
      console.error('Failed to generate description:', err);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const performUpload = async () => {
    if (!file || !walletAddress) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('file', file);
      formDataToSend.append('title', data.title);
      formDataToSend.append('description', data.description);
      formDataToSend.append('tags', data.tags);
      formDataToSend.append('price', data.price);
      formDataToSend.append('photographerAddress', walletAddress);

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

      // Small delay to show 100% before redirect
      setUploadProgress(100);
      setTimeout(() => router.push('/'), 500);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'Upload failed'
      );
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!file) {
      setErrors((prev) => ({ ...prev, file: 'Image is required' }));
      return;
    }

    const result = uploadSchema.safeParse(data);
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

    // Check if user already has a username
    try {
      const checkResponse = await fetch('/api/username/check-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAddress: walletAddress }),
      });

      if (checkResponse.ok) {
        const { hasUsername } = await checkResponse.json();

        if (!hasUsername) {
          // First upload, show username modal before uploading
          setPendingUpload(true);
          setShowUsernameModal(true);
          return;
        }
      }

      // User has username or check failed, proceed with upload
      await performUpload();
    } catch (error) {
      // If check fails, proceed with upload anyway
      await performUpload();
    }
  };

  const handleUsernameSuccess = async (username: string) => {
    setShowUsernameModal(false);
    setPendingUpload(false);

    // Now perform the upload
    await performUpload();
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-1">
          <input
            type="text"
            name="title"
            value={data.title}
            onChange={handleInputChange}
            placeholder="Image title"
            className="w-full text-3xl font-bold text-neutral-950 placeholder:text-neutral-400 border-none outline-none focus:outline-none p-0 bg-transparent"
          />
          {errors.title && (
            <p className="text-sm text-red-600">{errors.title}</p>
          )}
        </div>

        <div className="space-y-1">
          <textarea
            name="description"
            value={data.description}
            onChange={handleInputChange}
            placeholder="Tell your story…"
            className="w-full text-lg text-neutral-700 placeholder:text-neutral-400 border-none outline-none focus:outline-none p-0 bg-transparent min-h-[100px] resize-none"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="tags" className="text-sm font-medium text-neutral-900">Tags</label>
          <input
            type="text"
            name="tags"
            value={data.tags}
            onChange={handleInputChange}
            placeholder="nature, landscape, sunset"
            className="w-full text-lg text-neutral-700 placeholder:text-neutral-400 border-none outline-none focus:outline-none p-0 bg-transparent min-h-[50px] resize-none"
          />
        </div>

        <div className='space-y-1'>
          <label htmlFor="price" className="text-sm font-medium text-neutral-900">Price (USD)</label>
          <div className='flex items-center gap-2'>
            <span className="text-lg text-neutral-700">$</span>
            <input
              type="text"
              name="price"
              value={data.price}
              onChange={handleInputChange}
              placeholder="9.99"
              className="w-full text-lg text-neutral-700 placeholder:text-neutral-400 border-none outline-none focus:outline-none p-0 bg-transparent min-h-[50px] resize-none"
            />
          </div>

        </div>

        {isUploading && <ProgressBar progress={uploadProgress} />}

        {
          submitError && (
            <p className="text-sm text-red-600">{submitError}</p>
          )
        }

        <Button type="submit" disabled={isUploading} className="w-full">
          {isUploading ? 'Uploading...' : 'Upload Image'}
        </Button>
      </form >

      {showUsernameModal && walletAddress && (
        <UsernameClaimModal
          isOpen={showUsernameModal}
          onClose={() => setShowUsernameModal(false)}
          userAddress={walletAddress}
          onSuccess={handleUsernameSuccess}
        />
      )}
    </>
  );
}
