/**
 * @file Toast.tsx
 * @description A highly customizable toast notification system with animations, theming, and accessibility support.
 * @see {@link https://github.com/your-org/your-repo/blob/main/src/components/Toast/README.md Documentation}
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { X, AlertCircle, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeProvider';
import { motion, AnimatePresence } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import { ToastType, Toast, ToastContextType, ToastOptions } from './types';

/**
 * Icons mapping for different toast types
 */
const toastIcons = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
} as const;

/**
 * Context for the Toast system
 */
const ToastContext = createContext<ToastContextType | undefined>(undefined);

export interface ToastProviderProps {
  /** Child components that will have access to the toast context */
  children: React.ReactNode;
  /** Default position for toasts */
  defaultPosition?: ToastOptions['position'];
  /** Whether to enable analytics tracking */
  enableAnalytics?: boolean;
  /** Custom toast container class name */
  className?: string;
}

/**
 * ToastProvider component that manages the state and display of toast notifications.
 * Wrap your application with this component to enable toast notifications.
 *
 * @example
 * ```tsx
 * <ToastProvider defaultPosition="top-right">
 *   <App />
 * </ToastProvider>
 * ```
 *
 * @component
 * @param {ToastProviderProps} props - Component props
 * @returns {React.ReactElement} The ToastProvider component
 */
export const ToastProvider: React.FC<ToastProviderProps> = ({
  children,
  defaultPosition = 'bottom-right',
  enableAnalytics = false,
  className = '',
}) => {
  const { t } = useTranslation('common');
  const { theme, isDark } = useTheme();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timeouts = useRef<Record<string, NodeJS.Timeout>>({});

  const clearTimeoutRef = useCallback((id: string) => {
    if (timeouts.current[id]) {
      clearTimeout(timeouts.current[id]);
      delete timeouts.current[id];
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prevToasts) => {
      const toastToRemove = prevToasts.find((toast) => toast.id === id);
      if (toastToRemove?.onClose) {
        toastToRemove.onClose();
      }
      return prevToasts.filter((toast) => toast.id !== id);
    });
    clearTimeoutRef(id);
  }, [clearTimeoutRef]);

  const addToast = useCallback((message: string, options: ToastOptions = {}) => {
    const id = options.id || uuidv4();
    const type = options.type || 'info';
    const duration = options.duration ?? (type === 'error' ? 10000 : 5000);
    const position = options.position || defaultPosition;
    const disableAutoClose = options.disableAutoClose || false;

    setToasts((prevToasts) => {
      // Update existing toast if it has the same ID
      const existingToastIndex = prevToasts.findIndex((t) => t.id === id);
      if (existingToastIndex !== -1) {
        clearTimeoutRef(id);
        const newToasts = [...prevToasts];
        newToasts[existingToastIndex] = {
          ...newToasts[existingToastIndex],
          ...options,
          message,
          type,
          duration,
          position,
          disableAutoClose,
        };
        return newToasts;
      }

      // Add new toast
      return [
        ...prevToasts,
        {
          id,
          message,
          type,
          duration,
          position,
          disableAutoClose,
          createdAt: Date.now(),
          ...options,
        },
      ];
    });

    // Auto-dismiss if not disabled
    if (!disableAutoClose && duration > 0) {
      timeouts.current[id] = setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  }, [removeToast, defaultPosition, clearTimeoutRef]);

  const updateToast = useCallback((id: string, options: Partial<Omit<Toast, 'id' | 'createdAt'>>) => {
    setToasts((prevToasts) =>
      prevToasts.map((toast) =>
        toast.id === id
          ? {
              ...toast,
              ...options,
              message: options.message !== undefined ? options.message : toast.message,
            }
          : toast
      )
    );
  }, []);

  const removeAllToasts = useCallback(() => {
    setToasts([]);
    Object.values(timeouts.current).forEach(clearTimeout);
    timeouts.current = {};
  }, []);

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(timeouts.current).forEach(clearTimeout);
    };
  }, []);

  // Create toast methods for each type
  const toast = {
    success: (message: string, options?: Omit<ToastOptions, 'type'>) =>
      addToast(message, { ...options, type: 'success' }),
    error: (message: string, options?: Omit<ToastOptions, 'type'>) =>
      addToast(message, { ...options, type: 'error' }),
    warning: (message: string, options?: Omit<ToastOptions, 'type'>) =>
      addToast(message, { ...options, type: 'warning' }),
    info: (message: string, options?: Omit<ToastOptions, 'type'>) =>
      addToast(message, { ...options, type: 'info' }),
  };

  // Group toasts by position
  const toastGroups = toasts.reduce<Record<string, Toast[]>>((groups, toast) => {
    const position = toast.position || defaultPosition;
    if (!groups[position]) {
      groups[position] = [];
    }
    groups[position].push(toast);
    return groups;
  }, {});

  // Toast position styles
  const positionStyles: Record<string, string> = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  // Animation variants
  const toastVariants = {
    hidden: (position: string) => ({
      opacity: 0,
      x: position.includes('left') ? '-100%' : '100%',
      y: position.includes('top') ? '-100%' : '100%',
    }),
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: {
        type: 'spring',
        damping: 30,
        stiffness: 300,
      },
    },
    exit: (position: string) => ({
      opacity: 0,
      x: position.includes('left') ? '-100%' : '100%',
      y: position.includes('top') ? '-100%' : '100%',
      transition: {
        duration: 0.2,
      },
    }),
  };

  return (
    <ToastContext.Provider
      value={{
        toasts,
        addToast,
        removeToast,
        removeAllToasts,
        updateToast,
        toast,
      }}
    >
      {children}
      
      {/* Render toast containers for each position */}
      {Object.entries(toastGroups).map(([position, positionToasts]) => (
        <div
          key={position}
          className={`fixed z-[1000] flex flex-col gap-2 ${positionStyles[position]}`}
          style={{
            '--toast-duration': '5000ms',
            '--toast-spacing': '0.5rem',
          } as React.CSSProperties}
        >
          <AnimatePresence initial={false}>
            {positionToasts.map((toastItem) => (
              <motion.div
                key={toastItem.id}
                layout
                custom={position}
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={toastVariants}
                className={`relative w-full max-w-xs rounded-lg p-4 shadow-lg ${
                  isDark ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                } ${toastItem.className || ''}`}
                role="alert"
                aria-live={toastItem.type === 'error' ? 'assertive' : 'polite'}
                aria-atomic="true"
              >
                <div className="flex items-start">
                  <div className="flex-shrink-0 pt-0.5">
                    {toastItem.type && React.createElement(toastIcons[toastItem.type], {
                      className: `h-5 w-5 ${
                        toastItem.type === 'success' ? 'text-green-500' :
                        toastItem.type === 'error' ? 'text-red-500' :
                        toastItem.type === 'warning' ? 'text-yellow-500' : 'text-blue-500'
                      }`,
                      'aria-hidden': 'true',
                    })}
                  </div>
                  <div className="ml-3 w-0 flex-1 pt-0.5">
                    {toastItem.title && (
                      <h3 className="text-sm font-medium">
                        {toastItem.title}
                      </h3>
                    )}
                    <p className="mt-1 text-sm">
                      {toastItem.message}
                    </p>
                    {toastItem.action && (
                      <div className="mt-3 flex">
                        <button
                          type="button"
                          onClick={() => {
                            toastItem.action?.onClick();
                            removeToast(toastItem.id);
                          }}
                          className="rounded-md bg-transparent text-sm font-medium text-primary-600 hover:text-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:text-primary-400 dark:hover:text-primary-300"
                        >
                          {toastItem.action.label}
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="ml-4 flex flex-shrink-0">
                    <button
                      type="button"
                      className="inline-flex rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                      onClick={() => removeToast(toastItem.id)}
                      aria-label={t('common:close') || 'Close'}
                    >
                      <span className="sr-only">{t('common:close') || 'Close'}</span>
                      <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
                {!toastItem.disableAutoClose && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 overflow-hidden">
                    <motion.div
                      className="h-full bg-primary-500"
                      initial={{ scaleX: 1 }}
                      animate={{ 
                        scaleX: 0,
                        transition: { 
                          duration: (toastItem.duration || 5000) / 1000,
                          ease: 'linear'
                        } 
                      }}
                    />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ))}
    </ToastContext.Provider>
  );
};

/**
 * @internal
 * ToastItem has been integrated into the main ToastProvider component
 * for better performance and state management.
 */

/**
 * Hook to access the toast context.
 * Must be used within a ToastProvider.
 *
 * @example
 * ```tsx
 * const { toast } = useToast();
 * 
 * // Show a success toast
 * toast.success('Operation completed successfully!');
 * 
 * // Show an error toast with options
 * toast.error('Something went wrong!', {
 *   duration: 10000,
 *   title: 'Error',
 *   action: {
 *     label: 'Retry',
 *     onClick: () => handleRetry()
 *   }
 * });
 * ```
 *
 * @throws {Error} If used outside of a ToastProvider
 * @returns {ToastContextType} The toast context with all available methods
 */
export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export default ToastProvider;
