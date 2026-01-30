# Qarote App

The main frontend dashboard for Qarote, built with React, TypeScript, and Tailwind CSS.

## Overview

This is the primary user interface for monitoring and managing RabbitMQ servers. It provides:

- **Real-time Dashboard** - Overview of server health, queues, and metrics
- **Queue Management** - View, publish, and consume messages
- **Exchange & VHost Management** - Browse exchanges, bindings, and virtual hosts
- **User Management** - View RabbitMQ users and permissions
- **Alerts** - Configure and view alerts (Enterprise)
- **Workspace Management** - Team workspaces with member invitations (Enterprise)
- **Billing & Plans** - Subscription management

## Tech Stack

- **Framework**: [React](https://react.dev/) 18 with TypeScript
- **Build Tool**: [Vite](https://vite.dev/) 7
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with [shadcn/ui](https://ui.shadcn.com/)
- **State Management**: [TanStack Query](https://tanstack.com/query) (React Query)
- **API Client**: [tRPC](https://trpc.io/) with React Query integration
- **Routing**: [React Router](https://reactrouter.com/) v6
- **Forms**: [React Hook Form](https://react-hook-form.com/) with [Zod](https://zod.dev/)
- **Charts**: [Recharts](https://recharts.org/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Error Tracking**: [Sentry](https://sentry.io/) (optional)

## Project Structure

```
apps/app/
├── public/
│   └── images/           # Static images and favicons
├── src/
│   ├── components/
│   │   ├── ui/           # shadcn/ui components
│   │   ├── Layout.tsx    # Main layout with sidebar
│   │   ├── ProtectedRoute.tsx
│   │   └── ...           # Feature components
│   ├── contexts/
│   │   ├── AuthContext.tsx
│   │   ├── ServerContext.tsx
│   │   ├── WorkspaceContext.tsx
│   │   └── ...           # React contexts
│   ├── hooks/
│   │   ├── queries/      # React Query hooks
│   │   └── ui/           # UI utility hooks
│   ├── lib/
│   │   ├── trpc/         # tRPC client setup
│   │   ├── queryClient.ts
│   │   └── utils.ts
│   ├── pages/            # Route components
│   ├── schemas/          # Zod validation schemas
│   ├── styles/           # Global CSS
│   ├── types/            # TypeScript types
│   ├── App.tsx           # Main app with routing
│   └── main.tsx          # Entry point
├── index.html
├── tailwind.config.ts    # Tailwind configuration
├── vite.config.ts        # Vite configuration
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 24+
- pnpm 9+
- Running backend API (see `apps/api`)

### Development Setup

1. **Start the backend API** (from project root):

   ```bash
   docker compose up -d
   cd apps/api && pnpm run db:migrate:dev
   pnpm run dev:api
   ```

2. **Start the frontend** (from project root):

   ```bash
   pnpm run dev:app
   ```

   The app will be available at `http://localhost:8080`.

### Environment Variables

Create a `.env` file or set these environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `http://localhost:3000` |
| `VITE_DEPLOYMENT_MODE` | `community`, `enterprise`, or `cloud` | `cloud` |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID | - |
| `VITE_ENABLE_OAUTH` | Enable Google OAuth | `true` in cloud mode |
| `VITE_ENABLE_SENTRY` | Enable Sentry error tracking | `false` |
| `VITE_SENTRY_DSN` | Sentry DSN | - |

## Available Scripts

```bash
pnpm run dev          # Start development server
pnpm run build        # Build for production
pnpm run preview      # Preview production build
pnpm run lint         # Check linting
pnpm run lint:fix     # Fix linting issues
pnpm run type-check   # TypeScript type checking
pnpm run test         # Run tests
```

### Build Variants

```bash
pnpm run build:community   # Build for Community Edition
pnpm run build:enterprise  # Build for Enterprise Edition
```

## Pages & Routes

### Public Routes

| Path | Component | Description |
|------|-----------|-------------|
| `/auth/sign-in` | `SignIn` | Login page |
| `/auth/sign-up` | `SignUp` | Registration page |
| `/forgot-password` | `ForgotPassword` | Password reset request |
| `/reset-password` | `ResetPassword` | Password reset form |
| `/verify-email` | `VerifyEmail` | Email verification |
| `/invite/:token` | `AcceptInvitation` | Workspace invitation |
| `/terms-of-service` | `TermsOfService` | Legal terms |
| `/privacy-policy` | `PrivacyPolicy` | Privacy policy |

### Protected Routes (Require Authentication)

| Path | Component | Description |
|------|-----------|-------------|
| `/` | `Index` | Dashboard overview |
| `/queues` | `Queues` | Queue list |
| `/queues/:queueName` | `QueueDetail` | Queue details & messages |
| `/exchanges` | `Exchanges` | Exchange list |
| `/connections` | `Connections` | Active connections |
| `/nodes` | `Nodes` | Cluster nodes |
| `/vhosts` | `VHostsPage` | Virtual hosts |
| `/vhosts/:vhostName` | `VHostDetailsPage` | VHost details |
| `/users` | `UsersPage` | RabbitMQ users |
| `/users/:username` | `UserDetailsPage` | User details |
| `/alerts` | `Alerts` | Alert management (Enterprise) |
| `/workspace` | `Workspace` | Workspace settings |
| `/profile` | `Profile` | User profile |
| `/plans` | `Plans` | Subscription plans |
| `/billing` | `Billing` | Billing management |
| `/help` | `HelpSupport` | Help & support |

## Context Providers

The app uses several React contexts for state management:

| Context | Purpose |
|---------|---------|
| `AuthContext` | Authentication state and methods |
| `UserContext` | Current user data |
| `WorkspaceContext` | Active workspace and switching |
| `ServerContext` | Selected RabbitMQ server |
| `VHostContext` | Selected virtual host |
| `ThemeContext` | Dark/light theme |

## UI Components

This project uses [shadcn/ui](https://ui.shadcn.com/) components, customized with Tailwind CSS. The design system includes:

- Custom color palette with gradients
- Dark mode support
- Consistent spacing and typography
- Accessible components

### Adding New shadcn Components

```bash
npx shadcn@latest add [component-name]
```

### Tailwind Configuration

Always reference `tailwind.config.ts` before creating or updating components. Key customizations:

- Custom colors: `primary`, `secondary`, `destructive`, `muted`, `accent`
- Gradients: `gradient-page`, `gradient-button`, `gradient-title`
- Custom animations

## Feature Gates

Enterprise features are controlled by the `FeatureGate` component:

```tsx
<FeatureGate feature="alerting">
  <Alerts />
</FeatureGate>
```

Available features:
- `workspace_management`
- `alerting`
- `slack_integration`
- `webhook_integration`
- `data_export`
- `advanced_alert_rules`

## Testing

```bash
# Run tests
pnpm run test

# Run tests with UI
pnpm run test:ui

# Run tests once
pnpm run test:run
```

## Building for Production

```bash
# Standard build
pnpm run build

# Community Edition (disables premium features)
VITE_DEPLOYMENT_MODE=community pnpm run build

# Enterprise Edition
VITE_DEPLOYMENT_MODE=enterprise pnpm run build
```

The build output is in the `dist/` directory.

## Related Documentation

- [API Documentation](../api/README.md)
- [Contributing Guide](../../CONTRIBUTING.md)
- [Tailwind CSS Rules](../../.cursor/rules/tailwind-css.mdc)
