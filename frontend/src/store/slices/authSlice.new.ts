import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '../../../services/apiClient';

// Types
interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: string;
  createdAt: string;
  updatedAt: string;
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

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  error: string | null;
  lastActive: string | null;
  isTokenRefreshing: boolean;
}

// Initial state
const initialState: AuthState = {
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  user: null,
  loading: false,
  error: null,
  lastActive: null,
  isTokenRefreshing: false,
};

// Async thunks
export const login = createAsyncThunk<AuthResponse, LoginCredentials, { rejectValue: string }>(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/auth/login', credentials);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Login failed');
    }
  }
);

export const refreshToken = createAsyncThunk<AuthResponse, void, { rejectValue: string }>(
  'auth/refreshToken',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: AuthState };
      const response = await apiClient.post('/auth/refresh-token', {
        refreshToken: state.auth.refreshToken,
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to refresh token');
    }
  }
);

// Create the auth slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<{ token: string; refreshToken: string; user: User }>) => {
      const { token, refreshToken, user } = action.payload;
      state.token = token;
      state.refreshToken = refreshToken;
      state.user = user;
      state.isAuthenticated = true;
      state.lastActive = new Date().toISOString();
    },
    clearAuthState: (state) => {
      state.token = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.user = null;
      state.error = null;
      state.loading = false;
      state.lastActive = null;
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    setLastActive: (state) => {
      state.lastActive = new Date().toISOString();
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action: PayloadAction<AuthResponse>) => {
        const { token, refreshToken, user } = action.payload;
        state.token = token;
        state.refreshToken = refreshToken;
        state.user = user;
        state.isAuthenticated = true;
        state.loading = false;
        state.lastActive = new Date().toISOString();
        
        // Store tokens in localStorage
        localStorage.setItem('token', token);
        localStorage.setItem('refreshToken', refreshToken);
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Refresh Token
    builder
      .addCase(refreshToken.pending, (state) => {
        state.isTokenRefreshing = true;
      })
      .addCase(refreshToken.fulfilled, (state, action: PayloadAction<AuthResponse>) => {
        const { token, refreshToken, user } = action.payload;
        state.token = token;
        state.refreshToken = refreshToken;
        state.user = user;
        state.isAuthenticated = true;
        state.isTokenRefreshing = false;
        state.lastActive = new Date().toISOString();
      })
      .addCase(refreshToken.rejected, (state, action) => {
        state.isTokenRefreshing = false;
        state.error = action.payload as string;
      });
  },
});

// Export actions
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

// Reset auth state
export const resetAuthState = () => (dispatch: any) => {
  dispatch(clearAuthState());};

export default authSlice.reducer;
