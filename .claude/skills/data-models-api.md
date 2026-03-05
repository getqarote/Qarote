# Data Models - Backend API

**Part:** apps/api/
**Generated:** 2026-03-05
**Database:** PostgreSQL with Prisma ORM 7.4

## Overview

The Qarote API uses PostgreSQL as its primary database with Prisma as the ORM. The schema includes **27 models** and **14 enums** organized around core domains: authentication, workspaces, RabbitMQ management, alerts, payments, licensing, SSO, and system configuration.

## Database Schema

### Authentication & Users

#### `User`
Core user account model.

**Key Fields:**
- `id` (uuid, primary key)
- `email` (unique)
- `passwordHash` (optional, hashed)
- `firstName`, `lastName`
- `role` (enum: ADMIN, MEMBER, READONLY)
- `isActive` (boolean, default true)
- `lastLogin` (optional timestamp)
- `workspaceId` (optional foreign key)
- `emailVerified` (boolean)
- `emailVerifiedAt` (optional timestamp)
- `pendingEmail` (optional)
- `googleId` (optional, unique, for OAuth)
- `ssoSubjectId` (optional, unique, for SSO)
- `stripeCustomerId` (optional, unique)
- `stripeSubscriptionId` (optional, unique)
- `locale` (string, default "en")
- `discordJoined` (boolean, default false)
- `discordJoinedAt` (optional timestamp)

**Relations:**
- Belongs to `Workspace` (optional, cascade delete)
- Has many `Alert`, `AlertRule`, `EmailVerificationToken`, `PasswordReset`
- Has many `Feedback` (as author and as responder)
- Has many `Invitation` (as inviter and as invitee)
- Has many `WorkspaceMember`, `Payment`
- Has one `Subscription`

#### `EmailVerificationToken`
Email verification tokens with expiration.

**Key Fields:**
- `id` (uuid), `token` (unique)
- `userId` (foreign key), `email`, `type`
- `expiresAt` (timestamp)

**Indexes:** `token`, `userId`

#### `PasswordReset`
Password reset tokens with expiration.

**Key Fields:**
- `id` (uuid), `token` (unique)
- `userId` (foreign key)
- `expiresAt` (timestamp)
- `used` (boolean, default false)

**Indexes:** `expiresAt`, `token`, `userId`

---

### Workspace & Collaboration

#### `Workspace`
Multi-tenant workspace container.

**Key Fields:**
- `id` (uuid, primary key)
- `name`
- `contactEmail` (optional)
- `logoUrl` (optional)
- `ownerId` (optional)
- `tags` (JSON, optional)
- `emailNotificationsEnabled` (boolean, default true)
- `notificationSeverities` (JSON, optional)
- `browserNotificationsEnabled` (boolean, default false)
- `browserNotificationSeverities` (JSON, optional)
- `notificationServerIds` (JSON, optional)

**Relations:**
- Has many `User`, `RabbitMQServer`, `Alert`, `AlertRule`, `WorkspaceMember`, `Invitation`
- Has many `Feedback`, `License`, `ResolvedAlert`, `SeenAlert`, `SlackConfig`, `Webhook`
- Has one `WorkspaceAlertThresholds`

#### `WorkspaceMember`
Workspace membership tracking.

**Key Fields:**
- `id` (uuid), `userId`, `workspaceId`
- `role` (enum: ADMIN, MEMBER, READONLY)

**Constraints:** Unique on `[userId, workspaceId]`
**Indexes:** `userId`, `workspaceId`

#### `Invitation`
Workspace invitation tokens.

**Key Fields:**
- `id` (uuid), `token` (unique)
- `email`
- `role` (enum: ADMIN, MEMBER, READONLY; default MEMBER)
- `workspaceId`, `invitedById`, `invitedUserId` (optional)
- `status` (enum: PENDING, ACCEPTED, EXPIRED)
- `expiresAt`

#### `WorkspaceAlertThresholds`
Custom alert thresholds per workspace.

**Key Fields:**
- `id` (uuid), `workspaceId` (unique)
- Memory: `memoryWarning` (80.0), `memoryCritical` (90.0)
- Disk: `diskWarning` (80.0), `diskCritical` (90.0)
- File descriptors: `fileDescriptorsWarning` (80.0), `fileDescriptorsCritical` (90.0)
- Sockets: `socketsWarning` (80.0), `socketsCritical` (90.0)
- Processes: `processesWarning` (80.0), `processesCritical` (90.0)
- Unacked messages: `unackedMessagesWarning` (1000), `unackedMessagesCritical` (5000)
- Consumer utilization: `consumerUtilizationWarning` (20.0), `consumerUtilizationCritical` (10.0)
- Run queue: `runQueueWarning` (50), `runQueueCritical` (100)

---

### RabbitMQ Management

#### `RabbitMQServer`
Registered RabbitMQ server connections.

**Key Fields:**
- `id` (uuid, primary key)
- `name`, `host`, `port`
- `username`, `password`
- `vhost` (default "/")
- `useHttps` (boolean, default false)
- `sslVerifyPeer` (boolean, default true)
- `amqpPort` (int, default 5672)
- `workspaceId` (optional foreign key)
- `version`, `versionMajorMinor` (optional)
- `isOverQueueLimit` (boolean, default false)
- `overLimitWarningShown` (boolean, default false)
- `queueCountAtConnect` (optional int)
- `queuePauseStates` (JSON, optional)

**Relations:**
- Belongs to `Workspace` (optional)
- Has many `Queue`, `AlertRule`, `ResolvedAlert`, `SeenAlert`

#### `Queue`
Cached queue metadata.

**Key Fields:**
- `id` (uuid), `name`, `vhost`
- `serverId` (foreign key)
- `messages`, `messagesReady`, `messagesUnack` (int)
- `lastFetched` (timestamp)

**Constraints:** Unique on `[name, vhost, serverId]`

**Relations:**
- Belongs to `RabbitMQServer` (cascade delete)
- Has many `QueueMetric`

#### `QueueMetric`
Historical queue metrics for charting.

**Key Fields:**
- `id` (uuid), `queueId`
- `timestamp`
- `messages`, `messagesReady`, `messagesUnack` (int)
- `publishRate`, `consumeRate` (float)

**Indexes:** Composite `[queueId, timestamp]`

---

### Alerts & Monitoring

#### `Alert`
Individual alert instances.

**Key Fields:**
- `id` (uuid), `title`, `description`
- `severity` (enum: LOW, MEDIUM, HIGH, CRITICAL)
- `status` (enum: ACTIVE, ACKNOWLEDGED, RESOLVED; default ACTIVE)
- `threshold`, `value` (optional float)
- `workspaceId`, `createdById` (optional), `alertRuleId` (optional)
- `resolvedAt`, `acknowledgedAt` (optional timestamps)

**Relations:**
- Belongs to `Workspace` (cascade delete), `User` (optional), `AlertRule` (optional)

#### `AlertRule`
Configurable alert rules.

**Key Fields:**
- `id` (cuid), `name`, `description` (optional)
- `type` (enum: QUEUE_DEPTH, MESSAGE_RATE, CONSUMER_COUNT, MEMORY_USAGE, DISK_USAGE, CONNECTION_COUNT, CHANNEL_COUNT, NODE_DOWN, EXCHANGE_ERROR)
- `threshold` (float), `operator` (enum: GREATER_THAN, LESS_THAN, EQUALS, NOT_EQUALS)
- `severity` (enum: LOW, MEDIUM, HIGH, CRITICAL)
- `enabled` (boolean, default true)
- `serverId`, `workspaceId`, `createdById`

**Relations:**
- Belongs to `User` (cascade delete), `RabbitMQServer` (cascade delete), `Workspace` (cascade delete)
- Has many `Alert`

#### `SeenAlert`
Alert deduplication tracking.

**Key Fields:**
- `id` (uuid), `fingerprint` (unique)
- `serverId`, `workspaceId`
- `severity`, `category`, `sourceType`, `sourceName`
- `firstSeenAt`, `lastSeenAt` (timestamps)
- `resolvedAt`, `emailSentAt` (optional timestamps)

**Indexes:** `fingerprint`, `resolvedAt`, `serverId`, `workspaceId`

#### `ResolvedAlert`
Historical resolved alerts.

**Key Fields:**
- `id` (uuid), `fingerprint`
- `serverId`, `serverName`
- `severity`, `category`, `title`, `description`
- `details` (JSON)
- `sourceType`, `sourceName`
- `firstSeenAt`, `resolvedAt`
- `duration` (optional int)
- `workspaceId`

**Indexes:** `fingerprint`, `resolvedAt`, `serverId`, `workspaceId`

#### `SlackConfig`
Slack webhook configuration.

**Key Fields:**
- `id` (uuid), `workspaceId`
- `webhookUrl`
- `customValue` (optional)
- `enabled` (boolean, default true)

**Indexes:** `enabled`, `workspaceId`

#### `Webhook`
Custom webhook endpoints for alerts.

**Key Fields:**
- `id` (uuid), `workspaceId`
- `url`
- `enabled` (boolean, default true)
- `secret` (optional, for HMAC signing)
- `version` (string, default "v1")

**Indexes:** `enabled`, `workspaceId`

---

### Payments & Subscriptions

#### `Subscription`
Stripe subscription tracking.

**Key Fields:**
- `id` (uuid), `userId` (unique)
- `stripeSubscriptionId` (unique), `stripePriceId`, `stripeCustomerId`
- `plan` (enum: FREE, DEVELOPER, ENTERPRISE)
- `status` (enum: ACTIVE, PAST_DUE, CANCELED, INCOMPLETE, INCOMPLETE_EXPIRED, TRIALING, UNPAID)
- `billingInterval` (enum: MONTH, YEAR)
- `pricePerMonth` (decimal 10,2), `currency` (default "usd")
- `currentPeriodStart`, `currentPeriodEnd`
- `trialStart`, `trialEnd` (optional)
- `cancelAtPeriodEnd` (boolean, default false)
- `canceledAt` (optional), `cancelationReason` (optional)
- `isRenewalAfterCancel` (boolean, default false)
- `previousCancelDate` (optional)
- `metadata` (JSON, optional)

**Indexes:** `status`, `stripeSubscriptionId`, `userId`

#### `Payment`
Payment transaction records.

**Key Fields:**
- `id` (uuid), `userId`
- `stripePaymentId` (unique), `stripeInvoiceId` (optional), `stripeChargeId` (optional)
- `amount` (decimal 10,2), `currency` (default "usd")
- `status` (enum: SUCCEEDED, PENDING, FAILED, CANCELED, REQUIRES_ACTION)
- `plan` (optional, enum: FREE, DEVELOPER, ENTERPRISE)
- `billingInterval` (optional, enum: MONTH, YEAR)
- `periodStart`, `periodEnd` (optional timestamps)
- `description` (optional)
- `paymentMethodId`, `paymentMethodType` (optional)
- `failureCode`, `failureMessage` (optional)
- `receiptUrl`, `invoiceUrl` (optional)
- `paidAt` (optional timestamp)
- `metadata` (JSON, optional)

**Indexes:** `createdAt`, `status`, `stripePaymentId`, `userId`

#### `StripeWebhookEvent`
Stripe webhook event deduplication.

**Key Fields:**
- `id` (uuid), `stripeEventId` (unique)
- `eventType` (string)
- `processed` (boolean, default false)
- `data` (JSON)
- `processedAt` (optional), `errorMessage` (optional)
- `retryCount` (int, default 0)

**Indexes:** `eventType`, `processed`, `stripeEventId`

---

### Enterprise Licensing

#### `License`
Self-hosted Enterprise license management.

**Key Fields:**
- `id` (uuid), `licenseKey` (unique)
- `tier` (enum: FREE, DEVELOPER, ENTERPRISE)
- `isActive` (boolean, default true)
- `expiresAt`
- `customerEmail`
- `workspaceId` (optional, onDelete: SetNull)
- `lastValidatedAt` (optional)
- `stripeCustomerId`, `stripePaymentId`, `stripeSubscriptionId` (optional)
- `currentVersion` (int, default 1)

**Relations:**
- Belongs to `Workspace` (optional, set null on delete)
- Has many `LicenseRenewalEmail`, `LicenseFileVersion`

**Indexes:** `isActive`, `customerEmail`, `licenseKey`, `workspaceId`, `stripeSubscriptionId`

#### `LicenseRenewalEmail`
Tracks renewal reminder emails sent per license.

**Key Fields:**
- `id` (uuid), `licenseId`
- `reminderType` (string: "30_DAY", "15_DAY", "7_DAY", "EXPIRED")
- `sentAt` (timestamp)

**Constraints:** Unique on `[licenseId, reminderType]`
**Indexes:** `licenseId`, `sentAt`

#### `LicenseFileVersion`
Versioned signed license file content for renewals.

**Key Fields:**
- `id` (uuid), `licenseId`
- `version` (int)
- `fileContent` (text, signed license JSON)
- `expiresAt`
- `stripeInvoiceId` (optional, for idempotency)
- `deletesAt` (timestamp, set when a newer version is created)

**Constraints:** Unique on `[licenseId, version]`
**Indexes:** `licenseId`, `deletesAt`, `stripeInvoiceId`

---

### SSO (Single Sign-On)

#### `SsoAuthCode`
Temporary SSO authorization codes for the auth code flow.

**Key Fields:**
- `id` (uuid), `code` (unique)
- `jwt` (text)
- `userData` (JSON)
- `isNewUser` (boolean)
- `expiresAt`

**Indexes:** `expiresAt`

#### `SsoState`
SSO state parameter tracking for CSRF protection.

**Key Fields:**
- `id` (uuid), `state` (unique)
- `expiresAt`

**Indexes:** `expiresAt`

---

### Feedback

#### `Feedback`
User feedback submissions.

**Key Fields:**
- `id` (uuid)
- `type` (enum: BUG, FEATURE, GENERAL, IMPROVEMENT)
- `category` (enum: UI_UX, PERFORMANCE, SECURITY, FUNCTIONALITY, DOCUMENTATION, OTHER)
- `title` (varchar 100), `description`
- `priority` (enum: LOW, MEDIUM, HIGH; default MEDIUM)
- `status` (enum: OPEN, IN_PROGRESS, RESOLVED, CLOSED; default OPEN)
- `email` (optional, varchar 255)
- `metadata` (JSON, optional)
- `userId` (optional), `workspaceId` (optional)
- `response` (optional), `respondedById` (optional), `respondedAt` (optional)

**Indexes:** `createdAt`, `priority`, `status`, `type`, `workspaceId`

---

### System Configuration

#### `SystemState`
Internal process state used by cron jobs to track cursors (e.g., last notified release version).

**Key Fields:**
- `id` (uuid), `key` (unique)
- `value` (string)

#### `SystemSetting`
User-facing configuration persisted across restarts. Primary use: storing the activated license JWT (key = "license").

**Key Fields:**
- `key` (string, primary key)
- `value` (text)

---

## Enums

| Enum | Values |
|---|---|
| `AlertSeverity` | LOW, MEDIUM, HIGH, CRITICAL |
| `AlertStatus` | ACTIVE, ACKNOWLEDGED, RESOLVED |
| `AlertType` | QUEUE_DEPTH, MESSAGE_RATE, CONSUMER_COUNT, MEMORY_USAGE, DISK_USAGE, CONNECTION_COUNT, CHANNEL_COUNT, NODE_DOWN, EXCHANGE_ERROR |
| `BillingInterval` | MONTH, YEAR |
| `ComparisonOperator` | GREATER_THAN, LESS_THAN, EQUALS, NOT_EQUALS |
| `FeedbackCategory` | UI_UX, PERFORMANCE, SECURITY, FUNCTIONALITY, DOCUMENTATION, OTHER |
| `FeedbackPriority` | LOW, MEDIUM, HIGH |
| `FeedbackStatus` | OPEN, IN_PROGRESS, RESOLVED, CLOSED |
| `FeedbackType` | BUG, FEATURE, GENERAL, IMPROVEMENT |
| `InvitationStatus` | PENDING, ACCEPTED, EXPIRED |
| `PaymentStatus` | SUCCEEDED, PENDING, FAILED, CANCELED, REQUIRES_ACTION |
| `SubscriptionStatus` | ACTIVE, PAST_DUE, CANCELED, INCOMPLETE, INCOMPLETE_EXPIRED, TRIALING, UNPAID |
| `UserPlan` | FREE, DEVELOPER, ENTERPRISE |
| `UserRole` | ADMIN, MEMBER, READONLY |

## Data Model Relationships

### Workspace-Centric Architecture
All core entities are scoped to a `Workspace`:
- Users belong to workspaces
- RabbitMQ servers belong to workspaces
- Alerts and alert rules belong to workspaces
- Subscriptions tied to users (not workspaces directly)
- Payments tied to users

### User-Centric Subscriptions
- `Subscription` belongs to `User` (one-to-one via unique `userId`)
- `Payment` belongs to `User` (one-to-many)
- Stripe customer/subscription IDs stored on `User`

### Cascade Deletion
- Deleting a workspace cascades to: alerts, alert rules, users, members, invitations, alert thresholds, resolved alerts, seen alerts, slack configs, webhooks
- Deleting a user cascades to: alert rules, password resets, email tokens, workspace members, payments, subscription
- Deleting a server cascades to: queues, alert rules, resolved alerts, seen alerts
- Deleting a queue cascades to: queue metrics
- Deleting a license cascades to: renewal emails, file versions
- License workspace relation uses `SetNull` (license preserved when workspace deleted)

### Data Encryption
Sensitive fields are encrypted at rest:
- `RabbitMQServer.password`
- `SlackConfig.webhookUrl`
- `Webhook.url`
- `Webhook.secret`

## Naming Convention

All tables use **PascalCase** naming:
- Model names match table names exactly
- Relation fields use camelCase
- No `@@map` directives used

## Indexes

Key indexes for performance:
- User: `email` (unique), `googleId` (unique), `ssoSubjectId` (unique), `stripeCustomerId` (unique), `stripeSubscriptionId` (unique)
- EmailVerificationToken: `token`, `userId`
- PasswordReset: `expiresAt`, `token`, `userId`
- WorkspaceMember: composite unique `[userId, workspaceId]`, `userId`, `workspaceId`
- Queue: composite unique `[name, vhost, serverId]`
- QueueMetric: composite `[queueId, timestamp]`
- SeenAlert: `fingerprint` (unique), `resolvedAt`, `serverId`, `workspaceId`
- ResolvedAlert: `fingerprint`, `resolvedAt`, `serverId`, `workspaceId`
- SlackConfig: `enabled`, `workspaceId`
- Webhook: `enabled`, `workspaceId`
- Subscription: `stripeSubscriptionId` (unique), `status`, `userId`
- Payment: `stripePaymentId` (unique), `createdAt`, `status`, `userId`
- StripeWebhookEvent: `stripeEventId` (unique), `eventType`, `processed`
- License: `licenseKey` (unique), `isActive`, `customerEmail`, `workspaceId`, `stripeSubscriptionId`
- LicenseRenewalEmail: composite unique `[licenseId, reminderType]`, `licenseId`, `sentAt`
- LicenseFileVersion: composite unique `[licenseId, version]`, `licenseId`, `deletesAt`, `stripeInvoiceId`
- Feedback: `createdAt`, `priority`, `status`, `type`, `workspaceId`
- SsoAuthCode: `code` (unique), `expiresAt`
- SsoState: `state` (unique), `expiresAt`

## Migrations

Located in `apps/api/prisma/migrations/`:
- Managed via Prisma Migrate
- Applied with `pnpm run db:migrate:dev` (dev) or `pnpm run db:migrate` (prod)
