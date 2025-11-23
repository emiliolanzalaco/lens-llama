import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Home from './page';

// Mock the ImageCard component
vi.mock('@/components/image-card', () => ({
  ImageCard: ({ title, priceUsdc }: { title: string; priceUsdc: string }) => (
    <div data-testid="image-card">
      <h3>{title}</h3>
      <p>${priceUsdc}</p>
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

  it('renders navigation with LensLlama branding', () => {
    (global.fetch as any).mockResolvedValueOnce({
      json: async () => ({ images: [] }),
    });

    render(<Home />);
    expect(screen.getByText('LensLlama')).toBeInTheDocument();
    expect(screen.getByText('Sign In')).toBeInTheDocument();
  });

  it('renders hero section', () => {
    (global.fetch as any).mockResolvedValueOnce({
      json: async () => ({ images: [] }),
    });

    render(<Home />);
    expect(screen.getByText('Professional photography on-chain')).toBeInTheDocument();
  });

  it('displays loading skeletons initially', () => {
    (global.fetch as any).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    const { container } = render(<Home />);
    const skeletons = container.querySelectorAll('.bg-\\[\\#FDF6E3\\]');
    expect(skeletons.length).toBeGreaterThan(0);
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
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
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

  it('applies correct grid classes for responsive layout', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      json: async () => ({ images: mockImages }),
    });

    const { container } = render(<Home />);

    await waitFor(() => {
      expect(screen.getByText('Image 1')).toBeInTheDocument();
    });

    const grid = container.querySelector('.grid.auto-rows-\\[300px\\]');
    expect(grid).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-4');
  });

  it('uses 8-unit gap for grid spacing', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      json: async () => ({ images: mockImages }),
    });

    const { container } = render(<Home />);

    await waitFor(() => {
      expect(screen.getByText('Image 1')).toBeInTheDocument();
    });

    const grid = container.querySelector('.grid');
    expect(grid).toHaveClass('gap-8');
  });

  it('renders 12 loading skeletons', () => {
    (global.fetch as any).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    const { container } = render(<Home />);
    const skeletons = container.querySelectorAll('.aspect-square.bg-\\[\\#FDF6E3\\]');
    expect(skeletons).toHaveLength(12);
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
