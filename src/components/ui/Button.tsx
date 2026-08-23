import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils/cn';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading = false, children, disabled, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mocha-blue/50 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] select-none rounded-lg';

    const variants = {
      primary:
        'bg-mocha-blue text-mocha-crust font-semibold hover:bg-mocha-sapphire hover:shadow-glow-cyan',
      secondary:
        'bg-mocha-surface0 text-mocha-text hover:bg-mocha-surface1 border border-mocha-surface1',
      outline:
        'border border-mocha-surface1 text-mocha-text hover:bg-mocha-surface0 hover:border-mocha-blue/50',
      ghost:
        'text-mocha-subtext0 hover:text-mocha-text hover:bg-mocha-surface0/60',
      danger:
        'bg-mocha-red/20 text-mocha-red hover:bg-mocha-red/30 border border-mocha-red/40',
    };

    const sizes = {
      sm: 'text-xs px-2.5 py-1.5 gap-1.5 h-8',
      md: 'text-sm px-4 py-2 gap-2 h-9',
      lg: 'text-base px-6 py-2.5 gap-2.5 h-11',
      icon: 'h-9 w-9 p-0',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
