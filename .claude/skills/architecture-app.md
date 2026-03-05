# Architecture - App Dashboard

**Part:** apps/app/  
**Generated:** 2026-01-30  
**Type:** React Single Page Application

## Executive Summary

The Qarote dashboard is a **React SPA** that provides real-time monitoring and management of RabbitMQ servers. It uses tRPC for type-safe API communication and supports Enterprise features like alerting and workspace management.

## Technology Stack

| Category | Technology | Version | Purpose |
|----------|------------|---------|---------|
| Framework | React | 18.3 | UI library |
| Language | TypeScript | 5.9 | Type-safe development |
| Build Tool | Vite | 7.2 | Fast dev server and bundler |
| API Client | tRPC Client | 11.0 | Type-safe API calls |
| State Management | TanStack Query | 5.56 | Server state management |
| Routing | React Router | 6.30 | Client-side routing |
| Forms | React Hook Form | 7.66 | Form state management |
| Validation | Zod | 3.25 | Schema validation |
| Styling | Tailwind CSS | 3.4 | Utility-first CSS |
| UI Components | shadcn/ui | Latest | Component library |
| Charts | Recharts | 2.15 | Data visualization |
| Icons | Lucide React | 0.462 | Icon library |
| OAuth | React OAuth Google | 0.12 | Google authentication |
| Error Tracking | Sentry React | 9.33 | Error monitoring (optional) |
| Live Chat | Tawk.to | 2.0 | Customer support |

## Architecture Pattern

**Component-Based SPA** with context providers and hooks:

```
┌─────────────────────────────────────────┐
│          Context Providers              │
│  Auth, User, Workspace, Server, Theme   │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│           React Router                  │
│  Public and Protected Routes            │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│          Page Components                │
│  Dashboard, Queues, Alerts, etc.        │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│        Feature Components               │
│  QueueList, AlertCard, Charts, etc.     │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│          UI Components                  │
│  Button, Card, Dialog, etc. (shadcn)    │
└─────────────────────────────────────────┘
```

## Directory Structure

```
apps/app/src/
├── components/          # Feature and UI components
│   ├── ui/             # shadcn/ui components (40+)
│   ├── alerts/         # Alert components
│   ├── billing/        # Billing components
│   ├── profile/        # Profile components
│   ├── queues/         # Queue components
│   ├── workspace/      # Workspace components
│   └── Layout.tsx      # Main layout wrapper
├── contexts/            # React contexts (6 total)
│   ├── AuthContext.tsx
│   ├── UserContext.tsx
│   ├── WorkspaceContext.tsx
│   ├── ServerContext.tsx
│   ├── VHostContext.tsx
│   └── ThemeContext.tsx
├── hooks/               # Custom hooks
│   ├── queries/        # React Query hooks
│   └── ui/             # UI utility hooks
├── lib/                 # Utilities and clients
│   ├── trpc/           # tRPC client setup
│   ├── api/            # Type definitions
│   ├── queryClient.ts  # React Query config
│   ├── sentry.ts       # Error tracking
│   └── utils.ts        # Helper functions
├── pages/               # Route components (25 pages)
│   ├── Index.tsx       # Dashboard
│   ├── Queues.tsx      # Queue list
│   ├── QueueDetail.tsx # Queue details
│   ├── Alerts.tsx      # Alert dashboard
│   └── ...
├── schemas/             # Zod schemas
│   ├── auth.ts
│   ├── alerts.ts
│   └── server.ts
├── types/               # TypeScript types
└── styles/              # Global CSS
```

## State Management

**Hybrid Approach:**

1. **React Context API** for global app state:
   - Authentication (AuthContext)
   - User data (UserContext)
   - Workspace selection (WorkspaceContext)
   - Server selection (ServerContext)
   - VHost selection (VHostContext)
   - Theme (ThemeContext)

2. **TanStack Query** for server state:
   - All API data fetching
   - Caching and cache invalidation
   - Polling for real-time data
   - Optimistic updates

See [state-management-app.md](./state-management-app.md) for details.

## Routing Strategy

**React Router v6** with nested routes:

**Public Routes:**
- `/auth/sign-in` - Login
- `/auth/sign-up` - Registration
- `/forgot-password` - Password reset
- `/verify-email` - Email verification
- `/invite/:token` - Workspace invitation

**Protected Routes** (all behind `ProtectedRoute`):
- `/` - Dashboard
- `/queues`, `/queues/:queueName` - Queue management
- `/exchanges` - Exchange list
- `/connections` - Connection list
- `/nodes` - Cluster nodes
- `/vhosts`, `/vhosts/:vhostName` - Virtual hosts
- `/users`, `/users/:username` - RabbitMQ users
- `/alerts` - Alert management (Enterprise)
- `/workspace` - Workspace settings (Enterprise)
- `/profile` - User profile
- `/plans` - Subscription plans
- `/billing` - Billing history

## Component Design

**Patterns:**

1. **Composition over Inheritance**
   - Small, focused components
   - Composed into larger features

2. **Container/Presentational Split**
   - Pages handle data fetching
   - Components handle presentation

3. **Custom Hooks for Logic**
   - Data fetching in `useRabbitMQ`, `useAlerts`, etc.
   - UI logic in `useToast`, `useMobile`, etc.

4. **shadcn/ui for Base Components**
   - Customizable with Tailwind
   - Accessible by default
   - Composable with Radix UI primitives

## Data Fetching

**React Query Hooks:**

All queries in `src/hooks/queries/`:
- `useRabbitMQ.ts` - Server and queue data
- `useServer.ts` - Server management
- `useAlerts.ts` - Alert system
- `useWorkspaceApi.ts` - Workspace operations
- `usePlans.ts` - Subscription data

**Polling Strategy:**
- Live rates: 5-second interval
- Alerts: 30-second interval
- Server overview: 10-second interval
- Queue metrics: 15-second interval

## Styling System

**Tailwind CSS** with custom configuration:

**Custom Theme:**
- Colors: `primary`, `secondary`, `destructive`, `muted`, `accent`
- Gradients: `gradient-page`, `gradient-button`, `gradient-title`
- Dark mode support via `ThemeContext`

**Component Styling:**
- All styling via Tailwind classes
- Custom component classes in `src/index.css`
- Gradient buttons for primary CTAs
- Gradient switches for toggles

## Build Configuration

**Vite Configuration** (`vite.config.ts`):

**Optimizations:**
- Manual chunks for vendor code
- React dedupe to prevent duplicate instances
- Code splitting by feature area
- Tree-shaking enabled

**Build Modes:**
- `build` - Standard production build
- `build:community` - Community Edition (feature flags off)
- `build:enterprise` - Enterprise Edition (self-hosted)

## Feature Gating

**FeatureGate Component:**

```tsx
<FeatureGate feature="alerting">
  <Alerts />
</FeatureGate>
```

**Controlled by:**
- User's subscription plan
- License features (self-hosted)
- Deployment mode

## Performance

**Optimizations:**
- Route-based code splitting
- React Query caching (5-minute default)
- Optimistic UI updates
- Debounced search inputs
- Virtual scrolling for large lists (future)

**Bundle Size:**
- Vendor chunks separated for better caching
- Tree-shaking to remove unused code
- Dynamic imports for heavy features

## Testing

**Framework:** Vitest 4.0

**Test Files:**
- `*.test.ts` - Unit tests
- `*.test.tsx` - Component tests

**Commands:**
- `pnpm run test` - Watch mode
- `pnpm run test:run` - Single run
- `pnpm run test:ui` - UI interface
