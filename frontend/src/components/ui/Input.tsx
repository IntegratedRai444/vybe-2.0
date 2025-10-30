import React from 'react';
import { cn } from '../../utils/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  success?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: 'default' | 'filled';
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className, 
    type = 'text',
    label,
    error,
    success,
    leftIcon,
    rightIcon,
    variant = 'default',
    disabled,
    ...props 
  }, ref) => {
    const baseStyles = `
      flex w-full rounded-md border px-3 py-2 text-sm
      transition-all duration-150 ease-out
      placeholder:text-gray-400 dark:placeholder:text-gray-500
      focus:outline-none focus:ring-2 focus:ring-offset-1
      disabled:cursor-not-allowed disabled:opacity-50
    `;

    const variants = {
      default: `
        border-gray-300 bg-white text-gray-900
        hover:border-gray-400
        focus:border-blue-500 focus:ring-blue-500/20
        dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100
        dark:hover:border-gray-500
        dark:focus:border-blue-400 dark:focus:ring-blue-400/20
      `,
      filled: `
        border-transparent bg-gray-100 text-gray-900
        hover:bg-gray-200
        focus:bg-white focus:border-blue-500 focus:ring-blue-500/20
        dark:bg-gray-800 dark:text-gray-100
        dark:hover:bg-gray-700
        dark:focus:bg-gray-800 dark:focus:border-blue-400 dark:focus:ring-blue-400/20
      `,
    };

    const getStateStyles = () => {
      if (error) {
        return `
          border-red-500 focus:border-red-500 focus:ring-red-500/20
          dark:border-red-400 dark:focus:border-red-400 dark:focus:ring-red-400/20
        `;
      }
      if (success) {
        return `
          border-green-500 focus:border-green-500 focus:ring-green-500/20
          dark:border-green-400 dark:focus:border-green-400 dark:focus:ring-green-400/20
        `;
      }
      return '';
    };

    const inputElement = (
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
            {leftIcon}
          </div>
        )}
        
        <input
          type={type}
          className={cn(
            baseStyles,
            variants[variant],
            getStateStyles(),
            leftIcon && 'pl-10',
            rightIcon && 'pr-10',
            className
          )}
          ref={ref}
          disabled={disabled}
          {...props}
        />
        
        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
            {rightIcon}
          </div>
        )}
      </div>
    );

    if (label || error || success) {
      return (
        <div className="space-y-1">
          {label && (
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {label}
            </label>
          )}
          
          {inputElement}
          
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </p>
          )}
          
          {success && (
            <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              {success}
            </p>
          )}
        </div>
      );
    }

    return inputElement;
  }
);

Input.displayName = 'Input';

export { Input };
export type { InputProps };