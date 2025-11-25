import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UploadForm } from './upload-form';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Mock useAuth hook
vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: () => ({
    walletAddress: '0x1234567890123456789012345678901234567890',
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

import { upload as mockUpload } from '@vercel/blob/client';

// Mock fetch for username check
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Helper to get the hidden file input
const getFileInput = (container: HTMLElement) => {
  return container.querySelector('input[type="file"]') as HTMLInputElement;
};

describe('UploadForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ hasUsername: true }),
    });
    vi.mocked(mockUpload).mockResolvedValue({
      url: 'https://blob.vercel-storage.com/test.jpg',
      pathname: 'test.jpg',
    } as any);
  });

  it('renders all form fields', () => {
    render(<UploadForm />);

    expect(screen.getByText(/^image$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^title$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/tags/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/price/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /upload image/i })).toBeInTheDocument();
  });

  it('shows validation error when title is empty', async () => {
    const { container } = render(<UploadForm />);

    // Create and select a file
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const input = getFileInput(container);
    fireEvent.change(input, { target: { files: [file] } });

    // Wait for image processing to complete
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /upload image/i })).not.toBeDisabled();
    });

    // Fill price but not title
    fireEvent.change(screen.getByLabelText(/price/i), {
      target: { value: '10' },
    });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /upload image/i }));

    await waitFor(() => {
      expect(screen.getByText(/title is required/i)).toBeInTheDocument();
    });
  });

  it('shows validation error for invalid price', async () => {
    const { container } = render(<UploadForm />);

    // Create and select a file
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const input = getFileInput(container);
    fireEvent.change(input, { target: { files: [file] } });

    // Wait for image processing to complete
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /upload image/i })).not.toBeDisabled();
    });

    // Fill form with invalid price
    fireEvent.change(screen.getByLabelText(/^title$/i), {
      target: { value: 'Test Image' },
    });
    fireEvent.change(screen.getByLabelText(/price/i), {
      target: { value: '-5' },
    });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /upload image/i }));

    await waitFor(() => {
      expect(screen.getByText(/price must be a positive number/i)).toBeInTheDocument();
    });
  });

  it('shows error when no file is selected', async () => {
    render(<UploadForm />);

    // Fill form without selecting file
    fireEvent.change(screen.getByLabelText(/^title$/i), {
      target: { value: 'Test Image' },
    });
    fireEvent.change(screen.getByLabelText(/price/i), {
      target: { value: '10' },
    });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /upload image/i }));

    await waitFor(() => {
      expect(screen.getByText(/image is required/i)).toBeInTheDocument();
    });
  });

  it('rejects invalid file types', async () => {
    const { container } = render(<UploadForm />);

    // Try to select a PDF file
    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    const input = getFileInput(container);
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/invalid file type/i)).toBeInTheDocument();
    });
  });

  it('shows error message when upload fails', async () => {
    vi.mocked(mockUpload).mockRejectedValue(new Error('Upload failed'));

    const { container } = render(<UploadForm />);

    // Create and select a file
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const input = getFileInput(container);
    fireEvent.change(input, { target: { files: [file] } });

    // Wait for image processing to complete
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /upload image/i })).not.toBeDisabled();
    });

    // Fill form
    fireEvent.change(screen.getByLabelText(/^title$/i), {
      target: { value: 'Test Image' },
    });
    fireEvent.change(screen.getByLabelText(/price/i), {
      target: { value: '9.99' },
    });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /upload image/i }));

    await waitFor(() => {
      expect(screen.getByText(/upload failed/i)).toBeInTheDocument();
    });
  });

  it('shows uploading state during upload', async () => {
    // Make upload hang to test loading state
    vi.mocked(mockUpload).mockImplementation(() => new Promise(() => {}));

    const { container } = render(<UploadForm />);

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const input = getFileInput(container);
    fireEvent.change(input, { target: { files: [file] } });

    // Wait for image processing to complete
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /upload image/i })).not.toBeDisabled();
    });

    fireEvent.change(screen.getByLabelText(/^title$/i), {
      target: { value: 'Test Image' },
    });
    fireEvent.change(screen.getByLabelText(/price/i), {
      target: { value: '9.99' },
    });

    fireEvent.click(screen.getByRole('button', { name: /upload image/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /uploading/i })).toBeDisabled();
    });
  });
});
