# Architecture - App Dashboard

**Part:** apps/app/
**Generated:** 2026-03-05
**Type:** React Single Page Application

## Executive Summary

The Qarote dashboard is a **React SPA** that provides real-time monitoring and management of RabbitMQ servers. It uses tRPC for type-safe API communication with real-time subscriptions (SSE) for live metrics and queue data. It supports Enterprise features like alerting, workspace management, and self-hosted deployment with license management.

## Technology Stack

| Category | Technology | Version | Purpose |
|----------|------------|---------|---------|
| Framework | React | 19.2 | UI library |
| Language | TypeScript | 5.9 | Type-safe development |
| Build Tool | Vite | 7.3 | Fast dev server and bundler |
| API Client | tRPC Client | 11.8 | Type-safe API calls (batch HTTP + SSE subscriptions) |
| State Management | TanStack Query | 5.90 | Server state management |
| Routing | React Router | 7.13 | Client-side routing |
| Forms | React Hook Form | 7.70 | Form state management |
| Validation | Zod | 4.3 | Schema validation |
| Styling | Tailwind CSS | 4.2 | Utility-first CSS |
| UI Components | shadcn/ui | Latest | Component library (53 components) |
| Charts | Recharts | 3.6 | Data visualization |
| Icons | Lucide React | 0.575 | Icon library |
| i18n | i18next + react-i18next | 25.2 / 15.6 | Internationalization |
| OAuth | React OAuth Google | 0.13 | Google authentication (cloud mode) |
| Error Tracking | Sentry React | 10.39 | Error monitoring (optional) |
| Analytics | react-ga4 | 2.1 | Google Analytics (cloud mode) |
| Live Chat | Tawk.to | 2.0 | Customer support |
| Toasts | Sonner | 2.0 | Toast notifications |
| Theme | next-themes | 0.4 | Dark mode support |
| Logging | loglevel | 1.9 | Structured logging |

## Architecture Pattern

**Component-Based SPA** with context providers, custom hooks, and tRPC subscriptions:

```
+------------------------------------------+
|          Context Providers               |
|  Auth, User, Workspace, Server,         |
|  VHost, Theme                           |
+------------------------------------------+
                    |
+------------------------------------------+
|         React Router v7                  |
|  Public, Protected, and Layout Routes    |
+------------------------------------------+
                    |
+------------------------------------------+
|          Page Components (30)            |
|  Dashboard, Queues, Alerts, License...   |
+------------------------------------------+
                    |
+------------------------------------------+
|        Feature Components                |
|  QueueTable, AlertItem, Charts,         |
|  AddServerForm, BillingLayout, etc.     |
+------------------------------------------+
                    |
+------------------------------------------+
|          UI Components (53)              |
|  Button, Card, Dialog, etc. (shadcn)     |
+------------------------------------------+
```

## Directory Structure

```
apps/app/src/
+-- components/          # Feature and UI components
|   +-- ui/             # shadcn/ui components (53 files)
|   +-- alerts/         # Alert components (7 files)
|   +-- auth/           # Auth components (Google, SSO)
|   +-- billing/        # Billing components (6 files)
|   +-- nodes/          # Node overview components
|   +-- plans/          # Plan upgrade modal
|   +-- profile/        # Profile tab components (9 files)
|   +-- users/          # RabbitMQ user management
|   +-- vhosts/         # VHost management modals
|   +-- Queues/         # Queue list components
|   +-- QueueDetail/    # Queue detail sub-components
|   +-- AddServerFormComponent/  # Multi-step server form
|   +-- Layout.tsx      # Main layout wrapper with footer
|   +-- AppHeader.tsx   # Header with workspace selector
|   +-- AppSidebar.tsx  # Navigation sidebar
|   +-- FeatureGate.tsx # Premium feature gating
|   +-- ProtectedRoute.tsx  # Auth guard
|   +-- PublicRoute.tsx     # Redirect if authenticated
|   +-- ...             # 40+ standalone feature components
+-- contexts/            # React contexts (5 contexts, 10 files)
|   +-- AuthContext.tsx / AuthContextDefinition.tsx
|   +-- UserContext.tsx / UserContextDefinition.ts
|   +-- WorkspaceContext.tsx / WorkspaceContextDefinition.ts
|   +-- ServerContext.tsx
|   +-- VHostContext.tsx / VHostContextDefinition.tsx
|   +-- ThemeContext.tsx
+-- hooks/               # Custom hooks
|   +-- queries/        # tRPC/React Query hooks (14 files)
|   +-- ui/             # UI utility hooks (7 files)
|   +-- useFeatureFlags.ts  # Feature flag hook
+-- lib/                 # Utilities and clients
|   +-- trpc/           # tRPC client, provider, types, unauthorized link
|   +-- api/            # Type definitions (11 files)
|   +-- queryClient.ts  # React Query config with retry logic
|   +-- featureFlags.ts # Deployment mode + premium features
|   +-- sentry.ts       # Error tracking setup
|   +-- ga.ts           # Google Analytics
|   +-- logger.ts       # loglevel wrapper
|   +-- utils.ts        # Helper functions (cn, etc.)
|   +-- error-utils.ts  # Error formatting utilities
|   +-- formatTags.ts   # Tag formatting
|   +-- rabbitmqUrlParser.ts  # RabbitMQ URL parsing
+-- pages/               # Route components (30 pages + public/)
|   +-- Index.tsx       # Dashboard
|   +-- Queues.tsx      # Queue list
|   +-- QueueDetail.tsx # Queue details
|   +-- Connections.tsx # Connection list
|   +-- Exchanges.tsx   # Exchange management
|   +-- Nodes.tsx       # Cluster nodes
|   +-- VHostsPage.tsx / VHostDetailsPage.tsx  # Virtual hosts
|   +-- UsersPage.tsx / UserDetailsPage.tsx    # RabbitMQ users
|   +-- Alerts.tsx      # Alert dashboard
|   +-- Profile.tsx     # User profile (tabs)
|   +-- Workspace.tsx   # Workspace setup/management
|   +-- License.tsx     # Self-hosted license management
|   +-- SSOSettings.tsx # Self-hosted SSO configuration
|   +-- SMTPSettings.tsx # Self-hosted SMTP configuration
|   +-- Plans.tsx       # Subscription plans (cloud)
|   +-- Billing.tsx     # Billing history (cloud)
|   +-- HelpSupport.tsx # Help and support
|   +-- SignIn.tsx / SignUp.tsx  # Authentication
|   +-- ForgotPassword.tsx / ResetPassword.tsx  # Password reset flow
|   +-- VerifyEmail.tsx # Email verification
|   +-- AcceptInvitation.tsx  # Workspace invitation
|   +-- SSOCallback.tsx # SSO redirect handler
|   +-- PaymentSuccess.tsx / PaymentCancelled.tsx  # Stripe callbacks
|   +-- NotFound.tsx    # 404 page
|   +-- public/         # TermsOfService, PrivacyPolicy
+-- schemas/             # Zod validation schemas (9 files)
|   +-- auth.ts, feedback.ts, message.ts, queue.ts,
|   +-- server.ts, user.ts, vhost.ts, workspace.ts
+-- types/               # TypeScript types
|   +-- apiErrors.ts, feedback.ts, plans.ts
+-- styles/              # Global CSS (index.css, google-auth.css)
+-- i18n.ts              # i18next configuration (17 namespaces)
```

## State Management

**Hybrid Approach:**

1. **React Context API** for global app state (5 contexts):
   - Authentication (AuthContext) - JWT token, login/logout, user session
   - User data (UserContext) - current user profile
   - Workspace selection (WorkspaceContext) - active workspace
   - Server selection (ServerContext) - active RabbitMQ server
   - VHost selection (VHostContext) - active virtual host filter
   - Theme (ThemeContext) - dark/light mode via next-themes

2. **TanStack Query** for server state:
   - All API data fetching via tRPC hooks
   - Caching with 5-minute default staleTime
   - Polling via refetchInterval for standard queries
   - Intelligent retry logic (no retry on 401/429)
   - Cache invalidation on mutations

3. **tRPC Subscriptions** (SSE) for real-time data:
   - Queues (watchQueues) - live queue list updates
   - Metrics (watchMetrics) - live server metrics
   - Live rates (watchRates) - message rate time series
   - Alerts (watchAlerts) - real-time alert updates

See [state-management-app.md](./state-management-app.md) for details.

## Routing Strategy

**React Router v7** with flat route definitions:

**Public Routes:**
- `/auth/sign-in` - Login (PublicRoute)
- `/auth/sign-up` - Registration (PublicRoute)
- `/auth/sso/callback` - SSO redirect handler (PublicRoute)
- `/forgot-password` - Password reset request (PublicRoute)
- `/reset-password` - Password reset form (PublicRoute)
- `/verify-email` - Email verification
- `/invite/:token` - Workspace invitation (PublicRoute)
- `/terms-of-service` - Terms of Service
- `/privacy-policy` - Privacy Policy

**Protected Routes** (all behind `ProtectedRoute`):
- `/` - Dashboard (with Layout)
- `/queues`, `/queues/:queueName` - Queue management
- `/connections` - Connection list
- `/exchanges` - Exchange management
- `/nodes` - Cluster nodes
- `/vhosts`, `/vhosts/:vhostName` - Virtual hosts
- `/users`, `/users/:username` - RabbitMQ users
- `/alerts` - Alert management
- `/profile` - User profile
- `/workspace` - Workspace setup (no Layout)
- `/license` - License management (self-hosted)
- `/settings/sso` - SSO configuration (self-hosted)
- `/settings/smtp` - SMTP configuration (self-hosted)
- `/plans` - Subscription plans (cloud)
- `/billing` - Billing history (cloud)
- `/payment/success` - Stripe success callback (no Layout)
- `/payment/cancelled` - Stripe cancelled callback (no Layout)
- `/help` - Help and support
- `*` - 404 Not Found

All pages are **lazy-loaded** with `React.lazy()` and wrapped in `<Suspense>` with a `<PageLoader>` fallback.

## Component Design

**Patterns:**

1. **Composition over Inheritance**
   - Small, focused components
   - Composed into larger features

2. **Container/Presentational Split**
   - Pages handle data fetching and state
   - Components handle presentation

3. **Custom Hooks for Logic**
   - Data fetching in `useRabbitMQ`, `useAlerts`, `useServer`, etc.
   - Composite data hooks (e.g., `useDashboardData` aggregates multiple queries)
   - UI logic in `useToast`, `useMobile`, `usePlanUpgrade`, etc.

4. **shadcn/ui for Base Components**
   - Customizable with Tailwind
   - Accessible by default
   - Composable with Radix UI primitives

5. **Feature Gating with FeatureGate**
   - Wraps premium features with upgrade prompts
   - Controlled by deployment mode and license/plan

## Data Fetching

**tRPC + React Query Hooks:**

All queries in `src/hooks/queries/` (14 files):
- `useRabbitMQ.ts` - Overview, queues, nodes, metrics, connections, channels, exchanges, bindings, queue operations (create, delete, purge, pause, resume), message publishing
- `useServer.ts` - Server CRUD, test connection
- `useAlerts.ts` - Alert rules, RabbitMQ alerts, notification settings, webhooks, Slack configs
- `useWorkspaceApi.ts` - Workspace management, invitations, user management, workspace switching
- `usePlans.ts` - Subscription plan data
- `useProfile.ts` - User profile, password change, email change, verification status
- `useRabbitMQUsers.ts` - RabbitMQ user management and permissions
- `useRabbitMQVHosts.ts` - VHost management, permissions, and limits
- `useFeedback.ts` - Feedback submission
- `usePublicConfig.ts` - Public server configuration
- `useLicenseManagement.ts` - License activation/deactivation (self-hosted)
- `useSelfhostedSmtp.ts` - SMTP settings for self-hosted
- `useSelfhostedSso.ts` - SSO settings for self-hosted
- `useSsoConfig.ts` - SSO configuration check

**Real-time Strategy (Subscriptions via SSE):**
- Queue list: tRPC subscription (watchQueues)
- Server metrics: tRPC subscription (watchMetrics)
- Message rates: tRPC subscription (watchRates)
- Active alerts: tRPC subscription (watchAlerts)

**Polling Strategy (refetchInterval):**
- Connections: 5-second interval
- Queue detail / consumers: 10-second interval
- Overview: 10-second interval
- Channels: 15-second interval
- Nodes / exchanges / vhosts / users: 30-second interval
- Servers list: 60-second interval
- Resolved alerts: 60-second interval

**tRPC Transport:**
- Standard queries/mutations: `httpBatchLink` with Bearer token auth
- Subscriptions: `httpSubscriptionLink` (SSE) with token in connectionParams
- `unauthorizedLink` dispatches `auth:unauthorized` event on 401 errors
- `splitLink` routes subscriptions vs queries to appropriate transport

## Internationalization

**i18next** with 17 namespaces:
- `common`, `auth`, `validation`, `sidebar`, `dashboard`, `queues`, `connections`, `nodes`, `exchanges`, `vhosts`, `users`, `alerts`, `billing`, `profile`, `workspace`, `help`, `sso`, `smtp`
- Shared translations from `@qarote/i18n` workspace package
- Browser language detection via `i18next-browser-languagedetector`
- JSON translation files loaded from `/locales/{{lng}}/{{ns}}.json`

## Styling System

**Tailwind CSS v4** with custom configuration:

**Custom Theme:**
- Colors: `primary`, `secondary`, `destructive`, `muted`, `accent`
- Gradients: `gradient-page`, `gradient-button`, `gradient-title`
- Dark mode support via `ThemeContext` / `next-themes`

**Component Styling:**
- All styling via Tailwind classes
- Custom component classes in `src/styles/index.css`
- Gradient buttons for primary CTAs
- Gradient switches for toggles

## Build Configuration

**Vite Configuration** (`vite.config.ts`):

**Path Aliases:**
- `@` -> `./src`
- `@api` -> `../api/src`

**Optimizations:**
- Manual chunks for vendor code (react, ui, data, charts, icons, forms, i18n, utils)
- React dedupe to prevent duplicate instances
- Code splitting by feature area via lazy-loaded pages
- ESNext build target with esbuild minification
- Tree-shaking enabled
- Chunk size warning limit: 1000 KB

**Build Modes:**
- `build` - Standard production build
- `build:dev` - Development build
- `build:community` - Community Edition (VITE_DEPLOYMENT_MODE=community)
- `build:enterprise` - Enterprise Edition (VITE_DEPLOYMENT_MODE=enterprise)

## Feature Gating

**FeatureGate Component:**

```tsx
<FeatureGate feature="alerting">
  <Alerts />
</FeatureGate>
```

**Premium Features:**
- `workspace_management` - Workspace Management
- `alerting` - Alerting System
- `slack_integration` - Slack Integration
- `webhook_integration` - Webhook Integration
- `data_export` - Data Export
- `advanced_alert_rules` - Advanced Alert Rules

**Controlled by:**
- Deployment mode (`cloud` vs `selfhosted`)
- Cloud: all features enabled, gated by subscription plan (server-side)
- Self-hosted: feature flags queried from server (`public.getFeatureFlags`), determined by license

**Deployment Mode Detection:**
- Build-time: `VITE_DEPLOYMENT_MODE` env var
- Runtime: `window.__QAROTE_CONFIG__` (served by `/config.js` in binary mode)
- `cloud` mode enables Google OAuth, Google Analytics, Sentry
- `selfhosted` mode enables license management, SSO settings, SMTP settings

## Performance

**Optimizations:**
- Route-based code splitting (all pages lazy-loaded)
- React Query caching (5-minute default staleTime)
- tRPC subscriptions for live data (avoids polling overhead)
- Cache invalidation on mutations
- Debounced search inputs
- Manual vendor chunks for better caching

**Bundle Size:**
- Vendor chunks separated: react, ui, data, charts, icons, forms, i18n, utils
- Tree-shaking to remove unused code
- Dynamic imports for all page components

## Testing

**Framework:** Vitest 4.0

**Test Files:**
- `*.test.ts` - Unit tests
- `*.test.tsx` - Component tests

**Commands:**
- `pnpm run test` - Watch mode
- `pnpm run test:run` - Single run
- `pnpm run test:ui` - UI interface
