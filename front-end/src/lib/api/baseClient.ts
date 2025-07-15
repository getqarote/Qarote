import logger from "../logger";
import { captureAPIError } from "../sentry";
/**
 * Base API Client
 * Core HTTP client with authentication and error handling
 */

const API_BASE_URL = import.meta.env.BASE_URL + "/api";

export abstract class BaseApiClient {
  protected baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
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
        // Try to parse error response
        let errorMessage = `HTTP error! status: ${response.status}`;

        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (parseError) {
          // If we can't parse the error response, use the generic error
          logger.warn(
            `Could not parse error response for ${endpoint}:`,
            parseError
          );
        }

        throw new Error(errorMessage);
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
      const error = await response.json();
      throw new Error(error.message || "Request failed");
    }

    return response.blob();
  }
}
