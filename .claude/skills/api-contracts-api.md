# API Contracts - Backend API

**Part:** apps/api/  
**Generated:** 2026-01-30  
**API Layer:** tRPC 11.0 (Type-safe RPC)

## Overview

The Qarote API exposes all endpoints via **tRPC** at `/trpc/*`, providing end-to-end type safety between frontend and backend. All routers are combined in the root `appRouter`.

## API Architecture

- **Protocol:** tRPC over HTTP (POST requests to `/trpc/*`)
- **Authentication:** JWT tokens (Bearer authentication)
- **Procedures:** 
  - `publicProcedure` - Unauthenticated endpoints
  - `protectedProcedure` - Requires authentication
  - Enterprise features use `requirePremiumFeature` middleware

## Router Structure

### 1. Authentication Router (`auth`)

**Namespace:** `trpc.auth.*`

#### Session Management (`auth.session`)
- `login` - Email/password authentication
- `getSession` - Get current user session
- `logout` - Invalidate session

#### Registration (`auth.registration`)
- `register` - Create new user account
- `checkEmail` - Check if email exists

#### Password Management (`auth.password`)
- `requestReset` - Request password reset email
- `resetPassword` - Reset password with token
- `changePassword` - Change password (authenticated)

#### Email Verification (`auth.verification`)
- `verifyEmail` - Verify email with token
- `resendVerification` - Resend verification email

#### Google OAuth (`auth.google`)
- `authenticate` - Authenticate with Google OAuth token

#### Invitations (`auth.invitation`)
- `send` - Send workspace invitation
- `accept` - Accept invitation with token

---

### 2. User Router (`user`)

**Namespace:** `trpc.user.*`

- `getProfile` - Get current user profile
- `updateProfile` - Update user information
- `deleteAccount` - Delete user account

---

### 3. Workspace Router (`workspace`)

**Namespace:** `trpc.workspace.*`

#### Core Operations (`workspace.core`)
- `get` - Get current workspace
- `create` - Create new workspace
- `update` - Update workspace details
- `delete` - Delete workspace

#### Member Management (`workspace.management`)
- `listMembers` - List workspace members
- `updateMemberRole` - Change member role
- `removeMember` - Remove member from workspace

#### Plan Management (`workspace.plan`)
- `getCurrent` - Get current plan details
- `getFeatures` - Get available features for plan

#### Invitation Management (`workspace.invitation`)
- `send` - Send workspace invitation
- `list` - List pending invitations
- `cancel` - Cancel invitation

#### Data Management (`workspace.data`)
- `export` - Export workspace data (Enterprise)

---

### 4. RabbitMQ Router (`rabbitmq`)

**Namespace:** `trpc.rabbitmq.*`

#### Server Management (`rabbitmq.server`)
- `list` - List all RabbitMQ servers
- `get` - Get server details
- `create` - Add new server
- `update` - Update server configuration
- `delete` - Remove server
- `testConnection` - Test server connectivity

#### Overview (`rabbitmq.overview`)
- `get` - Get server overview/stats

#### Queues (`rabbitmq.queues`)
- `list` - List all queues
- `get` - Get queue details
- `create` - Create new queue
- `delete` - Delete queue
- `purge` - Purge queue messages

#### Messages (`rabbitmq.messages`)
- `publish` - Publish message to queue
- `consume` - Consume messages from queue
- `get` - Get message by ID

#### Virtual Hosts (`rabbitmq.vhost`)
- `list` - List virtual hosts
- `get` - Get vhost details
- `create` - Create vhost
- `delete` - Delete vhost

#### Users (`rabbitmq.users`)
- `list` - List RabbitMQ users
- `get` - Get user details
- `create` - Create RabbitMQ user
- `update` - Update user
- `delete` - Delete user

#### Infrastructure (`rabbitmq.infrastructure`)
- `getConnections` - List active connections
- `getChannels` - List active channels
- `getNodes` - List cluster nodes
- `getExchanges` - List exchanges
- `getBindings` - List bindings

#### Metrics (`rabbitmq.metrics`)
- `getLiveRates` - Get real-time message rates
- `getQueueMetrics` - Get queue metrics over time

#### Memory (`rabbitmq.memory`)
- `getMemoryUsage` - Get memory usage details

#### Alerts (`rabbitmq.alerts`)
- `list` - List alerts for server
- `acknowledge` - Acknowledge alert
- `resolve` - Resolve alert

---

### 5. Alerts Router (`alerts`)

**Namespace:** `trpc.alerts.*` (Enterprise)

#### Rules (`alerts.rules`)
- `list` - List alert rules
- `get` - Get alert rule details
- `create` - Create alert rule
- `update` - Update alert rule
- `delete` - Delete alert rule
- `toggle` - Enable/disable alert rule

#### Slack Integration (`alerts.slack`)
- `getConfig` - Get Slack configuration
- `updateConfig` - Update Slack settings
- `testNotification` - Send test Slack message

#### Webhook Integration (`alerts.webhook`)
- `list` - List webhooks
- `create` - Create webhook
- `update` - Update webhook
- `delete` - Delete webhook
- `test` - Test webhook delivery

---

### 6. Payment Router (`payment`)

**Namespace:** `trpc.payment.*`

#### Checkout (`payment.checkout`)
- `createSession` - Create Stripe checkout session
- `getSessionStatus` - Check checkout session status

#### Billing (`payment.billing`)
- `getPortalUrl` - Get Stripe customer portal URL
- `getInvoices` - List invoices
- `getUpcomingInvoice` - Get next invoice

#### Subscription (`payment.subscription`)
- `getCurrent` - Get current subscription
- `cancel` - Cancel subscription
- `resume` - Resume cancelled subscription
- `update` - Update subscription

---

### 7. Feedback Router (`feedback`)

**Namespace:** `trpc.feedback.*`

- `submit` - Submit user feedback

---

### 8. Discord Router (`discord`)

**Namespace:** `trpc.discord.*`

- `getConfig` - Get Discord webhook configuration
- `updateConfig` - Update Discord webhook
- `testNotification` - Send test Discord message

---

### 9. License Router (`license`) - Customer Portal

**Namespace:** `trpc.license.*`

- `list` - List purchased licenses
- `get` - Get license details
- `download` - Download license file
- `purchase` - Purchase new license

---

### 10. Public Router (`public`)

**Namespace:** `trpc.public.*`

#### Invitation (`public.invitation`)
- `getDetails` - Get invitation details by token (public)

---

## Authentication Flow

1. **Registration:** `auth.registration.register` → Email verification required
2. **Email Verification:** `auth.verification.verifyEmail` with token
3. **Login:** `auth.session.login` → Returns JWT token
4. **Protected Requests:** Include JWT in Authorization header
5. **Session Check:** `auth.getSession` to refresh user data

## Authorization Levels

- **Public** - No authentication required
- **Protected** - Requires valid JWT token
- **Enterprise** - Requires Enterprise plan + valid license (self-hosted)
- **Feature-Gated** - Specific plan features (workspace_management, alerting, etc.)

## Rate Limiting

Applied to sensitive endpoints:
- Authentication: 5 requests/minute per IP
- Payment: 10 requests/minute per user
- Registration: 3 requests/hour per IP

## Error Handling

All tRPC procedures return typed errors using `TRPCError`:
- `UNAUTHORIZED` - Authentication required
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `BAD_REQUEST` - Invalid input
- `INTERNAL_SERVER_ERROR` - Server error

## Integration Points

### External Services
- **Stripe** - Payment processing (`payment.*` routers)
- **Resend** - Email delivery (internal service)
- **Sentry** - Error tracking (optional)
- **Slack** - Alert notifications (`alerts.slack.*`)
- **Discord** - Alert notifications (`discord.*`)
- **Google OAuth** - Authentication (`auth.google.*`)
- **Notion** - User synchronization (internal service)

### RabbitMQ Connectivity
- **Management HTTP API** - Server monitoring and configuration
- **AMQP Protocol** - Message publishing and consumption

## Type Safety

Frontend applications import the `AppRouter` type for complete type inference:

```typescript
import type { AppRouter } from 'qarote-api';

const trpc = createTRPCClient<AppRouter>({ ... });
```

All request inputs and responses are fully typed via Zod schemas.
