import { logger } from "@/lib/logger";
import { captureAPIError } from "@/lib/sentry";

import { parseApiError } from "@/types/apiErrors";

/**
 * Base API Client
 * Core HTTP client with authentication and error handling
 */

const API_API_URL = import.meta.env.VITE_API_URL + "/api";

export abstract class BaseApiClient {
  protected baseUrl: string;

  constructor(baseUrl: string = API_API_URL) {
    this.baseUrl = baseUrl;
  }

  protected getAuthToken(): string | null {
    return localStorage.getItem("auth_token");
  }

  protected async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    try {
      const token = this.getAuthToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (options?.headers) {
        Object.assign(headers, options.headers);
      }

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
      });

      if (!response.ok) {
        // Handle 401 Unauthorized - logout user
        if (response.status === 401) {
          // Clear auth data
          localStorage.removeItem("auth_token");
          localStorage.removeItem("auth_user");

          // Dispatch event to trigger logout in AuthContext
          window.dispatchEvent(new CustomEvent("auth:unauthorized"));

          logger.warn("Received 401 Unauthorized - user logged out");
        }

        // Try to parse error response
        let errorData: unknown;
        let errorMessage = `HTTP error! status: ${response.status}`;

        try {
          errorData = await response.json();
          if (typeof errorData === "object" && errorData !== null) {
            const data = errorData as Record<string, unknown>;
            // Prefer message field, then error field, then rabbitMQReason if available
            errorMessage =
              (data.message as string) ||
              (data.rabbitMQReason as string) ||
              (data.error as string) ||
              errorMessage;
          }
        } catch (parseError) {
          // If we can't parse the error response, use the generic error
          logger.warn(
            `Could not parse error response for ${endpoint}:`,
            parseError
          );
        }

        // Parse and throw the appropriate error type
        const apiError = parseApiError(errorData || errorMessage);
        throw apiError;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      logger.error(`API request failed for ${endpoint}:`, error);

      // Capture API error in Sentry
      if (error instanceof Error) {
        captureAPIError(error, {
          endpoint,
          method: options?.method || "GET",
          response: error.message,
        });
      }

      throw error;
    }
  }

  protected async requestBlob(
    endpoint: string,
    options?: RequestInit
  ): Promise<Blob> {
    const token = this.getAuthToken();
    const headers: Record<string, string> = {};

    if (options?.headers) {
      Object.assign(headers, options.headers);
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      // Handle 401 Unauthorized - logout user
      if (response.status === 401) {
        // Clear auth data
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_user");

        // Dispatch event to trigger logout in AuthContext
        window.dispatchEvent(new CustomEvent("auth:unauthorized"));

        logger.warn("Received 401 Unauthorized - user logged out");
      }

      const error = await response.json();
      throw new Error(error.message || "Request failed");
    }

    return response.blob();
  }
}
