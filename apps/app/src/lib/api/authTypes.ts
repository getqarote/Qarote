/**
 * Authentication Types
 * Contains interfaces for user authentication and management
 */

export enum UserRole {
  ADMIN = "ADMIN",
}

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  // TODO: fix this shit
  workspaceId?: string | null;
  workspace?: Workspace;
  isActive: boolean;
  emailVerified?: boolean;
  emailVerifiedAt?: string;
  pendingEmail?: string;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
  authProvider?: "google" | "password";
  hasPassword?: boolean;
  image?: string | null;
}

interface Workspace {
  id: string;
  name: string;
  contactEmail?: string;
  logoUrl?: string;
  ownerId?: string;
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

export interface UserProfile extends User {
  workspace?: Workspace;
}
