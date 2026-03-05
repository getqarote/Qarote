# Source Tree Analysis

**Project:** Qarote  
**Generated:** 2026-01-30  
**Type:** Monorepo with 4 parts

## Repository Structure

```
qarote/
├── .cursor/                    # Cursor IDE configuration
│   ├── rules/                  # Coding rules and conventions
│   └── commands/               # BMad Method commands
├── .github/                    # GitHub configuration
│   └── workflows/              # CI/CD workflows (20 files)
│       ├── deploy-api-*.yml
│       ├── deploy-frontend-*.yml
│       ├── deploy-landing-*.yml
│       ├── deploy-portal-*.yml
│       ├── deploy-worker-*.yml
│       └── validate-commits.yml
├── .husky/                     # Git hooks
├── apps/                       # ⭐ Applications (monorepo workspaces)
│   ├── api/                    # Backend API [PART 1]
│   ├── app/                    # Dashboard Frontend [PART 2]
│   ├── web/                    # Landing Page [PART 3]
│   └── portal/                 # Customer Portal [PART 4]
├── bin/                        # Build scripts
│   └── prebuild
├── docker/                     # Docker configurations
│   ├── haproxy/               # HAProxy config
│   ├── postgresql/            # PostgreSQL setup
│   └── rabbitmq/              # RabbitMQ cluster config
├── docs/                       # 📚 Project documentation
│   ├── README.md              # Documentation index
│   ├── COMMUNITY_EDITION.md
│   ├── ENTERPRISE_EDITION.md
│   ├── FEATURE_COMPARISON.md
│   ├── SELF_HOSTED_DEPLOYMENT.md
│   ├── ACT_TESTING.md
│   └── [Generated docs]       # This analysis and more
├── scripts/                    # Utility scripts
│   ├── test-corepack-buildpack.sh
│   └── test-dokku-build.sh
├── docker-compose.yml          # Local development environment
├── turbo.json                  # Turborepo configuration
├── pnpm-workspace.yaml         # pnpm workspace config
├── pnpm-lock.yaml              # Dependency lockfile
├── package.json                # Root package.json
├── commitlint.config.js        # Commit message linting
├── knip.config.ts              # Unused code detection
├── LICENSE                     # MIT License
├── SECURITY.md                 # Security policy
├── Procfile                    # Heroku deployment
├── app.json                    # Heroku app config
└── app.worker.json             # Heroku worker config
```

---

## Part 1: API Backend (`apps/api/`)

```
apps/api/
├── prisma/                     # Database layer
│   ├── migrations/            # 46 SQL migration files
│   └── schema.prisma          # 21 Prisma models
├── scripts/                    # Development & testing scripts
│   ├── rabbitmq/              # RabbitMQ seeding and testing
│   ├── resend/                # Email template development
│   ├── stripe/                # Stripe product setup
│   └── webhook/               # Webhook testing
├── src/
│   ├── config/                # ⚙️ Application configuration
│   │   ├── index.ts           # Main config export
│   │   ├── deployment.ts      # Deployment mode detection
│   │   └── features.ts        # Feature flag definitions
│   ├── controllers/           # 🎮 HTTP controllers (legacy, minimal)
│   │   ├── healthcheck.controller.ts
│   │   └── payment/webhook.controller.ts
│   ├── core/                  # 🔧 Core utilities
│   │   ├── rabbitmq/          # RabbitMQ client implementation
│   │   │   ├── api-client.ts  # HTTP Management API client
│   │   │   └── amqp-client.ts # AMQP protocol client
│   │   ├── auth.ts            # JWT utilities
│   │   ├── logger.ts          # Pino logger setup
│   │   ├── prisma.ts          # Prisma client instance
│   │   ├── retry.ts           # Retry with exponential backoff
│   │   ├── workspace-access.ts
│   │   ├── feature-flags.ts
│   │   └── instance-fingerprint.ts
│   ├── cron/                  # 📅 Scheduled tasks
│   │   └── alert-monitor.ts   # Alert monitoring cron
│   ├── mappers/               # 🗺️ Response mappers
│   │   └── rabbitmq/          # Transform RabbitMQ API responses
│   ├── middlewares/           # 🛡️ Hono middlewares
│   │   ├── cors.ts            # CORS configuration
│   │   ├── rateLimiter.ts     # Rate limiting
│   │   ├── request.ts         # Request logging
│   │   └── workspace.ts       # Workspace validation
│   ├── schemas/               # ✅ Zod validation schemas
│   │   ├── auth.ts
│   │   ├── payment.ts
│   │   ├── portal.ts
│   │   ├── rabbitmq.ts
│   │   ├── user.ts
│   │   └── workspace.ts
│   ├── services/              # 🏢 Business logic layer
│   │   ├── alerts/            # Alert analysis and notifications
│   │   │   ├── alert.analyzer.ts
│   │   │   ├── alert.fingerprint.ts
│   │   │   ├── alert.notification.ts
│   │   │   └── alert.service.ts
│   │   ├── email/             # Email service
│   │   │   ├── templates/     # React Email templates
│   │   │   ├── auth-email.service.ts
│   │   │   ├── billing-email.service.ts
│   │   │   └── core-email.service.ts
│   │   ├── license/           # Enterprise license validation
│   │   │   ├── license.service.ts
│   │   │   ├── license-crypto.service.ts
│   │   │   └── license-file.service.ts
│   │   ├── stripe/            # Payment processing
│   │   │   ├── customer.service.ts
│   │   │   ├── payment.service.ts
│   │   │   └── subscription.service.ts
│   │   ├── slack/             # Slack integration
│   │   ├── webhook/           # Webhook delivery
│   │   ├── sentry/            # Error tracking
│   │   └── integrations/      # Third-party integrations
│   │       └── notion.service.ts
│   ├── trpc/                  # 🚀 tRPC API layer
│   │   ├── routers/           # Route handlers (40 files)
│   │   │   ├── auth/          # Authentication (8 routers)
│   │   │   ├── rabbitmq/      # RabbitMQ ops (11 routers)
│   │   │   ├── workspace/     # Workspace mgmt (5 routers)
│   │   │   ├── alerts/        # Alert system (4 routers)
│   │   │   ├── payment/       # Billing (4 routers)
│   │   │   ├── portal/        # Portal ops
│   │   │   ├── public/        # Public endpoints
│   │   │   ├── discord.ts
│   │   │   ├── feedback.ts
│   │   │   └── user.ts
│   │   ├── middlewares/       # tRPC middlewares
│   │   │   └── rateLimiter.ts
│   │   ├── context.ts         # Request context factory
│   │   ├── trpc.ts            # tRPC initialization
│   │   └── router.ts          # Root router
│   ├── types/                 # 📝 TypeScript types
│   │   ├── api.ts             # API response types
│   │   └── rabbitmq.ts        # RabbitMQ types
│   ├── workers/               # 👷 Background workers
│   │   └── alert-monitor.ts   # Alert monitoring worker
│   └── index.ts               # 🚪 Application entry point
├── .env.example                # Environment template
├── tsconfig.json               # TypeScript configuration
├── vitest.config.ts            # Test configuration
└── package.json                # Dependencies and scripts
```

**Entry Points:**
- `src/index.ts` - Main API server
- `src/workers/alert-monitor.ts` - Alert monitoring worker

**Critical Directories:**
- `src/trpc/routers/` - All API endpoints
- `src/services/` - Business logic
- `src/core/rabbitmq/` - RabbitMQ connectivity
- `prisma/` - Database schema and migrations

---

## Part 2: App Dashboard (`apps/app/`)

```
apps/app/
├── public/
│   └── images/                # Static assets
├── src/
│   ├── components/            # 🧩 React components (50+)
│   │   ├── ui/                # shadcn/ui base components (40+)
│   │   ├── alerts/            # Alert feature components
│   │   ├── billing/           # Billing components
│   │   ├── profile/           # Profile components
│   │   ├── queues/            # Queue components
│   │   ├── workspace/         # Workspace components
│   │   ├── Layout.tsx         # Main layout with sidebar
│   │   └── ProtectedRoute.tsx # Auth guard
│   ├── contexts/              # 🌐 React contexts (6 total)
│   │   ├── AuthContext.tsx    # Authentication state
│   │   ├── UserContext.tsx    # User data
│   │   ├── WorkspaceContext.tsx # Workspace selection
│   │   ├── ServerContext.tsx  # Server selection
│   │   ├── VHostContext.tsx   # VHost selection
│   │   └── ThemeContext.tsx   # Dark/light theme
│   ├── hooks/                 # 🎣 Custom hooks
│   │   ├── queries/           # React Query hooks
│   │   │   ├── useRabbitMQ.ts
│   │   │   ├── useAlerts.ts
│   │   │   ├── useWorkspaceApi.ts
│   │   │   └── queryKeys.ts
│   │   └── ui/                # UI utility hooks
│   │       ├── useAuth.ts
│   │       ├── useUser.ts
│   │       └── useDashboardData.ts
│   ├── lib/                   # 📚 Libraries and utilities
│   │   ├── trpc/              # tRPC client setup
│   │   │   ├── client.ts
│   │   │   └── provider.tsx
│   │   ├── api/               # Type definitions
│   │   ├── queryClient.ts     # React Query config
│   │   ├── sentry.ts          # Error tracking
│   │   └── utils.ts           # Helpers
│   ├── pages/                 # 📄 Route components (25 pages)
│   │   ├── Index.tsx          # Dashboard
│   │   ├── Queues.tsx         # Queue list
│   │   ├── QueueDetail.tsx    # Queue details
│   │   ├── Alerts.tsx         # Alert dashboard (Enterprise)
│   │   ├── Workspace.tsx      # Workspace settings (Enterprise)
│   │   ├── SignIn.tsx         # Login
│   │   ├── SignUp.tsx         # Registration
│   │   └── ...
│   ├── schemas/               # ✅ Zod validation schemas
│   │   ├── auth.ts
│   │   ├── alerts.ts
│   │   └── server.ts
│   ├── types/                 # 📝 TypeScript types
│   ├── styles/                # 🎨 Global CSS
│   ├── App.tsx                # Root component
│   └── main.tsx               # 🚪 Entry point
├── index.html                  # HTML template
├── tailwind.config.ts          # Tailwind configuration
├── vite.config.ts              # Vite build configuration
└── package.json                # Dependencies and scripts
```

**Entry Point:** `src/main.tsx` → `src/App.tsx`

**Critical Directories:**
- `src/pages/` - Route components
- `src/components/` - Reusable components
- `src/contexts/` - Global state
- `src/hooks/queries/` - Data fetching logic

---

## Part 3: Landing Page (`apps/web/`)

```
apps/web/
├── public/
│   ├── images/                # Marketing images (optimized WebP)
│   │   ├── dashboard-640.webp
│   │   ├── dashboard-1280.webp
│   │   ├── dashboard-1920.webp
│   │   └── ...
│   ├── manifest.json          # PWA manifest
│   ├── robots.txt             # SEO directives
│   └── sitemap.xml            # XML sitemap
├── src/
│   ├── assets/                # Avatar images for testimonials
│   ├── components/            # 🧩 Marketing components
│   │   ├── ui/                # shadcn/ui library (~50 components)
│   │   ├── SEO.tsx            # Meta tags component
│   │   ├── AuthButtons.tsx    # CTA buttons with variants
│   │   ├── FeatureCard.tsx    # Feature showcase
│   │   ├── FAQ.tsx            # FAQ section
│   │   ├── StickyNav.tsx      # Navigation header
│   │   └── TawkTo.tsx         # Live chat widget
│   ├── hooks/
│   │   └── use-toast.ts       # Toast notifications
│   ├── lib/
│   │   ├── gtm.ts             # Google Tag Manager
│   │   ├── logger.ts          # Console logging
│   │   └── utils.ts           # Utilities
│   ├── pages/                 # 📄 4 pages
│   │   ├── Index.tsx          # Homepage (eager)
│   │   ├── PrivacyPolicy.tsx  # (lazy loaded)
│   │   ├── TermsOfService.tsx # (lazy loaded)
│   │   └── NotFound.tsx       # 404 (lazy loaded)
│   ├── types/                 # TypeScript declarations
│   ├── index.css              # Global styles + Tailwind
│   ├── App.tsx                # Root component
│   └── main.tsx               # 🚪 Entry point
├── index.html                  # HTML with GTM, preload directives
├── DEPLOYMENT.md               # Cloudflare Pages guide
├── cloudflare.json             # Cloudflare configuration
├── tailwind.config.ts          # Tailwind theme
├── vite.config.ts              # Vite build config
└── package.json                # Dependencies and scripts
```

**Entry Point:** `src/main.tsx` → `src/App.tsx` → `src/pages/Index.tsx`

**Critical Directories:**
- `src/pages/` - Route pages
- `src/components/` - Marketing components
- `public/images/` - Optimized assets

---

## Part 4: Customer Portal (`apps/portal/`)

```
apps/portal/
├── public/
│   └── images/                # Logos and favicons
├── src/
│   ├── components/            # 🧩 Portal components
│   │   ├── auth/              # Authentication components
│   │   │   └── GoogleLoginButton.tsx
│   │   ├── ui/                # shadcn/ui (minimal set)
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── password-input.tsx
│   │   │   ├── password-requirements.tsx
│   │   │   ├── checkbox.tsx
│   │   │   ├── form.tsx
│   │   │   ├── card.tsx
│   │   │   └── alert.tsx
│   │   └── Layout.tsx         # Main layout
│   ├── contexts/              # 🌐 State management
│   │   └── AuthContext.tsx    # Authentication
│   ├── hooks/                 # 🎣 Custom hooks
│   │   └── ui/
│   │       └── useAuth.ts     # Login/register mutations
│   ├── lib/                   # 📚 Libraries
│   │   ├── trpc/              # tRPC client
│   │   ├── queryClient.ts     # React Query
│   │   └── utils.ts
│   ├── pages/                 # 📄 6 pages
│   │   ├── Login.tsx          # Sign in
│   │   ├── SignUp.tsx         # Registration
│   │   ├── LicenseManagement.tsx
│   │   ├── LicensePurchase.tsx
│   │   ├── Downloads.tsx
│   │   └── AccountSettings.tsx
│   ├── schemas/               # ✅ Zod validation
│   │   └── auth.ts            # Sign up/sign in schemas
│   ├── styles/
│   │   └── google-auth.css    # Google button overrides
│   ├── index.css              # Global styles
│   ├── App.tsx                # Root component
│   └── main.tsx               # 🚪 Entry point
├── DEPLOYMENT.md               # Cloudflare Pages guide
├── cloudflare.json             # Cloudflare configuration
├── tailwind.config.ts          # Tailwind theme
├── vite.config.ts              # Vite build config
└── package.json                # Dependencies and scripts
```

**Entry Point:** `src/main.tsx` → `src/App.tsx`

**Critical Directories:**
- `src/pages/` - Route components
- `src/components/auth/` - Authentication UI
- `src/schemas/` - Form validation

---

## Integration Points

### Frontend → Backend
All three frontend apps (`app`, `web`, `portal`) connect to `api` via:
- **Protocol:** tRPC over HTTP
- **Endpoint:** `https://api.qarote.io` (production) or `http://localhost:3000` (dev)
- **Authentication:** JWT tokens in Authorization header

### Backend → External Services
The `api` connects to:
- **PostgreSQL** - Primary database
- **RabbitMQ Servers** - Customer RabbitMQ instances (HTTP API + AMQP)
- **Stripe** - Payment processing
- **Resend** - Email delivery
- **Google OAuth** - Authentication validation
- **Sentry** - Error tracking (optional)
- **Slack/Discord** - Webhook notifications

---

## Build System

**Turborepo** orchestrates builds across all apps:

**Commands:**
- `pnpm run dev` - Start all apps in development
- `pnpm run build` - Build all apps
- `pnpm run build:api` - Build API only
- `pnpm run build:app` - Build dashboard only
- `pnpm run lint` - Lint all apps
- `pnpm run test` - Test all apps

**Workspace Configuration:**
- `pnpm-workspace.yaml` - Defines `apps/*` as workspaces
- `turbo.json` - Build dependencies and caching

---

## Shared Configuration

### Code Quality
- **ESLint** - Linting with `eslint-plugin-simple-import-sort`
- **Prettier** - Code formatting
- **Commitlint** - Conventional commit messages
- **Husky** - Git hooks for pre-commit linting
- **Knip** - Unused code detection

### TypeScript
All apps use TypeScript 5.9 with strict mode enabled.

### Styling
All apps use Tailwind CSS 3.4 with custom configurations per app.

### Testing
All apps support Vitest for unit testing.

---

## Development Environment

**Local Services (docker-compose.yml):**
- PostgreSQL (port 5432)
- RabbitMQ 3-node cluster with HAProxy load balancer
- RabbitMQ versions: 3.12, 3.13, 4.0, 4.1, 4.2

**Development Ports:**
- API: 3000
- App: 8080
- Web: 5173
- Portal: 5174

---

## CI/CD Pipeline

**GitHub Actions Workflows:**
- Quality checks (lint, type-check, test)
- Staging deployments (auto on push)
- Production deployments (manual approval)
- Commit message validation

**Deployment Targets:**
- API → Heroku/Dokku (apps/api)
- App → Cloudflare Pages (apps/app)
- Web → Cloudflare Pages (apps/web)
- Portal → Cloudflare Pages (apps/portal)
