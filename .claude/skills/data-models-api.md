# Data Models - Backend API

**Part:** apps/api/  
**Generated:** 2026-01-30  
**Database:** PostgreSQL with Prisma ORM 6.19

## Overview

The Qarote API uses PostgreSQL as its primary database with Prisma as the ORM. The schema includes **21 models** organized around core domains: authentication, workspaces, RabbitMQ management, alerts, payments, and licensing.

## Database Schema

### Authentication & Users

#### `User`
Core user account model.

**Key Fields:**
- `id` (uuid, primary key)
- `email` (unique)
- `password` (hashed)
- `firstName`, `lastName`
- `isEmailVerified` (boolean)
- `googleId` (optional, for OAuth)
- `workspaceId` (foreign key)
- `role` (enum: OWNER, ADMIN, MEMBER)

**Relations:**
- Belongs to `Workspace`
- Has many `RabbitMQServer`, `Alert`, `AlertRule`, `Invitation`, `WorkspaceMember`

#### `EmailVerificationToken`
Email verification tokens with expiration.

**Key Fields:**
- `id`, `token` (unique)
- `userId` (foreign key)
- `expiresAt` (timestamp)

#### `PasswordReset`
Password reset tokens with expiration.

**Key Fields:**
- `id`, `token` (unique)
- `userId` (foreign key)
- `expiresAt` (timestamp)

---

### Workspace & Collaboration

#### `Workspace`
Multi-tenant workspace container (Enterprise).

**Key Fields:**
- `id` (uuid, primary key)
- `name`
- `contactEmail` (optional)
- `plan` (enum: FREE, DEVELOPER, ENTERPRISE)
- `customerId` (Stripe customer ID)
- `subscriptionId` (Stripe subscription ID)

**Relations:**
- Has many `User`, `RabbitMQServer`, `Alert`, `AlertRule`, `WorkspaceMember`, `Invitation`
- Has one `WorkspaceAlertThresholds`, `Subscription`, `SlackConfig`

#### `WorkspaceMember`
Additional workspace members (Enterprise).

**Key Fields:**
- `id`, `workspaceId`, `userId`
- `role` (enum: OWNER, ADMIN, MEMBER)
- `joinedAt` (timestamp)

#### `Invitation`
Workspace invitation tokens.

**Key Fields:**
- `id`, `token` (unique)
- `email`
- `role`
- `workspaceId`, `invitedById`
- `status` (enum: PENDING, ACCEPTED, EXPIRED, CANCELLED)
- `expiresAt`

#### `WorkspaceAlertThresholds`
Custom alert thresholds per workspace (Enterprise).

**Key Fields:**
- `id`, `workspaceId` (unique)
- Thresholds: `queueLength`, `messageRate`, `consumerCount`, `memoryUsage`, `diskSpace`, `connectionCount`

---

### RabbitMQ Management

#### `RabbitMQServer`
Registered RabbitMQ server connections.

**Key Fields:**
- `id` (uuid, primary key)
- `name`, `host`, `port`
- `username`, `encryptedPassword` (AES-256-GCM encrypted)
- `protocol` (http/https)
- `workspaceId`, `createdById`
- `isActive` (boolean)

**Relations:**
- Belongs to `Workspace` and `User`
- Has many `Queue`, `QueueMetric`, `AlertRule`

#### `Queue`
Cached queue metadata.

**Key Fields:**
- `id`, `name`, `vhost`
- `serverId` (foreign key)
- `messageCount`, `consumerCount`
- `messageRate`, `publishRate`, `deliverRate`
- `lastSeen` (timestamp)

#### `QueueMetric`
Historical queue metrics for charting.

**Key Fields:**
- `id`, `queueId`, `serverId`
- `timestamp`
- `messageCount`, `messageRate`
- `publishRate`, `deliverRate`

---

### Alerts & Monitoring

#### `Alert`
Individual alert instances.

**Key Fields:**
- `id`, `title`, `description`
- `severity` (enum: INFO, WARNING, CRITICAL)
- `status` (enum: ACTIVE, ACKNOWLEDGED, RESOLVED)
- `threshold`, `value`
- `workspaceId`, `createdById`, `alertRuleId`
- `resolvedAt`, `acknowledgedAt`

**Relations:**
- Belongs to `Workspace`, `User`, `AlertRule`

#### `AlertRule`
Configurable alert rules (Enterprise).

**Key Fields:**
- `id`, `name`, `description`
- `type` (enum: QUEUE_LENGTH, MESSAGE_RATE, CONSUMER_COUNT, etc.)
- `threshold`, `operator` (>, <, >=, <=, ==, !=)
- `severity`
- `enabled` (boolean)
- `serverId`, `workspaceId`, `createdById`

#### `SeenAlert`
Alert deduplication tracking.

**Key Fields:**
- `id`, `fingerprint` (unique)
- `workspaceId`
- `firstSeenAt`, `lastSeenAt`
- `occurrenceCount`

#### `ResolvedAlert`
Historical resolved alerts.

**Key Fields:**
- `id`, `fingerprint`
- `workspaceId`
- `resolvedAt`, `resolvedBy`

#### `SlackConfig`
Slack webhook configuration (Enterprise).

**Key Fields:**
- `id`, `workspaceId` (unique)
- `webhookUrl` (encrypted)
- `channel`, `enabled`

#### `Webhook`
Custom webhook endpoints for alerts (Enterprise).

**Key Fields:**
- `id`, `workspaceId`
- `url` (encrypted)
- `name`, `description`
- `enabled`, `secret` (for HMAC signing)

---

### Payments & Subscriptions

#### `Subscription`
Stripe subscription tracking.

**Key Fields:**
- `id`, `workspaceId` (unique)
- `stripeSubscriptionId`
- `plan` (enum: FREE, DEVELOPER, ENTERPRISE)
- `status` (enum: ACTIVE, CANCELLED, PAST_DUE, TRIALING, UNPAID, INCOMPLETE)
- `currentPeriodStart`, `currentPeriodEnd`
- `cancelAtPeriodEnd` (boolean)

#### `Payment`
Payment transaction records.

**Key Fields:**
- `id`, `workspaceId`
- `stripePaymentIntentId`
- `amount`, `currency`
- `status` (enum: SUCCEEDED, PENDING, FAILED, CANCELLED, REFUNDED)
- `plan` (purchased plan)
- `metadata` (JSON)

#### `StripeWebhookEvent`
Stripe webhook event deduplication.

**Key Fields:**
- `id`, `stripeEventId` (unique)
- `type` (event type)
- `processed` (boolean)
- `processedAt`

---

### Enterprise Licensing

#### `License`
Self-hosted Enterprise license management.

**Key Fields:**
- `id`, `workspaceId`
- `tier` (enum: DEVELOPER, ENTERPRISE)
- `status` (enum: ACTIVE, EXPIRED, SUSPENDED)
- `licenseKey` (unique)
- `expiresAt`
- `maxServers`, `maxUsers`
- `instanceId` (server fingerprint, optional)
- `features` (JSON array)

---

### Feedback

#### `Feedback`
User feedback submissions.

**Key Fields:**
- `id`, `userId`, `workspaceId`
- `type` (enum: BUG, FEATURE_REQUEST, IMPROVEMENT, OTHER)
- `title`, `description`
- `status` (enum: PENDING, REVIEWED, RESOLVED, DISMISSED)
- `priority` (optional)

---

## Data Model Relationships

### Workspace-Centric Architecture
All core entities are scoped to a `Workspace`:
- Users belong to workspaces
- RabbitMQ servers belong to workspaces
- Alerts and alert rules belong to workspaces
- Payments and subscriptions tied to workspaces

### Cascade Deletion
- Deleting a workspace cascades to all related entities
- Deleting a user cascades to their created entities
- Deleting a server cascades to queues, metrics, and alert rules

### Data Encryption
Sensitive fields are encrypted at rest:
- `RabbitMQServer.encryptedPassword` (AES-256-GCM)
- `SlackConfig.webhookUrl` (AES-256-GCM)
- `Webhook.url` (AES-256-GCM)
- `Webhook.secret` (AES-256-GCM)

## Naming Convention

All tables use **PascalCase** naming:
- Model names match table names exactly
- Relation fields use camelCase
- No `@@map` directives used

## Indexes

Key indexes for performance:
- User email (unique)
- Workspace subscription lookups
- RabbitMQ server queries by workspace
- Alert queries by status and workspace
- Queue metrics time-series queries

## Migrations

Located in `apps/api/prisma/migrations/`:
- Managed via Prisma Migrate
- Applied with `pnpm run db:migrate:dev` (dev) or `pnpm run db:migrate` (prod)
