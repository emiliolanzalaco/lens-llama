import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ImageCard from './image-card';

describe('ImageCard', () => {
  const mockProps = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    watermarkedCid: 'QmYxT4LnK8sqLupjbS6eRvu1si7Ly2wFQAqFebxhWntcf6',
    title: 'Sunset over Mountains',
    priceUsdc: '5.00',
    size: 'small' as const,
  };

  it('renders image with correct IPFS URL', () => {
    render(<ImageCard {...mockProps} />);
    const image = screen.getByAltText('Sunset over Mountains');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute(
      'src',
      expect.stringContaining('QmYxT4LnK8sqLupjbS6eRvu1si7Ly2wFQAqFebxhWntcf6')
    );
  });

  it('renders title and price', () => {
    render(<ImageCard {...mockProps} />);
    expect(screen.getByText('Sunset over Mountains')).toBeInTheDocument();
    expect(screen.getByText('$5.00')).toBeInTheDocument();
  });

  it('links to correct detail page', () => {
    render(<ImageCard {...mockProps} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/image/550e8400-e29b-41d4-a716-446655440001');
  });

  it('applies small grid classes', () => {
    render(<ImageCard {...mockProps} size="small" />);
    const link = screen.getByRole('link');
    expect(link).toHaveClass('row-span-1', 'col-span-1');
  });

  it('applies tall grid classes', () => {
    render(<ImageCard {...mockProps} size="tall" />);
    const link = screen.getByRole('link');
    expect(link).toHaveClass('row-span-2', 'col-span-1');
  });

  it('applies wide grid classes', () => {
    render(<ImageCard {...mockProps} size="wide" />);
    const link = screen.getByRole('link');
    expect(link).toHaveClass('row-span-1', 'col-span-2');
  });

  it('applies large grid classes', () => {
    render(<ImageCard {...mockProps} size="large" />);
    const link = screen.getByRole('link');
    expect(link).toHaveClass('row-span-2', 'col-span-2');
  });

  it('has cream background color', () => {
    render(<ImageCard {...mockProps} />);
    const link = screen.getByRole('link');
    expect(link).toHaveClass('bg-[#FDF6E3]');
  });

  it('has hover scale effect', () => {
    render(<ImageCard {...mockProps} />);
    const link = screen.getByRole('link');
    expect(link).toHaveClass('hover:scale-105');
  });

  it('truncates long titles', () => {
    const longTitle = 'This is a very long title that should be truncated to fit in one line';
    render(<ImageCard {...mockProps} title={longTitle} />);
    const titleElement = screen.getByText(longTitle);
    expect(titleElement).toHaveClass('truncate');
  });

  it('formats price with dollar sign', () => {
    render(<ImageCard {...mockProps} priceUsdc="10.50" />);
    expect(screen.getByText('$10.50')).toBeInTheDocument();
  });

  it('uses cream background for info section', () => {
    const { container } = render(<ImageCard {...mockProps} />);
    const infoSection = container.querySelector('.bg-\\[\\#FDF6E3\\]');
    expect(infoSection).toBeInTheDocument();
  });
});
