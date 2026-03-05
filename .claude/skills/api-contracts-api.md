# API Contracts - Backend API

**Part:** apps/api/
**Generated:** 2026-03-05
**API Layer:** tRPC 11.0 (Type-safe RPC)

## Overview

The Qarote API exposes all endpoints via **tRPC** at `/trpc/*`, providing end-to-end type safety between frontend and backend. All routers are combined in the root `appRouter`. Real-time data is delivered via **SSE subscriptions** using `httpSubscriptionLink`.

## API Architecture

- **Protocol:** tRPC over HTTP (POST requests to `/trpc/*`, SSE for subscriptions)
- **Authentication:** JWT tokens (Bearer header for HTTP, `connectionParams` query parameter for SSE)
- **Procedures:**
  - `publicProcedure` - Unauthenticated endpoints (no rate limit)
  - `rateLimitedPublicProcedure` - Unauthenticated with rate limiting
  - `rateLimitedProcedure` - Authenticated with standard rate limiting
  - `strictRateLimitedProcedure` - Authenticated with strict rate limiting (5/min)
  - `billingRateLimitedProcedure` - Authenticated with billing rate limiting (30/min)
  - `workspaceProcedure` - Authenticated with workspace-scoped access control
  - `planValidationProcedure` - Catches `PlanValidationError` and `PlanLimitExceededError`
  - `adminPlanValidationProcedure` - Admin-only with plan validation
  - `rateLimitedAdminProcedure` - Admin-only with standard rate limiting
  - `authorize([roles])` - Role-based access (e.g., `authorize([UserRole.ADMIN])`)
  - Enterprise features use `requirePremiumFeature` middleware

## Router Structure

### 1. Authentication Router (`auth`)

**Namespace:** `trpc.auth.*`

#### Session Management (`auth.session`)
- `login` (mutation, rateLimitedPublic) - Email/password authentication, returns JWT
- `getSession` (query, rateLimited) - Get current user session with subscription info

#### Registration (`auth.registration`)
- `register` (mutation, rateLimitedPublic) - Create new user account (auto-verifies when email disabled)

#### Password Management (`auth.password`)
- `requestPasswordReset` (mutation, rateLimitedPublic) - Request password reset email
- `resetPassword` (mutation, rateLimitedPublic) - Reset password with token
- `changePassword` (mutation, strictRateLimited) - Change password (authenticated)

#### Email Verification (`auth.verification`)
- `verifyEmail` (mutation, rateLimitedPublic) - Verify email with token
- `resendVerification` (mutation, rateLimitedPublic) - Resend verification email (supports both authenticated and unauthenticated)
- `getVerificationStatus` (query, rateLimited) - Get email verification status

#### Email Change (`auth.email`)
- `requestEmailChange` (mutation, strictRateLimited) - Request email change with password verification
- `cancelEmailChange` (mutation, strictRateLimited) - Cancel pending email change

#### Google OAuth (`auth.google`)
- `googleLogin` (mutation, rateLimitedPublic) - Authenticate with Google OAuth token

#### SSO (`auth.sso`)
- `getConfig` (query, rateLimitedPublic) - Get SSO configuration (enabled, button label, type)
- `exchangeCode` (mutation, rateLimitedPublic) - Exchange SSO auth code for JWT

#### Invitations (`auth.invitation`)
- `getInvitationDetails` (query, rateLimitedPublic) - Get invitation details by token
- `acceptInvitation` (mutation, rateLimitedPublic) - Accept invitation (existing or new user with password)
- `acceptInvitationWithRegistration` (mutation, rateLimitedPublic) - Accept invitation with new account registration
- `acceptInvitationWithGoogle` (mutation, rateLimitedPublic) - Accept invitation with Google OAuth

---

### 2. User Router (`user`)

**Namespace:** `trpc.user.*`

- `getWorkspaceUsers` (query, workspace) - Get users in the same workspace
- `getProfile` (query, rateLimited) - Get current user profile with workspace info
- `updateProfile` (mutation, rateLimited) - Update user profile (handles email change with verification)
- `getInvitations` (query, admin) - Get pending invitations for a workspace
- `getUser` (query, workspace) - Get a specific user by ID
- `updateUser` (mutation, admin) - Update a user (admin only)
- `updateWorkspace` (mutation, admin) - Update workspace information (admin only)
- `removeFromWorkspace` (mutation, admin) - Remove user from workspace (admin only)
- `updateLocale` (mutation, rateLimited) - Update user locale preference

---

### 3. Workspace Router (`workspace`)

**Namespace:** `trpc.workspace.*`

#### Core Operations (`workspace.core`)
- `getCurrent` (query, rateLimited) - Get current user's workspace
- `getById` (query, workspace) - Get specific workspace by ID
- `getAll` (query, admin) - Get all workspaces (admin only)

#### Management (`workspace.management`)
- `getUserWorkspaces` (query, rateLimited) - Get all workspaces the user belongs to
- `getCreationInfo` (query, rateLimited) - Get workspace creation info (plan limits, counts)
- `create` (mutation, planValidation) - Create a new workspace
- `update` (mutation, rateLimited) - Update workspace (owner only)
- `delete` (mutation, rateLimited) - Delete workspace (owner only)
- `switch` (mutation, workspace) - Switch active workspace

#### Plan Management (`workspace.plan`)
- `getAllPlans` (query, rateLimited) - Get all available plans with features
- `getCurrentPlan` (query, rateLimited) - Get current plan, usage, and warnings (falls back to license JWT for self-hosted)

#### Invitation Management (`workspace.invitation`)
- `getInvitations` (query, rateLimited) - Get pending invitations for workspace
- `sendInvitation` (mutation, planValidation) - Send workspace invitation (validates plan limits)
- `revokeInvitation` (mutation, rateLimited) - Revoke a pending invitation

#### Data Management (`workspace.data`)
- `export` (query, rateLimitedAdmin + DATA_EXPORT feature) - Export all workspace data (Enterprise)

---

### 4. RabbitMQ Router (`rabbitmq`)

**Namespace:** `trpc.rabbitmq.*`

#### Server Management (`rabbitmq.server`)
- `getServers` (query, workspace) - List all RabbitMQ servers for workspace
- `getServer` (query, workspace) - Get server details by ID
- `createServer` (mutation, adminPlanValidation) - Add new server (validates plan limits, tests connection, detects version)
- `updateServer` (mutation, admin) - Update server configuration (re-tests connection)
- `deleteServer` (mutation, admin) - Remove server
- `testConnection` (mutation, admin) - Test server connectivity

#### Overview (`rabbitmq.overview`)
- `getOverview` (query, workspace) - Get server overview/stats with over-limit warnings

#### Queues (`rabbitmq.queues`)
- `getQueues` (query, workspace) - List all queues (persists to DB, includes over-limit warnings)
- `getQueue` (query, workspace) - Get queue details
- `getQueueConsumers` (query, workspace) - Get consumers for a specific queue
- `getQueueBindings` (query, workspace) - Get bindings for a specific queue
- `createQueue` (mutation, admin) - Create new queue (validates plan limits)
- `purgeQueue` (mutation, admin) - Purge queue messages
- `deleteQueue` (mutation, admin) - Delete queue (from RabbitMQ and local DB)
- `pauseQueue` (mutation, admin) - Pause queue via AMQP protocol
- `resumeQueue` (mutation, admin) - Resume queue via AMQP protocol
- `getPauseStatus` (query, admin) - Get pause status of a queue
- `watchQueues` (subscription, workspace, 4s interval) - **SSE** live queue data stream

#### Messages (`rabbitmq.messages`)
- `publishMessage` (mutation, admin) - Publish message to exchange/queue

#### Virtual Hosts (`rabbitmq.vhost`)
- `getVHosts` (query, admin) - List virtual hosts with permissions, limits, and message stats
- `getVHost` (query, admin) - Get vhost details with stats (queues, exchanges, connections)
- `createVHost` (mutation, admin) - Create virtual host
- `updateVHost` (mutation, admin) - Update virtual host
- `deleteVHost` (mutation, admin) - Delete virtual host (prevents deletion of default "/")
- `setPermissions` (mutation, admin) - Set user permissions for a vhost
- `deletePermissions` (mutation, admin) - Delete user permissions for a vhost
- `setLimit` (mutation, admin) - Set virtual host limit (max-queues, max-connections)
- `deleteLimit` (mutation, admin) - Delete virtual host limit

#### Users (`rabbitmq.users`)
- `getUsers` (query, admin) - List RabbitMQ users
- `getUser` (query, admin) - Get user details with permissions
- `createUser` (mutation, admin) - Create RabbitMQ user
- `updateUser` (mutation, admin) - Update user (tags, password)
- `deleteUser` (mutation, admin) - Delete user
- `setPermissions` (mutation, admin) - Set user permissions on a vhost
- `deletePermissions` (mutation, admin) - Delete user permissions on a vhost

#### Infrastructure (`rabbitmq.infrastructure`)
- `getNodes` (query, workspace) - List cluster nodes
- `getConnections` (query, workspace) - List active connections and channels
- `getChannels` (query, workspace) - List active channels
- `getExchanges` (query, workspace) - List exchanges with bindings and type counts
- `createExchange` (mutation, admin) - Create exchange
- `deleteExchange` (mutation, admin) - Delete exchange

#### Metrics (`rabbitmq.metrics`)
- `getMetrics` (query, workspace) - Get system-level metrics (CPU, memory, disk)
- `getRates` (query, workspace) - Get message rates with configurable time range
- `getQueueRates` (query, workspace) - Get queue-specific message rates
- `watchMetrics` (subscription, workspace, 10s interval) - **SSE** live system metrics stream
- `watchRates` (subscription, workspace, 4s interval) - **SSE** live message rates stream

#### Memory (`rabbitmq.memory`)
- `getNodeMemory` (query, workspace) - Get detailed memory metrics for a node (basic, advanced, expert, trends, optimization)

#### Alerts (`rabbitmq.alerts`)
- `getAlerts` (query, workspace) - Get current alerts (free users get summary only)
- `getResolvedAlerts` (query, workspace) - Get resolved alerts with pagination
- `getHealthCheck` (query, workspace) - Get server health check
- `getThresholds` (query, workspace) - Get alert thresholds for workspace
- `updateThresholds` (mutation, workspace) - Update alert thresholds
- `getNotificationSettings` (query, workspace) - Get email/browser notification settings
- `updateNotificationSettings` (mutation, workspace) - Update notification settings (owner only)
- `watchAlerts` (subscription, workspace, 10s interval) - **SSE** live alerts stream

---

### 5. Alerts Router (`alerts`)

**Namespace:** `trpc.alerts.*` (Feature-gated)

#### Rules (`alerts.rules`)
- `getRules` (query, workspace + ALERTING) - List alert rules
- `getRule` (query, workspace + ALERTING) - Get alert rule details
- `createRule` (mutation, workspace + ADVANCED_ALERT_RULES) - Create alert rule
- `updateRule` (mutation, workspace + ADVANCED_ALERT_RULES) - Update alert rule
- `deleteRule` (mutation, workspace + ADVANCED_ALERT_RULES) - Delete alert rule

#### Slack Integration (`alerts.slack`)
- `getConfigs` (query, workspace + SLACK_INTEGRATION) - List Slack configurations
- `createConfig` (mutation, workspace + SLACK_INTEGRATION) - Create Slack configuration
- `updateConfig` (mutation, workspace + SLACK_INTEGRATION) - Update Slack configuration
- `deleteConfig` (mutation, workspace + SLACK_INTEGRATION) - Delete Slack configuration

#### Webhook Integration (`alerts.webhook`)
- `getWebhooks` (query, workspace + WEBHOOK_INTEGRATION) - List webhooks
- `createWebhook` (mutation, workspace + WEBHOOK_INTEGRATION) - Create webhook
- `updateWebhook` (mutation, workspace + WEBHOOK_INTEGRATION) - Update webhook
- `deleteWebhook` (mutation, workspace + WEBHOOK_INTEGRATION) - Delete webhook

---

### 6. Payment Router (`payment`)

**Namespace:** `trpc.payment.*`

#### Checkout (`payment.checkout`)
- `createCheckoutSession` (mutation, strictRateLimited) - Create Stripe checkout session with 30-day trial

#### Billing (`payment.billing`)
- `getBillingOverview` (query, billingRateLimited) - Get comprehensive billing overview (subscription, Stripe data, payments, usage)
- `createBillingPortalSession` (mutation, rateLimited) - Create Stripe billing portal session
- `createPortalSession` (mutation, rateLimited) - Alias for createBillingPortalSession

#### Subscription (`payment.subscription`)
- `cancelSubscription` (mutation, strictRateLimited) - Cancel subscription (immediate or at period end)
- `renewSubscription` (mutation, strictRateLimited) - Renew subscription via new checkout session

---

### 7. Feedback Router (`feedback`)

**Namespace:** `trpc.feedback.*`

- `submit` (mutation, rateLimited) - Submit user feedback
- `getAll` (query, admin) - Get all feedback with pagination and filters
- `getById` (query, admin) - Get feedback by ID
- `update` (mutation, admin) - Update feedback status/response
- `delete` (mutation, admin) - Delete feedback
- `getStats` (query, admin) - Get feedback statistics (counts by status)

---

### 8. Discord Router (`discord`)

**Namespace:** `trpc.discord.*`

- `markJoined` (mutation, rateLimited) - Mark user as having joined Discord community
- `getStatus` (query, rateLimited) - Get user's Discord join status

---

### 9. License Router (`license`) - Customer Portal

**Namespace:** `trpc.license.*`

- `validate` (mutation, rateLimitedPublic) - Validate a license key (called by self-hosted instances)
- `getLicenses` (query, rateLimited) - List purchased licenses for the authenticated user
- `purchaseLicense` (mutation, rateLimited) - Purchase a new license (creates Stripe checkout for annual subscription)

---

### 10. Self-Hosted License Router (`selfhostedLicense`)

**Namespace:** `trpc.selfhostedLicense.*` (Self-hosted only, admin only)

- `activate` (mutation) - Activate a license by pasting a JWT (verifies offline, stores in DB)
- `status` (query) - Get current license status (decoded JWT info or null)
- `deactivate` (mutation) - Deactivate the current license (reverts to free tier)

---

### 11. Self-Hosted SMTP Router (`selfhostedSmtp`)

**Namespace:** `trpc.selfhostedSmtp.*` (Self-hosted only, admin only)

- `getSettings` (query) - Get current SMTP settings (DB or env fallback, secrets redacted)
- `updateSettings` (mutation) - Update SMTP settings (preserves existing secrets if redacted placeholder sent)
- `testConnection` (mutation) - Test SMTP connection and send test email

---

### 12. Self-Hosted SSO Router (`selfhostedSso`)

**Namespace:** `trpc.selfhostedSso.*` (Self-hosted only, admin only)

- `getSettings` (query) - Get current SSO settings (DB or env fallback, client secret redacted)
- `updateSettings` (mutation) - Update SSO settings (preserves existing secrets, reinitializes service)
- `testConnection` (mutation) - Test OIDC connection by fetching discovery URL (with SSRF protection)

---

### 13. Public Router (`public`)

**Namespace:** `trpc.public.*`

- `getConfig` (query, public) - Get public app configuration (registration, email, OAuth, SSO flags)
- `getFeatureFlags` (query, public) - Get which premium features are enabled for the deployment

#### Invitation (`public.invitation`)
- `getDetails` (query, rateLimitedPublic) - Get invitation details by token
- `accept` (mutation, rateLimitedPublic) - Accept invitation with registration
- `acceptWithGoogle` (mutation, rateLimitedPublic) - Accept invitation with Google OAuth

---

## Authentication Flow

1. **Registration:** `auth.registration.register` - Email verification sent (or auto-verified when email disabled)
2. **Email Verification:** `auth.verification.verifyEmail` with token
3. **Login:** `auth.session.login` - Returns JWT token
4. **Protected Requests:** Include JWT in `Authorization: Bearer <token>` header
5. **SSE Subscriptions:** Include JWT via `connectionParams` query parameter
6. **Session Check:** `auth.session.getSession` to refresh user data

## Authorization Levels

- **Public** - No authentication required (`publicProcedure`)
- **Rate-Limited Public** - No auth, with rate limiting (`rateLimitedPublicProcedure`)
- **Protected** - Requires valid JWT token (`rateLimitedProcedure`)
- **Workspace** - Requires JWT + workspace membership validation (`workspaceProcedure`)
- **Admin** - Requires JWT + ADMIN role (`authorize([UserRole.ADMIN])`)
- **Self-Hosted Admin** - Admin + self-hosted deployment mode check
- **Feature-Gated** - Workspace + specific premium feature (e.g., ALERTING, SLACK_INTEGRATION)

## Rate Limiting

In-memory rate limiter with sliding window:
- **Standard:** 100 requests/minute per user (`rateLimitedProcedure`)
- **Strict:** 5 requests/minute per user (`strictRateLimitedProcedure`)
- **Billing:** 30 requests/minute per user (`billingRateLimitedProcedure`)

## SSE Subscriptions

Real-time data streams via Server-Sent Events:
- `rabbitmq.queues.watchQueues` - Queue data every 4 seconds
- `rabbitmq.metrics.watchMetrics` - System metrics every 10 seconds
- `rabbitmq.metrics.watchRates` - Message rates every 4 seconds
- `rabbitmq.alerts.watchAlerts` - Alert data every 10 seconds

All subscriptions use `abortableSleep` for clean cancellation and yield stale data on fetch errors.

## Error Handling

All tRPC procedures return typed errors using `TRPCError`:
- `UNAUTHORIZED` - Authentication required
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `BAD_REQUEST` - Invalid input
- `CONFLICT` - Resource conflict (e.g., email already in use)
- `SERVICE_UNAVAILABLE` - Feature not enabled (e.g., OAuth, SSO disabled)
- `UNPROCESSABLE_CONTENT` - Valid input but cannot process (e.g., message not routed)
- `INTERNAL_SERVER_ERROR` - Server error

## Integration Points

### External Services
- **Stripe** - Payment processing (`payment.*`, `license.purchaseLicense`)
- **SMTP/Nodemailer** - Email delivery (configurable via `selfhostedSmtp.*` in self-hosted mode)
- **Sentry** - Error tracking and user context (optional)
- **Slack** - Alert notifications (`alerts.slack.*`)
- **Google OAuth** - Authentication (`auth.google.*`, invitation acceptance)
- **Notion** - User synchronization on registration/verification (non-blocking)

### RabbitMQ Connectivity
- **Management HTTP API** - Server monitoring, queue/exchange/vhost/user management
- **AMQP Protocol** - Queue pause/resume operations via `RabbitMQAmqpClient`

### SSO Integration
- **OIDC** - OpenID Connect discovery and code exchange (`auth.sso.*`)
- **SAML** - SAML metadata URL support (via `selfhostedSso.*` configuration)

## Type Safety

Frontend applications import the `AppRouter` type for complete type inference:

```typescript
import type { AppRouter } from 'qarote-api';

const trpc = createTRPCClient<AppRouter>({ ... });
```

All request inputs and responses are fully typed via Zod schemas.
