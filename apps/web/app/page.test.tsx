import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Home from './page';

// Mock the ImageGrid component
vi.mock('@/components/image-grid', () => ({
  default: ({ images, onImageClick }: any) => (
    <div data-testid="image-grid">
      {images.map((img: any) => (
        <div key={img.id} data-testid="image-card" onClick={() => onImageClick(img)}>
          <h3>{img.title}</h3>
          <p>${img.priceUsdc}</p>
        </div>
      ))}
    </div>
  ),
}));

// Mock fetch
global.fetch = vi.fn();

describe('Home Page', () => {
  const mockImages = [
    {
      id: '1',
      watermarkedCid: 'QmTest1',
      title: 'Image 1',
      priceUsdc: '5.00',
      photographerAddress: '0x1111',
    },
    {
      id: '2',
      watermarkedCid: 'QmTest2',
      title: 'Image 2',
      priceUsdc: '10.00',
      photographerAddress: '0x2222',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches images from API on mount', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      json: async () => ({ images: mockImages }),
    });

    render(<Home />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/images?limit=30');
    });
  });

  it('renders image cards after loading', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      json: async () => ({ images: mockImages }),
    });

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText('Image 1')).toBeInTheDocument();
      expect(screen.getByText('Image 2')).toBeInTheDocument();
    });
  });

  it('assigns bento sizes to images', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      json: async () => ({ images: mockImages }),
    });

    render(<Home />);

    await waitFor(() => {
      const imageCards = screen.getAllByTestId('image-card');
      expect(imageCards).toHaveLength(2);
    });
  });

  it('handles fetch errors gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    render(<Home />);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to fetch images:',
        expect.any(Error)
      );
    });

    consoleErrorSpy.mockRestore();
  });

  it('stops showing loading state after fetch completes', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      json: async () => ({ images: mockImages }),
    });

    const { container } = render(<Home />);

    await waitFor(() => {
      expect(screen.getByText('Image 1')).toBeInTheDocument();
    });

    // Loading skeletons should be gone
    const loadingGrid = container.querySelector('.grid.grid-cols-1.gap-8.md\\:grid-cols-2');
    expect(loadingGrid).not.toBeInTheDocument();
  });

  it('repeats size pattern correctly for multiple images', async () => {
    const manyImages = Array.from({ length: 12 }, (_, i) => ({
      id: `${i}`,
      watermarkedCid: `QmTest${i}`,
      title: `Image ${i}`,
      priceUsdc: '5.00',
      photographerAddress: '0x1111',
    }));

    (global.fetch as any).mockResolvedValueOnce({
      json: async () => ({ images: manyImages }),
    });

    render(<Home />);

    await waitFor(() => {
      const imageCards = screen.getAllByTestId('image-card');
      expect(imageCards).toHaveLength(12);
    });
  });
});
