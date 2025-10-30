import { jwtDecode } from 'jwt-decode';

const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

interface TokenPayload {
  exp: number;
  user_id: string;
  email: string;
}

export const authService = {
  // Store tokens in localStorage
  setAuthTokens: (token: string, refreshToken: string) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },

  // Get access token
  getAccessToken: (): string | null => {
    return localStorage.getItem(TOKEN_KEY);
  },

  // Get refresh token
  getRefreshToken: (): string | null => {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  // Clear auth data
  clearAuth: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },

  // Check if token is expired
  isTokenExpired: (token: string): boolean => {
    try {
      const decoded = jwtDecode<TokenPayload>(token);
      return decoded.exp < Date.now() / 1000;
    } catch (e) {
      return true;
    }
  },

  // Get current user info from token
  getCurrentUser: (): TokenPayload | null => {
    const token = authService.getAccessToken();
    if (!token) return null;
    try {
      return jwtDecode<TokenPayload>(token);
    } catch (e) {
      return null;
    }
  },

  // Check if user is authenticated
  isAuthenticated: (): boolean => {
    const token = authService.getAccessToken();
    return !!token && !authService.isTokenExpired(token);
  },
};
