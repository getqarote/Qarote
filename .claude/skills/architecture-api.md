# Architecture - Backend API

**Part:** apps/api/  
**Generated:** 2026-01-30  
**Type:** Backend API Service

## Executive Summary

The Qarote API is a **Node.js backend service** built with Hono.js and tRPC that provides type-safe APIs for RabbitMQ monitoring and management. It supports Community, Enterprise, and Cloud deployment modes with feature gating and license validation.

## Technology Stack

| Category | Technology | Version | Purpose |
|----------|------------|---------|---------|
| Runtime | Node.js | 24+ | JavaScript runtime |
| Language | TypeScript | 5.9 | Type-safe development |
| Framework | Hono.js | 4.11 | Lightweight web framework |
| API Layer | tRPC | 11.0 | End-to-end type safety |
| Database | PostgreSQL | 15+ | Primary data store |
| ORM | Prisma | 6.19 | Database access layer |
| Message Queue | RabbitMQ | 3.12-4.2 | Target monitoring system |
| Email | Resend | 4.6 | Transactional emails |
| Email Templates | React Email | 4.2 | Email composition |
| Payments | Stripe | 17.7 | Subscription billing |
| Logging | Pino | 9.7 | Structured logging |
| Error Tracking | Sentry | 10.24 | Error monitoring (optional) |
| OAuth | Google Auth Library | 10.3 | Google authentication |

## Architecture Pattern

**Service-Oriented Architecture** with layered design:

```
┌──────────────────────────────────────┐
│         HTTP Layer (Hono.js)         │
│  Health checks, Stripe webhooks      │
└──────────────────────────────────────┘
                 ↓
┌──────────────────────────────────────┐
│         tRPC Layer                    │
│  Type-safe routers and procedures    │
└──────────────────────────────────────┘
                 ↓
┌──────────────────────────────────────┐
│        Services Layer                │
│  Business logic and integrations     │
└──────────────────────────────────────┘
                 ↓
┌──────────────────────────────────────┐
│         Data Layer (Prisma)          │
│  Database access and models          │
└──────────────────────────────────────┘
                 ↓
┌──────────────────────────────────────┐
│         PostgreSQL Database          │
└──────────────────────────────────────┘
```

## Directory Structure

```
apps/api/
├── prisma/
│   ├── migrations/            # Database migrations
│   └── schema.prisma          # Database schema (21 models)
├── scripts/                   # Utility scripts
│   ├── rabbitmq/             # RabbitMQ seeding
│   ├── resend/               # Email testing
│   ├── stripe/               # Stripe setup
│   └── webhook/              # Webhook testing
├── src/
│   ├── config/               # Configuration
│   │   ├── index.ts         # Main config
│   │   ├── deployment.ts    # Deployment mode
│   │   └── features.ts      # Feature flags
│   ├── controllers/          # HTTP controllers
│   │   └── healthcheck.controller.ts
│   │   └── payment/webhook.controller.ts
│   ├── core/                 # Core utilities
│   │   ├── rabbitmq/        # RabbitMQ clients
│   │   ├── auth.ts          # JWT utilities
│   │   ├── logger.ts        # Pino setup
│   │   ├── prisma.ts        # Prisma client
│   │   ├── retry.ts         # Retry logic
│   │   └── workspace-access.ts
│   ├── cron/                 # Scheduled jobs
│   │   └── alert-monitor.ts # Alert monitoring
│   ├── mappers/              # Response mappers
│   │   └── rabbitmq/        # RabbitMQ response transformers
│   ├── middlewares/          # Hono middlewares
│   │   ├── cors.ts          # CORS configuration
│   │   ├── rateLimiter.ts   # Rate limiting
│   │   └── request.ts       # Request logging
│   ├── schemas/              # Zod validation
│   │   ├── auth.ts
│   │   ├── payment.ts
│   │   ├── rabbitmq.ts
│   │   └── workspace.ts
│   ├── services/             # Business logic
│   │   ├── alerts/          # Alert system
│   │   ├── email/           # Email service
│   │   ├── license/         # License validation
│   │   ├── slack/           # Slack integration
│   │   ├── stripe/          # Payment processing
│   │   ├── webhook/         # Webhook delivery
│   │   └── sentry/          # Error tracking
│   ├── trpc/                 # tRPC layer
│   │   ├── routers/         # Route handlers
│   │   │   ├── auth/        # Authentication
│   │   │   ├── rabbitmq/    # RabbitMQ operations
│   │   │   ├── workspace/   # Workspace management
│   │   │   ├── alerts/      # Alert system
│   │   │   ├── payment/     # Billing
│   │   │   └── ...
│   │   ├── middlewares/     # tRPC middlewares
│   │   ├── context.ts       # Request context
│   │   ├── trpc.ts          # tRPC setup
│   │   └── router.ts        # Root router
│   ├── types/                # TypeScript types
│   │   ├── api.ts
│   │   └── rabbitmq.ts
│   ├── workers/              # Background workers
│   │   └── alert-monitor.ts
│   └── index.ts              # Application entry
```

## Key Components

### tRPC Router System

**Root Router** (`src/trpc/router.ts`):
Combines 10 sub-routers:
- `auth` - Authentication and registration
- `user` - User management
- `workspace` - Workspace operations (Enterprise)
- `rabbitmq` - RabbitMQ monitoring and management
- `alerts` - Alert system (Enterprise)
- `payment` - Billing and subscriptions
- `feedback` - User feedback
- `discord` - Discord integration
- `license` - License management (Portal)
- `public` - Public endpoints

**Procedures:**
- `publicProcedure` - No authentication required
- `protectedProcedure` - Requires JWT token
- `requirePremiumFeature(feature)` - Enterprise feature gate

### RabbitMQ Client System

**Dual Protocol Architecture:**

1. **ApiClient** (`src/core/rabbitmq/api-client.ts`)
   - HTTP client for RabbitMQ Management API
   - Used for: Reading server state, queues, exchanges, users
   - Authentication: Basic Auth

2. **AmqpClient** (`src/core/rabbitmq/amqp-client.ts`)
   - AMQP protocol client
   - Used for: Publishing and consuming messages
   - Connection pooling and management

**Credential Security:**
- Passwords encrypted with AES-256-GCM
- Encryption key from environment variable
- Decryption only in memory

### Alert Monitoring System (Enterprise)

**Components:**
1. **Alert Analyzer** (`services/alerts/alert.analyzer.ts`)
   - Analyzes server metrics against thresholds
   - Evaluates alert rules

2. **Alert Fingerprinting** (`services/alerts/alert.fingerprint.ts`)
   - Generates unique fingerprints for alerts
   - Deduplicates similar alerts

3. **Alert Notifications** (`services/alerts/alert.notification.ts`)
   - Sends notifications via email, Slack, Discord, webhooks
   - Handles retry logic

4. **Alert Monitor Worker** (`workers/alert-monitor.ts`)
   - Runs as cron job or separate process
   - Polls servers every 60 seconds

### Service Layer

**Stripe Services** (`src/services/stripe/`):
- `customer.service.ts` - Customer management
- `payment.service.ts` - Payment processing
- `subscription.service.ts` - Subscription lifecycle
- `webhook.service.ts` - Webhook processing

**Email Services** (`src/services/email/`):
- `core-email.service.ts` - Email sending with retry
- `auth-email.service.ts` - Verification, password reset
- `billing-email.service.ts` - Payment notifications
- `notification-email.service.ts` - Alert emails
- Templates in `templates/` using React Email

**License Services** (`src/services/license/`) - Enterprise:
- `license.service.ts` - License validation orchestration
- `license-crypto.service.ts` - RSA-SHA256 signature verification
- `license-file.service.ts` - License file reading and parsing
- `license-features.service.ts` - Feature flag extraction

## Data Architecture

**Database:** PostgreSQL with 21 tables

**Key Domains:**
- **Authentication:** User, EmailVerificationToken, PasswordReset
- **Workspaces:** Workspace, WorkspaceMember, Invitation
- **RabbitMQ:** RabbitMQServer, Queue, QueueMetric
- **Alerts:** Alert, AlertRule, SeenAlert, ResolvedAlert, WorkspaceAlertThresholds
- **Integrations:** SlackConfig, Webhook
- **Payments:** Subscription, Payment, StripeWebhookEvent
- **Licensing:** License
- **Feedback:** Feedback

**Naming Convention:** PascalCase table names (matches Prisma models)

**Migrations:** Located in `prisma/migrations/`, applied via Prisma Migrate

See [data-models-api.md](./data-models-api.md) for complete schema documentation.

## API Design

**Protocol:** tRPC over HTTP (POST to `/trpc/*`)

**Authentication:** JWT tokens in Authorization header

**Type Safety:** Full end-to-end type inference from backend to frontend

**See:** [api-contracts-api.md](./api-contracts-api.md) for complete API documentation.

## Deployment Modes

### Community Edition
- Free, self-hosted
- Basic monitoring features
- No workspace management or alerts

### Enterprise Edition
- Paid, self-hosted
- License validation required
- Full feature set (workspaces, alerts, Slack/webhook integrations)

### Cloud Edition
- SaaS deployment
- Stripe subscription billing
- Multi-tenant with workspace isolation

## Configuration

**Environment Variables:**
- `NODE_ENV` - Environment (development/production)
- `PORT` - HTTP port (default: 3000)
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret
- `ENCRYPTION_KEY` - AES-256 encryption key
- `DEPLOYMENT_MODE` - community/enterprise/cloud
- `STRIPE_SECRET_KEY` - Stripe API key (cloud mode)
- `RESEND_API_KEY` - Resend API key
- `SENTRY_DSN` - Sentry DSN (optional)
- `GOOGLE_CLIENT_ID/SECRET` - OAuth credentials

## Testing

**Framework:** Vitest 4.0

**Test Organization:**
- Unit tests alongside source files (`*.test.ts`)
- Scripts for integration testing in `scripts/`

**Commands:**
- `pnpm run test` - Run tests in watch mode
- `pnpm run test:run` - Run once
- `pnpm run test:ui` - Vitest UI

## Build & Deployment

**Build Process:**
1. Generate Prisma Client
2. Compile TypeScript to JavaScript
3. Resolve path aliases with tsc-alias
4. (Enterprise) Obfuscate license code

**Output:** `dist/` directory

**Start Production:**
1. Run migrations: `pnpm run db:migrate`
2. Start server: `node dist/index.js`

**Worker Process (Alerts):**
- Can run as separate process: `node dist/workers/alert-monitor.js`
- Or as cron within main process

## Logging & Monitoring

**Structured Logging:**
- Library: Pino with pino-pretty (dev)
- Format: JSON in production
- Levels: trace, debug, info, warn, error, fatal

**Error Tracking:**
- Optional Sentry integration
- Captures exceptions and performance data
- User context and custom tags

## Security

**Authentication:**
- JWT tokens (HS256 algorithm)
- 7-day expiration
- Password hashing with bcrypt (10 rounds)

**Encryption:**
- AES-256-GCM for sensitive data
- Unique IV per encryption
- Auth tags for integrity verification

**Rate Limiting:**
- IP-based limits for public endpoints
- User-based limits for authenticated endpoints
- Different limits per router (auth, payment, etc.)

**CORS:**
- Configured allowed origins per deployment mode
- Credentials enabled for auth cookies

## External Integrations

1. **RabbitMQ** - Target monitoring system (customer servers)
2. **PostgreSQL** - Primary database
3. **Stripe** - Payment processing (cloud mode)
4. **Resend** - Email delivery
5. **Sentry** - Error tracking (optional)
6. **Google OAuth** - Social authentication
7. **Slack** - Alert notifications (Enterprise)
8. **Discord** - Alert notifications (Enterprise)
9. **Notion** - User sync (optional)

## Performance Considerations

- **Connection Pooling:** RabbitMQ and PostgreSQL
- **Query Optimization:** Indexed database queries
- **Response Mapping:** Lean API responses via mappers
- **Retry Logic:** Exponential backoff for external services
- **Caching:** React Query caching on frontend
