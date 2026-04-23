# Alerts Feature — Unified Alert Table (feat/alert-table-unification)

**Part:** apps/api/ + apps/app/
**Last Updated:** 2026-03-17
**Domain:** Alert monitoring, tracking, deduplication, and multi-channel notifications

---

## What Changed and Why

### Before: Two separate tables

The system used two legacy tables:

- **`SeenAlert`** — tracked currently active (and recently resolved) alerts. Had a `fingerprint` unique constraint, `firstSeenAt`, `lastSeenAt`, `resolvedAt`, `emailSentAt`.
- **`ResolvedAlert`** — immutable historical records created on resolution. Had `title`, `description`, `duration`, `serverName` snapshot.

Problems:
- Data had to be duplicated or cross-joined between tables
- No shared query interface (active vs. resolved alerts required two separate code paths)
- Migration between the two was fragile (timing issues between creation and resolution)

### After: One unified `Alert` table

A single `Alert` table holds both ACTIVE and RESOLVED rows, distinguished by a `status` field (`ACTIVE` | `RESOLVED`).

Key design decisions:
- Active rows carry a `fingerprint` for dedup; resolved rows have `fingerprint = NULL` to free the partial unique index slot for re-firing.
- A **partial unique index** (`alert_active_fingerprint_unique`) enforces only one ACTIVE row per fingerprint at a time.
- RESOLVED rows retain their full history (`title`, `description`, `details`, `duration`, `serverName`, `firstSeenAt`, `resolvedAt`).

---

## Database Schema

### `Alert` model (key fields)

| Field | Type | Purpose |
|-------|------|---------|
| `id` | String (UUID) | Primary key |
| `status` | `AlertStatus` (`ACTIVE` / `RESOLVED`) | Lifecycle state |
| `fingerprint` | String? | Dedup key — set on ACTIVE, NULL on RESOLVED |
| `severity` | `AlertSeverity` (`CRITICAL`, `HIGH`, `MEDIUM`, `INFO`, `LOW`) | Prisma enum |
| `category` | String? | `memory`, `disk`, `connection`, `queue`, `node`, `performance` |
| `sourceType` | String? | `node`, `queue`, `cluster` |
| `sourceName` | String? | Node or queue name |
| `serverId` | String? | FK → `RabbitMQServer` (CASCADE delete) |
| `serverName` | String? | Snapshot of server name at creation |
| `workspaceId` | String | FK → `Workspace` |
| `title` | String | Human-readable title |
| `description` | String | Human-readable description |
| `details` | JSON? | `{ current, threshold?, recommended?, affected? }` |
| `firstSeenAt` | DateTime? | When alert first fired |
| `lastSeenAt` | DateTime? | Most recent detection (ACTIVE only) |
| `resolvedAt` | DateTime? | When resolved |
| `duration` | Int? | Milliseconds from firstSeenAt to resolvedAt |
| `emailSentAt` | DateTime? | When notification last sent (drives cooldown) |

### Partial unique index (hand-crafted, not in Prisma schema)

```sql
CREATE UNIQUE INDEX "alert_active_fingerprint_unique"
  ON "Alert" (fingerprint)
  WHERE status = 'ACTIVE' AND fingerprint IS NOT NULL;
```

**Prisma pitfall**: Prisma does not understand this index and will DROP it on every `migrate dev` run. It must be re-applied manually via `prisma db execute` + `prisma migrate resolve --applied`. A warning comment is embedded above `@@index([fingerprint])` in `schema.prisma`.

### Indexes (Prisma-managed)

```
Alert_workspaceId_status_idx  (workspaceId, status)
Alert_serverId_status_idx     (serverId, status)
Alert_fingerprint_idx         (fingerprint)
Alert_resolvedAt_idx          (resolvedAt)
Alert_createdAt_idx           (createdAt)
```

---

## Migration Path (Production-safe, 4 phases)

### Phase 0 — Schema extension (`20260316115052_phase_0_unify_alert_schema`)
- Added new columns to `Alert`: `category`, `details`, `duration`, `emailSentAt`, `fingerprint`, `firstSeenAt`, `lastSeenAt`, `serverId`, `serverName`, `sourceName`, `sourceType`
- Added `INFO` value to `AlertSeverity` enum
- Added `isDefault` to `AlertRule`; made `serverId` and `createdById` nullable
- Created all compound indexes

### Phase 2 — Data migration (`20260316141713_phase_2_migrate_seen_resolved_to_alert`)
- Migrated `ResolvedAlert` rows → `Alert` rows with `status=RESOLVED`, `fingerprint=NULL`
- Migrated active `SeenAlert` rows (resolvedAt IS NULL) → `Alert` rows with `status=ACTIVE`, fingerprint preserved
- Migrated resolved `SeenAlert` rows (resolvedAt IS NOT NULL) → `Alert` rows with `status=RESOLVED`, `fingerprint=NULL`, `duration` computed
- Created the partial unique index `alert_active_fingerprint_unique`

Severity mapping applied during migration:
- `'critical'` → `CRITICAL`
- `'warning'` → `MEDIUM`
- `'info'` → `INFO`
- anything else → `LOW`

### Phase 4 — Drop legacy tables (`20260316150615_phase_4_drop_legacy_alert_tables`)
- Dropped `SeenAlert` and `ResolvedAlert` tables

### Post-PR fixes
- `20260317082629_fix_alert_server_cascade` — changed `Alert.serverId` FK from `SetNull` to `CASCADE`
- `20260317100000_alert_rule_server_cascade` — changed `AlertRule.serverId` FK from `SetNull` to `CASCADE`
- `20260317090000_add_alert_rule_slug_unique` — added `slug` column + `(serverId, slug)` unique index to `AlertRule`

---

## Alert Lifecycle

```
Alert fires
  → No ACTIVE row for fingerprint?
      → INSERT Alert (status=ACTIVE, fingerprint=...)
      → isNew=true → notification sent

Alert fires again (already ACTIVE)
  → updateMany WHERE id=... AND status=ACTIVE AND fingerprint=...
  → result.count=1 → update succeeds (lastSeenAt, severity refreshed)
  → isNew=false → no notification (unless 7-day cooldown expired)

  Concurrent resolution race:
  → result.count=0 (row was concurrently resolved between read and write)
  → isNew=true → fall through to INSERT
  → INSERT raises P2002 (another instance won the race) → skip (logged)

Alert disappears from check
  → updateMany WHERE fingerprint=... AND status=ACTIVE
      SET status=RESOLVED, resolvedAt=now, duration=..., fingerprint=NULL

Alert re-fires after resolution
  → No ACTIVE row (fingerprint=NULL after resolve)
  → INSERT new Alert (status=ACTIVE, fingerprint=...)
  → isNew=true → notification sent
```

---

## Alert Fingerprint Format

Generated by `alert.fingerprint.ts`:

| Alert type | Format |
|------------|--------|
| Node / cluster | `{serverId}-{category}-{sourceType}-{sourceName}` |
| Queue (with vhost) | `{serverId}-{category}-queue-{vhost}-{sourceName}` |

**Example:** `server-abc123-memory-node-rabbit@node1`

Vhost is embedded for queue alerts so the same queue name in different vhosts is tracked separately. Vhost boundary matching in resolution uses exact suffix matching (not DB `contains`) to prevent `"prod"` from matching `"prod-v2"`.

---

## Severity Model

### Internal (runtime / frontend)

```typescript
enum AlertSeverity { CRITICAL = "critical", WARNING = "warning", INFO = "info" }
```

### Prisma enum (DB)

`CRITICAL | HIGH | MEDIUM | INFO | LOW`

### Mapping (alert.service.ts)

| Prisma | Internal | Legacy string |
|--------|----------|--------------|
| CRITICAL | CRITICAL | "critical" |
| HIGH | WARNING | "warning" |
| MEDIUM | WARNING | "warning" |
| INFO | INFO | "info" |
| LOW | INFO | "info" |

`HIGH` was added to both maps during the PR review — it was previously silently falling through to `undefined`.

---

## Alert Analysis Engine

### `analyzeNodeHealth` (alert.analyzer.ts)

Evaluates a single RabbitMQ node against thresholds:

| Check | Critical | Warning |
|-------|---------|---------|
| Node running | node.running=false → CRITICAL | — |
| Memory alarm | mem_alarm=true → CRITICAL | mem_used/mem_limit ≥ 80% |
| Disk alarm | disk_free_alarm=true → CRITICAL | disk free ≤ 15% |
| Network partitions | partitions.length > 0 → CRITICAL | — |
| File descriptors | fd_used/fd_total ≥ 90% | ≥ 80% |
| Sockets | sockets_used/sockets_total ≥ 90% | ≥ 80% |
| Erlang processes | proc_used/proc_total ≥ 90% | ≥ 80% |
| Run queue | run_queue ≥ 20 | ≥ 10 |

### `analyzeQueueHealth` (alert.analyzer.ts)

Evaluates a single queue:

| Check | Critical | Warning |
|-------|---------|---------|
| Queue depth (messages) | ≥ 50,000 | ≥ 10,000 |
| No consumers but messages | — | consumers=0 AND messages>0 |
| Unacknowledged messages | ≥ 5,000 | ≥ 1,000 |
| Consumer utilization | — | deliverRate/publishRate < 10% |
| Stale messages | — | readyMessages>100, deliverRate=0 |
| Message accumulation | — | accumulationRatio > 0.5 AND messages>1,000 |
| Inactive queue (INFO) | — | idle_since > 24h, no messages, no consumers |

All thresholds are workspace-overridable via `WorkspaceAlertThresholds`.

---

## Notification Service (alert.notification.ts)

### Main method: `trackAndNotifyNewAlerts`

```
1. Bulk fetch all ACTIVE Alert rows for the server (one query, not N+1)
2. Build fingerprint → row map
3. Deduplicate incoming alerts by fingerprint (batch dedup)
4. For each alert:
   a. Compute fingerprint
   b. If ACTIVE row exists → updateMany (conditional on status=ACTIVE + fingerprint)
      - count=0 → concurrent resolution → isNew=true, fall through to INSERT
   c. If no activeAlertId → INSERT new Alert
      - P2002 → concurrent race lost → skip
   d. Decide notification:
      - isNew=true AND severity in notificationSeverities → notify
      - isNew=false AND cooldown expired (7 days since emailSentAt/firstSeenAt) → notify
5. Auto-resolve: fetch all ACTIVE rows for server, resolve those not in current fingerprints
   - Vhost scoping: exact suffix matching in-memory (not DB LIKE/contains)
6. If ALERTING feature disabled → return early (tracking done, no notifications)
7. Send notifications to qualifying alerts:
   - Email: if emailNotificationsEnabled=true AND contactEmail set
   - Webhook: if WEBHOOK_INTEGRATION feature + enabled Webhook record
   - Slack: if SLACK_INTEGRATION feature + enabled SlackConfig record
8. Stamp emailSentAt by alert ID (immune to resolution race)
```

### Notification decision logic

An alert triggers a notification when **all** of the following are true:
1. `ALERTING` feature flag is enabled
2. `serverId` is in `workspace.notificationServerIds` (or list is empty = all servers)
3. Alert severity is in `workspace.notificationSeverities` (default: `["critical", "warning"]`)
4. One of:
   - Alert is brand new (`isNew=true`)
   - Alert re-fired after resolution (`isNew=true` again)
   - Ongoing alert with cooldown expired (7 days since `emailSentAt` or `firstSeenAt`)

### Cooldown tracking

`emailSentAt` is stamped on the Alert row after a successful email send, using the row ID (not fingerprint+status), making it immune to the resolution race.

---

## Alert Rules & Default Rules

### `AlertRule` model

Server-scoped rules with `AlertType`, `ComparisonOperator`, threshold, and `AlertSeverity`. On server creation, `seedDefaultAlertRules` seeds 11 default rules per server (idempotent via `(serverId, slug)` unique index + `skipDuplicates: true`).

Default rules are seeded fire-and-forget (`void seedDefaultAlertRules(...)`) — failures are caught and logged internally; server creation is never blocked or rolled back.

### Default rules seeded per server

| Slug | Type | Operator | Threshold | Severity |
|------|------|----------|-----------|---------|
| high-memory-usage | MEMORY_USAGE | > | 80% | MEDIUM |
| critical-memory-usage | MEMORY_USAGE | > | 95% | CRITICAL |
| low-disk-space | DISK_USAGE | < | 15% | MEDIUM |
| critical-disk-space | DISK_USAGE | < | 10% | CRITICAL |
| high-queue-backlog | QUEUE_DEPTH | > | 10,000 | MEDIUM |
| critical-queue-backlog | QUEUE_DEPTH | > | 50,000 | CRITICAL |
| high-unacknowledged-messages | MESSAGE_RATE | > | 1,000 | MEDIUM |
| critical-unacknowledged-messages | MESSAGE_RATE | > | 5,000 | CRITICAL |
| low-consumer-utilization | CONSUMER_COUNT | < | 10% | MEDIUM |
| node-down | NODE_DOWN | = | 0 | CRITICAL |
| high-file-descriptor-usage | CONNECTION_COUNT | > | 80% | MEDIUM |
| critical-file-descriptor-usage | CONNECTION_COUNT | > | 90% | CRITICAL |

`AlertRule.serverId` FK uses `onDelete: CASCADE` — deleting a server removes all its rules.

---

## Frontend Changes (apps/app)

### `Alerts.tsx`

- Deep-link parameter `?openNotificationSettings=true` used to redirect non-admin users to admin with the modal pre-opened
- Added `isLoading` guard from `useUser()` — `isAdmin` is `false` until user context hydrates, so the effect must wait for `isUserLoading: false` before evaluating the param
- URL cleanup runs inside the same effect (not in a separate cleanup effect)

### `AlertNotificationSettingsModal.tsx`

- Resyncs `notificationPermission` state on modal open via a `useEffect([isOpen])`. The permission can change between renders (user grants/revokes in browser settings); without this, the modal could show stale permission state.

### `authTypes.ts`

- `UserRole` enum: only `ADMIN = "ADMIN"` is referenced in the frontend code (used in `Alerts.tsx` to gate the notification settings modal). `MEMBER`/`READONLY` were added and then removed since they were flagged as unused by knip.

---

## Key Files

| File | Purpose |
|------|---------|
| `apps/api/src/services/alerts/alert.notification.ts` | Core tracking loop + notification dispatch |
| `apps/api/src/services/alerts/alert.service.ts` | Orchestrator: health analysis + notification trigger |
| `apps/api/src/services/alerts/alert.analyzer.ts` | Node/queue threshold analysis |
| `apps/api/src/services/alerts/alert.fingerprint.ts` | Stable dedup key generation |
| `apps/api/src/services/alerts/alert.thresholds.ts` | Workspace-specific or default thresholds |
| `apps/api/src/services/alerts/alert.health.ts` | Cluster health summaries |
| `apps/api/src/services/alerts/alert.interfaces.ts` | `RabbitMQAlert`, `AlertThresholds`, `AlertSeverity`, etc. |
| `apps/api/src/services/alerts/alert.default-rules.ts` | Default rule definitions + seeding |
| `apps/api/src/services/alerts/alert.severity-map.ts` | `toPrismaAlertSeverity` helper |
| `apps/api/prisma/schema.prisma` | `Alert`, `AlertRule` models |
| `apps/api/prisma/migrations/20260316115052_*` | Phase 0: schema extension |
| `apps/api/prisma/migrations/20260316141713_*` | Phase 2: data migration |
| `apps/api/prisma/migrations/20260316150615_*` | Phase 4: drop legacy tables |
| `apps/api/prisma/migrations/20260317082629_*` | Fix Alert→Server cascade |
| `apps/api/prisma/migrations/20260317100000_*` | Fix AlertRule→Server cascade |
| `apps/app/src/pages/Alerts.tsx` | Alerts page + deep-link hydration guard |
| `apps/app/src/components/alerts/AlertNotificationSettingsModal.tsx` | Notification settings modal |

---

## Known Limitations / Future Work

1. **N+1 in tracking loop** — Each alert issues one `updateMany` then potentially one `create`. For very high alert volumes, a true bulk upsert would be more efficient.

2. **Slack/Webhook cooldown not tracked** — `emailSentAt` drives the cooldown for all channels. Slack and webhook sends are not persisted. A true per-channel cooldown would require a `lastNotifiedAt` per channel.

3. **Partial index Prisma pitfall** — The `alert_active_fingerprint_unique` index must be manually re-applied after every `migrate dev` run. This is documented in `schema.prisma` with a warning comment.

4. **No atomic notification claim** — Two overlapping cron runs could both decide to notify before either stamps `emailSentAt`. The sliding-window per-server concurrency makes this rare, but a fully safe implementation would need a conditional `UPDATE emailSentAt WHERE emailSentAt IS NULL OR emailSentAt < cooldown` claim before dispatching.
