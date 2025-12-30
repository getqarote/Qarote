/**
 * Auth API Response Types
 *
 * Types for auth-related API responses with proper date serialization.
 */

type SubscriptionData = {
  plan: string;
  status: string;
} | null;

type WorkspaceData = {
  id: string;
} | null;

export type PrismaUserWithDates = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  workspaceId: string | null;
  isActive: boolean;
  emailVerified: boolean;
  lastLogin: Date | null;
  createdAt: Date;
  updatedAt: Date;
  pendingEmail?: string | null;
  // Allow additional properties that may be present in Prisma select results
  [key: string]: unknown;
};

export type UserApiResponse = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  workspaceId: string | null;
  isActive: boolean;
  emailVerified: boolean;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
  pendingEmail?: string | null;
  subscription?: SubscriptionData;
  workspace?: WorkspaceData;
};

