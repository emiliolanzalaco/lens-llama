import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FormField } from './form-field';

describe('FormField', () => {
  it('renders label and input', () => {
    const onChange = vi.fn();
    render(
      <FormField
        label="Title"
        name="title"
        value=""
        onChange={onChange}
      />
    );

    expect(screen.getByLabelText('Title')).toBeInTheDocument();
  });

  it('displays optional indicator when optional prop is true', () => {
    const onChange = vi.fn();
    render(
      <FormField
        label="Description"
        name="description"
        value=""
        onChange={onChange}
        optional
      />
    );

    expect(screen.getByText('(optional)')).toBeInTheDocument();
  });

  it('renders textarea when multiline is true', () => {
    const onChange = vi.fn();
    render(
      <FormField
        label="Description"
        name="description"
        value=""
        onChange={onChange}
        multiline
      />
    );

    const textarea = screen.getByRole('textbox');
    expect(textarea.tagName).toBe('TEXTAREA');
  });

  it('renders input when multiline is false', () => {
    const onChange = vi.fn();
    render(
      <FormField
        label="Title"
        name="title"
        value=""
        onChange={onChange}
      />
    );

    const input = screen.getByRole('textbox');
    expect(input.tagName).toBe('INPUT');
  });

  it('displays error message when provided', () => {
    const onChange = vi.fn();
    render(
      <FormField
        label="Title"
        name="title"
        value=""
        onChange={onChange}
        error="Title is required"
      />
    );

    expect(screen.getByText('Title is required')).toBeInTheDocument();
  });

  it('calls onChange when value changes', () => {
    const onChange = vi.fn();
    render(
      <FormField
        label="Title"
        name="title"
        value=""
        onChange={onChange}
      />
    );

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'New Title' } });

    expect(onChange).toHaveBeenCalled();
  });

  it('displays placeholder text', () => {
    const onChange = vi.fn();
    render(
      <FormField
        label="Title"
        name="title"
        value=""
        onChange={onChange}
        placeholder="Enter title"
      />
    );

    expect(screen.getByPlaceholderText('Enter title')).toBeInTheDocument();
  });

  it('shows current value', () => {
    const onChange = vi.fn();
    render(
      <FormField
        label="Title"
        name="title"
        value="My Image"
        onChange={onChange}
      />
    );

    expect(screen.getByDisplayValue('My Image')).toBeInTheDocument();
  });
});
