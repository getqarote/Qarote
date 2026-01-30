# Qarote API

The backend API for Qarote, built with Hono.js, tRPC, and Prisma.

## Overview

This is the core backend service that powers Qarote. It provides:

- **tRPC API** - Type-safe API endpoints for the frontend
- **RabbitMQ Management** - Connects to RabbitMQ servers via the Management HTTP API and AMQP
- **Authentication** - Email/password and Google OAuth authentication
- **Workspace Management** - Multi-tenant workspace support (Enterprise)
- **Alert System** - Real-time monitoring and alerting for RabbitMQ (Enterprise)
- **Payment Processing** - Stripe integration for subscriptions
- **License Validation** - Cryptographic license validation for self-hosted deployments

## Tech Stack

- **Runtime**: Node.js 24+
- **Framework**: [Hono.js](https://hono.dev/) - Fast, lightweight web framework
- **API Layer**: [tRPC](https://trpc.io/) - End-to-end type-safe APIs
- **Database**: PostgreSQL with [Prisma](https://www.prisma.io/) ORM
- **Message Queue**: RabbitMQ (client connectivity)
- **Email**: [Resend](https://resend.com/) / SMTP with [React Email](https://react.email/)
- **Payments**: [Stripe](https://stripe.com/)
- **Logging**: [Pino](https://getpino.io/)
- **Error Tracking**: [Sentry](https://sentry.io/) (optional)

## Project Structure

```
apps/api/
├── prisma/
│   ├── migrations/       # Database migrations
│   └── schema.prisma     # Database schema
├── scripts/
│   ├── rabbitmq/         # RabbitMQ seeding and testing scripts
│   ├── resend/           # Email template development
│   ├── stripe/           # Stripe setup scripts
│   └── webhook/          # Webhook testing
├── src/
│   ├── config/           # Configuration (deployment mode, features)
│   ├── controllers/      # HTTP controllers (health, webhooks)
│   ├── core/
│   │   ├── rabbitmq/     # RabbitMQ client implementation
│   │   ├── auth.ts       # Authentication utilities
│   │   ├── logger.ts     # Pino logger setup
│   │   └── prisma.ts     # Prisma client instance
│   ├── cron/             # Scheduled tasks (alert monitoring)
│   ├── mappers/          # RabbitMQ API response mappers
│   ├── middlewares/      # Hono middlewares (CORS, rate limiting)
│   ├── schemas/          # Zod validation schemas
│   ├── services/
│   │   ├── alerts/       # Alert analysis and notifications
│   │   ├── email/        # Email service and templates
│   │   ├── license/      # License validation (Enterprise)
│   │   ├── slack/        # Slack integration
│   │   ├── stripe/       # Payment processing
│   │   └── webhook/      # Webhook delivery
│   ├── trpc/
│   │   ├── routers/      # tRPC route handlers
│   │   ├── middlewares/  # tRPC middlewares
│   │   ├── context.ts    # Request context
│   │   └── router.ts     # Root router
│   ├── workers/          # Background workers
│   └── index.ts          # Application entry point
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 24+
- pnpm 9+
- PostgreSQL 15+
- Docker (for local development)

### Development Setup

1. **Start local services** (from project root):

   ```bash
   docker compose up -d
   ```

2. **Install dependencies** (from project root):

   ```bash
   pnpm install
   ```

3. **Run database migrations**:

   ```bash
   cd apps/api
   pnpm run db:migrate:dev
   ```

4. **Start development server**:

   ```bash
   pnpm run dev
   ```

   The API will be available at `http://localhost:3000`.

### Environment Variables

See [docs/ENVIRONMENT_VARIABLES.md](../../docs/ENVIRONMENT_VARIABLES.md) for a complete reference.

Key variables:

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `JWT_SECRET` | Secret for JWT signing (min 32 chars) | Yes |
| `ENCRYPTION_KEY` | Key for encrypting credentials (min 32 chars) | Yes |
| `DEPLOYMENT_MODE` | `community`, `enterprise`, or `cloud` | Yes |

## Available Scripts

### Development

```bash
pnpm run dev          # Start API with hot reload
pnpm run dev:alert    # Start alert monitor worker
pnpm run build        # Build for production
pnpm run start        # Start production server
```

### Database

```bash
pnpm run db:migrate:dev   # Run migrations in development
pnpm run db:migrate       # Run migrations in production
pnpm run db:studio        # Open Prisma Studio
pnpm run db:generate      # Generate Prisma client
```

### Testing & Quality

```bash
pnpm run test         # Run tests
pnpm run test:run     # Run tests once
pnpm run lint         # Check linting
pnpm run lint:fix     # Fix linting issues
pnpm run type-check   # TypeScript type checking
```

### Seeding & Testing Data

```bash
pnpm run seed:test    # Seed test data
pnpm run seed:users   # Seed test users
pnpm run seed:publish # Publish test messages to RabbitMQ
pnpm run seed:consume # Consume test messages from RabbitMQ
pnpm run seed:all     # Seed all test servers
```

### Email Development

```bash
pnpm run email:dev      # Start email preview server (port 3001)
pnpm run email:preview  # Preview email templates
pnpm run email:test     # Test email rendering
```

### Stripe

```bash
pnpm run stripe:set-up  # Interactive Stripe setup
pnpm run stripe:create  # Create Stripe products/prices
pnpm run stripe:list    # List Stripe products
pnpm run stripe:verify  # Verify Stripe configuration
```

### Webhooks

```bash
pnpm run webhook:test   # Test webhook delivery
```

## API Routes

### tRPC Router Structure

All API endpoints are exposed via tRPC at `/trpc/*`:

| Router | Description |
|--------|-------------|
| `auth` | Authentication (login, register, password reset, OAuth) |
| `user` | User profile management |
| `workspace` | Workspace CRUD and member management (Enterprise) |
| `rabbitmq` | RabbitMQ server management and monitoring |
| `alerts` | Alert rules, Slack/webhook configuration (Enterprise) |
| `payment` | Billing, checkout, subscriptions |
| `feedback` | User feedback submission |
| `discord` | Discord integration |
| `public` | Public endpoints (invitation acceptance) |
| `license` | License management (Customer Portal) |

### HTTP Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check |
| `GET /health/ready` | Readiness check |
| `POST /webhooks/stripe` | Stripe webhook handler |

## Architecture

### RabbitMQ Integration

The API connects to RabbitMQ servers in two ways:

1. **Management HTTP API** (`ApiClient`) - For reading server state, queues, exchanges, users, etc.
2. **AMQP Protocol** (`AmqpClient`) - For publishing/consuming messages

All RabbitMQ credentials are encrypted at rest using AES-256-GCM.

### Alert System (Enterprise)

The alert system monitors RabbitMQ servers for issues:

1. **Alert Analyzer** - Analyzes server metrics against thresholds
2. **Alert Fingerprint** - Deduplicates similar alerts
3. **Alert Notifications** - Sends alerts via email, Slack, Discord, or webhooks

The alert monitor can run as:
- A cron job within the main API process
- A separate worker process (`pnpm run dev:alert`)

### License Validation (Self-Hosted)

Enterprise licenses are validated offline using:

1. **RSA-SHA256 signatures** - Cryptographic verification
2. **Instance fingerprinting** - Optional server locking
3. **Feature flags** - Granular feature control

## Testing

```bash
# Run all tests
pnpm run test

# Run tests with UI
pnpm run test:ui
```

## Deployment

### Community Edition

```bash
DEPLOYMENT_MODE=community pnpm run build
pnpm run start:production
```

### Enterprise Edition

```bash
DEPLOYMENT_MODE=enterprise pnpm run build:enterprise
pnpm run start:production
```

The enterprise build includes license code obfuscation.

## Related Documentation

- [Contributing Guide](../../CONTRIBUTING.md)
- [Self-Hosted Deployment](../../docs/SELF_HOSTED_DEPLOYMENT.md)
