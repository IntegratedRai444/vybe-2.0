import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import { authService } from "./auth";

type HttpMethod = "get" | "post" | "put" | "delete" | "patch";

interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: any;
  config: AxiosRequestConfig;
}

interface ApiError extends Error {
  config: AxiosRequestConfig;
  code?: string;
  status?: number;
  response?: {
    status: number;
    data: any;
    headers: any;
  };
  isApiError: boolean;
}

interface RequestOptions extends AxiosRequestConfig {
  retries?: number;
  retryDelay?: number;
  timeout?: number;
  throwOnError?: boolean;
}

const DEFAULT_RETRIES = 2;
const DEFAULT_RETRY_DELAY = 1000; // 1 second
const DEFAULT_TIMEOUT = 10000; // 10 seconds

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

class ApiClient {
  private client: AxiosInstance;
  private refreshPromise: Promise<string | null> | null = null;
  // Remove unused isRefreshing since we're using refreshPromise for tracking refresh state
  // private isRefreshing = false;
  // Queue for requests waiting for token refresh
  private pendingRequests: Array<() => void> = [];

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        Expires: "0",
      },
      withCredentials: true,
      timeout: DEFAULT_TIMEOUT,
    });

    // Request interceptor for auth token and common headers
    this.client.interceptors.request.use(
      (config) => {
        const token = authService.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Add request timestamp
        config.headers["X-Request-Timestamp"] = new Date().toISOString();

        // Add request ID for tracking
        config.headers["X-Request-ID"] = Math.random()
          .toString(36)
          .substr(2, 9);

        return config;
      },
      (error) => {
        const apiError: ApiError = {
          ...error,
          isApiError: true,
          message: error.message || "Request failed",
        };
        return Promise.reject(apiError);
      },
    );

    // Response interceptor for token refresh and error handling
    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as any;

        // Create a standardized error object
        const apiError: ApiError = {
          name: "ApiError",
          message: error.message,
          stack: error.stack,
          config: error.config || {},
          code: error.code,
          status: error.response?.status,
          response: error.response
            ? {
                status: error.response.status,
                data: error.response.data,
                headers: error.response.headers,
              }
            : undefined,
          isApiError: true,
        } as ApiError;

        // Handle 401 Unauthorized errors
        if (error.response?.status === 401) {
          if (originalRequest.url?.includes("/auth/refresh")) {
            // If refresh token fails, clear auth and redirect
            authService.clearAuth();
            window.location.href = "/login";
            return Promise.reject(apiError);
          }

          // Set retry flag
          originalRequest._retry = true;

          try {
            // Get new access token
            const newToken = await this.refreshToken();
            if (newToken) {
              // Update the Authorization header
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              // Retry the original request
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            authService.clearAuth();
            window.location.href = "/login";
            return Promise.reject(refreshError);
          }
        }
        return Promise.reject(error);
      },
    );
  }

  private async refreshToken(): Promise<string | null> {
    // If we're already refreshing, return the existing promise
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    const refreshToken = authService.getRefreshToken();
    if (!refreshToken) {
      return null;
    }

    try {
      this.refreshPromise = (async () => {
        // Call your backend refresh token endpoint here
        const response = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {
            refresh_token: refreshToken,
          },
          {
            headers: {
              "Content-Type": "application/json",
            },
          },
        );

        if (response.data.access_token) {
          authService.setAuthTokens(
            response.data.access_token,
            response.data.refresh_token || refreshToken,
          );
          // Process any queued requests
          this.processQueue();
          return response.data.access_token;
        }

        throw new Error("No access token in response");
      })();

      return this.refreshPromise;
    } catch (error) {
      const errorObj = error as Error;
      // Process any queued requests
      this.processQueue();

      console.error("Failed to refresh token:", errorObj);
      authService.clearAuth();
      throw errorObj;
    } finally {
      this.refreshPromise = null;
    }
  }

  /**
   * Process queued requests after token refresh
   */
  private processQueue(): void {
    this.pendingRequests.forEach((cb) => {
      try {
        // Call the callback without any arguments
        cb();
      } catch (err) {
        console.error("Error in request callback:", err);
      }
    });
    this.pendingRequests = [];
  }

  /**
   * Make an HTTP request with retry logic
   */
  private async request<T = any>(
    method: HttpMethod,
    url: string,
    data?: any,
    options: RequestOptions = {},
  ): Promise<ApiResponse<T>> {
    const {
      retries = DEFAULT_RETRIES,
      retryDelay = DEFAULT_RETRY_DELAY,
      timeout = DEFAULT_TIMEOUT,
      throwOnError = true,
      ...axiosConfig
    } = options;

    let lastError: any;
    let attempt = 0;

    while (attempt <= retries) {
      try {
        const response = await this.client.request<T>({
          method,
          url,
          data,
          timeout,
          ...axiosConfig,
        } as AxiosRequestConfig);

        return {
          data: response.data,
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          config: response.config,
        };
      } catch (error: any) {
        lastError = this.normalizeError(error);

        if (this.shouldNotRetry(error) || attempt >= retries) {
          if (throwOnError) {
            throw lastError;
          }
          return {
            data: null as any,
            status: error.response?.status || 500,
            statusText: error.response?.statusText || "Internal Server Error",
            headers: error.response?.headers || {},
            config: error.config || {},
          };
        }

        // Wait before retrying
        await new Promise((resolve) =>
          setTimeout(resolve, retryDelay * (attempt + 1)),
        );
        attempt++;
      }
    }

    // This should never be reached, but TypeScript needs it
    throw lastError || new Error("Request failed");
  }

  /**
   * Check if a request should not be retried
   */
  private shouldNotRetry(error: any): boolean {
    // Don't retry if there's no response (network error)
    if (!error.response) {
      return true;
    }

    // Don't retry on these status codes
    const nonRetryableStatuses = [400, 401, 403, 404, 422];
    return nonRetryableStatuses.includes(error.response.status);
  }

  /**
   * Normalize error object
   */
  private normalizeError(error: any): ApiError {
    if (error.isApiError) return error as ApiError;

    return {
      name: error.name || "ApiError",
      message: error.message || "An unknown error occurred",
      stack: error.stack,
      config: error.config || {},
      code: error.code,
      status: error.response?.status,
      response: error.response
        ? {
            status: error.response.status,
            data: error.response.data,
            headers: error.response.headers,
          }
        : undefined,
      isApiError: true,
    } as ApiError;
  }

  /**
   * Public HTTP methods with proper typing
   */
  public async get<T = any>(
    url: string,
    params?: any,
    config: RequestOptions = {},
  ): Promise<T> {
    const response = await this.request<T>("get", url, params, config);
    return response.data;
  }

  public async post<T = any>(
    url: string,
    data?: any,
    config: RequestOptions = {},
  ): Promise<T> {
    const response = await this.request<T>("post", url, data, config);
    return response.data;
  }

  public async put<T = any>(
    url: string,
    data?: any,
    config: RequestOptions = {},
  ): Promise<T> {
    const response = await this.request<T>("put", url, data, config);
    return response.data;
  }

  public async delete<T = any>(
    url: string,
    config: RequestOptions = {},
  ): Promise<T> {
    const response = await this.request<T>("delete", url, undefined, config);
    return response.data;
  }

  public async patch<T = any>(
    url: string,
    data?: any,
    config: RequestOptions = {},
  ): Promise<T> {
    const response = await this.request<T>("patch", url, data, config);
    return response.data;
  }

  /**
   * Add a request interceptor
   */
  public addRequestInterceptor(
    onFulfilled?: (
      value: InternalAxiosRequestConfig,
    ) => InternalAxiosRequestConfig | Promise<InternalAxiosRequestConfig>,
    onRejected?: (error: any) => any,
  ): number {
    return this.client.interceptors.request.use(onFulfilled, onRejected);
  }

  /**
   * Add a response interceptor
   */
  public addResponseInterceptor(
    onFulfilled?: (
      value: AxiosResponse,
    ) => AxiosResponse | Promise<AxiosResponse>,
    onRejected?: (error: any) => any,
  ): number {
    return this.client.interceptors.response.use(onFulfilled, onRejected);
  }

  /**
   * Remove an interceptor
   */
  public removeInterceptor(interceptorId: number): void {
    this.client.interceptors.request.eject(interceptorId);
    this.client.interceptors.response.eject(interceptorId);
  }
}

export const apiClient = new ApiClient();
