import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { RootState, AppDispatch } from '../store';
import { login, logoutUser, refreshToken, selectCurrentUser, selectIsAuthenticated } from '../store/slices/authSlice';

interface UseAuthReturn {
  user: ReturnType<typeof selectCurrentUser>;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<boolean>;
}

export const useAuth = (): UseAuthReturn => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const location = useLocation();
  
  const user = useSelector(selectCurrentUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const { loading, error, isTokenRefreshing } = useSelector((state: RootState) => ({
    loading: state.auth.loading,
    error: state.auth.error,
    isTokenRefreshing: state.auth.isTokenRefreshing,
  }));

  // Handle login
  const handleLogin = useCallback(
    async (email: string, password: string) => {
      const resultAction = await dispatch(login({ email, password }));
      
      if (login.fulfilled.match(resultAction)) {
        // Redirect to the requested page or home
        const from = location.state?.from?.pathname || '/';
        navigate(from, { replace: true });
      }
    },
    [dispatch, navigate, location.state]
  );

  // Handle logout
  const handleLogout = useCallback(async () => {
    await dispatch(logoutUser());
    navigate('/login', { replace: true });
  }, [dispatch, navigate]);

  // Handle token refresh
  const handleRefreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const resultAction = await dispatch(refreshToken());
      return refreshToken.fulfilled.match(resultAction);
    } catch (error) {
      console.error('Failed to refresh token:', error);
      return false;
    }
  }, [dispatch]);

  // Auto refresh token before it expires
  useEffect(() => {
    if (!isAuthenticated) return;

    const refreshInterval = 14 * 60 * 1000; // 14 minutes
    const refreshTimer = setInterval(() => {
      if (!isTokenRefreshing) {
        handleRefreshToken().catch(console.error);
      }
    }, refreshInterval);

    return () => clearInterval(refreshTimer);
  }, [isAuthenticated, isTokenRefreshing, handleRefreshToken]);

  // Check auth state on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      
      if (token && !isAuthenticated) {
        try {
          await handleRefreshToken();
        } catch (error) {
          console.error('Failed to refresh token on mount:', error);
          await handleLogout();
        }
      }
    };

    checkAuth();
  }, [isAuthenticated, handleRefreshToken, handleLogout]);

  return {
    user,
    isAuthenticated,
    isLoading: loading || isTokenRefreshing,
    error,
    login: handleLogin,
    logout: handleLogout,
    refreshAuth: handleRefreshToken,
  };
};

// Create a higher-order component for protected routes
export const withAuth = <P extends object>(
  Component: React.ComponentType<P>,
  options: { redirectTo?: string } = {}
) => {
  const WrappedComponent: React.FC<P> = (props) => {
    const { isAuthenticated, isLoading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
      if (!isLoading && !isAuthenticated) {
        navigate(options.redirectTo || '/login', {
          state: { from: location },
          replace: true,
        });
      }
    }, [isAuthenticated, isLoading, navigate, location]);

    if (isLoading) {
      return <div>Loading...</div>; // Or your custom loading component
    }

    if (!isAuthenticated) {
      return null;
    }

    return <Component {...(props as P)} />;
  };

  return WrappedComponent;
};

export default useAuth;
