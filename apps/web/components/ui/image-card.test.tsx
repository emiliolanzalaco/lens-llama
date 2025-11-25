import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ImageCard from './image-card';

describe('ImageCard', () => {
  const mockImage = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    watermarkedBlobUrl: 'https://blob.vercel-storage.com/test-image.jpg',
    originalBlobUrl: 'https://blob.vercel-storage.com/test-original.jpg',
    photographerAddress: '0x1234567890123456789012345678901234567890',
    title: 'Sunset over Mountains',
    description: 'A beautiful sunset',
    priceUsdc: '5.00',
    width: 1920,
    height: 1080,
  };

  const mockOnClick = vi.fn();

  it('renders image with correct blob URL', () => {
    render(<ImageCard image={mockImage} onClick={mockOnClick} />);
    const image = screen.getByAltText('Sunset over Mountains');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute(
      'src',
      expect.stringContaining('blob.vercel-storage.com')
    );
  });

  it('links to correct detail page', () => {
    render(<ImageCard image={mockImage} onClick={mockOnClick} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/images/550e8400-e29b-41d4-a716-446655440001');
  });

  it('uses break-inside-avoid for masonry layout', () => {
    render(<ImageCard image={mockImage} onClick={mockOnClick} />);
    const link = screen.getByRole('link');
    expect(link).toHaveClass('break-inside-avoid');
  });

  it('renders portrait image with correct aspect ratio', () => {
    const portraitImage = { ...mockImage, width: 1080, height: 1920 };
    render(<ImageCard image={portraitImage} onClick={mockOnClick} />);
    const card = screen.getByTestId('image-card');
    const aspectRatioDiv = card.querySelector('div[style]');
    expect(aspectRatioDiv).toHaveStyle({ aspectRatio: '1080/1920' });
  });

  it('renders landscape image with correct aspect ratio', () => {
    const landscapeImage = { ...mockImage, width: 1920, height: 1080 };
    render(<ImageCard image={landscapeImage} onClick={mockOnClick} />);
    const card = screen.getByTestId('image-card');
    const aspectRatioDiv = card.querySelector('div[style]');
    expect(aspectRatioDiv).toHaveStyle({ aspectRatio: '1920/1080' });
  });

  it('falls back to 1/1 aspect ratio when height is zero', () => {
    const zeroHeightImage = { ...mockImage, width: 1920, height: 0 };
    render(<ImageCard image={zeroHeightImage} onClick={mockOnClick} />);
    const card = screen.getByTestId('image-card');
    const aspectRatioDiv = card.querySelector('div[style]');
    expect(aspectRatioDiv).toHaveStyle({ aspectRatio: '1/1' });
  });

  it('has test id for testing', () => {
    render(<ImageCard image={mockImage} onClick={mockOnClick} />);
    const card = screen.getByTestId('image-card');
    expect(card).toBeInTheDocument();
  });
});
