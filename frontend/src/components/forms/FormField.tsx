import { forwardRef, useState, useId, ComponentProps } from 'react';
import { cn } from '../../utils/cn';

type InputProps = ComponentProps<'input'> & {
  label?: string;
  error?: string | boolean;
  description?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
};

export const FormField = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      error,
      description,
      leftIcon,
      rightIcon,
      id: idProp,
      required,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const id = useId();
    const inputId = idProp || `input-${id}`;
    const hasError = Boolean(error);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        
        <div 
          className={cn(
            'relative flex items-center border rounded-md transition-all',
            hasError
              ? 'border-red-500 focus-within:ring-2 focus-within:ring-red-500/20 focus-within:border-red-500'
              : 'border-gray-300 dark:border-gray-700 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500',
            isFocused && 'ring-2 ring-blue-500/20',
            className
          )}
        >
          {leftIcon && (
            <div className="pl-3 text-gray-400 dark:text-gray-500">
              {leftIcon}
            </div>
          )}
          
          <input
            id={inputId}
            ref={ref}
            className={cn(
              'w-full bg-transparent border-0 focus:ring-0 focus:outline-none py-2 px-3',
              leftIcon ? 'pl-2' : 'pl-3',
              rightIcon ? 'pr-2' : 'pr-3',
              'text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-colors duration-200'
            )}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            aria-invalid={hasError ? 'true' : 'false'}
            aria-describedby={
              [
                hasError ? `${inputId}-error` : undefined,
                description ? `${inputId}-description` : undefined,
              ]
                .filter(Boolean)
                .join(' ') || undefined
            }
            {...props}
          />
          
          {rightIcon && (
            <div className="pr-3 text-gray-400 dark:text-gray-500">
              {rightIcon}
            </div>
          )}
        </div>

        {description && !hasError && (
          <p
            id={`${inputId}-description`}
            className="mt-1 text-xs text-gray-500 dark:text-gray-400"
          >
            {description}
          </p>
        )}
        
        {hasError && typeof error === 'string' && (
          <p
            id={`${inputId}-error`}
            className="mt-1 text-xs text-red-600 dark:text-red-400"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

FormField.displayName = 'FormField';

// Example usage:
/*
<FormField
  label="Email"
  type="email"
  placeholder="Enter your email"
  error={errors.email?.message}
  {...register('email')}
/>
*/
