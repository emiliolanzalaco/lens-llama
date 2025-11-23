import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ProgressBar } from './progress-bar';

describe('ProgressBar', () => {
  it('renders with 0% progress', () => {
    const { container } = render(<ProgressBar progress={0} />);
    const bar = container.querySelector('.bg-neutral-950');
    expect(bar).toHaveStyle({ width: '0%' });
  });

  it('renders with 50% progress', () => {
    const { container } = render(<ProgressBar progress={50} />);
    const bar = container.querySelector('.bg-neutral-950');
    expect(bar).toHaveStyle({ width: '50%' });
  });

  it('renders with 100% progress', () => {
    const { container } = render(<ProgressBar progress={100} />);
    const bar = container.querySelector('.bg-neutral-950');
    expect(bar).toHaveStyle({ width: '100%' });
  });

  it('has correct background styling', () => {
    const { container } = render(<ProgressBar progress={50} />);
    const background = container.firstChild;
    expect(background).toHaveClass('bg-[#FDF6E3]');
    expect(background).toHaveClass('h-2');
  });
});
