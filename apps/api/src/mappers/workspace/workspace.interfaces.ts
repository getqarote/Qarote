/**
 * Workspace API Response Types
 *
 * Types for workspace-related API responses with proper date serialization.
 */

export type PrismaWorkspaceWithDates = {
  id: string;
  name: string;
  contactEmail: string | null;
  logoUrl: string | null;
  ownerId: string | null;
  tags: unknown;
  emailNotificationsEnabled: boolean;
  notificationSeverities: unknown;
  browserNotificationsEnabled: boolean;
  browserNotificationSeverities: unknown;
  notificationServerIds: unknown;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    members: number;
    servers: number;
  };
  // Allow additional properties that may be present in Prisma select results
  [key: string]: unknown;
};

export type WorkspaceApiResponse = {
  id: string;
  name: string;
  contactEmail: string | null;
  logoUrl: string | null;
  ownerId: string | null;
  tags: unknown;
  emailNotificationsEnabled: boolean;
  notificationSeverities: unknown;
  browserNotificationsEnabled: boolean;
  browserNotificationSeverities: unknown;
  notificationServerIds: unknown;
  createdAt: string;
  updatedAt: string;
  _count?: {
    members: number;
    servers: number;
  };
  // Allow additional properties that may be added by controllers
  [key: string]: unknown;
};

