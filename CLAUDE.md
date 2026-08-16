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

## Architecture

- **API**: Hono.js serves tRPC routes. Auth via better-auth (email/password + SSO via OIDC/SAML). RabbitMQ connections via amqplib.
- **Frontend**: SPA with React Router. Data fetching via TanStack Query + tRPC client.
- **Licensing**: JWT license keys validated offline with baked-in public key. Two tiers: Developer ($348/yr), Enterprise ($1,188/yr).
- **Deployment**: Dokku (recommended), Docker Compose, or standalone binary. Procfile workers: `web`, `alert-worker`, `license-worker`, `release-notifier`.

## Key Directories

```text
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
docs/internal/adr/              # Architecture Decision Records
```

## Documentation

- `docs/README.md` — Documentation hub
- `docs/SELF_HOSTED_DEPLOYMENT.md` — Deployment guide (binary, Docker, Dokku)
- `docs/COMMUNITY_EDITION.md` — Free edition guide
- `docs/ENTERPRISE_EDITION.md` — Licensed features guide
- `docs/FEATURE_COMPARISON.md` — Edition comparison
- `docs/RELEASE_MANAGEMENT.md` — Versioning & release-it workflow
- `docs/internal/adr/` — Architecture Decision Records

## Engineering Rules & Conventions (non-negotiable)

Code conventions, scope discipline, review workflow, testing rules, and
design principles live in `@.claude/ai_rules.md`. They apply to every PR —
treat them as part of the definition of done.

@.claude/ai_rules.md

## gstack (recommended)

This project uses [gstack](https://github.com/garrytan/gstack) for AI-assisted workflows.
Install it for the best experience:

```bash
git clone --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack
cd ~/.claude/skills/gstack && ./setup --team
```

Skills like /qa, /ship, /review, /investigate, and /browse become available after install.
Use /browse for all web browsing. Use ~/.claude/skills/gstack/... for gstack file paths.

## graphify + rtk

Two complementary token-reduction tools — always use both together:

- **rtk** cuts tokens on bash *outputs* (git, grep, pnpm, find, sed, awk…). Wrap every bash command: `rtk grep`, `rtk git`, `rtk pnpm`. Exception: `cd` is a shell builtin — chain as `cd <path> && rtk <cmd>`.
- **graphify** cuts tokens on codebase *understanding*. Before browsing source files or grepping, query the graph first — 260x fewer tokens per answer than reading raw code.

Together they minimize context burn per session, keeping answers precise longer and reducing compaction.

### graphify rules

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying docs (not code), run `rtk graphify --update .` to keep the graph current.
