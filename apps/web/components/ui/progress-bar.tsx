interface ProgressBarProps {
  progress: number;
}

export function ProgressBar({ progress }: ProgressBarProps) {
  return (
    <div className="w-full bg-[#FDF6E3] h-2">
      <div
        className="bg-neutral-950 h-2 transition-all duration-200"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
