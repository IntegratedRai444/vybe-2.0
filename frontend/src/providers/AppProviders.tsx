import React from 'react';
import { ThemeProvider } from '../theme/ThemeProvider';
import { WebSocketProvider } from './WebSocketProvider';
import { QueryClient, QueryClientProvider } from 'react-query';

// Create a client for react-query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

type AppProvidersProps = {
  children: React.ReactNode;
};

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <WebSocketProvider>
          {children}
        </WebSocketProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default AppProviders;
