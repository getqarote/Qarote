# Qarote Customer Portal

The customer portal for Qarote Enterprise Edition license management, built with React, TypeScript, and Tailwind CSS.

## Overview

This is the customer-facing portal at [portal.qarote.io](https://portal.qarote.io) where Enterprise customers can:

- **Purchase Licenses** - Buy Enterprise Edition licenses
- **Manage Licenses** - View, download, and manage license files
- **Download Software** - Access Enterprise Edition downloads
- **Account Settings** - Manage account and billing information

## Tech Stack

- **Framework**: [React](https://react.dev/) 18 with TypeScript
- **Build Tool**: [Vite](https://vite.dev/) 7
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with [shadcn/ui](https://ui.shadcn.com/)
- **API Client**: [tRPC](https://trpc.io/) with React Query
- **Routing**: [React Router](https://reactrouter.com/) v6
- **Forms**: [React Hook Form](https://react-hook-form.com/) with [Zod](https://zod.dev/)
- **Authentication**: Email/password and Google OAuth
- **Hosting**: [Cloudflare Pages](https://pages.cloudflare.com/)

## Project Structure

```
apps/portal/
├── public/
│   └── images/           # Logos and favicons
├── src/
│   ├── components/
│   │   ├── auth/         # Authentication components
│   │   ├── ui/           # shadcn/ui components
│   │   └── Layout.tsx    # Main layout with navigation
│   ├── contexts/
│   │   └── AuthContext.tsx
│   ├── hooks/
│   │   └── ui/           # UI utility hooks
│   ├── lib/
│   │   ├── trpc/         # tRPC client setup
│   │   ├── logger.ts
│   │   └── queryClient.ts
│   ├── pages/
│   │   ├── AccountSettings.tsx
│   │   ├── Downloads.tsx
│   │   ├── LicenseManagement.tsx
│   │   ├── LicensePurchase.tsx
│   │   ├── Login.tsx
│   │   └── SignUp.tsx
│   ├── schemas/          # Zod validation schemas
│   ├── styles/           # CSS styles
│   ├── App.tsx           # Main app with routing
│   └── main.tsx          # Entry point
├── DEPLOYMENT.md         # Cloudflare Pages deployment guide
├── cloudflare.json       # Cloudflare configuration
├── tailwind.config.ts
├── vite.config.ts
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
   pnpm run dev:api
   ```

2. **Start the portal** (from project root):

   ```bash
   pnpm run dev:portal
   ```

   The portal will be available at `http://localhost:5174`.

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_API_URL` | Backend API URL | Yes |

## Available Scripts

```bash
pnpm run dev              # Start development server
pnpm run build            # Build for production
pnpm run build:cloudflare # Build for Cloudflare Pages
pnpm run preview          # Preview production build
pnpm run lint             # Check linting
pnpm run lint:fix         # Fix linting issues
pnpm run type-check       # TypeScript type checking
```

## Pages & Routes

### Public Routes

| Path | Component | Description |
|------|-----------|-------------|
| `/auth/sign-in` | `Login` | Customer login |
| `/auth/sign-up` | `SignUp` | Customer registration |

### Protected Routes (Require Authentication)

| Path | Component | Description |
|------|-----------|-------------|
| `/` | Redirects to `/licenses` | - |
| `/licenses` | `LicenseManagement` | View and manage licenses |
| `/purchase` | `LicensePurchase` | Purchase new licenses |
| `/downloads` | `Downloads` | Download Enterprise Edition |
| `/settings` | `AccountSettings` | Account and billing settings |

## Deployment

This portal is deployed to **Cloudflare Pages**. See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

### Quick Deploy

1. Connect repository to Cloudflare Pages
2. Set build configuration:
   - **Build command**: `pnpm run build:cloudflare`
   - **Build output directory**: `dist`
   - **Root directory**: `apps/portal`
3. Set environment variables:
   - `NODE_VERSION=24`
   - `VITE_API_URL=https://api.qarote.io`
4. Deploy

### Custom Domain

The portal is configured for `portal.qarote.io`.

## Authentication

The portal supports two authentication methods:

1. **Email/Password** - Traditional login with email verification
2. **Google OAuth** - Sign in with Google (requires `VITE_GOOGLE_CLIENT_ID`)

Authentication state is managed via `AuthContext` and stored in the browser.

## License Management

Customers can:

1. **View Licenses** - See all purchased licenses with details
2. **Download License Files** - Get the JSON license file for self-hosted deployment
3. **View License Status** - Check expiration dates and feature availability
4. **Purchase Additional Licenses** - Buy more licenses or upgrade tiers

## Related Documentation

- [Enterprise Edition Guide](../../docs/ENTERPRISE_EDITION.md)
- [Cloudflare Deployment](./DEPLOYMENT.md)
- [API Documentation](../api/README.md)
