/**
 * Workspace permission catalog (RBAC Phase 2, rbac.md §3 / §5).
 *
 * Single source of truth for "who can do what" inside a workspace. Routers
 * MUST gate operations via `workspacePermissionProcedure(<key>)` instead of
 * comparing against `WorkspaceRole.ADMIN` etc. directly — that keeps the
 * permission model centralized and makes Phase 3 (custom roles) a pure
 * data change.
 *
 * The map below assigns each permission the *lowest* WorkspaceRole that
 * holds it. `hasPermission(role, perm)` returns true when the caller's
 * rank is >= the requirement.
 *
 * **Scope rule**: permission keys gate *workspace resources*, not the
 * caller's own session state. Procedures that read/write per-user state
 * (e.g. `getMyRole`, `switch`) stay on bare `workspaceProcedure` — adding
 * `auth:self_read` keys would bloat the catalog with no expressive power.
 *
 * Frontend imports the `WorkspacePermission` type from here (via the
 * generated tRPC types) but receives the *resolved* permission list per
 * session from `workspace.core.getMyRole`. The static role→permissions
 * map on the client is a Phase 1 shim and gets removed in PR-C.
 */

import { WORKSPACE_ROLE_RANK } from "./workspace-roles";

import { WorkspaceRole } from "@/generated/prisma/client";

export type WorkspacePermission =
  // --- Workspace ---
  | "workspace:read"
  | "workspace:update"
  | "workspace:delete"
  | "workspace:export"
  // --- Member (workspace member management) ---
  | "member:read"
  | "member:invite"
  | "member:remove"
  | "member:update_role"
  // --- Server (Qarote server records) ---
  | "server:read"
  | "server:create"
  | "server:update"
  | "server:delete"
  | "server:test_connection"
  // --- Broker (cluster-level state of the connected RabbitMQ) ---
  | "broker:read"
  | "broker:connections:read"
  | "broker:update"
  // --- Vhost ---
  | "vhost:read"
  | "vhost:create"
  | "vhost:update"
  | "vhost:delete"
  | "vhost:permissions:write"
  | "vhost:limits:write"
  // --- Queue ---
  | "queue:read"
  | "queue:write"
  | "queue:create"
  | "queue:delete"
  | "queue:purge"
  | "queue:pause"
  // --- Binding ---
  | "binding:read"
  // --- Exchange ---
  | "exchange:read"
  | "exchange:create"
  | "exchange:delete"
  // --- Policy ---
  | "policy:read"
  | "policy:write"
  | "policy:delete"
  // --- Message (live broker message ops) ---
  | "message:publish"
  | "message:tap"
  | "message:record:read"
  | "message:record:write"
  // --- Broker user (RabbitMQ broker users, distinct from workspace members) ---
  | "broker_user:read"
  | "broker_user:write"
  | "broker_user:delete"
  | "broker_user:permissions:write"
  // --- Definitions ---
  | "definitions:export"
  | "definitions:import"
  // --- Metric ---
  | "metric:read"
  // --- Alerting ---
  | "alerting:read"
  | "alerting:write"
  | "alerting:delete"
  // --- Slack integration ---
  | "slack_config:read"
  | "slack_config:write"
  | "slack_config:delete"
  // --- Webhook integration ---
  | "webhook:read"
  | "webhook:write"
  | "webhook:delete"
  // --- LLM config (workspace-scoped) ---
  | "llm_config:read"
  | "llm_config:write"
  // --- Digest (email digests) ---
  | "digest:read"
  | "digest:write"
  // --- Diagnostics ---
  | "topology:read"
  | "incident:read"
  | "scan:read"
  | "scan:run"
  // --- Audit log (Enterprise plan-gated; permission gate = workspace authz) ---
  | "audit:read"
  | "audit:export"
  // --- Custom roles & RBAC management (RBAC Phase 3, Enterprise-gated at procedure layer)
  // role:read   — names + member counts (ADMIN-tier; privacy split per Security H6)
  // role:read:assignments — full role detail incl. who holds it (OWNER-tier)
  // role:manage — create / update / delete / setPermissions / assignRole (OWNER-tier)
  | "role:read"
  | "role:read:assignments"
  | "role:manage"
  // --- API keys (machine credentials for the MCP agent surface) ---
  | "apikey:manage";

/**
 * Minimum WorkspaceRole required for each permission. A role implicitly
 * holds every permission whose requirement is at or below its rank.
 */
export const WORKSPACE_PERMISSION_REQUIREMENTS: Record<
  WorkspacePermission,
  WorkspaceRole
> = {
  // --- Workspace ---
  "workspace:read": WorkspaceRole.READONLY,
  "workspace:update": WorkspaceRole.ADMIN,
  "workspace:delete": WorkspaceRole.OWNER,
  // Full workspace data dump (members, servers, etc.) — sensitive but
  // stays at ADMIN to preserve current data.export behavior.
  "workspace:export": WorkspaceRole.ADMIN,
  // --- Member ---
  "member:read": WorkspaceRole.READONLY,
  "member:invite": WorkspaceRole.ADMIN,
  "member:remove": WorkspaceRole.ADMIN,
  "member:update_role": WorkspaceRole.ADMIN,
  // --- Server ---
  "server:read": WorkspaceRole.READONLY,
  "server:create": WorkspaceRole.ADMIN,
  "server:update": WorkspaceRole.ADMIN,
  "server:delete": WorkspaceRole.ADMIN,
  "server:test_connection": WorkspaceRole.ADMIN,
  // --- Broker ---
  "broker:read": WorkspaceRole.READONLY,
  "broker:connections:read": WorkspaceRole.READONLY,
  "broker:update": WorkspaceRole.ADMIN,
  // --- Vhost ---
  "vhost:read": WorkspaceRole.READONLY,
  "vhost:create": WorkspaceRole.ADMIN,
  "vhost:update": WorkspaceRole.ADMIN,
  "vhost:delete": WorkspaceRole.ADMIN,
  "vhost:permissions:write": WorkspaceRole.ADMIN,
  "vhost:limits:write": WorkspaceRole.ADMIN,
  // --- Queue ---
  "queue:read": WorkspaceRole.READONLY,
  // queue:write is the only MEMBER-tier key today; no router currently
  // references it, so MEMBER and READONLY are functionally identical.
  // Intentional: PR-B preserved current ADMIN-tier write gates rather than
  // re-tiering them. The MEMBER tier will gain real meaning when Phase 3
  // ships custom roles (rbac.md §10 Phase 3) and customers can define
  // their own permission bundles.
  "queue:write": WorkspaceRole.MEMBER,
  "queue:create": WorkspaceRole.ADMIN,
  "queue:delete": WorkspaceRole.ADMIN,
  "queue:purge": WorkspaceRole.ADMIN,
  "queue:pause": WorkspaceRole.ADMIN,
  // --- Binding ---
  "binding:read": WorkspaceRole.READONLY,
  // --- Exchange ---
  "exchange:read": WorkspaceRole.READONLY,
  "exchange:create": WorkspaceRole.ADMIN,
  "exchange:delete": WorkspaceRole.ADMIN,
  // --- Policy ---
  "policy:read": WorkspaceRole.READONLY,
  "policy:write": WorkspaceRole.ADMIN,
  "policy:delete": WorkspaceRole.ADMIN,
  // --- Message ---
  // tap + record:read at ADMIN — payloads expose PII / business data
  // (strictly more sensitive than queue:read metadata).
  "message:publish": WorkspaceRole.ADMIN,
  "message:tap": WorkspaceRole.ADMIN,
  "message:record:read": WorkspaceRole.ADMIN,
  // Toggling broker-level tracing — destructive broker config change.
  "message:record:write": WorkspaceRole.ADMIN,
  // --- Broker user ---
  "broker_user:read": WorkspaceRole.ADMIN,
  "broker_user:write": WorkspaceRole.ADMIN,
  "broker_user:delete": WorkspaceRole.ADMIN,
  "broker_user:permissions:write": WorkspaceRole.ADMIN,
  // --- Definitions ---
  // OWNER-only: full broker config dump is the closest thing to "give me
  // the keys" — matches workspace:delete tier. Import is even more
  // destructive (overwrites broker config) — also OWNER.
  "definitions:export": WorkspaceRole.OWNER,
  "definitions:import": WorkspaceRole.OWNER,
  // --- Metric ---
  "metric:read": WorkspaceRole.READONLY,
  // --- Alerting ---
  "alerting:read": WorkspaceRole.READONLY,
  "alerting:write": WorkspaceRole.ADMIN,
  "alerting:delete": WorkspaceRole.ADMIN,
  // --- Slack integration ---
  "slack_config:read": WorkspaceRole.READONLY,
  "slack_config:write": WorkspaceRole.ADMIN,
  "slack_config:delete": WorkspaceRole.ADMIN,
  // --- Webhook integration ---
  "webhook:read": WorkspaceRole.READONLY,
  "webhook:write": WorkspaceRole.ADMIN,
  "webhook:delete": WorkspaceRole.ADMIN,
  // --- LLM config ---
  "llm_config:read": WorkspaceRole.READONLY,
  "llm_config:write": WorkspaceRole.ADMIN,
  // --- Digest ---
  // digest:read kept at ADMIN to preserve current workspaceAdminProcedure
  // semantics. TODO: revisit when a non-admin frontend surface needs it.
  "digest:read": WorkspaceRole.ADMIN,
  "digest:write": WorkspaceRole.ADMIN,
  // --- Diagnostics ---
  "topology:read": WorkspaceRole.READONLY,
  "incident:read": WorkspaceRole.READONLY,
  "scan:read": WorkspaceRole.READONLY,
  // Force-refresh bypasses the snapshot cache and triggers a live broker
  // scan — observable side effects (cache write, broker probes), so it's
  // ADMIN-tier even though scan:read alone is non-destructive.
  "scan:run": WorkspaceRole.ADMIN,
  // --- Audit log ---
  // The plan-gate (Enterprise-only DB writes) is enforced inside the
  // service. The permission keys here gate the *read* and *export*
  // surfaces at the workspace authz layer.
  "audit:read": WorkspaceRole.ADMIN,
  // CSV/JSON export — OWNER only per rbac.md §3.180. Bulk exfil is a
  // sensitive op even for an OWNER's own data.
  "audit:export": WorkspaceRole.OWNER,
  // --- Custom roles & RBAC management (Phase 3) ---
  // Privacy split per Security H6: role:read exposes names + counts
  // for any ADMIN, but full assignment detail (who holds which role,
  // scope contents) is OWNER-only — limits org-admin enumeration
  // surface across workspaces.
  "role:read": WorkspaceRole.ADMIN,
  "role:read:assignments": WorkspaceRole.OWNER,
  // role:manage covers create / update / setPermissions / delete /
  // assignRole — all OWNER-tier since custom roles are a privilege-
  // escalation surface (a malicious ADMIN with role:manage could
  // grant themselves new permissions otherwise).
  "role:manage": WorkspaceRole.OWNER,
  // Minting/revoking machine API keys is credential issuance — OWNER-tier,
  // conservative (a key grants programmatic workspace access). Can loosen to
  // ADMIN later if needed.
  "apikey:manage": WorkspaceRole.OWNER,
};

const ALL_PERMISSIONS = Object.keys(
  WORKSPACE_PERMISSION_REQUIREMENTS
) as WorkspacePermission[];

/** True when `role` has at least the rank required by `permission`. */
export function hasPermission(
  role: WorkspaceRole,
  permission: WorkspacePermission
): boolean {
  const required = WORKSPACE_PERMISSION_REQUIREMENTS[permission];
  return WORKSPACE_ROLE_RANK[role] >= WORKSPACE_ROLE_RANK[required];
}

/**
 * Returns the permissions held by `role`. Cached per role; the cached
 * array is frozen so callers can't poison the cache via `.sort()` /
 * `.push()` etc. (TypeScript also surfaces this via the readonly return
 * type — `ReadonlyArray` is the contract).
 */
const ROLE_PERMISSION_CACHE: Partial<
  Record<WorkspaceRole, ReadonlyArray<WorkspacePermission>>
> = {};
export function permissionsForRole(
  role: WorkspaceRole
): ReadonlyArray<WorkspacePermission> {
  const cached = ROLE_PERMISSION_CACHE[role];
  if (cached) return cached;
  const list = Object.freeze(
    ALL_PERMISSIONS.filter((p) => hasPermission(role, p))
  );
  ROLE_PERMISSION_CACHE[role] = list;
  return list;
}
