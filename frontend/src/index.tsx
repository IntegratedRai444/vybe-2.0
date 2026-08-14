import React, { Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ThemeProvider } from './contexts/ThemeContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { ProjectProvider } from './contexts/ProjectContext';
import { DebuggerProvider } from './contexts/DebuggerContext';
import { GitProvider } from './contexts/GitContext';
import { MCPProvider } from './contexts/MCPContext';
import { AIProvider } from './components/ai/AIProvider';
import { store } from './store/store';
import App from './App';
import './index.css';

// Error Boundary Component
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h2>Something went wrong.</h2>
          <button onClick={() => window.location.reload()}>Refresh Page</button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Loading fallback component
const LoadingFallback = () => (
  <div className="loading-fallback">
    <div className="spinner"></div>
    <p>Loading...</p>
  </div>
);

// Main application entry point
const root = createRoot(document.getElementById('root')!);

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <Provider store={store}>
        <ThemeProvider>
          <WebSocketProvider>
            <ProjectProvider>
              <DebuggerProvider>
                <GitProvider>
                  <MCPProvider>
                    <AIProvider>
                      <Router>
                        <Suspense fallback={<LoadingFallback />}>
                          <App />
                        </Suspense>
                      </Router>
                    </AIProvider>
                  </MCPProvider>
                </GitProvider>
              </DebuggerProvider>
            </ProjectProvider>
          </WebSocketProvider>
        </ThemeProvider>
      </Provider>
    </ErrorBoundary>
  </React.StrictMode>
);
