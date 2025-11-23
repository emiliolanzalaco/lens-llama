'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { useAuth } from '@/lib/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { ProgressBar } from '@/components/ui/progress-bar';
import { GradientAIButton } from '@/components/ui/ai-button';
import { generateDescription } from '@/app/actions/generate-description';

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

  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
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
    onChange({ ...data, [name]: value });
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleGenerateDescription = async () => {
    setIsGeneratingAI(true);
    try {
      // Create a temporary URL for the file to send to the server (or handle upload there)
      // For the skeleton/mock, we just pass a string. In reality, we might need to upload to blob storage first
      // or send the file content. For now, we'll simulate it.
      const imageUrl = URL.createObjectURL(file);
      const description = await generateDescription(imageUrl);
      onChange({ ...data, description });
    } catch (err) {
      console.error('Failed to generate description:', err);
    } finally {
      setIsGeneratingAI(false);
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
        const responseData = await response.json();
        throw new Error(responseData.error || 'Upload failed');
      }

      setUploadProgress(100);
      onUploadSuccess();

      // Optional: Redirect if it was the last image, but parent handles flow now.
      // setTimeout(() => router.push('/'), 500); 
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'Upload failed'
      );
      setIsUploading(false);
      setUploadProgress(0);
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
        <FormField
          label="Title"
          name="title"
          value={data.title}
          onChange={handleInputChange}
          error={errors.title}
          placeholder="Enter image title"
        />

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-neutral-950">
              Description
            </label>
            <GradientAIButton
              onClick={handleGenerateDescription}
              isLoading={isGeneratingAI}
              size="sm"
            />
          </div>
          <textarea
            name="description"
            value={data.description}
            onChange={handleInputChange}
            placeholder="Describe your image"
            className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm placeholder:text-neutral-500 focus:border-neutral-950 focus:outline-none focus:ring-1 focus:ring-neutral-950 min-h-[100px]"
          />
        </div>

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
      );
}
