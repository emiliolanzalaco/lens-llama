import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UploadForm } from './upload-form';

// Test constants
const TEST_WALLET_ADDRESS = '0x1234567890123456789012345678901234567890';
const TEST_IMAGE_WIDTH = 1920;
const TEST_IMAGE_HEIGHT = 1080;
const VALID_TITLE = 'Test Image';
const VALID_PRICE = '9.99';
const INVALID_PRICE = '-5';
const TEST_BLOB_URL = 'https://blob.vercel-storage.com/test.jpg';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Mock useAuth hook
vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: () => ({
    walletAddress: TEST_WALLET_ADDRESS,
    getAccessToken: vi.fn().mockResolvedValue('test-access-token'),
  }),
}));

// Mock @vercel/blob/client
vi.mock('@vercel/blob/client', () => ({
  upload: vi.fn(),
}));

// Mock client image processing
vi.mock('@/lib/client-image-processing', () => ({
  getImageDimensions: vi.fn().mockResolvedValue({ width: 1920, height: 1080 }),
  createWatermarkedPreview: vi.fn().mockImplementation((file: File) =>
    Promise.resolve(new File(['watermarked'], 'watermarked-test.jpg', { type: 'image/jpeg' }))
  ),
}));

import { getImageDimensions, createWatermarkedPreview } from '@/lib/client-image-processing';

import { upload as mockUpload } from '@vercel/blob/client';

// Mock fetch for username check
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Test helpers
const getFileInput = (container: HTMLElement) => {
  return container.querySelector('input[type="file"]') as HTMLInputElement;
};

const createTestFile = (name = 'test.jpg', type = 'image/jpeg') => {
  return new File(['test'], name, { type });
};

const selectFile = async (container: HTMLElement, file: File) => {
  const input = getFileInput(container);
  fireEvent.change(input, { target: { files: [file] } });

  // Wait for image processing
  await waitFor(() => {
    expect(screen.getByRole('button', { name: /upload image/i })).not.toBeDisabled();
  });
};

const fillFormField = (label: RegExp, value: string) => {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
};

const submitForm = () => {
  fireEvent.click(screen.getByRole('button', { name: /upload image/i }));
};

describe('UploadForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockImplementation(async (url: string) => {
      if (url.includes('/api/username/check-user')) {
        return {
          ok: true,
          json: async () => ({ hasUsername: true }),
        } as Response;
      }
      if (url.includes('/api/upload/complete')) {
        return {
          ok: true,
          json: async () => ({ id: 'test-id' }),
        } as Response;
      }
      return { ok: false } as Response;
    });
    vi.mocked(mockUpload).mockResolvedValue({
      url: TEST_BLOB_URL,
      pathname: 'test.jpg',
    } as any);
  });

  it('renders all form fields', () => {
    // Arrange & Act
    render(<UploadForm />);

    // Assert
    expect(screen.getByText(/^image$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^title$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/tags/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/price/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /upload image/i })).toBeInTheDocument();
  });

  it('shows validation error when title is empty', async () => {
    // Arrange
    const { container } = render(<UploadForm />);
    await selectFile(container, createTestFile());
    fillFormField(/price/i, VALID_PRICE);

    // Act
    submitForm();

    // Assert
    await waitFor(() => {
      expect(screen.getByText(/title is required/i)).toBeInTheDocument();
    });
  });

  it('shows validation error for invalid price', async () => {
    // Arrange
    const { container } = render(<UploadForm />);
    await selectFile(container, createTestFile());
    fillFormField(/^title$/i, VALID_TITLE);
    fillFormField(/price/i, INVALID_PRICE);

    // Act
    submitForm();

    // Assert
    await waitFor(() => {
      expect(screen.getByText(/price must be greater than zero/i)).toBeInTheDocument();
    });
  });

  it('shows error when no file is selected', async () => {
    // Arrange
    render(<UploadForm />);
    fillFormField(/^title$/i, VALID_TITLE);
    fillFormField(/price/i, VALID_PRICE);

    // Act
    submitForm();

    // Assert
    await waitFor(() => {
      expect(screen.getByText(/image is required/i)).toBeInTheDocument();
    });
  });

  it('rejects invalid file types', async () => {
    // Arrange
    const { container } = render(<UploadForm />);
    const input = getFileInput(container);

    // Act
    fireEvent.change(input, { target: { files: [createTestFile('test.pdf', 'application/pdf')] } });

    // Assert
    await waitFor(() => {
      expect(screen.getByText(/invalid file type/i)).toBeInTheDocument();
    });
  });

  it('shows error message when upload fails', async () => {
    // Arrange
    vi.mocked(mockUpload).mockRejectedValue(new Error('Upload failed'));
    const { container } = render(<UploadForm />);
    await selectFile(container, createTestFile());
    fillFormField(/^title$/i, VALID_TITLE);
    fillFormField(/price/i, VALID_PRICE);

    // Act
    submitForm();

    // Assert
    await waitFor(() => {
      expect(screen.getByText(/upload failed/i)).toBeInTheDocument();
    });
  });

  it('shows uploading state during upload', async () => {
    // Arrange
    let resolveUpload: (value: { url: string }) => void = () => {};
    const uploadPromise = new Promise<{ url: string }>((resolve) => {
      resolveUpload = resolve;
    });
    vi.mocked(mockUpload).mockReturnValue(uploadPromise);

    const { container } = render(<UploadForm />);
    await selectFile(container, createTestFile());
    fillFormField(/^title$/i, VALID_TITLE);
    fillFormField(/price/i, VALID_PRICE);

    // Act
    submitForm();

    // Assert
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /uploading/i })).toBeInTheDocument();
    });

    resolveUpload({ url: TEST_BLOB_URL });
  });

  it('shows error when watermark creation fails during file selection', async () => {
    // Arrange
    vi.mocked(createWatermarkedPreview).mockRejectedValueOnce(
      new Error('Canvas context unavailable')
    );
    const { container } = render(<UploadForm />);
    const input = getFileInput(container);

    // Act
    fireEvent.change(input, { target: { files: [createTestFile()] } });

    // Assert
    await waitFor(() => {
      expect(screen.getByText(/failed to process image/i)).toBeInTheDocument();
    });
  });

  it('extracts dimensions and creates watermarked file when valid image is selected', async () => {
    // Arrange
    const { container } = render(<UploadForm />);
    const testFile = createTestFile();
    const input = getFileInput(container);

    // Act
    fireEvent.change(input, { target: { files: [testFile] } });

    // Assert - verify image processing functions were called
    await waitFor(() => {
      expect(getImageDimensions).toHaveBeenCalledWith(testFile);
      expect(createWatermarkedPreview).toHaveBeenCalledWith(testFile, {
        width: TEST_IMAGE_WIDTH,
        height: TEST_IMAGE_HEIGHT,
      });
    });

    // Verify button is enabled after processing
    expect(screen.getByRole('button', { name: /upload image/i })).not.toBeDisabled();
  });
});
