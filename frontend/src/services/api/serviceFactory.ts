import { AxiosRequestConfig, AxiosResponse } from "axios";
import { apiClient } from "./config";
import { handleApiError, ApiError } from "./errorHandler";

type HttpMethod = "get" | "post" | "put" | "delete" | "patch";

interface ApiServiceConfig extends Omit<AxiosRequestConfig, "method" | "url"> {
  requiresAuth?: boolean;
}

export const createApiService = <T = any>(
  endpoint: string,
  method: HttpMethod = "get",
  defaultConfig: ApiServiceConfig = {},
) => {
  return async (
    data?: any,
    config: Omit<ApiServiceConfig, "data"> = {},
  ): Promise<T> => {
    const { requiresAuth = true, ...requestConfig } = {
      ...defaultConfig,
      ...config,
    };

    if (requiresAuth) {
      const token = localStorage.getItem("authToken");
      if (!token) {
        throw new ApiError("Authentication required", 401, "UNAUTHORIZED");
      }
      requestConfig.headers = {
        ...requestConfig.headers,
        Authorization: `Bearer ${token}`,
      };
    }

    try {
      const request: AxiosRequestConfig = {
        ...requestConfig,
        method,
        url: endpoint,
      };

      if (["post", "put", "patch"].includes(method)) {
        request.data = data;
      } else if (data) {
        request.params = data;
      }

      const response: AxiosResponse<T> = await apiClient(request);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  };
};

// Helper methods for common HTTP methods
export const api = {
  get: <T = any>(endpoint: string, config: ApiServiceConfig = {}) =>
    createApiService<T>(endpoint, "get", config),

  post: <T = any>(endpoint: string, config: ApiServiceConfig = {}) =>
    createApiService<T>(endpoint, "post", config),

  put: <T = any>(endpoint: string, config: ApiServiceConfig = {}) =>
    createApiService<T>(endpoint, "put", config),

  delete: <T = any>(endpoint: string, config: ApiServiceConfig = {}) =>
    createApiService<T>(endpoint, "delete", config),

  patch: <T = any>(endpoint: string, config: ApiServiceConfig = {}) =>
    createApiService<T>(endpoint, "patch", config),
};

// Export types for external use
export type { ApiServiceConfig };
export { ApiError } from "./errorHandler";
