interface FormFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  error?: string;
  placeholder?: string;
  optional?: boolean;
  multiline?: boolean;
  rows?: number;
}

export function FormField({
  label,
  name,
  value,
  onChange,
  error,
  placeholder,
  optional = false,
  multiline = false,
  rows = 3,
}: FormFieldProps) {
  const inputClasses =
    'w-full bg-[#FDF6E3] px-4 py-3 text-neutral-950 placeholder-neutral-400 focus:outline-none';

  return (
    <div>
      <label
        htmlFor={name}
        className="block text-sm font-medium text-neutral-950 mb-2"
      >
        {label}
        {optional && (
          <span className="text-neutral-400 font-normal"> (optional)</span>
        )}
      </label>
      {multiline ? (
        <textarea
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          rows={rows}
          className={`${inputClasses} resize-none`}
          placeholder={placeholder}
        />
      ) : (
        <input
          type="text"
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          className={inputClasses}
          placeholder={placeholder}
        />
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
