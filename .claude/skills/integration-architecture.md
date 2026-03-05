# Integration Architecture

**Project:** Qarote  
**Generated:** 2026-01-30  
**Type:** Monorepo with 4 parts

## Overview

Qarote uses a **client-server architecture** with one backend API serving three frontend applications via tRPC.

## Architecture Diagram

```
┌─────────────────┐
│  apps/web       │  Marketing Site
│  (Landing Page) │  qarote.io
└─────────────────┘
         │
         │ tRPC Client
         ↓
┌─────────────────┐     ┌──────────────────┐
│  apps/app       │────→│   apps/api       │
│  (Dashboard)    │     │   (Backend API)  │
│  app.qarote.io  │     │   api.qarote.io  │
└─────────────────┘     └──────────────────┘
         ↑                       │
         │                       │
         │ tRPC Client           │ Clients
         │                       ↓
┌─────────────────┐     ┌──────────────────┐
│  apps/portal    │────→│   RabbitMQ       │
│  (Customer      │     │   Servers        │
│  Portal)        │     │   (External)     │
│  portal.q...io  │     └──────────────────┘
└─────────────────┘              │
                                 │
                         ┌───────┴────────┐
                         │                │
                  PostgreSQL         External
                  Database           Services
                                    (Stripe, etc)
```

## Integration Points

### 1. Frontend → Backend (tRPC)

**Technology:** tRPC 11.0 over HTTP

**From:** `apps/app`, `apps/web` (minimal), `apps/portal`  
**To:** `apps/api`  
**Protocol:** HTTP POST to `/trpc/*`

**Authentication:**
- JWT tokens in Authorization header: `Bearer <token>`
- Token stored in localStorage
- Managed by AuthContext in each frontend

**Type Safety:**
- Frontend imports `AppRouter` type from API
- Full end-to-end type inference
- Compile-time validation of requests/responses

**Example Integration:**

```typescript
// Frontend (apps/app)
import { trpc } from '@/lib/trpc/client';

const { data: queues } = trpc.rabbitmq.queues.list.useQuery({
  serverId: selectedServerId
});
```

**Endpoints Used by Each App:**

**apps/app (Dashboard):**
- `auth.*` - Full authentication flow
- `user.*` - User profile management
- `workspace.*` - Workspace operations (Enterprise)
- `rabbitmq.*` - All RabbitMQ operations
- `alerts.*` - Alert management (Enterprise)
- `payment.*` - Subscription management
- `feedback.*` - Feedback submission

**apps/web (Landing):**
- Minimal API usage (mostly static content)
- Possible use of public endpoints for contact forms

**apps/portal (Customer Portal):**
- `auth.*` - Authentication
- `license.*` - License management
- `payment.*` - License purchases

---

### 2. Backend → PostgreSQL

**Technology:** Prisma ORM 6.19

**From:** `apps/api`  
**To:** PostgreSQL database  
**Connection:** Connection string from `DATABASE_URL` env var

**Data Access Pattern:**
- All database operations through Prisma Client
- Type-safe queries
- Migration-based schema management

**Example:**

```typescript
await prisma.user.findUnique({
  where: { email },
  include: { workspace: true }
});
```

---

### 3. Backend → RabbitMQ Servers

**Technology:** RabbitMQ Management HTTP API + AMQP

**From:** `apps/api`  
**To:** External RabbitMQ servers (customer-managed)

**Dual Protocol:**

**Management HTTP API:**
- Read server state, queues, exchanges, users, etc.
- Used by `ApiClient` in `src/core/rabbitmq/`
- Basic Auth with encrypted credentials

**AMQP Protocol:**
- Publish and consume messages
- Used by `AmqpClient` in `src/core/rabbitmq/`
- Connection pooling

**Credential Security:**
- Passwords encrypted at rest (AES-256-GCM)
- Decrypted only in memory for connections
- Encryption key from `ENCRYPTION_KEY` env var

---

### 4. Backend → External Services

#### Stripe (Payment Processing)
- **From:** `apps/api`
- **To:** Stripe API
- **Integration:** `stripe` NPM package
- **Services:** `src/services/stripe/`
- **Webhooks:** `/webhooks/stripe` endpoint

#### Resend (Email Delivery)
- **From:** `apps/api`
- **To:** Resend API
- **Integration:** `resend` NPM package + React Email templates
- **Services:** `src/services/email/`
- **Templates:** React components in `src/services/email/templates/`

#### Sentry (Error Tracking)
- **From:** `apps/api`, `apps/app` (optional)
- **To:** Sentry cloud
- **Integration:** `@sentry/node`, `@sentry/react`
- **Service:** `src/services/sentry/`

#### Slack (Alert Notifications)
- **From:** `apps/api`
- **To:** Customer Slack workspaces
- **Integration:** Webhook URLs
- **Service:** `src/services/slack/`

#### Discord (Alert Notifications)
- **From:** `apps/api`
- **To:** Customer Discord channels
- **Integration:** Webhook URLs
- **Router:** `src/trpc/routers/discord.ts`

#### Google OAuth
- **From:** `apps/app`, `apps/portal`
- **To:** Google OAuth 2.0
- **Integration:** `@react-oauth/google` (frontend), `google-auth-library` (backend)
- **Flow:** Frontend gets OAuth token → Backend validates with Google

#### Notion (Optional)
- **From:** `apps/api`
- **To:** Notion API
- **Integration:** `@notionhq/client`
- **Service:** `src/services/integrations/notion.service.ts`
- **Purpose:** User synchronization

---

## Data Flow Examples

### User Registration Flow
1. User fills form in `apps/app` or `apps/portal`
2. `trpc.auth.registration.register.mutate(...)` → `apps/api`
3. API creates user in PostgreSQL (Prisma)
4. API sends verification email (Resend)
5. User clicks email link → `trpc.auth.verification.verifyEmail`
6. User can now login

### RabbitMQ Monitoring Flow
1. User selects server in `apps/app`
2. `trpc.rabbitmq.overview.get.useQuery(serverId)` → `apps/api`
3. API retrieves server credentials from PostgreSQL
4. API decrypts password
5. API calls RabbitMQ Management API
6. API returns mapped response to frontend
7. Frontend displays in dashboard

### Alert Notification Flow
1. Alert monitor worker runs in `apps/api` (cron or separate process)
2. Worker queries RabbitMQ servers via Management API
3. Worker analyzes metrics against alert rules (PostgreSQL)
4. If threshold breached → Create alert in PostgreSQL
5. Send notifications via:
   - Email (Resend)
   - Slack (webhook)
   - Discord (webhook)
   - Custom webhooks
6. Frontend polls for new alerts via `trpc.rabbitmq.alerts.list`

### Payment Flow
1. User clicks upgrade in `apps/app`
2. `trpc.payment.checkout.createSession.mutate(...)` → `apps/api`
3. API creates Stripe Checkout session
4. API returns Stripe URL
5. Frontend redirects to Stripe
6. User completes payment on Stripe
7. Stripe sends webhook to `/webhooks/stripe` in `apps/api`
8. API updates subscription in PostgreSQL
9. Frontend polls for subscription status

---

## Shared Dependencies

### Across All Apps
- TypeScript 5.9
- React 18.3 (frontend apps)
- Tailwind CSS 3.4 (frontend apps)
- Vite 7.2 (frontend build tool)

### Frontend Shared
- `@trpc/client` + `@trpc/react-query` - API client
- `@tanstack/react-query` - Server state management
- `lucide-react` - Icon library
- `sonner` - Toast notifications
- `zod` - Schema validation

### Backend Unique
- Hono.js - Web framework
- Prisma - ORM
- Pino - Logging
- Various service integrations (Stripe, Resend, etc.)

---

## Deployment Architecture

### Production Endpoints
- **Landing:** `qarote.io` (Cloudflare Pages)
- **Dashboard:** `app.qarote.io` (Cloudflare Pages)
- **Portal:** `portal.qarote.io` (Cloudflare Pages)
- **API:** `api.qarote.io` (Heroku / Dokku)

### Development Ports
- **API:** `localhost:3000`
- **App:** `localhost:8080`
- **Web:** `localhost:5173`
- **Portal:** `localhost:5174`

### Local Development Stack
Via `docker-compose.yml`:
- PostgreSQL (port 5432)
- RabbitMQ Cluster (nodes 1-3, HAProxy load balancer)
- RabbitMQ versions 3.12, 3.13, 4.0, 4.1, 4.2

---

## Cross-Cutting Concerns

### Authentication
- JWT tokens issued by API
- Stored in localStorage by frontends
- Validated on every protected tRPC procedure

### Error Handling
- API returns typed `TRPCError`
- Frontends show toast notifications
- Optional Sentry error tracking

### Logging
- API: Structured logging with Pino
- Frontend: console-based logging with loglevel

### Rate Limiting
- Applied at API layer (Hono middleware)
- Per-IP and per-user limits

### CORS
- API configured to accept requests from frontend domains
- Credentials allowed for cookie/auth headers
