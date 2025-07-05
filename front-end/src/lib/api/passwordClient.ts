import { BaseApiClient } from "./baseClient";

export interface PasswordChangeRequest {
  currentPassword: string;
  newPassword: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordReset {
  token: string;
  password: string;
}

export interface ApiResponse {
  message: string;
  token?: string; // Only in development
}

export class PasswordApiClient extends BaseApiClient {
  /**
   * Change password for authenticated user
   */
  async changePassword(data: PasswordChangeRequest): Promise<ApiResponse> {
    return this.request<ApiResponse>("/auth/password-change", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /**
   * Request password reset (sends email with reset link)
   */
  async requestPasswordReset(data: PasswordResetRequest): Promise<ApiResponse> {
    return this.request<ApiResponse>("/auth/password-reset/request", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /**
   * Reset password using token from email
   */
  async resetPassword(data: PasswordReset): Promise<ApiResponse> {
    return this.request<ApiResponse>("/auth/password-reset", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }
}
