/**
 * Authentication API Client
 * Handles user authentication and profile management
 */

import { BaseApiClient } from "./baseClient";
import {
  LoginRequest,
  RegisterRequest,
  User,
  UserProfile,
  UpdateProfileRequest,
  UpdateCompanyRequest,
  InviteUserRequest,
  Company,
  Invitation,
} from "./authTypes";

export class AuthApiClient extends BaseApiClient {
  async login(
    credentials: LoginRequest
  ): Promise<{ user: User; token: string }> {
    return this.request<{ user: User; token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
  }

  async register(
    userData: RegisterRequest
  ): Promise<{ user: User; token: string }> {
    return this.request<{ user: User; token: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  }

  async getProfile(): Promise<{ profile: UserProfile }> {
    return this.request<{ profile: UserProfile }>("/users/profile/me");
  }

  async updateProfile(userData: UpdateProfileRequest): Promise<{ user: User }> {
    return this.request<{ user: User }>("/users/profile/me", {
      method: "PUT",
      body: JSON.stringify(userData),
    });
  }

  async updateCompany(
    companyData: UpdateCompanyRequest
  ): Promise<{ company: Company }> {
    return this.request<{ company: Company }>("/users/profile/company", {
      method: "PUT",
      body: JSON.stringify(companyData),
    });
  }

  async getCompanyUsers(): Promise<{ users: User[] }> {
    return this.request<{ users: User[] }>("/users/profile/company/users");
  }

  async inviteUser(
    userData: InviteUserRequest
  ): Promise<{ invitation: Invitation }> {
    return this.request<{ invitation: Invitation }>("/users/invite", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  }

  async logout(): Promise<void> {
    return this.request<void>("/auth/logout", {
      method: "POST",
    });
  }
}
