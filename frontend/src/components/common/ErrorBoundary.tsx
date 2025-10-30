import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showReset?: boolean;
  showReload?: boolean;
  className?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ error, errorInfo });
    this.props.onError?.(error, errorInfo);
    console.error('Error boundary caught an error:', error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  render() {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback, showReset = true, showReload = true, className = '' } = this.props;

    if (!hasError) {
      return <>{children}</>;
    }

    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className={`p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 ${className}`}>
        <div className="flex">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" aria-hidden="true" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
              Something went wrong
            </h3>
            <div className="mt-2 text-sm text-red-700 dark:text-red-300">
              <p>{error?.message || 'An unknown error occurred'}</p>
              {process.env.NODE_ENV === 'development' && errorInfo?.componentStack && (
                <details className="mt-2">
                  <summary className="text-xs text-red-500 dark:text-red-400 cursor-pointer">
                    Show details
                  </summary>
                  <pre className="mt-1 text-xs text-red-500 dark:text-red-400 overflow-auto max-h-40 p-2 bg-red-50 dark:bg-red-900/30 rounded">
                    {errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </div>
            <div className="mt-4 flex space-x-3">
              {showReset && (
                <button
                  type="button"
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  onClick={this.handleReset}
                >
                  <RefreshCw className="-ml-0.5 mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                  Try again
                </button>
              )}
              {showReload && (
                <button
                  type="button"
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
                  onClick={this.handleReload}
                >
                  Reload page
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
