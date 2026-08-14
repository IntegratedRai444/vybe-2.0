import React from "react";
import { cn } from "../../utils/cn";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success";
  size?: "xs" | "sm" | "md" | "lg";
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      icon,
      iconPosition = "left",
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    const baseStyles = `
      inline-flex items-center justify-center gap-2 rounded-md font-medium
      transition-all duration-150 ease-out
      focus:outline-none focus:ring-2 focus:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed
      active:scale-[0.98] hover:shadow-sm
    `;

    const variants = {
      primary: `
        bg-blue-600 text-white border border-blue-600
        hover:bg-blue-700 hover:border-blue-700
        focus:ring-blue-500 focus:ring-offset-blue-100
        dark:focus:ring-offset-gray-900
      `,
      secondary: `
        bg-gray-100 text-gray-900 border border-gray-300
        hover:bg-gray-200 hover:border-gray-400
        focus:ring-gray-500 focus:ring-offset-gray-50
        dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600
        dark:hover:bg-gray-700 dark:hover:border-gray-500
        dark:focus:ring-offset-gray-900
      `,
      ghost: `
        bg-transparent text-gray-700 border border-transparent
        hover:bg-gray-100 hover:text-gray-900
        focus:ring-gray-500 focus:ring-offset-gray-50
        dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100
        dark:focus:ring-offset-gray-900
      `,
      danger: `
        bg-red-600 text-white border border-red-600
        hover:bg-red-700 hover:border-red-700
        focus:ring-red-500 focus:ring-offset-red-100
        dark:focus:ring-offset-gray-900
      `,
      success: `
        bg-green-600 text-white border border-green-600
        hover:bg-green-700 hover:border-green-700
        focus:ring-green-500 focus:ring-offset-green-100
        dark:focus:ring-offset-gray-900
      `,
    };

    const sizes = {
      xs: "h-6 px-2 text-xs",
      sm: "h-8 px-3 text-sm",
      md: "h-10 px-4 text-sm",
      lg: "h-12 px-6 text-base",
    };

    return (
      <button
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}

        {!loading && icon && iconPosition === "left" && icon}

        {children}

        {!loading && icon && iconPosition === "right" && icon}
      </button>
    );
  },
);

Button.displayName = "Button";

export { Button };
export type { ButtonProps };
