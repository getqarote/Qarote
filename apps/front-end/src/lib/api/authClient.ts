/**
 * Authentication API Client
 * Handles user authentication and profile management
 */

import {
  AcceptInvitationResponse,
  GetInvitationsResponse,
  InvitationDetailsResponse,
  LoginRequest,
  RegisterRequest,
  RegisterResponse,
  RevokeInvitationResponse,
  SendInvitationRequest,
  SendInvitationResponse,
  UpdateProfileRequest,
  UpdateWorkspaceRequest,
  User,
  UserProfile,
  Workspace,
} from "./authTypes";
import { BaseApiClient } from "./baseClient";

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

  async register(userData: RegisterRequest): Promise<RegisterResponse> {
    return this.request<RegisterResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  }

  async getProfile(workspaceId: string): Promise<{ profile: UserProfile }> {
    return this.request<{ profile: UserProfile }>(
      `/workspaces/${workspaceId}/users/me`
    );
  }

  async updateProfile(
    workspaceId: string,
    userData: UpdateProfileRequest
  ): Promise<{ user: User }> {
    return this.request<{ user: User }>(`/workspaces/${workspaceId}/users/me`, {
      method: "PUT",
      body: JSON.stringify(userData),
    });
  }

  async updateWorkspace(
    workspaceId: string,
    workspaceData: UpdateWorkspaceRequest
  ): Promise<{ workspace: Workspace }> {
    return this.request<{ workspace: Workspace }>(
      `/workspaces/${workspaceId}/users/profile/workspace`,
      {
        method: "PUT",
        body: JSON.stringify(workspaceData),
      }
    );
  }

  async getCompanyUsers(): Promise<{ users: User[] }> {
    return this.request<{ users: User[] }>("/users/profile/company/users");
  }

  // New workspace users method
  async getWorkspaceUsers(workspaceId: string): Promise<{ users: User[] }> {
    return this.request<{ users: User[] }>(`/workspaces/${workspaceId}/users`);
  }

  // async logout(): Promise<void> {
  //   return this.request<void>("/auth/logout", {
  //     method: "POST",
  //   });
  // }

  // Invitation management
  async getInvitations(): Promise<GetInvitationsResponse> {
    return this.request<GetInvitationsResponse>("/workspaces/invitations");
  }

  async sendInvitation(
    invitationData: SendInvitationRequest
  ): Promise<SendInvitationResponse> {
    return this.request<SendInvitationResponse>("/workspaces/invitations", {
      method: "POST",
      body: JSON.stringify(invitationData),
    });
  }

  async revokeInvitation(
    invitationId: string
  ): Promise<RevokeInvitationResponse> {
    return this.request<RevokeInvitationResponse>(
      `/workspaces/invitations/${invitationId}`,
      {
        method: "DELETE",
      }
    );
  }

  async getInvitationDetails(
    token: string
  ): Promise<InvitationDetailsResponse> {
    return this.request<InvitationDetailsResponse>(`/invitations/${token}`);
  }

  async acceptInvitation(token: string): Promise<AcceptInvitationResponse> {
    return this.request<AcceptInvitationResponse>(
      `/invitations/${token}/accept`,
      {
        method: "POST",
      }
    );
  }

  async acceptInvitationWithRegistration(
    token: string,
    registrationData: {
      password: string;
      firstName: string;
      lastName: string;
    }
  ): Promise<{ user: User; token: string; workspace: Workspace }> {
    return this.request<{ user: User; token: string; workspace: Workspace }>(
      "/auth/invitation/accept",
      {
        method: "POST",
        body: JSON.stringify({
          token,
          ...registrationData,
        }),
      }
    );
  }

  async acceptInvitationWithGoogle(
    token: string,
    credential: string
  ): Promise<{
    user: User;
    token: string;
    workspace: Workspace;
    isNewUser: boolean;
  }> {
    return this.request<{
      user: User;
      token: string;
      workspace: Workspace;
      isNewUser: boolean;
    }>(`/invitations/${token}/accept-google`, {
      method: "POST",
      body: JSON.stringify({ credential }),
    });
  }

  // Email verification methods
  async verifyEmail(token: string): Promise<{
    message: string;
    user: User;
    type: string;
  }> {
    return this.request<{
      message: string;
      user: User;
      type: string;
    }>("/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
  }

  async resendVerificationEmail(
    type: "SIGNUP" | "EMAIL_CHANGE" = "SIGNUP"
  ): Promise<{
    message: string;
  }> {
    return this.request<{
      message: string;
    }>("/auth/resend-verification", {
      method: "POST",
      body: JSON.stringify({ type }),
    });
  }

  async getVerificationStatus(): Promise<{
    emailVerified: boolean;
    emailVerifiedAt: string | null;
    pendingEmail: string | null;
    hasPendingSignupVerification: boolean;
    hasPendingEmailChange: boolean;
  }> {
    return this.request<{
      emailVerified: boolean;
      emailVerifiedAt: string | null;
      pendingEmail: string | null;
      hasPendingSignupVerification: boolean;
      hasPendingEmailChange: boolean;
    }>("/auth/verification-status");
  }

  // Email change methods
  async requestEmailChange(data: {
    newEmail: string;
    password: string;
  }): Promise<{
    message: string;
    pendingEmail: string;
  }> {
    return this.request<{
      message: string;
      pendingEmail: string;
    }>("/auth/email-change/request", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async cancelEmailChange(): Promise<{
    message: string;
  }> {
    return this.request<{
      message: string;
    }>("/auth/email-change/cancel", {
      method: "POST",
    });
  }
}
