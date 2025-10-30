export * from './Toast';
export * from './types';

// Re-export types for convenience
export type { Toast, ToastOptions, ToastContextType } from './types';

// This file serves as the public API for the Toast component
// Import from here in other files to access the Toast components

// Example usage:
/*
import { useToast } from './components/Toast';

function MyComponent() {
  const { toast } = useToast();

  const showToast = () => {
    // Basic usage
    toast.success('Operation completed successfully!');
    
    // With options
    toast.error('Something went wrong!', {
      duration: 10000, // 10 seconds
      title: 'Error',
      action: {
        label: 'Retry',
        onClick: () => {
          // Handle retry
        },
      },
    });
  };

  return (
    <button onClick={showToast}>
      Show Toast
    </button>
  );
}
*/
