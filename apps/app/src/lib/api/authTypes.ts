/**
 * Authentication Types
 * Contains interfaces for user authentication and management
 */

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
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
  googleId?: string | null;
}

interface Workspace {
  id: string;
  name: string;
  contactEmail?: string;
  logoUrl?: string;
  ownerId?: string;
  // plan: "FREE" | "DEVELOPER" | "ENTERPRISE";
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

interface Invitation {
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
