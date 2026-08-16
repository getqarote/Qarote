/**
 * Authentication Types
 * Contains interfaces for user authentication and management
 */

/**
 * Workspace-scoped roles (OWNER > ADMIN > MEMBER > READONLY).
 * Mirrors the WorkspaceRole enum in the Prisma schema — keep in sync.
 */
export enum WorkspaceRole {
  OWNER = "OWNER",
  ADMIN = "ADMIN",
  MEMBER = "MEMBER",
  READONLY = "READONLY",
}

/** Numeric rank — higher = more privilege. Used for canGrantRole comparisons. */
export const WORKSPACE_ROLE_RANK: Record<WorkspaceRole, number> = {
  [WorkspaceRole.OWNER]: 3,
  [WorkspaceRole.ADMIN]: 2,
  [WorkspaceRole.MEMBER]: 1,
  [WorkspaceRole.READONLY]: 0,
};

/**
 * Phase 1 permission keys.
 * These map to role bundles below — no custom roles shipped yet (Phase 2).
 */
export type WorkspacePermission =
  | "workspace:read"
  | "workspace:update"
  | "workspace:delete"
  | "member:invite"
  | "member:remove"
  | "member:update_role"
  | "server:read"
  | "server:create"
  | "server:update"
  | "server:delete"
  | "queue:read"
  | "queue:write"
  // OWNER-tier: minting/revoking machine API keys (backend maps
  // apikey:manage → OWNER). Only OWNER (= ALL_PERMISSIONS) gets it below.
  | "apikey:manage";

const ALL_PERMISSIONS = new Set<WorkspacePermission>([
  "workspace:read",
  "workspace:update",
  "workspace:delete",
  "member:invite",
  "member:remove",
  "member:update_role",
  "server:read",
  "server:create",
  "server:update",
  "server:delete",
  "queue:read",
  "queue:write",
  "apikey:manage",
]);

export const ROLE_PERMISSIONS: Record<
  WorkspaceRole,
  ReadonlySet<WorkspacePermission>
> = {
  [WorkspaceRole.OWNER]: ALL_PERMISSIONS,
  [WorkspaceRole.ADMIN]: new Set<WorkspacePermission>([
    "workspace:read",
    "workspace:update",
    "member:invite",
    "member:remove",
    "member:update_role",
    "server:read",
    "server:create",
    "server:update",
    "server:delete",
    "queue:read",
    "queue:write",
  ]),
  [WorkspaceRole.MEMBER]: new Set<WorkspacePermission>([
    "workspace:read",
    "server:read",
    "queue:read",
    "queue:write",
  ]),
  [WorkspaceRole.READONLY]: new Set<WorkspacePermission>([
    "workspace:read",
    "server:read",
    "queue:read",
  ]),
};

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
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

/**
 * A workspace member as returned by `user.getWorkspaceUsers`.
 *
 * Distinct from `User` because:
 *   - `role` is the WorkspaceMember role (a built-in `WorkspaceRole` enum
 *     value or the literal `"CUSTOM"` when the member is on a custom role).
 *     A bare `as WorkspaceRole` cast silently succeeds for `"CUSTOM"` and
 *     breaks every `WORKSPACE_ROLE_RANK[role]` lookup downstream.
 *   - `memberId` is the `WorkspaceMember.id` — required by
 *     `workspace.role.assignRole`, which addresses members by their
 *     membership row, not their user row.
 */
export interface WorkspaceMember extends User {
  memberId: string;
  role: WorkspaceRole | "CUSTOM";
}
