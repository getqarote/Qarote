/**
 * Authentication Types
 * Contains interfaces for user authentication and management
 */

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  workspaceName?: string;
}

export interface RegisterResponse {
  message: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    workspaceId?: string;
  };
}

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  workspaceId?: string;
  isActive: boolean;
  emailVerified?: boolean;
  emailVerifiedAt?: string;
  pendingEmail?: string;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  contactEmail?: string;
  logoUrl?: string;
  plan: "FREE" | "DEVELOPER" | "ENTERPRISE";
  storageMode: string;
  retentionDays: number;
  encryptData: boolean;
  autoDelete: boolean;
  consentGiven: boolean;
  consentDate?: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    users: number;
    servers: number;
  };
}

// Legacy type alias for backwards compatibility
export type Company = Workspace;

export interface UserProfile extends User {
  workspace?: Workspace;
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
}

export interface UpdateWorkspaceRequest {
  name?: string;
  contactEmail?: string;
  logoUrl?: string;
  planType?: "FREE" | "PREMIUM" | "ENTERPRISE";
}

// Legacy type alias for backwards compatibility
export type UpdateCompanyRequest = UpdateWorkspaceRequest;

export interface InviteUserRequest {
  email: string;
  role: "ADMIN" | "USER" | "READONLY";
  workspaceId: string;
}

export interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  token: string;
  createdAt: string;
  expiresAt: string;
}

// New invitation types for the enhanced system
export interface InvitationWithInviter extends Invitation {
  invitedBy: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    displayName: string;
  };
}

export interface SendInvitationRequest {
  email: string;
  role: "USER" | "ADMIN";
  message?: string;
}

export interface SendInvitationResponse {
  success: boolean;
  message: string;
  invitation: {
    id: string;
    email: string;
    role: string;
    expiresAt: string;
    monthlyCost: number;
  };
  emailResult: {
    messageId: string;
  };
}

export interface GetInvitationsResponse {
  success: boolean;
  invitations: InvitationWithInviter[];
  count: number;
}

export interface InvitationDetailsResponse {
  success: boolean;
  invitation: {
    id: string;
    email: string;
    role: string;
    expiresAt: string;
    workspace: {
      id: string;
      name: string;
      plan: string;
    };
    inviter: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      email: string;
      displayName: string;
    };
  };
}

export interface AcceptInvitationResponse {
  success: boolean;
  message: string;
  user?: {
    id: string;
    email: string;
    displayName: string;
  };
  workspace?: {
    id: string;
    name: string;
  };
  requiresRegistration?: boolean;
  invitation?: {
    token: string;
    email: string;
    role: string;
    workspaceName: string;
    inviterName: string;
  };
}

export interface RevokeInvitationResponse {
  success: boolean;
  message: string;
}
