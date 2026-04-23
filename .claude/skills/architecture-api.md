# Architecture - Backend API

**Part:** apps/api/
**Generated:** 2026-03-05
**Type:** Backend API Service

## Executive Summary

The Qarote API is a **Node.js backend service** built with Hono.js and tRPC that provides type-safe APIs for RabbitMQ monitoring and management. It supports Self-Hosted and Cloud deployment modes with feature gating via license JWTs and plan-based validation. The API supports internationalization (en, fr, es, zh) and can run as a standalone binary with an embedded frontend.

## Technology Stack

| Category | Technology | Version | Purpose |
|----------|------------|---------|---------|
| Runtime | Node.js | 24+ | JavaScript runtime |
| Language | TypeScript | 5.9 | Type-safe development |
| Framework | Hono.js | 4.12 | Lightweight web framework |
| API Layer | tRPC | 11.8 | End-to-end type safety |
| Database | PostgreSQL | 15+ | Primary data store |
| ORM | Prisma | 7.4 | Database access layer (with pg adapter) |
| Message Queue | RabbitMQ | 3.x-4.x | Target monitoring system |
| Email (Cloud) | Resend | 6.6 | Transactional emails (cloud mode) |
| Email (Self-Hosted) | Nodemailer | 8.0 | SMTP email delivery |
| Email Templates | React Email | 5.2 | Email composition |
| Payments | Stripe | 20.3 | Subscription billing (cloud mode) |
| Logging | Pino | 10.3 | Structured logging |
| Error Tracking | Sentry | 10.40 | Error monitoring (optional) |
| OAuth | Google Auth Library | 10.3 | Google authentication |
| SSO | BoxyHQ SAML Jackson | 1.52 | SAML/OIDC SSO |
| JWT | jose | 6.1 | License JWT RS256 signing/verification |
| Validation | Zod | 4.3 | Schema validation |
| i18n | @qarote/i18n | workspace | Server-side internationalization |
| Versioning | semver | 7.7 | Release version comparison |

## Architecture Pattern

**Service-Oriented Architecture** with layered design:

```
┌──────────────────────────────────────┐
│         HTTP Layer (Hono.js)         │
│  Health checks, Stripe webhooks,     │
│  SSO endpoints, static file serving  │
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
├── locales/                    # Server-side i18n translations
│   ├── en/                    # English (errors.json, emails.json)
│   ├── es/                    # Spanish
│   ├── fr/                    # French
│   └── zh/                    # Chinese
├── prisma/
│   ├── migrations/            # Database migrations (~58 migration dirs)
│   └── schema.prisma          # Database schema (27 models)
├── scripts/                   # Utility scripts
│   ├── email/                 # Email testing (nodemailer, resend)
│   ├── notion/                # Notion user sync
│   ├── rabbitmq/              # RabbitMQ seeding and discovery
│   ├── sentry/                # Sentry testing
│   ├── stripe/                # Stripe setup and testing
│   └── webhook/               # Webhook testing
├── src/
│   ├── cli/                   # CLI subcommands
│   │   └── setup.ts          # Interactive setup wizard
│   ├── config/                # Configuration
│   │   ├── index.ts          # Main config (Zod-validated, mode-aware)
│   │   ├── deployment.ts     # Deployment mode helpers
│   │   ├── features.ts       # Premium feature flags
│   │   └── schemas/          # Config validation schemas
│   │       ├── base.ts       # Shared base schema
│   │       ├── cloud.ts      # Cloud mode schema
│   │       └── selfhosted.ts # Self-hosted mode schema
│   ├── controllers/           # HTTP controllers (non-tRPC)
│   │   ├── healthcheck.controller.ts
│   │   ├── sso.controller.ts # SAML ACS + OIDC callback
│   │   └── payment/
│   │       └── webhook.controller.ts
│   ├── core/                  # Core utilities
│   │   ├── auth.ts           # JWT + password utilities (Hono JWT)
│   │   ├── bootstrap-admin.ts # First-boot admin account creation
│   │   ├── feature-flags.ts  # License-based feature gating
│   │   ├── logger.ts         # Pino setup with redaction
│   │   ├── migrate.ts        # Standalone SQL migration runner
│   │   ├── network.ts        # Private IP detection
│   │   ├── prisma.ts         # Prisma client (PrismaPg adapter)
│   │   ├── retry.ts          # Retry with exponential backoff
│   │   ├── utils.ts          # Shared helpers (getDirname, abortableSleep)
│   │   ├── workspace-access.ts # Workspace membership utilities
│   │   └── rabbitmq/         # RabbitMQ client system
│   │       ├── AmqpClient.ts     # AMQP protocol client
│   │       ├── AmqpFactory.ts    # AMQP client factory with pooling
│   │       ├── ApiClient.ts      # HTTP Management API client
│   │       ├── BaseClient.ts     # Base HTTP client (auth, SSL, tunnel)
│   │       ├── MetricsCalculator.ts # Rate/metric calculations
│   │       ├── QueueClient.ts    # Queue & message operations
│   │       ├── RabbitClient.ts   # Combined client (API + Queue)
│   │       ├── ResponseValidator.ts # API response field validation
│   │       ├── rabbitmq.interfaces.ts # Type definitions
│   │       ├── tunnel.ts        # Tunnel detection (ngrok, localtunnel)
│   │       └── index.ts         # Barrel exports
│   ├── cron/                  # Scheduled jobs
│   │   ├── rabbitmq-alerts.cron.ts          # Alert polling
│   │   ├── license-expiration-reminders.cron.ts # License reminders (cloud)
│   │   ├── license-file-cleanup.cron.ts     # Expired file cleanup (cloud)
│   │   └── release-notifier.cron.ts         # New version notifications (cloud)
│   ├── generated/             # Generated code
│   │   └── prisma/           # Generated Prisma client
│   ├── i18n.ts               # Server-side i18n (te, tEmail helpers)
│   ├── instrument.ts         # Sentry instrumentation (--import preload)
│   ├── mappers/               # Response mappers
│   │   ├── auth/             # Auth response transformers
│   │   ├── feedback/         # Feedback response transformers
│   │   ├── license/          # License response transformers
│   │   ├── rabbitmq/         # RabbitMQ response transformers
│   │   │   ├── consumer/    # Consumer mapper
│   │   │   ├── exchange/    # Exchange + binding mappers
│   │   │   ├── node/        # Node mapper
│   │   │   ├── overview/    # Overview mapper
│   │   │   ├── queue/       # Queue mapper
│   │   │   ├── user/        # RabbitMQ user mapper
│   │   │   └── vhost/       # VHost mapper
│   │   ├── server/           # Server mapper
│   │   └── workspace/        # Workspace response transformers
│   ├── middlewares/           # Hono middlewares
│   │   ├── cors.ts           # CORS configuration
│   │   ├── rateLimiter.ts    # HTTP-level rate limiting (hono-rate-limiter)
│   │   ├── request.ts        # Request ID + performance monitoring
│   │   └── workspace.ts      # Workspace access check
│   ├── schemas/               # Zod validation schemas
│   │   ├── alerts.ts
│   │   ├── auth.ts
│   │   ├── feedback.ts
│   │   ├── invitation.ts
│   │   ├── payment.ts
│   │   ├── portal.ts
│   │   ├── rabbitmq.ts
│   │   ├── user.ts
│   │   ├── vhost.ts
│   │   └── workspace.ts
│   ├── services/              # Business logic
│   │   ├── alerts/           # Alert system
│   │   ├── auth/             # SSO service (BoxyHQ Jackson)
│   │   ├── audit.service.ts  # Security audit logging
│   │   ├── deployment/       # Deployment detection and update instructions
│   │   ├── email/            # Email services (Resend + SMTP)
│   │   ├── encryption.service.ts # AES-256-CBC encryption
│   │   ├── integrations/     # Third-party integrations (Notion)
│   │   ├── license/          # License generation and validation
│   │   ├── plan/             # Plan features and validation
│   │   ├── sentry/           # Error tracking helpers
│   │   ├── slack/            # Slack integration
│   │   ├── stripe/           # Payment processing
│   │   └── webhook/          # Webhook delivery
│   ├── trpc/                  # tRPC layer
│   │   ├── routers/          # Route handlers
│   │   │   ├── auth/        # Authentication (email, google, SSO, password, etc.)
│   │   │   ├── rabbitmq/    # RabbitMQ operations (12 sub-modules)
│   │   │   ├── workspace/   # Workspace management (core, data, invitation, plan)
│   │   │   ├── alerts/      # Alert system (rules, slack, webhook)
│   │   │   ├── payment/     # Billing (checkout, subscription, billing)
│   │   │   ├── portal/      # License management (cloud portal)
│   │   │   ├── public/      # Public endpoints (config, feature flags, invitation)
│   │   │   ├── discord.ts   # Discord integration
│   │   │   ├── feedback.ts  # User feedback
│   │   │   ├── user.ts      # User management
│   │   │   ├── selfhosted-license.ts  # Self-hosted license activation
│   │   │   ├── selfhosted-smtp.ts     # Self-hosted SMTP configuration
│   │   │   └── selfhosted-sso.ts      # Self-hosted SSO configuration
│   │   ├── middlewares/      # tRPC middlewares
│   │   │   └── rateLimiter.ts # In-memory rate limiting
│   │   ├── context.ts        # Request context (user, workspace, locale)
│   │   ├── trpc.ts           # tRPC setup and procedure definitions
│   │   └── router.ts         # Root router composition
│   ├── types/                 # TypeScript type declarations
│   │   ├── hono.d.ts        # Hono context augmentation
│   │   └── node.d.ts        # Node.js type extensions
│   ├── workers/               # Background worker processes
│   │   ├── alert-monitor.ts      # RabbitMQ alert polling
│   │   ├── license-monitor.ts    # License expiration + file cleanup (cloud)
│   │   └── release-notifier.ts   # New version notification (cloud)
│   ├── index.ts               # Entry point (CLI arg parsing, setup subcommand)
│   └── server.ts              # Application bootstrap and HTTP server
```

## Key Components

### Entry Point and Server Startup

**Entry Point** (`src/index.ts`):
- Routes `qarote setup` subcommand to interactive CLI wizard
- Parses CLI flags (--port, --database-url, --jwt-secret, etc.)
- Maps CLI flags to environment variables before config loads
- Dynamically imports `server.ts` after env vars are set

**Server** (`src/server.ts`):
- Creates three separate Hono apps: main, webhooks (raw body for Stripe), SSO (form-encoded for SAML ACS)
- Applies middleware chain: honoLogger, prettyJSON, secureHeaders, requestId, performanceMonitoring, CORS
- Mounts tRPC at `/trpc/*`, webhooks at `/webhooks/*`, SSO at `/sso/*`
- In self-hosted mode, serves embedded frontend from `public/` directory (SPA fallback)
- Runs auto-migrations, bootstraps admin, initializes deployment detection and SSO on startup

### tRPC Router System

**Root Router** (`src/trpc/router.ts`):
Combines 13 sub-routers:
- `auth` - Authentication (email, Google OAuth, SSO, password, registration, verification, invitation, session)
- `user` - User management
- `workspace` - Workspace operations (core, data, invitation, management, plan)
- `alerts` - Alert system (rules, Slack, webhooks)
- `feedback` - User feedback
- `license` - License management (cloud portal)
- `payment` - Billing (checkout, subscription, billing overview)
- `rabbitmq` - RabbitMQ monitoring (overview, server, queues, messages, metrics, memory, infrastructure, users, vhost, alerts)
- `discord` - Discord integration
- `selfhostedLicense` - Self-hosted license activation/deactivation
- `selfhostedSmtp` - Self-hosted SMTP configuration
- `selfhostedSso` - Self-hosted SSO configuration
- `public` - Public endpoints (config, feature flags, invitation acceptance)

**Procedure Types** (`src/trpc/trpc.ts`):
- `publicProcedure` - No authentication required
- `protectedProcedure` - Requires JWT token + active account
- `adminProcedure` - Requires ADMIN role
- `authorize(roles)` - Generic role-based authorization
- `rateLimitedPublicProcedure` - Public + standard rate limit (100/min)
- `rateLimitedProcedure` - Protected + standard rate limit (100/min)
- `strictRateLimitedProcedure` - Protected + strict rate limit (5/min)
- `billingRateLimitedProcedure` - Protected + billing rate limit (30/min)
- `rateLimitedAdminProcedure` - Admin + standard rate limit
- `workspaceProcedure` - Protected + workspace access check + rate limit
- `planValidationProcedure` - Protected + catches plan validation errors
- `adminPlanValidationProcedure` - Admin + catches plan validation errors

**Context** (`src/trpc/context.ts`):
- Extracts JWT from Authorization header or SSE connectionParams
- Resolves locale: user preference > Accept-Language header > default (en)
- Provides `prisma`, `logger`, `user`, `workspaceId`, `locale`

### RabbitMQ Client System

**Modular Client Architecture:**

1. **BaseClient** (`core/rabbitmq/BaseClient.ts`)
   - Foundational HTTP client for RabbitMQ Management API
   - Basic Auth, SSL/TLS, tunnel auto-detection (ngrok, localtunnel)
   - Sentry error tracking for connection failures

2. **ApiClient** (`core/rabbitmq/ApiClient.ts`)
   - Extends BaseClient with read operations
   - Endpoints: overview, queues, exchanges, connections, channels, nodes, users, vhosts, bindings, consumers
   - CRUD for vhosts, users, and permissions

3. **QueueClient** (`core/rabbitmq/QueueClient.ts`)
   - Extends BaseClient with queue/message operations
   - Purge, get messages, publish messages, create/delete queues, bind/unbind

4. **RabbitClient** (`core/rabbitmq/RabbitClient.ts`)
   - Main combined client (extends ApiClient, delegates to QueueClient)
   - Single entry point for all RabbitMQ operations

5. **AmqpClient** (`core/rabbitmq/AmqpClient.ts`)
   - AMQP protocol client (amqplib)
   - Consumer management, queue pause/resume state tracking
   - Persistence callback for pause states

6. **AmqpFactory** (`core/rabbitmq/AmqpFactory.ts`)
   - Factory with connection pooling (max 3 per server)
   - Creates/reuses AMQP clients per server ID

7. **MetricsCalculator** (`core/rabbitmq/MetricsCalculator.ts`)
   - Rate calculations from cumulative samples
   - Queue and overview metric derivation

8. **ResponseValidator** (`core/rabbitmq/ResponseValidator.ts`)
   - Compares API responses against TypeScript types
   - Detects unexpected/missing fields (used by discovery scripts)

**Credential Security:**
- Passwords encrypted with AES-256-CBC (EncryptionService)
- Key derived via scrypt from ENCRYPTION_KEY env var
- Random IV per encryption, decryption only in memory

### Alert Monitoring System

**Components:**
1. **Alert Service** (`services/alerts/alert.service.ts`)
   - Orchestrates alert checking across servers

2. **Alert Analyzer** (`services/alerts/alert.analyzer.ts`)
   - Analyzes server metrics against thresholds
   - Evaluates alert rules

3. **Alert Fingerprinting** (`services/alerts/alert.fingerprint.ts`)
   - Generates unique fingerprints for alerts
   - Deduplicates similar alerts

4. **Alert Health** (`services/alerts/alert.health.ts`)
   - Server health status evaluation

5. **Alert Thresholds** (`services/alerts/alert.thresholds.ts`)
   - Configurable threshold definitions

6. **Alert Notification** (`services/alerts/alert.notification.ts`)
   - Sends notifications via email, Slack, Discord, webhooks
   - Handles retry logic

7. **Alert Monitor Worker** (`workers/alert-monitor.ts`)
   - Runs as a separate process
   - Uses `rabbitmq-alerts.cron.ts` with sliding-window concurrency

### Service Layer

**Stripe Services** (`src/services/stripe/`):
- `core.service.ts` - Shared Stripe client initialization
- `customer.service.ts` - Customer management
- `payment.service.ts` - Payment processing
- `subscription.service.ts` - Subscription lifecycle
- `webhook.service.ts` - Webhook event processing
- `webhook-processor.ts` - Webhook event dispatching
- `webhook-handlers.ts` - Individual webhook event handlers
- `stripe.service.ts` - Orchestration facade

**Email Services** (`src/services/email/`):
- `core-email.service.ts` - Email sending with retry (dual-provider: Resend for cloud, Nodemailer/SMTP for self-hosted)
- `email.service.ts` - Facade delegating to specialized services
- `auth-email.service.ts` - Invitation, welcome, verification emails
- `billing-email.service.ts` - Upgrade confirmation, welcome back
- `notification-email.service.ts` - Trial ending, payment alerts, update available
- `license-email.service.ts` - License delivery, renewal, expiration, cancellation
- `email-verification.service.ts` - Email verification token management
- `password-reset-email.service.ts` - Password reset flow
- Templates in `templates/` using React Email (18 templates)

**License Services** (`src/services/license/`):
- `license.service.ts` - License generation, validation, renewal
- `license-crypto.service.ts` - JWT RS256 signing/verification (jose)
- `license-features.service.ts` - Feature extraction from license JWTs
- `license-public-key.ts` - Embedded RSA public key for verification

**Plan Services** (`src/services/plan/`):
- `plan.service.ts` - Plan validation (servers, workspaces, users, queues, RabbitMQ versions)
- `features.service.ts` - Plan feature definitions (FREE, DEVELOPER, ENTERPRISE)
- PlanValidationError and PlanLimitExceededError for structured error handling

**Deployment Services** (`src/services/deployment/`):
- `deployment.service.ts` - Detects and persists deployment method (dokku, docker_compose, binary)
- `deployment-detector.ts` - Environment-based detection heuristics
- Provides adaptive update instructions per deployment method

**SSO Service** (`src/services/auth/`):
- `sso.service.ts` - SAML/OIDC SSO via BoxyHQ Jackson
- Config resolution: DB (SystemSetting) > env vars for runtime reconfiguration
- Supports SAML ACS endpoint and OIDC authorization code flow

**Other Services:**
- `audit.service.ts` - Security audit logging (password events)
- `encryption.service.ts` - AES-256-CBC encrypt/decrypt, hash/verify
- `sentry/` - Sentry integration helpers (capture, metrics, context)
- `slack/` - Slack webhook integration for alert notifications
- `webhook/` - Generic webhook delivery with retry
- `integrations/notion.service.ts` - Notion database sync (user tracking)

### Feature Flags System

**Feature Gating** (`src/core/feature-flags.ts`):
- Cloud mode: all premium features enabled
- Self-hosted mode: checks license JWT from SystemSetting table
- In-memory cache with 60s TTL to avoid DB hits per request
- `requirePremiumFeature(feature)` middleware for tRPC procedures
- Premium features: workspace_management, alerting, slack_integration, webhook_integration, data_export, advanced_alert_rules

## Data Architecture

**Database:** PostgreSQL with 27 models

**Key Domains:**
- **Authentication:** User, EmailVerificationToken, PasswordReset
- **Workspaces:** Workspace, WorkspaceMember, Invitation
- **RabbitMQ:** RabbitMQServer, Queue, QueueMetric
- **Alerts:** Alert, AlertRule, SeenAlert, ResolvedAlert, WorkspaceAlertThresholds
- **Integrations:** SlackConfig, Webhook
- **Payments:** Subscription, Payment, StripeWebhookEvent
- **Licensing:** License, LicenseRenewalEmail, LicenseFileVersion
- **Feedback:** Feedback
- **System:** SystemState, SystemSetting
- **SSO:** SsoAuthCode, SsoState

**Naming Convention:** PascalCase table names (matches Prisma models)

**Migrations:** Located in `prisma/migrations/`, applied via Prisma Migrate or standalone migration runner (`core/migrate.ts`)

**Prisma Adapter:** Uses `@prisma/adapter-pg` (PrismaPg) for native PostgreSQL driver support

See [data-models-api.md](./data-models-api.md) for complete schema documentation.

## API Design

**Protocol:** tRPC over HTTP (POST to `/trpc/*`)

**Authentication:** JWT tokens in Authorization header (Bearer), or via SSE connectionParams for subscriptions

**Type Safety:** Full end-to-end type inference from backend to frontend

**See:** [api-contracts-api.md](./api-contracts-api.md) for complete API documentation.

## Deployment Modes

### Self-Hosted Edition
- Free or licensed self-hosted deployment
- Two tiers: community (basic monitoring) or licensed (full features via license JWT)
- Supports three deployment methods: Dokku, Docker Compose, Binary
- Binary mode: single executable with embedded frontend, auto-migrations, CLI setup wizard
- SMTP email via Nodemailer (configurable per-instance or via admin UI)
- SSO configurable via env vars or admin UI (SystemSetting persistence)

### Cloud Edition
- SaaS deployment
- Stripe subscription billing (Free, Developer, Enterprise plans)
- Multi-tenant with workspace isolation
- Resend for email delivery
- Additional worker processes: license-monitor, release-notifier

## Configuration

**Config Validation:** Mode-specific Zod schemas (`config/schemas/`)

**Environment Variables (shared):**
- `NODE_ENV` - Environment (development/production)
- `PORT` - HTTP port (default: 3000)
- `HOST` - Bind address
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret
- `ENCRYPTION_KEY` - AES-256 encryption key
- `DEPLOYMENT_MODE` - selfhosted/cloud (community/enterprise are deprecated aliases for selfhosted)
- `CORS_ORIGIN` - Allowed CORS origins (comma-separated)
- `LOG_LEVEL` - Pino log level
- `FRONTEND_URL` - Frontend URL for email links
- `SENTRY_DSN` - Sentry DSN (optional)
- `SENTRY_ENABLED` - Enable Sentry (optional)

**Self-Hosted specific:**
- `ENABLE_EMAIL` - Enable email sending
- `FROM_EMAIL` - Sender email address
- `SMTP_HOST/PORT/USER/PASS` - SMTP configuration
- `SMTP_SERVICE` - SMTP service (e.g., gmail)
- `SMTP_OAUTH_*` - SMTP OAuth2 credentials
- `ADMIN_EMAIL/ADMIN_PASSWORD` - Bootstrap admin (auto-removed after first boot)
- `ENABLE_REGISTRATION` - Allow new user registration
- `SSO_ENABLED`, `SSO_TYPE`, `SSO_OIDC_*`, `SSO_SAML_*` - SSO configuration
- `API_URL` - API URL for reverse-proxy setups

**Cloud specific:**
- `STRIPE_SECRET_KEY` - Stripe API key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook verification
- `STRIPE_*_PRICE_ID` - Plan price IDs
- `RESEND_API_KEY` - Resend API key
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `ENABLE_OAUTH` - Enable Google OAuth
- `LICENSE_PRIVATE_KEY` - RSA private key for license signing
- `PORTAL_FRONTEND_URL` - License portal URL
- `NOTION_API_KEY`, `NOTION_DATABASE_ID` - Notion integration

**CLI Flags (binary mode):**
Flags like `--port`, `--database-url`, `--jwt-secret`, `--encryption-key`, `--smtp-host`, etc. are mapped to environment variables for zero-config binary deployments.

## Testing

**Framework:** Vitest 4.0

**Test Organization:**
- Unit tests alongside source files (`*.test.ts`)
- Tests in `__tests__/` directories within each module
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
4. (Self-hosted) Obfuscate license code

**Build Commands:**
- `pnpm run build` - Standard build
- `pnpm run build:selfhosted` - Self-hosted build with obfuscation
- `pnpm run build:production` - Full production build

**Output:** `dist/` directory

**Start Production:**
1. Run migrations: `pnpm run db:migrate`
2. Start server: `node --import ./dist/instrument.js dist/index.js`

**Worker Processes:**
- Alert monitor: `node --import ./dist/instrument.js dist/workers/alert-monitor.js`
- License monitor: `node --import ./dist/instrument.js dist/workers/license-monitor.js` (cloud only)
- Release notifier: `node --import ./dist/instrument.js dist/workers/release-notifier.js` (cloud only)

**Standalone Migration Runner:**
- `core/migrate.ts` reads SQL from `migrations/` directory (shipped with binary)
- Uses `pg` directly for multi-statement SQL execution
- Advisory locks prevent concurrent migration runs
- Compatible with Prisma's `_prisma_migrations` tracking table

## Logging & Monitoring

**Structured Logging:**
- Library: Pino 10.x with pino-pretty (dev)
- Format: JSON in production
- Levels: trace, debug, info, warn, error, fatal
- Automatic redaction of sensitive fields (passwords, tokens, emails, headers, credentials)

**Error Tracking:**
- Optional Sentry integration (loaded via `--import` preload)
- Integrations: HTTP, Prisma, console logging, Pino
- Optional profiling via @sentry/profiling-node
- Strips authorization headers and health check noise
- Custom metrics: request duration (distribution), slow requests (count)

## Security

**Authentication:**
- JWT tokens (HS256 algorithm via Hono JWT)
- 7-day expiration
- Password hashing with bcrypt (10 rounds)
- SSO support (SAML + OIDC via BoxyHQ Jackson)

**Encryption:**
- AES-256-CBC for sensitive data (RabbitMQ passwords)
- Key derived via scrypt from env var
- Random IV per encryption

**Rate Limiting (dual layer):**
1. HTTP-level: hono-rate-limiter (100 req/min, IP or user-based)
2. tRPC-level: In-memory store with cleanup (standard: 100/min, strict: 5/min, billing: 30/min)

**CORS:**
- Configured allowed origins from CORS_ORIGIN env var (comma-separated support)
- Credentials enabled for auth
- 10-minute preflight cache

**Secure Headers:**
- Hono secureHeaders middleware applied to all routes

**Admin Bootstrap:**
- First-boot admin creation from env vars
- Credentials auto-removed from .env after creation

## External Integrations

1. **RabbitMQ** - Target monitoring system (customer servers, HTTP + AMQP protocols)
2. **PostgreSQL** - Primary database (via Prisma with pg adapter)
3. **Stripe** - Payment processing (cloud mode)
4. **Resend** - Email delivery (cloud mode)
5. **Nodemailer/SMTP** - Email delivery (self-hosted mode)
6. **Sentry** - Error tracking + performance monitoring (optional)
7. **Google OAuth** - Social authentication (cloud mode)
8. **BoxyHQ Jackson** - SAML/OIDC SSO (self-hosted + cloud)
9. **Slack** - Alert notifications (licensed feature)
10. **Discord** - Alert notifications (licensed feature)
11. **Notion** - User sync (optional, cloud mode)
12. **GitHub API** - Release version checking (cloud release notifier)

## Performance Considerations

- **Connection Pooling:** RabbitMQ AMQP (max 3 per server) and PostgreSQL (Prisma pg adapter)
- **Query Optimization:** Indexed database queries, selective field loading
- **Response Mapping:** Lean API responses via dedicated mapper layer
- **Retry Logic:** Exponential backoff with timeout for all external services (Resend, Stripe, Notion, generic)
- **Caching:** In-memory license JWT cache (60s TTL), React Query caching on frontend
- **Concurrency:** Sliding-window concurrency for alert monitoring (configurable via ALERT_CHECK_CONCURRENCY)
- **Performance Monitoring:** Slow request detection (>1s), Sentry metric distributions
