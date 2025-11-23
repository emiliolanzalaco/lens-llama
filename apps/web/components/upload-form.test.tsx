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
const mockUpload = vi.fn();
vi.mock('@vercel/blob/client', () => ({
  upload: (...args: unknown[]) => mockUpload(...args),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Helper to get the hidden file input
const getFileInput = (container: HTMLElement) => {
  return container.querySelector('input[type="file"]') as HTMLInputElement;
};

describe('UploadForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock successful blob upload
    mockUpload.mockResolvedValue({ url: 'https://blob.vercel-storage.com/test.jpg' });
    // Mock successful fetch responses
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'test-id' }),
    });
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

  it('submits form successfully with valid data', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ hasUsername: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'test-id' }),
      });

    const { container } = render(<UploadForm />);

    // Create and select a file
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const input = getFileInput(container);
    fireEvent.change(input, { target: { files: [file] } });

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
      // Check blob upload was called
      expect(mockUpload).toHaveBeenCalled();
      // Check finalize endpoint was called
      expect(mockFetch).toHaveBeenCalledWith('/api/upload/finalize', expect.any(Object));
    });
  });

  it('shows error message when upload fails', async () => {
    // Mock username check success, then finalize failure
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ hasUsername: true }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Upload failed' }),
      });

    const { container } = render(<UploadForm />);

    // Create and select a file
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const input = getFileInput(container);
    fireEvent.change(input, { target: { files: [file] } });

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

  it('shows error message when blob upload fails', async () => {
    // Mock blob upload failure
    mockUpload.mockRejectedValueOnce(new Error('Blob upload failed'));

    // Mock username check success
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ hasUsername: true }),
    });

    const { container } = render(<UploadForm />);

    // Create and select a file
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const input = getFileInput(container);
    fireEvent.change(input, { target: { files: [file] } });

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
      expect(screen.getByText(/blob upload failed/i)).toBeInTheDocument();
    });
  });
});
