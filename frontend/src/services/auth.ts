import { jwtDecode } from "jwt-decode";
import { authApi } from "@/lib/utils/api";

const TOKEN_KEY = "auth_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const USER_KEY = "user_data";

export interface TokenPayload {
  exp: number;
  user_id: string;
  email: string;
  name: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupData extends LoginCredentials {
  name: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

class AuthService {
  // Store authentication data
  setAuthData(data: AuthResponse): void {
    localStorage.setItem(TOKEN_KEY, data.access_token);
    localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  }

  // Get access token
  getAccessToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  // Get refresh token
  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  // Clear auth data
  clearAuth(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  // Login user
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await authApi.login(credentials.email, credentials.password);
      this.setAuthData(response);
      return response;
    } catch (error) {
      this.clearAuth();
      throw error;
    }
  }

  // Register new user
  async signup(userData: SignupData): Promise<AuthResponse> {
    const response = await authApi.signup(userData.name, userData.email, userData.password);
    this.setAuthData(response);
    return response;
  }

  // Refresh access token
  async refreshToken(): Promise<{ access_token: string }> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    try {
      const response = await authApi.refreshToken(refreshToken);
      localStorage.setItem(TOKEN_KEY, response.access_token);
      return response;
    } catch (error) {
      this.clearAuth();
      throw error;
    }
  }

  // Get current user from localStorage
  getCurrentUser(): { id: string; email: string; name: string } | null {
    const userData = localStorage.getItem(USER_KEY);
    return userData ? JSON.parse(userData) : null;
  }

  // Check if token is expired
  isTokenExpired(token: string): boolean {
    try {
      const decoded = jwtDecode<TokenPayload>(token);
      return decoded.exp < Date.now() / 1000;
    } catch (error) {
      return true;
    }
  }

  // Get token payload
  getTokenPayload(): TokenPayload | null {
    const token = this.getAccessToken();
    if (!token) return null;

    try {
      return jwtDecode<TokenPayload>(token);
    } catch (error) {
      return null;
    }
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    const token = this.getAccessToken();
    return !!(token && !this.isTokenExpired(token));
  }

  // Logout user
  async logout(): Promise<void> {
    try {
      const refreshToken = this.getRefreshToken();
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      this.clearAuth();
    }
  }
}

// Create a singleton instance
export const authService = new AuthService();

export default authService;
};
