import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ImageCard from './image-card';

describe('ImageCard', () => {
  const mockImage = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    watermarkedCid: 'QmYxT4LnK8sqLupjbS6eRvu1si7Ly2wFQAqFebxhWntcf6',
    title: 'Sunset over Mountains',
    description: 'A beautiful sunset',
    priceUsdc: '5.00',
    size: 'small' as const,
  };

  const mockOnClick = vi.fn();

  it('renders image with correct Filecoin API URL', () => {
    render(<ImageCard image={mockImage} onClick={mockOnClick} />);
    const image = screen.getByAltText('Sunset over Mountains');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute(
      'src',
      expect.stringContaining('/api/filecoin-image?cid=')
    );
  });

  it('links to correct detail page', () => {
    render(<ImageCard image={mockImage} onClick={mockOnClick} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/images/550e8400-e29b-41d4-a716-446655440001');
  });

  it('applies small grid classes', () => {
    render(<ImageCard image={{ ...mockImage, size: 'small' }} onClick={mockOnClick} />);
    const link = screen.getByRole('link');
    expect(link).toHaveClass('row-span-1', 'col-span-1');
  });

  it('applies tall grid classes', () => {
    render(<ImageCard image={{ ...mockImage, size: 'tall' }} onClick={mockOnClick} />);
    const link = screen.getByRole('link');
    expect(link).toHaveClass('row-span-2', 'col-span-1');
  });

  it('applies wide grid classes', () => {
    render(<ImageCard image={{ ...mockImage, size: 'wide' }} onClick={mockOnClick} />);
    const link = screen.getByRole('link');
    expect(link).toHaveClass('row-span-1', 'col-span-2');
  });

  it('applies large grid classes', () => {
    render(<ImageCard image={{ ...mockImage, size: 'large' }} onClick={mockOnClick} />);
    const link = screen.getByRole('link');
    expect(link).toHaveClass('row-span-2', 'col-span-2');
  });

  it('has gray background color', () => {
    render(<ImageCard image={mockImage} onClick={mockOnClick} />);
    const link = screen.getByRole('link');
    expect(link).toHaveClass('bg-gray-200');
  });

  it('has test id for testing', () => {
    render(<ImageCard image={mockImage} onClick={mockOnClick} />);
    const card = screen.getByTestId('image-card');
    expect(card).toBeInTheDocument();
  });
});
