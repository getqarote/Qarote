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
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  contactEmail?: string;
  logoUrl?: string;
  planType: string;
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
