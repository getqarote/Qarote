# Plan: Audit Log System

## Context

Qarote has no persistent audit trail. Actions like setting RabbitMQ permissions, deleting queues, changing alert rules, or modifying workspace settings are logged via Pino (stdout only) and lost. The existing `audit.service.ts` only covers password events and writes to structured logs, not the database.

This plan introduces a generic `AuditLog` model and an `AuditService` that instruments all admin-visible mutations across the application, plus a dedicated audit log page in the frontend.

---

## Schema Design

### New Prisma model

```prisma
model AuditLog {
  id          String   @id @default(uuid())
  timestamp   DateTime @default(now())
  actorId     String?                        // Qarote user who performed the action
  actorEmail  String?                        // denormalized for display after user deletion
  action      String                         // e.g. "rabbitmq.user.permissions.set"
  category    String                         // e.g. "rabbitmq", "workspace", "alert", "auth"
  entityType  String                         // e.g. "rabbitmq_user", "queue", "alert_rule"
  entityId    String?                        // identifier (username, queue name, rule ID, etc.)
  entityLabel String?                        // human-readable label (queue name, user email, etc.)
  serverId    String?                        // RabbitMQ server (null for non-RMQ events)
  workspaceId String?                        // workspace scope
  metadata    Json?                          // action-specific details (old/new values, vhost, etc.)
  ipAddress   String?
  userAgent   String?

  actor       User?           @relation(fields: [actorId], references: [id], onDelete: SetNull)
  server      RabbitMQServer? @relation(fields: [serverId], references: [id], onDelete: SetNull)
  workspace   Workspace?      @relation(fields: [workspaceId], references: [id], onDelete: SetNull)

  @@index([workspaceId, timestamp(sort: Desc)])
  @@index([category, timestamp(sort: Desc)])
  @@index([actorId])
  @@index([serverId, entityType, entityId])
}
```

**Design rationale:**
- `action` is a dotted string (not an enum) — avoids a migration every time we add a new audited action
- `actorEmail` is denormalized so audit entries remain readable after a user is deleted
- `metadata` as `Json` holds action-specific details (old/new permission regexes, queue arguments, etc.) without schema changes
- `serverId` is nullable — non-RabbitMQ events (workspace, auth, billing) don't reference a server
- `workspaceId` scopes queries to the current workspace for the audit log page

### Reverse relations to add

- `User`: `auditLogs AuditLog[]`
- `RabbitMQServer`: `auditLogs AuditLog[]`
- `Workspace`: `auditLogs AuditLog[]`

---

## Action Taxonomy

Dotted notation: `{category}.{entityType}.{verb}`

### `rabbitmq` category
| Action | Entity Type | Trigger |
|--------|-------------|---------|
| `rabbitmq.user.create` | rabbitmq_user | `users.ts:createUser` |
| `rabbitmq.user.update` | rabbitmq_user | `users.ts:updateUser` |
| `rabbitmq.user.delete` | rabbitmq_user | `users.ts:deleteUser` |
| `rabbitmq.user.permissions.set` | rabbitmq_permission | `users.ts:setPermissions` |
| `rabbitmq.user.permissions.clear` | rabbitmq_permission | `users.ts:deletePermissions` |
| `rabbitmq.vhost.create` | rabbitmq_vhost | `vhost.ts:createVHost` |
| `rabbitmq.vhost.update` | rabbitmq_vhost | `vhost.ts:updateVHost` |
| `rabbitmq.vhost.delete` | rabbitmq_vhost | `vhost.ts:deleteVHost` |
| `rabbitmq.vhost.permissions.set` | rabbitmq_permission | `vhost.ts:setPermissions` |
| `rabbitmq.vhost.permissions.clear` | rabbitmq_permission | `vhost.ts:deletePermissions` |
| `rabbitmq.vhost.limits.set` | rabbitmq_vhost | `vhost.ts:setVHostLimits` |
| `rabbitmq.vhost.limits.clear` | rabbitmq_vhost | `vhost.ts:deleteVHostLimits` |
| `rabbitmq.queue.create` | queue | `queues.ts:createQueue` |
| `rabbitmq.queue.delete` | queue | `queues.ts:deleteQueue` |
| `rabbitmq.queue.purge` | queue | `queues.ts:purgeQueue` |
| `rabbitmq.queue.limits.set` | queue | `queues.ts:setQueueLimits` |
| `rabbitmq.queue.memory.reclaim` | queue | `queues.ts:reclaimMemory` |
| `rabbitmq.exchange.create` | exchange | `infrastructure.ts:createExchange` |
| `rabbitmq.exchange.delete` | exchange | `infrastructure.ts:deleteExchange` |
| `rabbitmq.message.publish` | queue | `messages.ts:publishMessage` |
| `rabbitmq.server.create` | server | `server.ts:createServer` |
| `rabbitmq.server.update` | server | `server.ts:updateServer` |
| `rabbitmq.server.delete` | server | `server.ts:deleteServer` |

### `alert` category
| Action | Entity Type | Trigger |
|--------|-------------|---------|
| `alert.rule.create` | alert_rule | `rules.ts:createAlertRule` |
| `alert.rule.update` | alert_rule | `rules.ts:updateAlertRule` |
| `alert.rule.delete` | alert_rule | `rules.ts:deleteAlertRule` |
| `alert.slack.create` | slack_config | `slack.ts:createConfig` |
| `alert.slack.update` | slack_config | `slack.ts:updateConfig` |
| `alert.slack.delete` | slack_config | `slack.ts:deleteConfig` |
| `alert.webhook.create` | webhook | `webhook.ts:createWebhook` |
| `alert.webhook.update` | webhook | `webhook.ts:updateConfig` |
| `alert.webhook.delete` | webhook | `webhook.ts:deleteConfig` |

### `workspace` category
| Action | Entity Type | Trigger |
|--------|-------------|---------|
| `workspace.create` | workspace | `management.ts:create` |
| `workspace.update` | workspace | `management.ts:update` |
| `workspace.delete` | workspace | `management.ts:delete` |
| `workspace.invitation.send` | invitation | `invitation.ts:sendInvitation` |
| `workspace.invitation.revoke` | invitation | `invitation.ts:revokeInvitation` |
| `workspace.invitation.accept` | invitation | `invitation.ts:acceptInvitation` |
| `workspace.member.remove` | workspace_member | `user.ts:removeFromWorkspace` |
| `workspace.member.update` | workspace_member | `user.ts:updateUser` (role change) |

### `organization` category
| Action | Entity Type | Trigger |
|--------|-------------|---------|
| `org.update` | organization | `management.ts:update` |
| `org.member.invite` | org_member | `members.ts:invite` |
| `org.member.accept` | org_member | `members.ts:acceptInvitation` |
| `org.member.role.update` | org_member | `members.ts:updateRole` |
| `org.member.remove` | org_member | `members.ts:remove` |
| `org.member.workspace.assign` | org_member | `members.ts:assignToWorkspace` |
| `org.member.workspace.remove` | org_member | `members.ts:removeFromWorkspace` |

### `auth` category
| Action | Entity Type | Trigger |
|--------|-------------|---------|
| `auth.password.change` | user | `password.ts:changePassword` |
| `auth.password.reset.request` | user | `password.ts:requestPasswordReset` |
| `auth.password.reset.complete` | user | `password.ts:resetPassword` |
| `auth.email.change.request` | user | `password.ts:requestEmailChange` |
| `auth.email.change.cancel` | user | `email.ts:cancelEmailChange` |

### `sso` category
| Action | Entity Type | Trigger |
|--------|-------------|---------|
| `sso.provider.create` | sso_provider | `sso.ts:registerProvider` |
| `sso.provider.update` | sso_provider | `sso.ts:updateProvider` |
| `sso.provider.delete` | sso_provider | `sso.ts:deleteProvider` |

### `license` category
| Action | Entity Type | Trigger |
|--------|-------------|---------|
| `license.activate` | license | `selfhosted-license.ts:activate` |
| `license.deactivate` | license | `selfhosted-license.ts:deactivate` |

---

## Implementation Steps

### Step 1: Prisma schema + migration
- Add `AuditLog` model to `apps/api/prisma/schema.prisma`
- Add reverse relations to `User`, `RabbitMQServer`, `Workspace`
- Run `pnpm db:migrate:dev --name add_audit_log`

### Step 2: Audit service
**New file:** `apps/api/src/services/audit/audit-log.service.ts`

```ts
import { prisma } from "@/core/prisma";
import { logger } from "@/core/logger";

interface AuditEntry {
  actorId: string | null;
  actorEmail?: string | null;
  action: string;
  category: string;
  entityType: string;
  entityId?: string | null;
  entityLabel?: string | null;
  serverId?: string | null;
  workspaceId?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function recordAuditLog(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({ data: entry });
  } catch (error) {
    logger.error({ error, entry }, "Failed to write audit log");
  }
}
```

Fire-and-forget: failures are logged but never block the primary operation. Wrapping in try/catch at the service level is sufficient.

### Step 3: tRPC helper for extracting audit context from `ctx`

**New file:** `apps/api/src/trpc/audit.ts`

```ts
export function auditContext(ctx: { user: { id: string; email: string }; req?: Request }) {
  return {
    actorId: ctx.user.id,
    actorEmail: ctx.user.email,
    ipAddress: ctx.req?.headers.get("x-forwarded-for") ?? null,
    userAgent: ctx.req?.headers.get("user-agent") ?? null,
  };
}
```

### Step 4: Instrument all mutation routers
Add `recordAuditLog()` calls after each successful mutation. Example for `setPermissions`:

```ts
// After client.setUserPermissions() succeeds:
recordAuditLog({
  ...auditContext(ctx),
  action: "rabbitmq.user.permissions.set",
  category: "rabbitmq",
  entityType: "rabbitmq_permission",
  entityId: username,
  entityLabel: `${username}@${vhost}`,
  serverId,
  workspaceId,
  metadata: { vhost, configure, write, read },
});
```

**Files to instrument** (all in `apps/api/src/trpc/routers/`):
- `rabbitmq/users.ts` — 5 mutations
- `rabbitmq/vhost.ts` — 7 mutations
- `rabbitmq/queues.ts` — 5 mutations
- `rabbitmq/infrastructure.ts` — 2 mutations
- `rabbitmq/messages.ts` — 1 mutation
- `rabbitmq/server.ts` — 3 mutations
- `alerts/rules.ts` — 3 mutations
- `alerts/slack.ts` — 3 mutations
- `alerts/webhook.ts` — 3 mutations
- `workspace/management.ts` — 3 mutations (create/update/delete)
- `workspace/invitation.ts` — 2 mutations
- `organization/management.ts` — 1 mutation
- `organization/members.ts` — 5 mutations
- `user.ts` — 2 mutations (updateUser, removeFromWorkspace)
- `auth/password.ts` — 3 mutations
- `auth/email.ts` — 2 mutations
- `sso.ts` — 3 mutations
- `selfhosted-license.ts` — 2 mutations

**Total: ~54 instrumentation points across 18 files**

### Step 5: tRPC query endpoint for audit logs
**File:** `apps/api/src/trpc/routers/audit.ts` (new router)

- `list` query — paginated, filterable by category, entityType, actorId, date range
- Scoped to workspace (`workspaceId`)
- Returns `{ items: AuditLog[], total: number, hasMore: boolean }`

Register in main router at `apps/api/src/trpc/routers/index.ts`.

### Step 6: Frontend — audit log page
**New file:** `apps/app/src/pages/AuditLogPage.tsx`

- Table with columns: Timestamp, Actor, Action, Entity, Details
- Filters: category dropdown, date range picker, actor search
- Infinite scroll or pagination
- Action descriptions resolved via i18n keys
- Relative timestamps with full-date tooltips

**Route:** Add to React Router config in `apps/app/src/` route definitions.

### Step 7: Frontend — inline "last changed" on permissions table
With the audit log in place, query the latest `rabbitmq.user.permissions.set` or `rabbitmq.user.permissions.clear` entry for each user/vhost and display relative time in `UserPermissionsTable.tsx` (the original request that spawned this feature).

### Step 8: i18n
Add translation keys for all ~55 action labels + audit log page UI across `en`, `fr`, `es`, `zh` locale files.

### Step 9: Migrate existing `audit.service.ts`
Refactor `apps/api/src/services/audit.service.ts` to use the new `recordAuditLog()` for password events instead of logger-only. Keep the structured log call as a secondary output.

---

## Implementation order

1. Schema + migration (Step 1)
2. Service + helper (Steps 2-3)
3. Instrument RabbitMQ routers first (Step 4, partial — highest value)
4. Query endpoint (Step 5)
5. Audit log page (Step 6)
6. Inline permission timestamps (Step 7)
7. Instrument remaining routers (Step 4, rest)
8. i18n (Step 8)
9. Migrate old audit service (Step 9)

---

## Files to create
- `apps/api/src/services/audit/audit-log.service.ts`
- `apps/api/src/trpc/audit.ts` (context helper)
- `apps/api/src/trpc/routers/audit.ts` (query router)
- `apps/app/src/pages/AuditLogPage.tsx`

## Files to modify
- `apps/api/prisma/schema.prisma` — add model + relations
- `apps/api/src/trpc/routers/index.ts` — register audit router
- 18 router files (see Step 4 list)
- `apps/app/src/components/UserDetail/UserPermissionsTable.tsx` — inline timestamps
- `apps/app/public/locales/{en,fr,es,zh}/` — multiple locale files
- `apps/api/src/services/audit.service.ts` — migrate to new system
- React Router config — add audit log route

## Verification
1. `pnpm db:migrate:dev` — migration succeeds
2. `pnpm type-check` — no errors
3. Set a RabbitMQ permission — verify audit row in `pnpm db:studio`
4. Open audit log page — verify entry appears with correct actor/action/entity
5. Filter by category — verify filtering works
6. Check user details page — "last changed" shows on permissions
7. Delete an admin user — verify audit entries still display with denormalized email
