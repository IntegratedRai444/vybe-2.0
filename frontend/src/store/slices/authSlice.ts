import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '../../services/apiClient';

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  error: string | null;
  lastActive: string | null;
  isTokenRefreshing: boolean;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface AuthResponse {
  token: string;
  refreshToken: string;
  user: User;
}

// Helper function to safely access localStorage
const safeGetItem = (key: string): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(key);
};

// Async thunks
export const login = createAsyncThunk<AuthResponse, LoginCredentials, { rejectValue: string }>(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Login failed');
    }
  }
);

export const refreshToken = createAsyncThunk<AuthResponse, void, { state: { auth: AuthState } }>(
  'auth/refreshToken',
  async (_, { getState, rejectWithValue }) => {
    const { refreshToken } = getState().auth;
    if (!refreshToken) {
      return rejectWithValue('No refresh token available');
    }

    try {
      const response = await apiClient.post<AuthResponse>('/auth/refresh-token', { refreshToken });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Token refresh failed');
    }
  }
);

export const logoutUser = createAsyncThunk('auth/logout', async (_, { dispatch }) => {
  try {
    await apiClient.post('/auth/logout');
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // Clear local storage and state even if API call fails
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    dispatch(clearAuthState());
  }
});

const initialState: AuthState = {
  token: safeGetItem('token'),
  refreshToken: safeGetItem('refreshToken'),
  isAuthenticated: false,
  user: null,
  loading: false,
  error: null,
  lastActive: null,
  isTokenRefreshing: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state: AuthState, action: PayloadAction<{ token: string; refreshToken: string; user: User }>) => {
      const { token, refreshToken, user } = action.payload;
      state.token = token;
      state.refreshToken = refreshToken;
      state.user = user;
      state.isAuthenticated = true;
      state.lastActive = new Date().toISOString();

      // Store tokens in localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', token);
        localStorage.setItem('refreshToken', refreshToken);
      }
    },
    clearAuthState: (state: AuthState) => {
      state.token = null;
      state.refreshToken = null;
      state.user = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
      state.lastActive = null;
      state.isTokenRefreshing = false;

      // Clear tokens from localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
      }
    },
    updateUser: (state: AuthState, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    setLastActive: (state: AuthState) => {
      state.lastActive = new Date().toISOString();
    },
    clearError: (state: AuthState) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(login.pending, (state: AuthState) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state: AuthState, action: PayloadAction<AuthResponse>) => {
        const { token, refreshToken, user } = action.payload;
        state.token = token;
        state.refreshToken = refreshToken;
        state.user = user;
        state.isAuthenticated = true;
        state.loading = false;
        state.lastActive = new Date().toISOString();

        // Store tokens in localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('token', token);
          localStorage.setItem('refreshToken', refreshToken);
        }
      })
      .addCase(login.rejected, (state: AuthState, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
        state.token = null;
        state.refreshToken = null;
        state.user = null;
      });

    // Refresh Token
    builder
      .addCase(refreshToken.pending, (state: AuthState) => {
        state.isTokenRefreshing = true;
      })
      .addCase(refreshToken.fulfilled, (state: AuthState, action: PayloadAction<AuthResponse>) => {
        const { token, refreshToken, user } = action.payload;
        state.token = token;
        state.refreshToken = refreshToken;
        state.user = user;
        state.isAuthenticated = true;
        state.isTokenRefreshing = false;
        state.lastActive = new Date().toISOString();

        // Update tokens in localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('token', token);
          localStorage.setItem('refreshToken', refreshToken);
        }
      })
      .addCase(refreshToken.rejected, (state: AuthState) => {
        state.isTokenRefreshing = false;
        state.isAuthenticated = false;
        state.token = null;
        state.refreshToken = null;
        state.user = null;

        // Clear tokens from localStorage
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
        }
      });

    // Logout
    builder.addCase(logoutUser.fulfilled, (state: AuthState) => {
      state.token = null;
      state.refreshToken = null;
      state.user = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
      state.lastActive = null;
      state.isTokenRefreshing = false;
    });
  },
});

export const { 
  setCredentials, 
  clearAuthState, 
  updateUser, 
  setLastActive,
  clearError 
} = authSlice.actions;

// Selectors
export const selectCurrentUser = (state: { auth: AuthState }): User | null => state.auth.user;
export const selectIsAuthenticated = (state: { auth: AuthState }): boolean => state.auth.isAuthenticated;
export const selectAuthLoading = (state: { auth: AuthState }): boolean => state.auth.loading;
export const selectAuthError = (state: { auth: AuthState }): string | null => state.auth.error;

export default authSlice.reducer;
