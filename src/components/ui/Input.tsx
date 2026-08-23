import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', label, error, leftIcon, rightIcon, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wider text-mocha-subtext0">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 flex items-center pointer-events-none text-mocha-overlay0">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            type={type}
            className={cn(
              'w-full bg-mocha-surface0/70 border border-mocha-surface1 text-mocha-text placeholder:text-mocha-overlay0 text-sm rounded-lg px-3.5 py-2 transition-all duration-150',
              'focus:outline-none focus:border-mocha-blue focus:ring-2 focus:ring-mocha-blue/20',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              leftIcon && 'pl-9',
              rightIcon && 'pr-9',
              error && 'border-mocha-red focus:border-mocha-red focus:ring-mocha-red/20',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 flex items-center text-mocha-overlay0">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-mocha-red font-medium">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
