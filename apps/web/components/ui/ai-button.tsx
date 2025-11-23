import { Button, buttonVariants } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type VariantProps } from 'class-variance-authority';

interface GradientAIButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    isLoading?: boolean;
    loadingText?: string;
    children?: React.ReactNode;
}

export function GradientAIButton({
    className,
    isLoading,
    loadingText = 'Generating...',
    children,
    variant,
    size,
    ...props
}: GradientAIButtonProps) {
    return (
        <Button
            type="button"
            variant={variant}
            size={size}
            className={cn(
                "relative overflow-hidden border-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-md transition-all hover:opacity-90 hover:shadow-lg disabled:opacity-70",
                className
            )}
            disabled={isLoading}
            {...props}
        >
            <div className="relative z-10 flex items-center gap-2">
                {isLoading ? (
                    <>
                        <Sparkles className="h-4 w-4 animate-spin" />
                        <span>{loadingText}</span>
                    </>
                ) : (
                    <>
                        <Sparkles className="h-4 w-4" />
                        <span>{children}</span>
                    </>
                )}
            </div>
        </Button>
    );
}
