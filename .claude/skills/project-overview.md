# Qarote - Project Overview

**Generated:** 2026-01-30  
**Repository:** https://github.com/LaGriffe/rabbit-dash-board

## What is Qarote?

Qarote is a **modern RabbitMQ monitoring and management platform** that provides real-time insights, alerting, and operational tools for RabbitMQ server infrastructure.

## Project Purpose

**Problem:** RabbitMQ's built-in management UI is functional but lacks modern features like real-time alerting, team collaboration, historical metrics, and mobile-friendly design.

**Solution:** Qarote provides a comprehensive monitoring platform with:
- Beautiful, modern UI
- Real-time metrics and charting
- Intelligent alerting system
- Team workspace collaboration
- Multiple RabbitMQ version support (3.12 - 4.2)
- Mobile-responsive design

## Repository Type

**Monorepo** (pnpm + Turborepo)

**Structure:**
```
qarote/
├── apps/
│   ├── api/      # Backend API (Hono.js + tRPC)
│   ├── app/      # Dashboard (React SPA)
│   ├── web/      # Landing page (React)
│   └── portal/   # Customer portal (React)
├── docs/         # Project documentation
├── docker/       # Docker configurations
└── scripts/      # Build and deployment scripts
```

## Technology Summary

| Part | Type | Primary Technologies |
|------|------|---------------------|
| **API** | Backend | Node.js 24, Hono.js 4, tRPC 11, Prisma 6, PostgreSQL |
| **App** | Frontend | React 18, TypeScript 5, Vite 7, Tailwind 3, shadcn/ui |
| **Web** | Frontend | React 18, TypeScript 5, Vite 7, Tailwind 3 |
| **Portal** | Frontend | React 18, TypeScript 5, Vite 7, Tailwind 3, tRPC |

## Deployment Modes

Qarote supports three deployment modes:

### 1. Community Edition (Free)
- Self-hosted
- Open source
- Basic monitoring features
- Single-user
- No workspace management or alerts

### 2. Enterprise Edition (Paid)
- Self-hosted
- License-based validation
- Full feature set:
  - Team workspaces
  - Advanced alerting
  - Slack/Discord/webhook integrations
  - Data export
  - Priority support

### 3. Cloud Edition (SaaS)
- Hosted at qarote.io
- Subscription-based (Stripe)
- Freemium model
- Multi-tenant architecture
- Automatic updates

## Key Features

### Core Monitoring
- Real-time dashboard with server overview
- Queue monitoring and management
- Message publishing and consumption
- Exchange and binding visualization
- Virtual host management
- User and permission management
- Connection and channel monitoring
- Cluster node information

### Enterprise Features
- **Alerting System** - Configurable rules with multiple notification channels
- **Workspace Management** - Team collaboration with role-based access
- **Slack Integration** - Alert notifications to Slack channels
- **Discord Integration** - Alert notifications to Discord
- **Custom Webhooks** - HTTP webhooks for custom integrations
- **Data Export** - Export metrics and configurations

### Administrative
- User authentication (email/password + Google OAuth)
- Subscription management (Cloud mode)
- License management (Enterprise mode)
- Billing and payment history
- User feedback system

## Target Users

1. **DevOps Engineers** - Monitor RabbitMQ infrastructure
2. **Backend Developers** - Debug message queues and flows
3. **System Administrators** - Manage users, permissions, and configuration
4. **Engineering Teams** - Collaborate on RabbitMQ operations (Enterprise)

## Development Workflow

**Prerequisites:**
- Node.js 24+
- pnpm 9+
- Docker (for local RabbitMQ and PostgreSQL)

**Setup:**
```bash
# Clone and install
git clone <repo-url>
cd qarote
pnpm install

# Start local services
docker compose up -d

# Setup database
cd apps/api
pnpm run db:migrate:dev

# Start development
pnpm run dev:api    # API on localhost:3000
pnpm run dev:app    # Dashboard on localhost:8080
pnpm run dev:web    # Landing on localhost:5173
pnpm run dev:portal # Portal on localhost:5174
```

## Project Goals

1. **Performance** - Fast load times, real-time updates
2. **Type Safety** - End-to-end TypeScript with tRPC
3. **Developer Experience** - Easy setup, good documentation
4. **User Experience** - Modern, intuitive interface
5. **Scalability** - Support multiple servers and large teams
6. **Reliability** - Robust error handling and monitoring

## Business Model

**Freemium SaaS:**
- Free tier with basic monitoring
- Developer tier ($9/month) with more servers
- Enterprise tier ($99/month) with full features
- Self-hosted Enterprise licenses available

## External Dependencies

**Required:**
- PostgreSQL 15+ (database)
- RabbitMQ servers (target monitoring systems)

**Optional:**
- Stripe (payments in cloud mode)
- Resend/SMTP (email notifications)
- Sentry (error tracking)
- Slack (alert notifications)
- Discord (alert notifications)

## Project Status

**Active Development** - Production-ready platform in active use

**Recent Work:**
- Added Sentry DSN validation fix
- Implemented retry logic for email service
- Created comprehensive READMEs for all apps
- Performance optimizations for landing page
- Portal sign-up page with password requirements

## License

MIT License - See LICENSE file

## Repository

**GitHub:** https://github.com/LaGriffe/rabbit-dash-board  
**Author:** La Griffe
