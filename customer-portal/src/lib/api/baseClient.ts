/**
 * Base API Client
 * Core HTTP client with authentication and error handling
 */

import { logger } from "@/lib/logger";

const API_URL = import.meta.env.VITE_API_URL;
const API_BASE_URL = `${API_URL}/api`;

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
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_user");
        window.dispatchEvent(new CustomEvent("auth:unauthorized"));
      }

      let errorData: unknown;
      let errorMessage = `HTTP error! status: ${response.status}`;

      try {
        errorData = await response.json();
        if (typeof errorData === "object" && errorData !== null) {
          const data = errorData as Record<string, unknown>;
          errorMessage =
            (data.message as string) || (data.error as string) || errorMessage;
        }
      } catch (error) {
        logger.error("Error parsing error response:", error);
        // If we can't parse the error response, use the generic error
      }

      throw new Error(errorMessage);
    }

    return response.json();
  }
}
