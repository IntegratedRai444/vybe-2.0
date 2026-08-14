import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from 'react';
import { authService } from '../services/auth';
import { useNavigate } from 'react-router-dom';

export interface User {
  id: string;
  email: string;
  name: string;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface SignupData extends LoginCredentials {
  name: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<User>;
  signup: (userData: SignupData) => Promise<User>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  checkAuth: () => Promise<boolean>;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Token refresh interval (5 minutes)
const TOKEN_REFRESH_INTERVAL = 5 * 60 * 1000;

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();

  // Clear any existing refresh interval
  const clearRefreshInterval = useCallback(() => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
  }, []);

  // Handle token refresh
  const handleRefreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const token = await authService.refreshToken();
      if (token) {
        const currentUser = authService.getCurrentUser();
        setUser(currentUser);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      await authService.logout();
      setUser(null);
      return false;
    }
  }, []);

  // Setup token refresh interval
  const setupTokenRefresh = useCallback(() => {
    clearRefreshInterval();
    
    refreshIntervalRef.current = setInterval(async () => {
      await handleRefreshToken();
    }, TOKEN_REFRESH_INTERVAL);

    return () => clearRefreshInterval();
  }, [handleRefreshToken, clearRefreshInterval]);

  // Check authentication status
  const checkAuth = useCallback(async (): Promise<boolean> => {
    if (!authService.getAccessToken()) return false;
    
    try {
      const isValid = await authService.isAuthenticated();
      if (!isValid) {
        return await handleRefreshToken();
      }
      return true;
    } catch (error) {
      console.error('Auth check failed:', error);
      return false;
    }
  }, [handleRefreshToken]);

  // Initialize auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        const currentUser = authService.getCurrentUser();
        if (currentUser && await checkAuth()) {
          setUser(currentUser);
          setupTokenRefresh();
        }
      } catch (err) {
        console.error('Failed to initialize auth:', err);
        setError('Failed to initialize authentication');
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    };

    initAuth();

    // Cleanup on unmount
    return () => {
      clearRefreshInterval();
    };
  }, [checkAuth, setupTokenRefresh]);

  // Handle user login
  const login = useCallback(async (credentials: LoginCredentials): Promise<User> => {
    setLoading(true);
    setError(null);
    
    try {
      const { user } = await authService.login(credentials);
      setUser(user);
      setupTokenRefresh();
      return user;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to login';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [setupTokenRefresh]);

  // Handle user signup
  const signup = useCallback(async (userData: SignupData): Promise<User> => {
    setLoading(true);
    setError(null);
    
    try {
      const { user } = await authService.signup(userData);
      setUser(user);
      setupTokenRefresh();
      return user;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Signup failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [setupTokenRefresh]);

  // Handle user logout
  const logout = useCallback(async () => {
    try {
      await authService.logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      clearRefreshInterval();
      setUser(null);
    }
  }, [navigate]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    user,
    isAuthenticated: !!user,
    login,
    signup,
    logout,
    refreshToken: handleRefreshToken,
    checkAuth,
    loading,
    error,
    initialized,
    clearError: () => setError(null),
  }), [
    user,
    login,
    signup,
    logout,
    handleRefreshToken,
    checkAuth,
    loading,
    error,
    initialized
  ]);

  // Show loading state while initializing
  if (!initialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Higher Order Component for protected routes
type WithAuthProps = {
  // Add any additional props your protected components might need
  [key: string]: any;
};

// Use a simple function component with proper typing
export function withAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>
): React.ComponentType<P> {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';
  
  // Create a new component with proper typing
  const ComponentWithAuth: React.FC<P> = (props) => {
    const { isAuthenticated, loading, initialized } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
      if (initialized && !loading && !isAuthenticated) {
        navigate('/login', { 
          replace: true, 
          state: { from: window.location.pathname } 
        });
      }
    }, [isAuthenticated, loading, navigate, initialized]);

    if (loading || !initialized) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      );
    }

    if (!isAuthenticated) {
      return null;
    }

    // Use type assertion here to avoid TypeScript errors
    const Component = WrappedComponent as React.ComponentType<any>;
    return <Component {...props} />;
  };

  // Set display name for better debugging
  ComponentWithAuth.displayName = `withAuth(${displayName})`;

  return ComponentWithAuth;
}
