import { AxiosError } from "axios";

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: any;

  constructor(message: string, status: number, code?: string, details?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export const handleApiError = (error: unknown): never => {
  if (error instanceof ApiError) {
    throw error;
  }

  if (error instanceof AxiosError) {
    const { response } = error;

    if (response) {
      const { status, data } = response;
      const message = data?.message || error.message || "An error occurred";
      const code = data?.code || "API_ERROR";
      const details = data?.details || {};

      throw new ApiError(message, status, code, details);
    }

    if (error.request) {
      // The request was made but no response was received
      throw new ApiError("No response from server", 0, "NO_RESPONSE");
    }
  }

  // Unknown error
  console.error("Unhandled API error:", error);
  throw new ApiError("An unexpected error occurred", 0, "UNKNOWN_ERROR");
};

export const isApiError = (error: unknown): error is ApiError => {
  return error instanceof ApiError;
};
