import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error | null) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
    
    // Log error to error reporting service
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    } else {
      console.error('Error caught by ErrorBoundary:', error, errorInfo);
    }
  }

  public render() {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      if (typeof fallback === 'function') {
        return fallback(error);
      }
      
      if (fallback) {
        return fallback;
      }

      // Default error UI
      return (
        <div className="error-boundary">
          <div className="error-boundary__content">
            <h2>Something went wrong</h2>
            {error && (
              <div className="error-boundary__details">
                <h3>{error.name}</h3>
                <p>{error.message}</p>
                {errorInfo?.componentStack && (
                  <pre className="error-boundary__stack">
                    {errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}
            <button 
              className="error-boundary__retry"
              onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return children;
  }
}

// Higher-Order Component for error boundaries
export function withErrorBoundary<P>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <WrappedComponent {...(props as any)} />
      </ErrorBoundary>
    );
  };
}

// Error boundary context for more granular error handling
export const ErrorBoundaryContext = React.createContext<{
  didCatch: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  resetError: () => void;
}>({
  didCatch: false,
  error: null,
  errorInfo: null,
  resetError: () => {},
});

export const useErrorBoundary = () => {
  const context = React.useContext(ErrorBoundaryContext);
  if (!context) {
    throw new Error('useErrorBoundary must be used within an ErrorBoundaryProvider');
  }
  return context;
};

export const ErrorBoundaryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [errorState, setErrorState] = React.useState<{
    error: Error | null;
    errorInfo: ErrorInfo | null;
  }>({ error: null, errorInfo: null });

  const resetError = React.useCallback(() => {
    setErrorState({ error: null, errorInfo: null });
  }, []);

  const value = React.useMemo(
    () => ({
      didCatch: !!errorState.error,
      error: errorState.error,
      errorInfo: errorState.errorInfo,
      resetError,
    }),
    [errorState, resetError]
  );

  if (errorState.error) {
    // You can render a fallback UI here if needed
    return (
      <ErrorBoundaryContext.Provider value={value}>
        <div className="error-fallback">
          <h2>Something went wrong</h2>
          <p>{errorState.error.message}</p>
          <button onClick={resetError}>Try again</button>
        </div>
      </ErrorBoundaryContext.Provider>
    );
  }

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => setErrorState({ error, errorInfo })}
    >
      <ErrorBoundaryContext.Provider value={value}>
        {children}
      </ErrorBoundaryContext.Provider>
    </ErrorBoundary>
  );
};
