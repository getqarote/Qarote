# Deployment Guide

**Project:** Qarote  
**Generated:** 2026-01-30

## Overview

Qarote supports multiple deployment strategies depending on the edition and deployment mode. This guide covers all deployment scenarios.

## Deployment Architecture

### Production Environment

```
┌─────────────────┐
│  qarote.io      │  Landing Page (Cloudflare Pages)
│  apps/web       │
└─────────────────┘

┌─────────────────┐
│  app.qarote.io  │  Dashboard (Cloudflare Pages)
│  apps/app       │
└─────────────────┘

┌─────────────────┐
│  portal.qar...  │  Customer Portal (Cloudflare Pages)
│  apps/portal    │
└─────────────────┘

┌─────────────────┐
│  api.qarote.io  │  Backend API (Heroku/Dokku)
│  apps/api       │
└─────────────────┘
                ↓
         ┌──────────────┐
         │  PostgreSQL  │  Database (Hosted)
         └──────────────┘
```

---

## 1. Backend API Deployment

### Option A: Heroku Deployment

**Prerequisites:**
- Heroku CLI installed
- PostgreSQL add-on provisioned

**Configuration Files:**
- `Procfile` - Defines web and worker processes
- `app.json` - Heroku app configuration
- `app.worker.json` - Worker configuration

**Deployment Steps:**

```bash
# 1. Create Heroku app
heroku create qarote-api

# 2. Add PostgreSQL
heroku addons:create heroku-postgresql:essential-0

# 3. Set environment variables
heroku config:set NODE_ENV=production
heroku config:set DEPLOYMENT_MODE=cloud
heroku config:set JWT_SECRET="your-secret-key"
heroku config:set ENCRYPTION_KEY="your-encryption-key"
heroku config:set STRIPE_SECRET_KEY="your-stripe-key"
heroku config:set RESEND_API_KEY="your-resend-key"

# 4. Push code
git push heroku main

# 5. Run migrations
heroku run pnpm run db:migrate

# 6. Scale services
heroku ps:scale web=1 worker=1
```

**Environment Variables:**

Required:
- `DATABASE_URL` (auto-set by PostgreSQL add-on)
- `NODE_ENV=production`
- `JWT_SECRET` (32+ characters)
- `ENCRYPTION_KEY` (32+ characters)
- `DEPLOYMENT_MODE` (community/enterprise/cloud)

Optional:
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- `SENTRY_DSN`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

**Processes:**
- **web:** Main API server
- **worker:** Alert monitoring (optional, can run as cron in web process)

---

### Option B: Dokku Deployment

**Prerequisites:**
- Dokku installed on server
- PostgreSQL plugin installed

**Deployment:**

```bash
# 1. Create app
dokku apps:create qarote-api

# 2. Create database
dokku postgres:create qarote-db
dokku postgres:link qarote-db qarote-api

# 3. Set environment variables
dokku config:set qarote-api NODE_ENV=production
dokku config:set qarote-api DEPLOYMENT_MODE=cloud
dokku config:set qarote-api JWT_SECRET="..."
dokku config:set qarote-api ENCRYPTION_KEY="..."

# 4. Deploy
git remote add dokku dokku@your-server:qarote-api
git push dokku main

# 5. Run migrations
dokku run qarote-api pnpm run db:migrate
```

---

### Option C: Self-Hosted (Docker)

**For Community/Enterprise Edition:**

**Dockerfile:**
Located in `docker/` directory (if exists) or create:

```dockerfile
FROM node:24-alpine
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Copy workspace files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/

# Install dependencies
RUN pnpm install --frozen-lockfile --prod

# Copy source
COPY apps/api ./apps/api

# Build
RUN cd apps/api && pnpm run build

# Expose port
EXPOSE 3000

# Start
CMD ["node", "apps/api/dist/index.js"]
```

**Deployment:**

```bash
# 1. Build image
docker build -t qarote-api -f docker/Dockerfile .

# 2. Run with docker-compose or docker run
docker run -d \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e JWT_SECRET="..." \
  -e ENCRYPTION_KEY="..." \
  -e DEPLOYMENT_MODE="enterprise" \
  --name qarote-api \
  qarote-api
```

---

## 2. Frontend Deployments

### Cloudflare Pages (All Frontend Apps)

**Prerequisites:**
- Cloudflare account
- Repository connected to Cloudflare Pages

---

### App Dashboard (`apps/app`)

**Build Configuration:**
- **Framework preset:** None (use custom)
- **Build command:** `pnpm run build:app` or `cd apps/app && pnpm install --no-optional && pnpm run build`
- **Build output directory:** `apps/app/dist`
- **Root directory:** `apps/app` (optional)
- **Node version:** 24

**Environment Variables:**
- `NODE_VERSION=24`
- `VITE_API_URL=https://api.qarote.io`
- `VITE_DEPLOYMENT_MODE=cloud` (or community/enterprise)
- `VITE_GOOGLE_CLIENT_ID=...` (optional)

**Custom Domain:** `app.qarote.io`

---

### Landing Page (`apps/web`)

**Build Configuration:**
- **Build command:** `cd apps/web && pnpm install --no-optional && pnpm run build:cloudflare`
- **Build output directory:** `apps/web/dist`
- **Root directory:** `apps/web`
- **Node version:** 24

**Environment Variables:**
- `NODE_VERSION=24`

**Custom Domains:** `qarote.io`, `www.qarote.io`

**SEO Files:** Ensure `public/sitemap.xml` and `public/robots.txt` are present

---

### Customer Portal (`apps/portal`)

**Build Configuration:**
- **Build command:** `cd apps/portal && pnpm install --no-optional && pnpm run build:cloudflare`
- **Build output directory:** `apps/portal/dist`
- **Root directory:** `apps/portal`
- **Node version:** 24

**Environment Variables:**
- `NODE_VERSION=24`
- `VITE_API_URL=https://api.qarote.io`

**Custom Domain:** `portal.qarote.io`

---

## 3. Database Deployment

### PostgreSQL Hosting Options

1. **Heroku Postgres** - Managed PostgreSQL (if using Heroku for API)
2. **Railway** - Managed PostgreSQL with generous free tier
3. **Supabase** - PostgreSQL with additional features
4. **DigitalOcean** - Managed databases
5. **Self-Hosted** - Your own PostgreSQL server

**Requirements:**
- PostgreSQL 15 or higher
- Sufficient storage for metrics data

**Connection:**
- Set `DATABASE_URL` environment variable in API
- Run migrations: `pnpm run db:migrate` (production)

---

## 4. CI/CD Pipeline

### GitHub Actions

**Workflows** (`.github/workflows/`):

**Quality Checks:**
- Runs on all PRs
- Linting, type checking, testing
- Commit message validation (conventional commits)

**Staging Deployments:**
- Auto-deploy on push to `main`
- Separate workflows for each app
- Deploy to staging environments

**Production Deployments:**
- Manual workflow dispatch
- Requires confirmation input
- Deploy to production domains

**Workflow Files:**
- `deploy-api-staging.yml` / `deploy-api-production.yml`
- `deploy-frontend-staging.yml` / `deploy-frontend-production.yml`
- `deploy-landing-staging.yml` / `deploy-landing-production.yml`
- `deploy-portal-staging.yml` / `deploy-portal-production.yml`
- `deploy-worker-staging.yml` / `deploy-worker-production.yml`
- `validate-commits.yml`

---

## 5. Environment-Specific Configuration

### Community Edition

**API:**
```bash
DEPLOYMENT_MODE=community
# No Stripe, no billing
# No license validation
# Basic features only
```

**Frontend:**
```bash
VITE_DEPLOYMENT_MODE=community
# Hides enterprise features
# No billing UI
```

### Enterprise Edition (Self-Hosted)

**API:**
```bash
DEPLOYMENT_MODE=enterprise
LICENSE_FILE_PATH=/path/to/license.json
# License validation required
# All features available if licensed
```

**Frontend:**
```bash
VITE_DEPLOYMENT_MODE=enterprise
# Shows enterprise features
# No billing UI (license-based)
```

### Cloud Edition (SaaS)

**API:**
```bash
DEPLOYMENT_MODE=cloud
STRIPE_SECRET_KEY=...
RESEND_API_KEY=...
# Full billing integration
# Multi-tenant with workspace isolation
```

**Frontend:**
```bash
VITE_DEPLOYMENT_MODE=cloud
VITE_GOOGLE_CLIENT_ID=...
# Shows all features
# Billing UI enabled
```

---

## 6. Health Checks

### API Health Endpoints

```bash
# Liveness check
GET /health
→ Returns: { status: "ok" }

# Readiness check  
GET /health/ready
→ Returns: { status: "ok", database: "connected" }
```

**Use in Load Balancers:**
- Kubernetes: livenessProbe / readinessProbe
- Heroku: Automatic health checks
- Docker: HEALTHCHECK directive

---

## 7. Monitoring & Logging

### Application Logs

**API:**
- Structured JSON logs via Pino
- Log level controlled by `LOG_LEVEL` env var
- Logs written to stdout (captured by platform)

**Frontend:**
- Console-based logging via loglevel
- Errors tracked via Sentry (optional)

### Error Tracking

**Sentry (Optional):**

**API:**
```bash
SENTRY_DSN=https://...@sentry.io/...
SENTRY_ENVIRONMENT=production
```

**Frontend:**
```bash
VITE_ENABLE_SENTRY=true
VITE_SENTRY_DSN=https://...@sentry.io/...
```

### Performance Monitoring

- Sentry Performance (API)
- Sentry Profiling (API)
- Web Vitals (Frontend)

---

## 8. Security Checklist

**Before Production:**

- [ ] Change all default passwords and secrets
- [ ] Use strong `JWT_SECRET` (32+ characters, random)
- [ ] Use strong `ENCRYPTION_KEY` (32+ characters, random)
- [ ] Enable HTTPS only (no HTTP in production)
- [ ] Set restrictive CORS origins
- [ ] Enable rate limiting
- [ ] Set up database backups
- [ ] Configure Sentry or error tracking
- [ ] Review and set appropriate log levels
- [ ] Validate environment variables
- [ ] Set up SSL certificates for custom domains
- [ ] Enable WAF if available (Cloudflare)

---

## 9. Backup Strategy

### Database Backups

**Heroku Postgres:**
```bash
heroku pg:backups:capture
heroku pg:backups:download
```

**Manual Backup:**
```bash
pg_dump $DATABASE_URL > backup.sql
```

**Restore:**
```bash
psql $DATABASE_URL < backup.sql
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
- Use session-less JWT auth (no sticky sessions needed)
- Database connection pooling (Prisma handles this)

**Alert Worker:**
- Can run as separate process/service
- Only one instance needed (uses database for coordination)

**Frontend:**
- CDN automatically scales (Cloudflare Pages)
- No backend needed (static files)

### Vertical Scaling

**API:**
- Increase dyno/container size for more CPU/RAM
- Monitor memory usage via Sentry

**Database:**
- Upgrade to larger plan
- Add read replicas for read-heavy workloads

---

## 11. Rollback Procedure

### API Rollback

**Heroku:**
```bash
heroku releases:rollback v<version-number>
```

**Dokku:**
```bash
dokku ps:rebuild qarote-api <commit-sha>
```

**Database Rollback:**
- Restore from backup (if schema changed)
- No automatic Prisma migration rollback

### Frontend Rollback

**Cloudflare Pages:**
- Navigate to deployment history
- Promote previous deployment
- OR: Revert git commit and push

---

## 12. Troubleshooting Production

### API Not Responding

1. Check health endpoint: `curl https://api.qarote.io/health`
2. Check logs: `heroku logs --tail` or equivalent
3. Verify database connection
4. Check environment variables

### Frontend Errors

1. Check browser console for errors
2. Verify API_URL is correct
3. Check Sentry for error reports
4. Verify build artifacts deployed correctly

### Database Connection Issues

1. Check DATABASE_URL is correct
2. Verify database is running
3. Check connection limits
4. Review Prisma logs

---

## Deployment Checklist

### Pre-Deployment

- [ ] All tests passing
- [ ] Type check passes
- [ ] Linting passes
- [ ] No console.log statements (or switch to logger)
- [ ] Environment variables documented
- [ ] Database migrations reviewed
- [ ] API version compatibility checked

### Post-Deployment

- [ ] Health checks passing
- [ ] Database migrations applied
- [ ] Smoke test critical flows
- [ ] Monitor error rates (Sentry)
- [ ] Check application logs
- [ ] Verify integrations working (Stripe, email, etc.)
- [ ] Test authentication flows
- [ ] Verify websocket/polling connections (if applicable)

---

## Support & Maintenance

### Regular Maintenance

- **Weekly:** Review error logs and Sentry reports
- **Monthly:** Check dependency updates
- **Quarterly:** Review and rotate secrets
- **Annually:** Review and renew SSL certificates (if self-managed)

### Monitoring Metrics

**API:**
- Response times (p50, p95, p99)
- Error rate
- Database query performance
- External service latency (Stripe, Resend, RabbitMQ)

**Frontend:**
- Core Web Vitals (LCP, FID, CLS)
- JavaScript errors
- Page load times
- Bounce rate

---

## Cost Optimization

### Cloud Edition

**Heroku:**
- Use appropriate dyno sizes
- Enable dyno sleeping for staging
- Use connection pooling for database

**Cloudflare Pages:**
- Free for most use cases
- Bandwidth included

**External Services:**
- Stripe: Pay per transaction
- Resend: Free tier available, pay for volume
- Sentry: Free tier available

### Self-Hosted Edition

**Infrastructure:**
- Single server for small deployments
- Separate database server for larger deployments
- No external service costs (except optional Sentry)

---

## See Also

- [SELF_HOSTED_DEPLOYMENT.md](./SELF_HOSTED_DEPLOYMENT.md) - Self-hosted deployment guide
- [COMMUNITY_EDITION.md](./COMMUNITY_EDITION.md) - Community Edition setup
- [ENTERPRISE_EDITION.md](./ENTERPRISE_EDITION.md) - Enterprise Edition setup
- Individual app READMEs for app-specific deployment details
