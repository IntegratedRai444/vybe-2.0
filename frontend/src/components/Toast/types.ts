/**
 * Type of toast notification to display
 */
export type ToastType = 'success' | 'error' | 'warning' | 'info';

/**
 * Configuration options for toast notifications
 */
export interface ToastOptions {
  /** Unique identifier for the toast. Auto-generated if not provided */
  id?: string;
  /** Type of toast to display */
  type?: ToastType;
  /** Duration in milliseconds before auto-dismissal */
  duration?: number;
  /** Optional title for the toast */
  title?: string;
  /** Optional action button configuration */
  action?: {
    /** Text to display on the action button */
    label: string;
    /** Callback when the action button is clicked */
    onClick: () => void;
  };
  /** If true, the toast will not auto-dismiss */
  disableAutoClose?: boolean;
  /** Position of the toast on screen */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  /** Additional CSS class names to apply to the toast */
  className?: string;
  /** Callback when the toast is closed */
  onClose?: () => void;
}

/**
 * Represents a toast notification instance
 */
export interface Toast extends ToastOptions {
  /** Unique identifier for the toast */
  id: string;
  /** The message to display in the toast */
  message: string;
  /** Timestamp when the toast was created */
  createdAt: number;
}

/**
 * Context type for the Toast system
 */
export interface ToastContextType {
  /** Array of active toasts */
  toasts: Toast[];
  
  /**
   * Add a new toast
   * @param message - The message to display
   * @param options - Additional toast options
   * @returns The ID of the created toast
   */
  addToast: (message: string, options?: ToastOptions) => string;
  
  /**
   * Remove a toast by ID
   * @param id - The ID of the toast to remove
   */
  removeToast: (id: string) => void;
  
  /** Remove all toasts */
  removeAllToasts: () => void;
  
  /**
   * Update an existing toast
   * @param id - The ID of the toast to update
   * @param options - New options to merge with existing toast
   */
  updateToast: (id: string, options: Partial<ToastOptions>) => void;
  
  /** Convenience methods for different toast types */
  toast: {
    /**
     * Show a success toast
     * @param message - The message to display
     * @param options - Additional toast options (without type)
     * @returns The ID of the created toast
     */
    success: (message: string, options?: Omit<ToastOptions, 'type'>) => string;
    
    /**
     * Show an error toast
     * @param message - The message to display
     * @param options - Additional toast options (without type)
     * @returns The ID of the created toast
     */
    error: (message: string, options?: Omit<ToastOptions, 'type'>) => string;
    
    /**
     * Show a warning toast
     * @param message - The message to display
     * @param options - Additional toast options (without type)
     * @returns The ID of the created toast
     */
    warning: (message: string, options?: Omit<ToastOptions, 'type'>) => string;
    
    /**
     * Show an info toast
     * @param message - The message to display
     * @param options - Additional toast options (without type)
     * @returns The ID of the created toast
     */
    info: (message: string, options?: Omit<ToastOptions, 'type'>) => string;
  };
}
