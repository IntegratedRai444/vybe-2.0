import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { useTheme } from '../../../theme/EnhancedThemeProvider';
import { createStyleProps } from '../../../theme/themeUtils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * The variant of the button
   * @default 'primary'
   */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'link' | 'danger';
  /**
   * The size of the button
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * If true, the button will take up the full width of its container
   * @default false
   */
  fullWidth?: boolean;
  /**
   * If true, the button will show a loading spinner and be disabled
   * @default false
   */
  isLoading?: boolean;
  /**
   * The icon to display before the button text
   */
  leftIcon?: React.ReactNode;
  /**
   * The icon to display after the button text
   */
  rightIcon?: React.ReactNode;
}

/**
 * A customizable button component that follows the Vybe design system.
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      isLoading = false,
      disabled = false,
      leftIcon,
      rightIcon,
      className = '',
      style,
      ...props
    },
    ref
  ) => {
    const { theme } = useTheme();

    // Base styles
    const baseStyles = createStyleProps(
      {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        border: '1px solid transparent',
        borderRadius: 'md',
        fontWeight: 'medium',
        transition: 'all 150ms ease-in-out',
        cursor: 'pointer',
        outline: 'none',
        _focus: {
          boxShadow: '0 0 0 3px rgba(66, 153, 225, 0.5)',
        },
        _disabled: {
          opacity: 0.6,
          cursor: 'not-allowed',
          boxShadow: 'none',
        },
        _hover: {
          _disabled: {
            bg: 'initial',
          },
        },
      },
      theme
    );

    // Size variants
    const sizeStyles = createStyleProps(
      {
        sm: {
          fontSize: 'sm',
          height: '32px',
          px: 3,
          py: 1,
        },
        md: {
          fontSize: 'sm',
          height: '40px',
          px: 4,
          py: 2,
        },
        lg: {
          fontSize: 'md',
          height: '48px',
          px: 6,
          py: 3,
        },
      }[size],
      theme
    );

    // Color variants
    const variantStyles = createStyleProps(
      {
        primary: {
          bg: 'primary',
          color: 'primaryText',
          _hover: {
            bg: 'primaryDark',
          },
          _active: {
            bg: 'primaryDarker',
          },
        },
        secondary: {
          bg: 'secondary',
          color: 'secondaryText',
          _hover: {
            bg: 'secondaryDark',
          },
          _active: {
            bg: 'secondaryDarker',
          },
        },
        outline: {
          bg: 'transparent',
          border: '1px solid',
          borderColor: 'border',
          color: 'text',
          _hover: {
            bg: 'hover',
          },
          _active: {
            bg: 'active',
          },
        },
        ghost: {
          bg: 'transparent',
          color: 'text',
          _hover: {
            bg: 'hover',
          },
          _active: {
            bg: 'active',
          },
        },
        link: {
          bg: 'transparent',
          color: 'primary',
          _hover: {
            textDecoration: 'underline',
          },
          _active: {
            color: 'primaryDark',
          },
        },
        danger: {
          bg: 'error',
          color: 'white',
          _hover: {
            bg: 'errorDark',
          },
          _active: {
            bg: 'errorDarker',
          },
        },
      }[variant],
      theme
    );

    // Full width
    const fullWidthStyles = fullWidth
      ? createStyleProps(
          {
            width: '100%',
          },
          theme
        )
      : {};

    // Loading state
    const loadingStyles = isLoading
      ? createStyleProps(
          {
            pointerEvents: 'none',
            _hover: {},
            _active: {},
          },
          theme
        )
      : {};

    // Combine all styles
    const buttonStyles = {
      ...baseStyles,
      ...sizeStyles,
      ...variantStyles,
      ...fullWidthStyles,
      ...loadingStyles,
      ...style,
    };

    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled || isLoading}
        className={className}
        style={buttonStyles}
        {...props}
      >
        {isLoading && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              marginRight: '8px',
            }}
          >
            <Spinner size="sm" />
          </span>
        )}
        {leftIcon && !isLoading && (
          <span style={{ marginRight: '8px', display: 'flex' }}>{leftIcon}</span>
        )}
        {children}
        {rightIcon && <span style={{ marginLeft: '8px' }}>{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;

// Simple Spinner component for loading state
const Spinner = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const sizeMap = {
    sm: '12px',
    md: '16px',
    lg: '20px',
  };

  return (
    <svg
      style={{
        animation: 'spin 1s linear infinite',
        width: sizeMap[size],
        height: sizeMap[size],
      }}
      viewBox="0 0 24 24"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeDasharray="42"
        strokeDashoffset="16"
        strokeLinecap="round"
      />
      <style jsx>{`
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </svg>
  );
};
