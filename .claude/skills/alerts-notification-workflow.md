# Alerts Notification Workflow

**Part:** apps/api/
**Last Updated:** 2026-03-11
**Domain:** Alert monitoring, tracking, and multi-channel notifications

## Overview

The alert notification system monitors all RabbitMQ servers on a scheduled interval, analyzes their health against configurable thresholds, tracks alert state in the database, and sends notifications via Email, Slack, and Webhooks. Notifications are feature-gated (Enterprise/licensed only).

---

## End-to-End Flow

```
[alert-monitor worker]
        ↓
[RabbitMQAlertsCronService]   (cron/rabbitmq-alerts.cron.ts)
  → runs on configurable interval (alertConfig.checkIntervalMs)
  → sliding-window concurrency (alertConfig.concurrency)
  → 30s per-server timeout
        ↓
[AlertService.getServerAlerts]   (services/alerts/alert.service.ts)
  → fetches workspace thresholds (WorkspaceAlertThresholds or defaults)
  → analyzeNodeHealth() for each node
  → analyzeQueueHealth() for each queue (optionally filtered by vhost)
  → sorts alerts: critical > warning > info, then by timestamp
        ↓
[AlertNotificationService.trackAndNotifyNewAlerts]   (services/alerts/alert.notification.ts)
  → checks ALERTING feature flag
  → loads workspace settings (contactEmail, emailNotificationsEnabled, notificationSeverities, notificationServerIds)
  → tracks all alerts in SeenAlert table (regardless of feature flag)
  → determines which alerts should send notifications
  → [if feature enabled] sends Email / Webhook / Slack
```

---

## Key Files

| File | Purpose |
|------|---------|
| `src/workers/alert-monitor.ts` | Worker entry point - runs the cron service as a separate process |
| `src/cron/rabbitmq-alerts.cron.ts` | `RabbitMQAlertsCronService` - scheduler with sliding-window concurrency |
| `src/services/alerts/alert.service.ts` | `AlertService` - orchestrates health analysis + notification |
| `src/services/alerts/alert.notification.ts` | `AlertNotificationService` - tracking, deduplication, multi-channel dispatch |
| `src/services/alerts/alert.analyzer.ts` | `analyzeNodeHealth`, `analyzeQueueHealth` - threshold evaluation |
| `src/services/alerts/alert.fingerprint.ts` | `generateAlertFingerprint` - stable deduplication key |
| `src/services/alerts/alert.thresholds.ts` | `AlertThresholdsService` - workspace-specific or default thresholds |
| `src/services/alerts/alert.health.ts` | `AlertHealthService` - cluster health summaries |
| `src/services/alerts/alert.interfaces.ts` | `RabbitMQAlert`, `AlertThresholds`, `AlertSeverity`, `AlertCategory` types |
| `src/services/email/templates/alert-notification-email.tsx` | React Email template for alert emails |
| `src/services/slack/slack.service.ts` | `SlackService.sendAlertNotifications` |
| `src/services/webhook/webhook.service.ts` | `WebhookService.sendAlertNotification` |

---

## Alert Fingerprinting

Fingerprints are stable identifiers used to deduplicate alerts across check cycles.

**Format:**
- Node/cluster alerts: `${serverId}-${category}-${sourceType}-${sourceName}`
- Queue alerts (with vhost): `${serverId}-${category}-${sourceType}-${vhost}-${sourceName}`

**Example:** `server-abc123-memory-node-rabbit@node1`

Vhost is included for queue alerts so the same queue name in different vhosts is tracked separately.

---

## Database Models

### `SeenAlert`
Tracks currently active and recently resolved alerts.

| Field | Purpose |
|-------|---------|
| `fingerprint` | Unique stable identifier |
| `serverId` / `workspaceId` | Scope |
| `severity` / `category` / `sourceType` / `sourceName` | Alert metadata |
| `firstSeenAt` | When first detected |
| `lastSeenAt` | Most recent detection |
| `resolvedAt` | Set when alert disappears; cleared when it returns |
| `emailSentAt` | When notification was last sent (drives cooldown) |

### `ResolvedAlert`
Immutable historical record created when an alert resolves.

| Field | Purpose |
|-------|---------|
| `fingerprint` | Matches `SeenAlert.fingerprint` |
| `title` / `description` / `details` | Reconstructed from category + source |
| `firstSeenAt` / `resolvedAt` | Alert lifetime |
| `duration` | Milliseconds from first seen to resolved |
| `serverName` | Snapshot of server name at resolution time |

---

## Notification Decision Logic

An alert triggers a notification when **all** of the following are true:

1. `ALERTING` feature flag is enabled
2. `serverId` is in `workspace.notificationServerIds` (or the list is empty/null = notify all)
3. Alert severity is in `workspace.notificationSeverities`
4. One of:
   - Alert is **brand new** (no SeenAlert record)
   - Alert was **previously resolved** (`resolvedAt` was set, now cleared)
   - **Cooldown period expired**: 7 days since `emailSentAt` (or `firstSeenAt` if never emailed)

Each channel then applies its own gate independently:
- **Email**: requires `workspace.emailNotificationsEnabled === true` AND `workspace.contactEmail` set
- **Webhook**: requires `WEBHOOK_INTEGRATION` feature flag + an enabled `Webhook` record
- **Slack**: requires `SLACK_INTEGRATION` feature flag + an enabled `SlackConfig` record

**Notifications are NOT sent when:**
- Alert is ongoing and within the 7-day cooldown
- Feature flag (`ALERTING`) is disabled (community mode) — alerts still tracked
- Server is excluded from `notificationServerIds`
- Per-channel gate fails (e.g. email disabled only suppresses email, not Slack/Webhook)

---

## Notification Channels

All channels fire for the same set of `alertsToNotify`:

| Channel | Feature Flag | Config |
|---------|-------------|--------|
| Email | `ALERTING` | `workspace.emailNotificationsEnabled` + `contactEmail` |
| Webhook | `WEBHOOK_INTEGRATION` | `Webhook` record with `enabled: true` |
| Slack | `SLACK_INTEGRATION` | `SlackConfig` record with `enabled: true` |

After email is sent, `SeenAlert.emailSentAt` is updated. Slack and Webhook delivery is not tracked in the DB.

---

## Auto-Resolution

After processing active alerts, the system resolves any `SeenAlert` records for alerts that are no longer present in the current check:

1. Fetches all unresolved `SeenAlert` records for the server
2. For each one not in the current active fingerprints set → sets `resolvedAt = now`
3. Creates a `ResolvedAlert` record with duration

**Vhost scoping:** If a `vhost` is provided to the check, only queue alerts matching that vhost's fingerprint pattern are considered for resolution. Node and cluster alerts are always evaluated. This prevents incorrectly resolving alerts from other vhosts.

---

## Severity & Categories

**Severities:** `critical` | `warning` | `info`

**Categories:**

| Category | Source Types | Thresholds |
|----------|-------------|------------|
| `memory` | node | mem_alarm or > 80%/95% |
| `disk` | node | disk_free_alarm or < 15%/10% free |
| `connection` | node | fd_used, sockets_used, connections |
| `node` | node | node running, net partitions, proc_used |
| `queue` | queue | messages, unacked, consumer_utilisation |
| `performance` | node/queue | run_queue, message rates |

Default thresholds are in `alert.thresholds.ts`. Workspaces can override via `WorkspaceAlertThresholds`.

---

## Workspace Notification Settings

Stored on the `Workspace` model:

| Field | Type | Default | Purpose |
|-------|------|---------|---------|
| `emailNotificationsEnabled` | boolean | false | Master email toggle |
| `contactEmail` | string? | null | Recipient address |
| `notificationSeverities` | string[] | `["critical", "warning"]` | Which severities trigger notifications |
| `notificationServerIds` | string[] | [] (= all) | Per-server notification filter |

---

## Known Issues (as of 2026-03-11)

1. **N+1 queries in tracking loop** — Each alert in the loop triggers an individual `upsert`. Could be batched with a true bulk upsert for very high alert volumes.

2. **Slack/Webhook not tracked** — Unlike email (`emailSentAt`), Slack and webhook sends are not recorded. The cooldown period only applies to email.

---

## tRPC Routers

Alert-related API endpoints are in `src/trpc/routers/alerts/`:
- `index.ts` — main alerts router (get alerts, resolved alerts, cluster health, thresholds)
- `rules.ts` — alert rules management
- `webhook.ts` — webhook integration CRUD
- `slack.ts` — Slack integration CRUD

---

## Example Scenarios

| Scenario | Outcome |
|----------|---------|
| New alert detected | SeenAlert created → notification sent → `emailSentAt` set |
| Same alert still active (< 7 days) | `lastSeenAt` updated → no notification (cooldown) |
| Same alert still active (> 7 days) | `lastSeenAt` updated → notification sent → `emailSentAt` updated |
| Alert disappears | `resolvedAt` set → `ResolvedAlert` record created |
| Resolved alert returns | `resolvedAt` cleared → notification sent (treated as new) |
| Community mode (no license) | Alerts tracked, no notifications sent |
| Email disabled in workspace | Alerts tracked, no email sent (Slack/Webhook still fire if configured) |
