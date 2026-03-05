# Development Guide

**Project:** Qarote  
**Generated:** 2026-01-30

## Prerequisites

### Required Software
- **Node.js:** 24.x or higher
- **pnpm:** 9.0.0 or higher
- **Docker:** Latest version (for local services)
- **Git:** Latest version

### Optional Tools
- **PostgreSQL Client:** psql, pgAdmin, or Prisma Studio
- **RabbitMQ Client:** rabbitmqadmin (for testing)
- **Stripe CLI:** For webhook testing

## Initial Setup

### 1. Clone Repository

```bash
git clone https://github.com/LaGriffe/rabbit-dash-board.git qarote
cd qarote
```

### 2. Install Dependencies

```bash
pnpm install
```

This installs dependencies for all apps in the monorepo.

### 3. Start Local Services

```bash
docker compose up -d
```

**Services Started:**
- PostgreSQL (port 5432)
- RabbitMQ 3-node cluster (ports 5672-5674, 15672-15674)
- RabbitMQ single instances (3.12, 3.13, 4.0, 4.1, 4.2)
- HAProxy load balancer (ports 5675, 15675)

**Verify services:**
```bash
docker compose ps
```

### 4. Setup Database

```bash
cd apps/api
cp .env.example .env
# Edit .env and set required variables
pnpm run db:migrate:dev
```

**Required Environment Variables:**
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - 32+ character secret for JWT signing
- `ENCRYPTION_KEY` - 32+ character key for encrypting passwords

### 5. Start Development Servers

**Terminal 1 - API:**
```bash
pnpm run dev:api
```
API runs on `http://localhost:3000`

**Terminal 2 - Dashboard:**
```bash
pnpm run dev:app
```
Dashboard runs on `http://localhost:8080`

**Terminal 3 - Landing Page (optional):**
```bash
pnpm run dev:web
```
Landing runs on `http://localhost:5173`

**Terminal 4 - Portal (optional):**
```bash
pnpm run dev:portal
```
Portal runs on `http://localhost:5174`

---

## Development Workflow

### Making Changes

1. **Create feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make changes** in appropriate app directory

3. **Test changes:**
   ```bash
   # Run tests
   pnpm run test
   
   # Check types
   pnpm run type-check
   
   # Lint code
   pnpm run lint
   ```

4. **Commit with conventional commits:**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

   **Commit Types:**
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation changes
   - `style:` - Code style changes (formatting)
   - `refactor:` - Code refactoring
   - `test:` - Test changes
   - `chore:` - Build/config changes

5. **Push and create PR:**
   ```bash
   git push origin feature/your-feature-name
   ```

### Code Quality Tools

**Linting:**
```bash
pnpm run lint        # Check all apps
pnpm run lint:fix    # Auto-fix issues
```

**Formatting:**
```bash
pnpm run format      # Check formatting
pnpm run format:fix  # Auto-format
```

**Type Checking:**
```bash
pnpm run type-check  # Check TypeScript types
```

**Unused Code Detection:**
```bash
pnpm run knip        # Find unused exports
pnpm run knip:fix    # Auto-remove unused code
```

---

## Working with the API

### Database Operations

**Run migrations:**
```bash
cd apps/api
pnpm run db:migrate:dev  # Development
pnpm run db:migrate      # Production
```

**Generate Prisma Client:**
```bash
pnpm run db:generate
```

**Open Prisma Studio:**
```bash
pnpm run db:studio
```
Opens GUI at `http://localhost:5555`

**Create new migration:**
```bash
# 1. Edit prisma/schema.prisma
# 2. Run migration
pnpm run db:migrate:dev --name your_migration_name
```

### Seeding Test Data

**Seed RabbitMQ test data:**
```bash
cd apps/api
pnpm run seed:test     # Seed all test data
pnpm run seed:users    # Seed users only
pnpm run seed:all      # Seed all servers
```

**Publish test messages:**
```bash
pnpm run seed:publish
```

**Consume test messages:**
```bash
pnpm run seed:consume
```

### Email Development

**Start email preview server:**
```bash
cd apps/api
pnpm run email:dev
```
Opens at `http://localhost:3001`

**Test email rendering:**
```bash
pnpm run email:test
```

### Stripe Integration

**Setup Stripe products:**
```bash
cd apps/api
pnpm run stripe:set-up  # Interactive setup
pnpm run stripe:create  # Create products
pnpm run stripe:list    # List products
pnpm run stripe:verify  # Verify config
```

**Test webhooks locally:**
```bash
# Terminal 1: Get webhook secret
stripe listen --print-secret

# Terminal 2: Forward webhooks
stripe listen --forward-to localhost:3000/webhooks/stripe
```

---

## Working with Frontend Apps

### Adding shadcn/ui Components

```bash
cd apps/app  # or apps/web, apps/portal
npx shadcn@latest add [component-name]
```

**Example:**
```bash
npx shadcn@latest add button
npx shadcn@latest add dialog
```

### Tailwind Configuration

**Always reference** `tailwind.config.ts` in each app before creating components.

**Custom classes:**
- Defined in `src/index.css` using `@layer components`
- Use existing gradients: `gradient-button`, `gradient-title`

### Creating New Pages

1. Create page component in `src/pages/`
2. Add route in `src/App.tsx`
3. Add to `ProtectedRoute` if authentication required
4. Create queries/mutations in `src/hooks/queries/` if data fetching needed

### Creating tRPC Endpoints

1. **Define schema** in `apps/api/src/schemas/`
2. **Create router** in `apps/api/src/trpc/routers/`
3. **Add to parent router** in appropriate `index.ts`
4. **Types automatically available** in frontend via `AppRouter` type

**Example:**
```typescript
// apps/api/src/trpc/routers/feedback.ts
export const feedbackRouter = router({
  submit: protectedProcedure
    .input(submitFeedbackSchema)
    .mutation(async ({ input, ctx }) => {
      // Implementation
    }),
});

// Frontend usage:
const { mutate } = trpc.feedback.submit.useMutation();
```

---

## Testing

### Running Tests

**All apps:**
```bash
pnpm run test         # Watch mode
pnpm run test:run     # Single run
```

**Specific app:**
```bash
cd apps/api
pnpm run test         # API tests only
```

**With UI:**
```bash
pnpm run test:ui      # Opens Vitest UI
```

### Writing Tests

**Location:** Alongside source files (`*.test.ts`, `*.test.tsx`)

**Framework:** Vitest 4.0

**Example:**
```typescript
// apps/api/src/services/alert.service.test.ts
import { describe, it, expect } from 'vitest';
import { AlertService } from './alert.service';

describe('AlertService', () => {
  it('should create alert', () => {
    // Test implementation
  });
});
```

---

## Environment Variables

### apps/api

**Required:**
- `DATABASE_URL` - PostgreSQL connection
- `JWT_SECRET` - JWT signing secret (32+ chars)
- `ENCRYPTION_KEY` - Encryption key (32+ chars)
- `DEPLOYMENT_MODE` - community/enterprise/cloud

**Optional:**
- `STRIPE_SECRET_KEY` - Stripe API key
- `RESEND_API_KEY` - Email delivery
- `SENTRY_DSN` - Error tracking
- `GOOGLE_CLIENT_ID/SECRET` - OAuth
- `SLACK_WEBHOOK_URL` - Slack notifications

### apps/app

**Required:**
- `VITE_API_URL` - Backend API URL (default: http://localhost:3000)

**Optional:**
- `VITE_DEPLOYMENT_MODE` - community/enterprise/cloud
- `VITE_GOOGLE_CLIENT_ID` - Google OAuth
- `VITE_ENABLE_SENTRY` - Enable Sentry
- `VITE_SENTRY_DSN` - Sentry DSN

### apps/web

**Optional:**
- No required environment variables (static site)

### apps/portal

**Required:**
- `VITE_API_URL` - Backend API URL

---

## Build Process

### Development Build

```bash
pnpm run dev  # All apps
# OR
pnpm run dev:api
pnpm run dev:app
pnpm run dev:web
pnpm run dev:portal
```

### Production Build

```bash
pnpm run build           # All apps
# OR
pnpm run build:api       # API only
pnpm run build:app       # Dashboard only
pnpm run build:web       # Landing only
pnpm run build:portal    # Portal only
```

### Build Variants

**Community Edition:**
```bash
cd apps/api
DEPLOYMENT_MODE=community pnpm run build

cd apps/app
pnpm run build:community
```

**Enterprise Edition:**
```bash
cd apps/api
pnpm run build:enterprise  # Includes code obfuscation

cd apps/app
pnpm run build:enterprise
```

---

## Debugging

### API Debugging

**Enable debug logging:**
```bash
LOG_LEVEL=debug pnpm run dev:api
```

**Inspect database:**
```bash
pnpm run db:studio  # Opens Prisma Studio
```

**Test RabbitMQ connectivity:**
```bash
# Check RabbitMQ Management API
curl http://localhost:15672/api/overview \
  -u admin:admin123
```

### Frontend Debugging

**React DevTools:** Install browser extension

**TanStack Query DevTools:** Automatically included in dev mode

**Console Logging:**
- API calls logged via `loglevel` library
- Adjust level in browser console: `log.setLevel('debug')`

### tRPC Debugging

**Enable tRPC logging:**
```typescript
// In apps/app/src/lib/trpc/client.ts
const trpc = createTRPCClient({
  links: [
    loggerLink(),  // Add this
    httpBatchLink({ ... })
  ]
});
```

---

## Common Tasks

### Add a New Feature

1. **Plan the feature** (optional: use BMad Method workflows)
2. **Create database models** (if needed):
   - Edit `apps/api/prisma/schema.prisma`
   - Run `pnpm run db:migrate:dev --name feature_name`
3. **Create Zod schemas** in `apps/api/src/schemas/`
4. **Create service layer** in `apps/api/src/services/`
5. **Create tRPC router** in `apps/api/src/trpc/routers/`
6. **Create frontend components** in `apps/app/src/components/`
7. **Create pages** in `apps/app/src/pages/`
8. **Add routes** in `apps/app/src/App.tsx`
9. **Test end-to-end**

### Fix a Bug

1. **Identify the layer:**
   - Frontend UI issue → `apps/app/src/components/`
   - Frontend logic issue → `apps/app/src/hooks/`
   - API issue → `apps/api/src/trpc/routers/` or `src/services/`
   - Database issue → `apps/api/prisma/schema.prisma`

2. **Write a test** that reproduces the bug
3. **Fix the bug**
4. **Verify the test passes**
5. **Commit with `fix:` prefix**

### Update Dependencies

**Check for updates:**
```bash
pnpm outdated
```

**Update specific package:**
```bash
pnpm update <package-name> --latest
```

**Update all packages:**
```bash
pnpm update --latest
```

**Verify builds:**
```bash
pnpm run build
pnpm run test
```

---

## Troubleshooting

### Port Already in Use

```bash
# Find process using port
lsof -i :3000  # Replace with your port

# Kill process
kill -9 <PID>
```

### Docker Services Not Starting

```bash
# Check logs
docker compose logs

# Restart services
docker compose down
docker compose up -d
```

### Database Connection Issues

```bash
# Check PostgreSQL is running
docker compose ps postgres

# Check connection
docker compose exec postgres psql -U postgres -d qarote -c "SELECT 1"
```

### Type Errors After API Changes

```bash
# Regenerate Prisma types
cd apps/api
pnpm run db:generate

# Frontend apps will automatically see new types
```

### Build Failures

```bash
# Clean and rebuild
rm -rf apps/*/dist
rm -rf apps/*/node_modules/.vite
pnpm run build
```

---

## Code Conventions

### Import Ordering

All files must follow strict import ordering (enforced by ESLint):

1. CSS/style files
2. Node.js built-in modules (with `node:` prefix)
3. React modules
4. External npm packages
5. Internal `@/lib/*` imports
6. Internal `@/components/*` imports
7. Internal `@/contexts/*` imports
8. Internal `@/hooks/*` imports
9. Internal `@/schemas/*` imports
10. Internal `@/types/*` imports
11. Config imports
12. Relative imports (`./`, `../`)

**Auto-fix:**
```bash
pnpm run lint:fix
```

### React Import Rules

**ALWAYS use named imports for React hooks:**

```typescript
// ✅ CORRECT
import { useState, useEffect } from "react";

// ❌ WRONG - Causes production errors
import * as React from "react";
React.useState(); // Can fail in production
```

### Styling Rules

- **Use Tailwind classes only** - No inline styles
- **No CSS-in-JS** - No styled-components or emotion
- **Custom utilities** - Define in `tailwind.config.ts`
- **Component classes** - Use `@layer components` in `index.css`
- **Primary buttons** - Must use `bg-gradient-button` class
- **Switches** - Must use `data-[state=checked]:bg-gradient-button`

### Database Rules

- **Table names:** PascalCase (e.g., `User`, `AlertRule`)
- **Never use `@@map`** - Let Prisma use model name as table name
- **Relation fields:** camelCase (e.g., `user`, `workspace`)

### Logger Error Pattern

**ALWAYS use object-first pattern:**

```typescript
// ✅ CORRECT
logger.error({ error, userId }, "Failed to fetch user");

// ❌ WRONG
logger.error("Failed to fetch user:", error);
```

---

## Useful Commands

### Monorepo Commands

```bash
# Run command in all apps
turbo run <command>

# Run command in specific app
turbo run <command> --filter=qarote-api
```

### API Commands

```bash
cd apps/api

# Development
pnpm run dev               # API server
pnpm run dev:alert         # Alert monitor worker

# Database
pnpm run db:migrate:dev    # Run migrations
pnpm run db:studio         # Open Prisma Studio
pnpm run db:generate       # Regenerate Prisma client

# Testing
pnpm run test              # Run tests
pnpm run test:ui           # Vitest UI

# Seeding
pnpm run seed:test         # Seed test data
pnpm run seed:all          # Seed all servers

# Email
pnpm run email:dev         # Email preview server
pnpm run email:test        # Test rendering

# Stripe
pnpm run stripe:set-up     # Interactive setup
pnpm run stripe:verify     # Verify configuration

# Build
pnpm run build             # Standard build
pnpm run build:community   # Community Edition
pnpm run build:enterprise  # Enterprise (obfuscated)
```

### Frontend Commands

```bash
cd apps/app  # or apps/web, apps/portal

# Development
pnpm run dev               # Dev server with HMR

# Build
pnpm run build             # Production build
pnpm run build:community   # Community Edition (app only)
pnpm run build:enterprise  # Enterprise Edition (app only)
pnpm run preview           # Preview build locally

# Testing
pnpm run test              # Run tests
pnpm run test:ui           # Vitest UI

# Code Quality
pnpm run lint              # Check linting
pnpm run lint:fix          # Fix issues
pnpm run type-check        # Check TypeScript
```

### Docker Commands

```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# View logs
docker compose logs -f [service-name]

# Restart service
docker compose restart [service-name]

# Rebuild service
docker compose up -d --build [service-name]

# Clean everything
docker compose down -v  # Removes volumes
```

---

## IDE Setup

### VS Code Extensions (Recommended)

- **ESLint** - Linting
- **Prettier** - Formatting
- **Tailwind CSS IntelliSense** - Tailwind autocomplete
- **Prisma** - Prisma schema support
- **TypeScript** - Enhanced TypeScript support

### VS Code Settings

Located in `.vscode/settings.json`:
- Format on save enabled
- ESLint auto-fix enabled
- Tailwind CSS class sorting

---

## Getting Help

### Documentation

- **Project Docs:** `docs/README.md`
- **API Docs:** `apps/api/README.md`
- **App Docs:** `apps/app/README.md`
- **Web Docs:** `apps/web/README.md`
- **Portal Docs:** `apps/portal/README.md`

### Cursor Rules

Located in `.cursor/rules/`:
- `import-ordering.mdc` - Import organization
- `react-imports.mdc` - React import rules
- `tailwind-css.mdc` - Styling rules
- `react-apps.mdc` - React app conventions

### BMad Method

For structured development workflows:
```bash
/bmad-help  # Get workflow guidance
```

---

## Performance Tips

### Development
- Use `pnpm` instead of `npm` (faster, more efficient)
- Run only the apps you need
- Use `turbo run` for parallel builds

### Production
- Enable caching in Turborepo
- Use production environment variables
- Monitor bundle sizes with build output

### Database
- Use indexes for frequently queried fields
- Use `select` to limit returned fields
- Use `include` carefully (avoid N+1 queries)

---

## Next Steps

- Review [project-overview.md](./project-overview.md) for high-level understanding
- Check [architecture-*.md](./architecture-api.md) files for detailed architecture
- Explore [api-contracts-api.md](./api-contracts-api.md) for API documentation
- See [integration-architecture.md](./integration-architecture.md) for how parts communicate
