/**
 * Permission catalog manifest — single source of truth for the
 * `Permission` table (RBAC Phase 3).
 *
 * This file is the load-bearing artifact for two consumers:
 *
 *   1. The migration in `prisma/migrations/2026..._rbac_phase3/`
 *      uses the entries here to seed the `Permission` table on
 *      first run. Future permission additions require a NEW migration
 *      that INSERTs the new keys (sync-on-boot is rejected — multi-
 *      pod write race).
 *
 *   2. The `apps/api/src/auth/permissions.ts` `WorkspacePermission`
 *      union is the typesafe mirror. Every key in this manifest MUST
 *      appear in that union; a structural test asserts the symmetry.
 *
 * Adding a key is a 3-step change:
 *   (a) add the key to `WorkspacePermission` and
 *       `WORKSPACE_PERMISSION_REQUIREMENTS` in `permissions.ts`
 *   (b) append an entry here (preserving order is not required)
 *   (c) ship a new migration that `INSERT ... ON CONFLICT DO NOTHING`
 *       the new row + the built-in `RolePermission` grants
 *
 * Soft-deprecation uses `deprecatedAt` on the `Permission` row; the
 * key stays in this manifest until all customer custom roles have
 * stopped referencing it.
 */

export interface PermissionManifestEntry {
  key: string;
  /** First segment of the dotted key (e.g. "queue" for "queue:purge"). */
  category: string;
  /** Human-readable, surfaced in the permission picker UI. */
  description: string;
}

export const PERMISSION_MANIFEST: ReadonlyArray<PermissionManifestEntry> = [
  // Workspace
  {
    key: "workspace:read",
    category: "workspace",
    description: "View workspace settings",
  },
  {
    key: "workspace:update",
    category: "workspace",
    description: "Update workspace settings",
  },
  {
    key: "workspace:delete",
    category: "workspace",
    description: "Delete the workspace",
  },
  {
    key: "workspace:export",
    category: "workspace",
    description: "Export workspace data",
  },

  // Workspace members
  {
    key: "member:read",
    category: "member",
    description: "View workspace members",
  },
  {
    key: "member:invite",
    category: "member",
    description: "Invite new members to the workspace",
  },
  {
    key: "member:remove",
    category: "member",
    description: "Remove members from the workspace",
  },
  {
    key: "member:update_role",
    category: "member",
    description: "Change a member's role",
  },

  // Qarote server records (not broker users)
  {
    key: "server:read",
    category: "server",
    description: "View RabbitMQ server connections",
  },
  {
    key: "server:create",
    category: "server",
    description: "Connect a new RabbitMQ server",
  },
  {
    key: "server:update",
    category: "server",
    description: "Edit RabbitMQ server connections",
  },
  {
    key: "server:delete",
    category: "server",
    description: "Disconnect a RabbitMQ server",
  },
  {
    key: "server:test_connection",
    category: "server",
    description: "Test a RabbitMQ server connection",
  },

  // Broker cluster state
  {
    key: "broker:read",
    category: "broker",
    description: "View broker overview and stats",
  },
  {
    key: "broker:connections:read",
    category: "broker",
    description: "View broker AMQP connections",
  },
  {
    key: "broker:update",
    category: "broker",
    description: "Modify broker-level configuration",
  },

  // Virtual hosts
  { key: "vhost:read", category: "vhost", description: "View virtual hosts" },
  {
    key: "vhost:create",
    category: "vhost",
    description: "Create a virtual host",
  },
  {
    key: "vhost:update",
    category: "vhost",
    description: "Update a virtual host",
  },
  {
    key: "vhost:delete",
    category: "vhost",
    description: "Delete a virtual host",
  },
  {
    key: "vhost:permissions:write",
    category: "vhost",
    description: "Modify virtual host permissions",
  },
  {
    key: "vhost:limits:write",
    category: "vhost",
    description: "Modify virtual host limits",
  },

  // Queues
  { key: "queue:read", category: "queue", description: "View queues" },
  {
    key: "queue:write",
    category: "queue",
    description: "Modify queue arguments",
  },
  { key: "queue:create", category: "queue", description: "Create a queue" },
  { key: "queue:delete", category: "queue", description: "Delete a queue" },
  {
    key: "queue:purge",
    category: "queue",
    description: "Purge messages from a queue",
  },
  {
    key: "queue:pause",
    category: "queue",
    description: "Pause / resume a queue's consumers",
  },

  // Bindings
  { key: "binding:read", category: "binding", description: "View bindings" },

  // Exchanges
  { key: "exchange:read", category: "exchange", description: "View exchanges" },
  {
    key: "exchange:create",
    category: "exchange",
    description: "Create an exchange",
  },
  {
    key: "exchange:delete",
    category: "exchange",
    description: "Delete an exchange",
  },

  // Policies
  {
    key: "policy:read",
    category: "policy",
    description: "View broker policies",
  },
  {
    key: "policy:write",
    category: "policy",
    description: "Create or update broker policies",
  },
  {
    key: "policy:delete",
    category: "policy",
    description: "Delete broker policies",
  },

  // Live broker message ops
  {
    key: "message:publish",
    category: "message",
    description: "Publish a message to the broker",
  },
  {
    key: "message:tap",
    category: "message",
    description: "Tap live messages (firehose)",
  },
  {
    key: "message:record:read",
    category: "message",
    description: "View recorded message metadata",
  },
  {
    key: "message:record:write",
    category: "message",
    description: "Manage recorded message captures",
  },

  // Broker users (RabbitMQ users, distinct from workspace members)
  {
    key: "broker_user:read",
    category: "broker_user",
    description: "View broker users",
  },
  {
    key: "broker_user:write",
    category: "broker_user",
    description: "Create or update broker users",
  },
  {
    key: "broker_user:delete",
    category: "broker_user",
    description: "Delete broker users",
  },
  {
    key: "broker_user:permissions:write",
    category: "broker_user",
    description: "Set broker user permissions",
  },

  // Definitions
  {
    key: "definitions:export",
    category: "definitions",
    description: "Export RabbitMQ definitions",
  },
  {
    key: "definitions:import",
    category: "definitions",
    description: "Import RabbitMQ definitions",
  },

  // Metrics
  {
    key: "metric:read",
    category: "metric",
    description: "View metric dashboards",
  },

  // Alerting
  {
    key: "alerting:read",
    category: "alerting",
    description: "View alert rules and incidents",
  },
  {
    key: "alerting:write",
    category: "alerting",
    description: "Create or update alert rules",
  },
  {
    key: "alerting:delete",
    category: "alerting",
    description: "Delete alert rules",
  },

  // Slack integration
  {
    key: "slack_config:read",
    category: "slack_config",
    description: "View Slack integration settings",
  },
  {
    key: "slack_config:write",
    category: "slack_config",
    description: "Configure Slack integration",
  },
  {
    key: "slack_config:delete",
    category: "slack_config",
    description: "Remove Slack integration",
  },

  // Webhook integration
  {
    key: "webhook:read",
    category: "webhook",
    description: "View webhook integrations",
  },
  {
    key: "webhook:write",
    category: "webhook",
    description: "Configure webhook integrations",
  },
  {
    key: "webhook:delete",
    category: "webhook",
    description: "Remove webhook integrations",
  },

  // LLM config
  {
    key: "llm_config:read",
    category: "llm_config",
    description: "View AI explain configuration",
  },
  {
    key: "llm_config:write",
    category: "llm_config",
    description: "Configure AI explain settings",
  },

  // Digest
  {
    key: "digest:read",
    category: "digest",
    description: "View daily digest settings",
  },
  {
    key: "digest:write",
    category: "digest",
    description: "Configure daily digest",
  },

  // Diagnostics
  {
    key: "topology:read",
    category: "topology",
    description: "View topology graph",
  },
  {
    key: "incident:read",
    category: "incident",
    description: "View incident diagnoses",
  },
  { key: "scan:read", category: "scan", description: "View scan results" },
  { key: "scan:run", category: "scan", description: "Trigger a broker scan" },

  // Audit log (Enterprise gate at procedure layer)
  { key: "audit:read", category: "audit", description: "Read the audit log" },
  {
    key: "audit:export",
    category: "audit",
    description: "Export the audit log as CSV",
  },

  // Custom roles & RBAC management (Phase 3; gated to Enterprise via RBAC_ADVANCED)
  {
    key: "role:read",
    category: "role",
    description: "View roles (names and member counts)",
  },
  {
    key: "role:read:assignments",
    category: "role",
    description: "View who is assigned to each role",
  },
  {
    key: "role:manage",
    category: "role",
    description: "Create, edit, and assign custom roles",
  },
];
