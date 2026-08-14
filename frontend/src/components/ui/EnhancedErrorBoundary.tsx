import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showReset?: boolean;
  showReload?: boolean;
  className?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class EnhancedErrorBoundary extends Component<Props, State> {
  static defaultProps = {
    showReset: true,
    showReload: true,
  };

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: process.env.NODE_ENV === "development",
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      showDetails: process.env.NODE_ENV === "development",
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
    this.props.onError?.(error, errorInfo);

    // In production, you might want to report this to an error tracking service
    if (process.env.NODE_ENV === "production") {
      // Example: Sentry.captureException(error, { extra: errorInfo });
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
  };

  toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  renderFallback() {
    if (this.props.fallback) {
      return this.props.fallback;
    }

    const { error, showDetails } = this.state;
    const { showReset = true, showReload = true, className = "" } = this.props;
    const errorMessage = error?.message || "An unexpected error occurred";
    const errorStack = error?.stack || "No stack trace available";

    return (
      <div
        className={`min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 p-4 ${className}`}
      >
        <div className="w-full max-w-md bg-gray-800 rounded-xl shadow-2xl overflow-hidden">
          <div className="p-6 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-red-500/10 rounded-full">
                <AlertTriangle className="w-10 h-10 text-red-400" />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-white mb-2">
              Oops! Something went wrong
            </h2>
            <p className="text-gray-300 mb-6">{errorMessage}</p>

            <div className="space-y-3">
              {showReset && (
                <button
                  onClick={this.handleReset}
                  className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </button>
              )}

              {showReload && (
                <button
                  onClick={() => window.location.reload()}
                  className="w-full px-4 py-2 text-gray-300 border border-gray-600 hover:bg-gray-700 rounded-md transition-colors"
                >
                  Reload Page
                </button>
              )}

              <button
                onClick={this.toggleDetails}
                className="text-sm text-gray-400 hover:text-gray-300 mt-4 inline-flex items-center mx-auto"
              >
                {showDetails ? "Hide" : "Show"} details
              </button>
            </div>

            {showDetails && (
              <div className="mt-6 p-4 bg-gray-700/50 rounded-lg text-left overflow-auto max-h-60">
                <pre className="text-xs text-red-300 font-mono">
                  {errorStack}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  render() {
    if (this.state.hasError) {
      return this.renderFallback();
    }

    return this.props.children;
  }
}

// Export as default for easier imports
// Default export for backward compatibility
export const EnhancedErrorBoundary = EnhancedErrorBoundary;

// Named exports
export { EnhancedErrorBoundary };
export default EnhancedErrorBoundary;
