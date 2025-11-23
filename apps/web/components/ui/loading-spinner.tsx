interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
};

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  return (
    <div className={`absolute inset-0 flex items-center justify-center bg-[#FDF6E3] ${className}`}>
      <div className={`${sizeClasses[size]} animate-spin rounded-full border-2 border-black/20 border-t-black`} />
    </div>
  );
}
