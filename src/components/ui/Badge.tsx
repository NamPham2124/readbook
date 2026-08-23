import React from 'react';
import { cn } from '@/lib/utils/cn';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'gray';
  size?: 'sm' | 'md';
}

export function Badge({ className, variant = 'blue', size = 'sm', children, ...props }: BadgeProps) {
  const variants = {
    blue: 'bg-mocha-blue/15 text-mocha-blue border-mocha-blue/30',
    green: 'bg-mocha-green/15 text-mocha-green border-mocha-green/30',
    yellow: 'bg-mocha-yellow/15 text-mocha-yellow border-mocha-yellow/30',
    red: 'bg-mocha-red/15 text-mocha-red border-mocha-red/30',
    purple: 'bg-mocha-mauve/15 text-mocha-mauve border-mocha-mauve/30',
    gray: 'bg-mocha-surface1/30 text-mocha-subtext0 border-mocha-surface1/50',
  };

  const sizes = {
    sm: 'text-[11px] px-2 py-0.5 font-semibold',
    md: 'text-xs px-2.5 py-1 font-medium',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border tracking-wide uppercase',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
