# Qarote

RabbitMQ monitoring dashboard with a freemium model. Core monitoring is free (MIT); premium features (workspaces, alerting, integrations) are unlocked via JWT license keys validated offline.

## Tech Stack

- **Monorepo**: pnpm 9 workspaces + Turborepo
- **Backend** (`apps/api`): Hono.js, tRPC, Prisma (PostgreSQL), better-auth, Stripe
- **Frontend** (`apps/app`): Vite, React 19, Tailwind CSS 4, Radix UI / shadcn, React Hook Form + Zod, TanStack Query, i18next
- **Website** (`apps/web`): Vite + React (landing page)
- **Portal** (`apps/portal`): Vite + React (customer portal)
- **E2E** (`apps/e2e`): Playwright
- **Shared**: `packages/i18n`
- **Node**: v24, **pnpm**: v9

## Common Commands

```bash
pnpm dev              # Start all apps in dev mode
pnpm dev:api          # API only
pnpm dev:app          # Frontend only
pnpm build            # Build API
pnpm build:app        # Build frontend
pnpm test             # Run all tests
pnpm lint             # ESLint across all workspaces
pnpm format           # Prettier check
pnpm format:fix       # Prettier fix
pnpm type-check       # TypeScript check
pnpm db:migrate:dev   # Create Prisma migration
pnpm db:migrate       # Run migrations
pnpm db:generate      # Generate Prisma client
pnpm db:studio        # Open Prisma Studio
```

## Code Conventions

- **Commits**: Conventional Commits enforced by commitlint + Husky. Types: `feat`, `fix`, `refactor`, `chore`, `docs`, `style`, `perf`, `test`, `build`, `ci`, `revert`. Lowercase subject, no period, max 100 chars.
- **Formatting**: Prettier — double quotes, semicolons, 2-space indent, trailing commas (ES5), LF line endings.
- **Linting**: ESLint flat config per app. No `console.log` in production. `simple-import-sort` with strict group ordering. No `any`.
- **Styling**: Tailwind CSS 4 utility classes. Radix UI primitives wrapped as shadcn components.
- **Database**: Prisma schema at `apps/api/prisma/schema.prisma`. Generated client at `apps/api/src/generated/prisma`.

## Architecture

- **API**: Hono.js serves tRPC routes. Auth via better-auth (email/password + SSO via OIDC/SAML). RabbitMQ connections via amqplib.
- **Frontend**: SPA with React Router. Data fetching via TanStack Query + tRPC client.
- **Licensing**: JWT license keys validated offline with baked-in public key. Two tiers: Developer ($348/yr), Enterprise ($1,188/yr).
- **Deployment**: Dokku (recommended), Docker Compose, or standalone binary. Procfile workers: `web`, `worker` (alerts), `license-worker`, `release-notifier`.

## Key Directories

```
apps/api/src/          # Backend source
apps/api/prisma/       # Prisma schema & migrations
apps/app/src/          # Frontend source
apps/app/src/components/ui/  # shadcn UI components
apps/app/src/pages/    # Page components
apps/web/              # Landing site
apps/portal/           # Customer portal
packages/i18n/         # Shared i18n
scripts/               # Utility scripts (seed, migrate, stripe, etc.)
docs/                  # Project documentation
docs/adr/              # Architecture Decision Records
```

## Documentation

- `docs/README.md` — Documentation hub
- `docs/SELF_HOSTED_DEPLOYMENT.md` — Deployment guide (binary, Docker, Dokku)
- `docs/COMMUNITY_EDITION.md` — Free edition guide
- `docs/ENTERPRISE_EDITION.md` — Licensed features guide
- `docs/FEATURE_COMPARISON.md` — Edition comparison
- `docs/RELEASE_MANAGEMENT.md` — Versioning & release-it workflow
- `docs/adr/` — Architecture Decision Records
