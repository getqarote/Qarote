/**
 * Authentication API Client
 */

import { BaseApiClient } from "./baseClient";

export interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  workspaceId: string | null;
  isActive: boolean;
  emailVerified: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export class AuthApiClient extends BaseApiClient {
  async login(
    credentials: LoginRequest
  ): Promise<{ user: User; token: string }> {
    return this.request<{ user: User; token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
  }

  async googleLogin(
    credential: string
  ): Promise<{ user: User; token: string }> {
    return this.request<{ user: User; token: string }>("/auth/google", {
      method: "POST",
      body: JSON.stringify({ credential }),
    });
  }

  async getProfile(): Promise<{ profile: User }> {
    return this.request<{ profile: User }>("/users/profile/me");
  }
}
