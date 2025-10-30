import React from 'react';
import { render, RenderOptions, fireEvent } from '@testing-library/react';
import { ToastProvider } from '../Toast';

// Mock the framer-motion for testing
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div data-testid="motion-div" {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="animate-presence">{children}</div>
  ),
}));

// Mock the useTranslation hook
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

// Mock the useTheme hook
jest.mock('../../../theme/ThemeProvider', () => ({
  useTheme: () => ({
    theme: 'light',
    isDark: false,
  }),
}));

// Mock the uuid module
jest.mock('uuid', () => ({
  v4: () => 'test-toast-id',
}));

export const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <ToastProvider>{children}</ToastProvider>;
};

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { 
  wrapper: ({ children }) => <AllTheProviders>{children}</AllTheProviders>,
  ...options 
});

// Re-export everything
export * from '@testing-library/react';
// Override render method
export { customRender as render };

// Helper functions for testing
export const renderWithToast = (ui: React.ReactElement) => {
  return customRender(ui);
};

export const createToast = async (message: string, options: any = {}) => {
  const result = renderWithToast(
    <div>
      <button
        onClick={() => {
          const { toast } = require('../useToast');
          toast[options.type || 'info'](message, options);
        }}
      >
        Show Toast
      </button>
    </div>
  );
  
  const button = result.getByText('Show Toast');
  return {
    ...result,
    button,
    showToast: () => {
      fireEvent.click(button);
      return result.findByText(message);
    },
  };
};

// Re-export fireEvent for convenience
export { fireEvent };

// Custom matchers
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveTextContent(text: string | RegExp): R;
      toHaveClass(className: string): R;
      toHaveAttribute(attr: string, value?: string): R;
    }
  }
}
