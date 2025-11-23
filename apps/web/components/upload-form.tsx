'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { upload } from '@vercel/blob/client';
import { useAuth } from '@/lib/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { FileDropzone } from '@/components/ui/file-dropzone';
import { FormField } from '@/components/ui/form-field';
import { ProgressBar } from '@/components/ui/progress-bar';
import { UsernameClaimModal } from '@/components/username-claim-modal';

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

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [pendingUpload, setPendingUpload] = useState(false);

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

    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(selectedFile);
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const performUpload = async () => {
    if (!file || !walletAddress) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Step 1: Upload directly to Vercel Blob (bypasses 4.5MB limit)
      const blob = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/upload/get-url',
        onUploadProgress: (progress) => {
          // First 50% is blob upload
          setUploadProgress(Math.round(progress.percentage * 0.5));
        },
      });

      // Step 2: Call finalize endpoint to process and upload to Filecoin
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 5, 95));
      }, 500);

      const response = await fetch('/api/upload/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blobUrl: blob.url,
          title: formData.title,
          description: formData.description,
          tags: formData.tags,
          price: formData.price,
          photographerAddress: walletAddress,
        }),
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Upload failed');
      }

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

  const handleUsernameSuccess = async (username: string, ensName: string) => {
    setShowUsernameModal(false);
    setPendingUpload(false);

    // Now perform the upload
    await performUpload();
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        <FileDropzone
          onFileSelect={handleFileSelect}
          preview={preview}
          error={errors.file}
        />

        <FormField
          label="Title"
          name="title"
          value={formData.title}
          onChange={handleInputChange}
          error={errors.title}
          placeholder="Enter image title"
        />

        <FormField
          label="Description"
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          placeholder="Describe your image"
          optional
          multiline
        />

        <FormField
          label="Tags"
          name="tags"
          value={formData.tags}
          onChange={handleInputChange}
          placeholder="nature, landscape, sunset"
          optional
        />

        <FormField
          label="Price (USDC)"
          name="price"
          value={formData.price}
          onChange={handleInputChange}
          error={errors.price}
          placeholder="9.99"
        />

        {isUploading && <ProgressBar progress={uploadProgress} />}

        {submitError && (
          <p className="text-sm text-red-600">{submitError}</p>
        )}

        <Button type="submit" disabled={isUploading} className="w-full">
          {isUploading ? 'Uploading...' : 'Upload Image'}
        </Button>
      </form>

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
