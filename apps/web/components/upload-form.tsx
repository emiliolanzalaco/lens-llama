'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { upload } from '@vercel/blob/client';
import { z } from 'zod';
import { useAuth } from '@/lib/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { FileDropzone } from '@/components/ui/file-dropzone';
import { FormField } from '@/components/ui/form-field';
import { ProgressBar } from '@/components/ui/progress-bar';
import { UsernameClaimModal } from '@/components/username-claim-modal';
import {
  getImageDimensions,
  createWatermarkedPreview,
  type ImageDimensions,
} from '@/lib/client-image-processing';

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
  const [dimensions, setDimensions] = useState<ImageDimensions | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
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

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    const error = validateFile(selectedFile);
    if (error) {
      setErrors((prev) => ({ ...prev, file: error }));
      return;
    }

    setFile(selectedFile);
    setDimensions(null);
    setIsProcessingImage(true);
    setErrors((prev) => ({ ...prev, file: undefined }));

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(selectedFile);

    // Extract dimensions
    try {
      const dims = await getImageDimensions(selectedFile);
      setDimensions(dims);
    } catch (err) {
      console.error('Failed to extract dimensions:', err);
      setErrors((prev) => ({ ...prev, file: 'Failed to process image' }));
    } finally {
      setIsProcessingImage(false);
    }
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const performUpload = async () => {
    if (!file || !walletAddress || !dimensions) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Create watermarked preview
      setUploadProgress(10);
      const watermarkedFile = await createWatermarkedPreview(file, dimensions);

      // Prepare metadata to send with the upload
      const metadata = {
        title: formData.title,
        description: formData.description || null,
        tags: formData.tags,
        price: formData.price,
        photographerAddress: walletAddress,
        width: dimensions.width,
        height: dimensions.height,
      };

      setUploadProgress(20);

      // Upload original and watermarked files to Vercel Blob from the client
      // The server validates metadata and generates the upload token
      const [originalBlob, watermarkedBlob] = await Promise.all([
        upload(file.name, file, {
          access: 'public',
          handleUploadUrl: '/api/upload',
          clientPayload: JSON.stringify({ ...metadata, type: 'original' }),
          onUploadProgress: ({ percentage }) => {
            setUploadProgress(20 + percentage * 0.4); // 20-60%
          },
        }),
        upload(watermarkedFile.name, watermarkedFile, {
          access: 'public',
          handleUploadUrl: '/api/upload',
          clientPayload: JSON.stringify({ ...metadata, type: 'watermarked' }),
          onUploadProgress: ({ percentage }) => {
            setUploadProgress(60 + percentage * 0.4); // 60-100%
          },
        }),
      ]);

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

  const handleUsernameSuccess = async (username: string) => {
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

        <Button
          type="submit"
          disabled={isUploading || isProcessingImage}
          className="w-full"
        >
          {isUploading ? 'Uploading...' : isProcessingImage ? 'Processing...' : 'Upload Image'}
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
