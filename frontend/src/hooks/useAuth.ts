import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const useAuth = () => {
  const [auth, setAuth] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  const navigate = useNavigate();

  // Check if user is logged in on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    if (token && user) {
      setAuth({
        user: JSON.parse(user),
        token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } else {
      setAuth(prev => ({
        ...prev,
        isLoading: false,
      }));
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setAuth(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }

      const { user, token } = await response.json();
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      setAuth({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      return user;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Login failed');
      setAuth(prev => ({
        ...prev,
        error: error.message,
        isLoading: false,
      }));
      throw error;
    }
  }, []);

  const register = useCallback(async (userData: {
    name: string;
    email: string;
    password: string;
  }) => {
    setAuth(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Registration failed');
      }

      const { user, token } = await response.json();
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      setAuth({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      return user;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Registration failed');
      setAuth(prev => ({
        ...prev,
        error: error.message,
        isLoading: false,
      }));
      throw error;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    setAuth({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });

    navigate('/login');
  }, [navigate]);

  const updateUser = useCallback((userData: Partial<User>) => {
    setAuth(prev => {
      if (!prev.user) return prev;
      
      const updatedUser = { ...prev.user, ...userData };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      return {
        ...prev,
        user: updatedUser,
      };
    });
  }, []);

  return {
    ...auth,
    login,
    register,
    logout,
    updateUser,
  };
};

export default useAuth;
