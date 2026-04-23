# Deployment Guide

**Project:** Qarote
**Generated:** 2026-03-05

## Overview

Qarote supports two **deployment modes** (`cloud` and `selfhosted`) and three **deployment methods** for the self-hosted mode (`dokku`, `docker_compose`, `binary`). The cloud mode is used for the managed SaaS at qarote.io. The self-hosted mode covers all customer-operated installations.

> **Terminology note:** `community` and `enterprise` are deprecated aliases for `selfhosted`. They still work but emit a console warning and will be removed in a future version. There is no separate "manual" deployment method -- `binary` is the standalone/manual method.

## Deployment Architecture

### Cloud (SaaS) Environment

```
+-----------------+
|  qarote.io      |  Landing Page (Cloudflare Pages)
|  apps/web       |
+-----------------+

+-----------------+
|  app.qarote.io  |  Dashboard (Cloudflare Pages)
|  apps/app       |
+-----------------+

+-----------------+
|  portal.qar...  |  Customer Portal (Cloudflare Pages)
|  apps/portal    |
+-----------------+

+-----------------+
|  api.qarote.io  |  Backend API (Heroku/Dokku)
|  apps/api       |
+-----------------+
        |
  +------------+
  | PostgreSQL |  Database (Hosted)
  +------------+
```

### Self-Hosted Environment (Docker Compose)

```
docker-compose.selfhosted.yml
+-------------------+
|  qarote_frontend  |  Nginx serving SPA (port 8080)
|  apps/app         |  -> apps/app/Dockerfile (multi-stage: build + nginx)
+-------------------+
        |
+-------------------+
|  qarote_backend   |  Node.js API (port 3000)
|  apps/api         |  -> apps/api/Dockerfile
+-------------------+
        |
+-------------------+
|  qarote_postgres  |  PostgreSQL 15 Alpine (port 5432)
+-------------------+
```

### Self-Hosted Environment (Binary)

```
Single process:
+----------------------------+
|  ./qarote                  |  Bun-compiled binary
|  Serves API + embedded    |  API on port 3000
|  frontend from public/    |  Frontend served from /public
|  Auto-runs migrations     |  migrations/ dir shipped in tarball
+----------------------------+
        |
+-------------------+
|  PostgreSQL       |  User-provided database
+-------------------+
```

---

## 1. Deployment Modes

### Cloud Mode (`DEPLOYMENT_MODE=cloud`)

The managed SaaS deployment. Requires all third-party services:

- **Stripe** for billing (secret key, webhook secret, price IDs)
- **Resend** for transactional email
- **Sentry** for error tracking
- **Google OAuth** for social login
- **License private key** for generating customer licenses

### Self-Hosted Mode (`DEPLOYMENT_MODE=selfhosted`)

All customer-operated installations. Premium features are gated by license activation through the UI, not by environment variables.

- Email is optional (disabled by default, SMTP only)
- Stripe, Sentry, Google OAuth are not available
- SSO (OIDC/SAML) is available and configurable
- Registration can be disabled via `ENABLE_REGISTRATION=false`
- Admin bootstrap via `ADMIN_EMAIL` / `ADMIN_PASSWORD` env vars (first boot)

---

## 2. Deployment Methods (Self-Hosted)

The deployment method is auto-detected at startup by `DeploymentDetector` (`apps/api/src/services/deployment/deployment-detector.ts`) and persisted in the `SystemState` table via `DeploymentService`. The detected method is used to show context-appropriate update instructions in the UI.

### Method A: Docker Compose (`docker_compose`)

**Detection:** `COMPOSE_PROJECT_NAME` env var, or `/.dockerenv` + compose files present.

**Files:**
- `docker-compose.selfhosted.yml` -- production compose file
- `apps/api/Dockerfile` -- Node 24 Alpine, builds API with Prisma
- `apps/app/Dockerfile` -- Multi-stage: Node 24 build + Nginx serve
- `docker/nginx/nginx.conf` -- Nginx config for SPA routing
- `setup.sh` -- Generates `.env` with secure random secrets
- `scripts/update.sh` -- Pull, rebuild, restart workflow
- `.env.selfhosted.example` -- Template with all configurable variables

**Quick Start:**

```bash
# 1. Generate .env with secure secrets
./setup.sh

# 2. Start services
docker compose -f docker-compose.selfhosted.yml up -d

# 3. Open http://localhost:8080

# 4. Activate license: Settings -> License -> paste license key
```

**Services in compose file:**
- `postgres` -- PostgreSQL 15 Alpine with health check
- `backend` -- API on port 3000 (configurable via `BACKEND_PORT`)
- `frontend` -- Nginx on port 80, mapped to `FRONTEND_PORT` (default 8080)

**Update procedure:**

```bash
./scripts/update.sh
# Steps: git pull -> docker compose build -> docker compose up -d
# Migrations run automatically on container start
```

---

### Method B: Dokku (`dokku`)

**Detection:** `DOKKU_APP_NAME`, `DOKKU_ROOT`, `DOKKU_HOST`, `BUILDPACK_URL`, or `SOURCE_VERSION` env vars.

**Files:**
- `Procfile` -- Defines process types
- `app.json` -- Dokku/Heroku app config with health checks and predeploy script

**Processes (from Procfile):**
- `web` -- Main API server (`pnpm --filter=qarote-api run start`)
- `worker` -- Alert monitoring (`pnpm --filter=qarote-api run start:alert`)
- `license_worker` -- License sync (`pnpm --filter=qarote-api run start:license`)
- `release_notifier` -- Release notifications (`pnpm --filter=qarote-api run start:release-notifier`)

**Predeploy script (from app.json):**

```bash
pnpm --filter=qarote-api run db:generate && pnpm --filter=qarote-api run db:migrate
```

**Health checks (from app.json):**
- Liveness: `GET /livez`
- Readiness: `GET /readyz`
- Startup: `GET /health`

**Deployment:**

```bash
# 1. Create app
dokku apps:create qarote-api

# 2. Create and link database
dokku postgres:create qarote-db
dokku postgres:link qarote-db qarote-api

# 3. Set environment variables
dokku config:set qarote-api NODE_ENV=production
dokku config:set qarote-api DEPLOYMENT_MODE=selfhosted
dokku config:set qarote-api JWT_SECRET="..."
dokku config:set qarote-api ENCRYPTION_KEY="..."

# 4. Deploy
git remote add dokku dokku@your-server:qarote-api
git push dokku main

# 5. Migrations run automatically via predeploy hook
```

**Update procedure:**

```bash
git pull origin main
git push dokku main
# Dokku automatically builds and deploys the update
```

---

### Method C: Binary (`binary`)

**Detection:** `qarote` path segment in `process.execPath` or `cwd`, or fallback default.

**Build tooling:**
- `scripts/build-binary.sh` -- Compiles API + embedded frontend into standalone Bun binary
- `.github/workflows/release-binary.yml` -- CI workflow, builds for 4 platforms on tag push

**Supported platforms (built in CI):**
- `linux-x64`
- `linux-arm64`
- `darwin-x64`
- `darwin-arm64`

**Build process:**
1. Build frontend with `VITE_API_URL=""` and `VITE_DEPLOYMENT_MODE=selfhosted`
2. Build backend (ESM + Prisma)
3. Copy frontend dist into `apps/api/dist/public/`
4. Compile to standalone binary with `bun build --compile`
5. Package binary + `public/` + `migrations/` into `.tar.gz`

**Binary features:**
- Serves API and embedded frontend from same port (default 3000)
- Runtime config via `/config.js` endpoint (no build-time `VITE_API_URL` needed)
- Auto-runs pending database migrations on startup from `migrations/` directory
- Interactive setup: `./qarote setup`
- CLI flags override `.env`: `--database-url`, `--port`

**Installation:**

```bash
# Download and extract
tar xzf qarote-<platform>.tar.gz
cd qarote

# Interactive setup (generates .env)
./qarote setup

# Start (migrations run automatically)
./qarote
```

**Update procedure:**

```bash
# Stop the current instance
kill $(pgrep -f './qarote') 2>/dev/null || true

# Download and extract latest (auto-detects OS and architecture)
PLATFORM="$(uname -s | tr '[:upper:]' '[:lower:]')-$(uname -m | sed 's/x86_64/x64/' | sed 's/aarch64/arm64/')"
curl -L "https://github.com/getqarote/Qarote/releases/latest/download/qarote-${PLATFORM}.tar.gz" | tar xz --strip-components=1

# Restart (migrations run automatically)
./qarote
```

---

## 3. Frontend Deployments (Cloud Mode)

### Cloudflare Pages (All Frontend Apps)

Each frontend app is deployed to Cloudflare Pages with its own custom domain.

### App Dashboard (`apps/app`)

- **Build command:** `cd apps/app && pnpm install --no-optional && pnpm run build`
- **Build output:** `apps/app/dist`
- **Node version:** 24
- **Env vars:** `VITE_API_URL`, `VITE_DEPLOYMENT_MODE=cloud`, `VITE_GOOGLE_CLIENT_ID`
- **Custom domain:** `app.qarote.io`

### Landing Page (`apps/web`)

- **Build command:** `cd apps/web && pnpm install --no-optional && pnpm run build:cloudflare`
- **Build output:** `apps/web/dist`
- **Node version:** 24
- **Env vars:** `VITE_APP_BASE_URL`, `VITE_PORTAL_URL`
- **Custom domains:** `qarote.io`, `www.qarote.io`

### Customer Portal (`apps/portal`)

- **Build command:** `cd apps/portal && pnpm install --no-optional && pnpm run build:cloudflare`
- **Build output:** `apps/portal/dist`
- **Node version:** 24
- **Env vars:** `VITE_API_URL`, `VITE_GOOGLE_CLIENT_ID`
- **Custom domain:** `portal.qarote.io`

---

## 4. CI/CD Pipeline

### GitHub Actions Workflows (`.github/workflows/`)

**Quality:**
- `pr-quality-checks.yml` -- Runs on PRs: linting, type checking, testing
- `validate-commits.yml` -- Conventional commit validation
- `codeql.yml` -- Code security analysis

**API Deployment:**
- `deploy-api-staging.yml` -- Auto-deploy API to staging on push to `main`
- `deploy-api-production.yml` -- Manual workflow dispatch for production API

**Frontend Deployment:**
- `deploy-frontend-staging.yml` / `deploy-frontend-production.yml`
- `deploy-landing-staging.yml` / `deploy-landing-production.yml`
- `deploy-portal-staging.yml` / `deploy-portal-production.yml`

**Worker Deployment:**
- `deploy-worker-staging.yml` / `deploy-worker-production.yml`

**Binary Release:**
- `release-binary.yml` -- Triggered on `v*` tags, builds 4 platform binaries, creates GitHub Release with checksums

**E2E Testing:**
- `e2e-tests.yml` -- End-to-end test suite

---

## 5. Local Development Environment

### `docker-compose.yml` (Development)

Provides local infrastructure for development:

- **PostgreSQL** with custom Dockerfile (`docker/postgresql/Dockerfile`)
- **RabbitMQ cluster** (3 nodes + HAProxy load balancer) for testing monitoring features
- **Standalone RabbitMQ instances** for version-specific testing (3.12, 3.13, 4.0, 4.1, 4.2)

### `docker-compose.keycloak.yml`

Provides a Keycloak instance for SSO/OIDC development and testing.

### `apps/e2e/docker/docker-compose.e2e.yml`

E2E test environment composition.

---

## 6. Health Check Endpoints

```bash
# Liveness check (is the process alive?)
GET /livez

# Readiness check (is the app ready to serve traffic?)
GET /readyz

# General health
GET /health
```

Configured in `app.json` for Dokku/Heroku with attempt counts and timeouts.

---

## 7. Embedded Frontend (Self-Hosted)

In self-hosted mode, if a `public/` directory exists alongside the binary or dist, the API serves the frontend directly. This enables single-process deployments.

**Resolution order for `public/`:**
1. Next to the script: `dist/public/`
2. Next to the binary: `<binary-dir>/public/`
3. Current working directory: `./public/`

**Runtime config (`/config.js`):**
- Served dynamically by the API in self-hosted mode
- Provides `apiUrl` (defaults to `""` for same-origin) and `deploymentMode`
- Static fallback in `apps/app/public/config.js` for development

**Frontend config resolution:**
- `VITE_API_URL` (build-time) takes precedence via `import.meta.env`
- `window.__QAROTE_CONFIG__.apiUrl` (runtime) is the fallback
- Empty string `""` means same-origin (binary mode default)

---

## 8. Security Checklist

**Before Production:**

- [ ] Generate secrets with `./setup.sh` (or `openssl rand -hex 64`)
- [ ] Use strong `JWT_SECRET` (32+ characters, random)
- [ ] Use strong `ENCRYPTION_KEY` (32+ characters, random)
- [ ] Enable HTTPS (reverse proxy or load balancer)
- [ ] Set restrictive `CORS_ORIGIN` (not `*`)
- [ ] Set up database backups
- [ ] Review and set appropriate `LOG_LEVEL`
- [ ] Configure Sentry or error tracking (optional)
- [ ] Set up SSL certificates for custom domains
- [ ] Enable WAF if available (Cloudflare)

---

## 9. Backup Strategy

### Database Backups

```bash
# Manual backup
pg_dump $DATABASE_URL > backup.sql

# Restore
psql $DATABASE_URL < backup.sql
```

**Heroku Postgres:**
```bash
heroku pg:backups:capture
heroku pg:backups:download
```

**Recommendation:**
- Daily automated backups
- Retain backups for 30 days
- Test restore procedure monthly

---

## 10. Scaling

### Horizontal Scaling

**API:**
- Deploy multiple instances behind load balancer
- Stateless JWT auth (no sticky sessions needed)
- Database connection pooling handled by Prisma

**Alert Worker:**
- Separate process (see Procfile)
- Only one instance needed (uses database for coordination)

**Frontend:**
- CDN scales automatically (Cloudflare Pages in cloud mode)
- Static files in self-hosted (Nginx or binary-embedded)

### Vertical Scaling

**API:** Increase dyno/container size for more CPU/RAM
**Database:** Upgrade plan or add read replicas for read-heavy workloads

---

## 11. Rollback Procedure

### API Rollback

**Heroku:** `heroku releases:rollback v<version>`
**Dokku:** Redeploy previous commit
**Docker Compose:** `git checkout <previous-tag> && ./scripts/update.sh`
**Binary:** Download and extract previous release tarball

### Frontend Rollback (Cloudflare Pages)

Navigate to deployment history and promote previous deployment.

### Database Rollback

Restore from backup if schema changed. No automatic Prisma migration rollback.

---

## 12. Monitoring & Logging

### Application Logs

**API:** Structured JSON logs via Pino, level controlled by `LOG_LEVEL`
**Frontend:** Console-based logging, errors tracked via Sentry (optional)

### Error Tracking (Sentry)

**API:**
- `SENTRY_DSN`, `SENTRY_ENABLED`
- Performance traces: 10% in production, 100% in dev
- Profiling: 5% in production, 100% in dev

**Frontend:**
- `VITE_SENTRY_DSN`, `VITE_ENABLE_SENTRY`
- Sentry initialized only when `VITE_ENABLE_SENTRY=true` or `VITE_DEPLOYMENT_MODE=cloud`

---

## See Also

- [ENV_VAR_MANAGEMENT.md](./ENV_VAR_MANAGEMENT.md) -- Environment variable architecture
- [DEVELOPMENT_RULES.md](./DEVELOPMENT_RULES.md) -- Development workflow
- [architecture-api.md](./architecture-api.md) -- API architecture
