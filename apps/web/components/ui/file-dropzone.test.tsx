import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FileDropzone } from './file-dropzone';

describe('FileDropzone', () => {
  it('renders default state with upload instructions', () => {
    const onFileSelect = vi.fn();
    render(<FileDropzone onFileSelect={onFileSelect} />);

    expect(screen.getByText('Drag and drop or click to upload')).toBeInTheDocument();
    expect(screen.getByText('JPEG, PNG, WebP up to 4MB')).toBeInTheDocument();
  });

  it('displays preview when provided', () => {
    const onFileSelect = vi.fn();
    render(
      <FileDropzone
        onFileSelect={onFileSelect}
        preview="data:image/png;base64,test"
      />
    );

    const img = screen.getByAltText('Preview');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'data:image/png;base64,test');
  });

  it('displays error message when provided', () => {
    const onFileSelect = vi.fn();
    render(
      <FileDropzone
        onFileSelect={onFileSelect}
        error="Invalid file type"
      />
    );

    expect(screen.getByText('Invalid file type')).toBeInTheDocument();
  });

  it('calls onFileSelect when file is selected via input', () => {
    const onFileSelect = vi.fn();
    render(<FileDropzone onFileSelect={onFileSelect} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

    fireEvent.change(input, { target: { files: [file] } });

    expect(onFileSelect).toHaveBeenCalledWith(file);
  });

  it('calls onFileSelect when file is dropped', () => {
    const onFileSelect = vi.fn();
    render(<FileDropzone onFileSelect={onFileSelect} />);

    const dropzone = screen.getByTestId('dropzone');
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

    fireEvent.drop(dropzone, {
      dataTransfer: { files: [file] },
    });

    expect(onFileSelect).toHaveBeenCalledWith(file);
  });

  it('indicates drag state on dragover', () => {
    const onFileSelect = vi.fn();
    render(<FileDropzone onFileSelect={onFileSelect} />);

    const dropzone = screen.getByTestId('dropzone');

    fireEvent.dragOver(dropzone);
    expect(dropzone).toHaveAttribute('data-dragging', 'true');
  });

  it('clears drag state on dragleave', () => {
    const onFileSelect = vi.fn();
    render(<FileDropzone onFileSelect={onFileSelect} />);

    const dropzone = screen.getByTestId('dropzone');

    fireEvent.dragOver(dropzone);
    fireEvent.dragLeave(dropzone);

    expect(dropzone).toHaveAttribute('data-dragging', 'false');
  });

  it('opens file dialog on click', () => {
    const onFileSelect = vi.fn();
    render(<FileDropzone onFileSelect={onFileSelect} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(input, 'click');

    const dropzone = screen.getByTestId('dropzone');
    fireEvent.click(dropzone);

    expect(clickSpy).toHaveBeenCalled();
  });
});
