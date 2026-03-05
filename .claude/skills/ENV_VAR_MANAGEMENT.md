# Environment Variable Management

**Generated:** 2026-03-05

This document explains how environment variables are loaded, validated, and consumed in the Qarote API.

## Architecture Overview

```
.env file
  |  (dotenv)
process.env
  |  (Zod schemas)
config object (validated & typed)
  |  (re-exported)
serverConfig, authConfig, sentryConfig, emailConfig, ...
```

Environment variables flow through three layers:

1. **dotenv** loads `.env` into `process.env`
2. **Zod schemas** validate and parse `process.env` into a typed `config` object
3. **Named config exports** group related settings for convenient access

All three steps happen in `apps/api/src/config/index.ts`.

## The Golden Rule

**Always use the validated `config` from `@/config` -- never read `process.env` directly.**

```typescript
// Good
import { sentryConfig } from "@/config";
if (sentryConfig.enabled) { ... }

// Bad
if (process.env.ENABLE_SENTRY === "true") { ... }
```

Why:

- **Type safety** -- `config.PORT` is a `number`, not `string | undefined`
- **Validation** -- Zod rejects invalid values at startup, not at runtime
- **Defaults** -- Schema defaults (e.g. `SENTRY_ENABLED` -> `false`) are applied once, in one place
- **Coercion** -- Boolean and number env vars are coerced automatically (`"true"` -> `true`, `"3000"` -> `3000`)

## Config Modules

| Import | Contains |
|--------|----------|
| `config` | Raw validated config (all fields) |
| `serverConfig` | `PORT`, `HOST`, `NODE_ENV` |
| `authConfig` | `JWT_SECRET`, `ENCRYPTION_KEY` |
| `corsConfig` | `CORS_ORIGIN` |
| `emailConfig` | Email provider, SMTP host/port/user/pass, OAuth2 settings (`SMTP_SERVICE`, `SMTP_OAUTH_CLIENT_ID`, `SMTP_OAUTH_CLIENT_SECRET`, `SMTP_OAUTH_REFRESH_TOKEN`) |
| `registrationConfig` | `ENABLE_REGISTRATION` (selfhosted only) |
| `adminBootstrapConfig` | `ADMIN_EMAIL`, `ADMIN_PASSWORD` (selfhosted only, first boot) |
| `sentryConfig` | `SENTRY_DSN`, `SENTRY_ENABLED`, sample rates, release version |
| `stripeConfig` | Stripe secret key, webhook secret, price IDs (developer/enterprise monthly/yearly) |
| `googleConfig` | `GOOGLE_CLIENT_ID`, `ENABLE_OAUTH` |
| `ssoConfig` | `SSO_ENABLED`, `SSO_TYPE`, OIDC discovery/client settings, SAML metadata, tenant/product/button label |
| `licenseConfig` | `LICENSE_PRIVATE_KEY` (cloud only, for generating licenses) |
| `notionConfig` | `NOTION_API_KEY`, `NOTION_DATABASE_ID`, `NOTION_SYNC_ENABLED`, `ENABLE_NOTION` |
| `alertConfig` | `ALERT_CHECK_INTERVAL_MS`, `ALERT_CHECK_CONCURRENCY` |
| `logConfig` | `LOG_LEVEL`, `isDevelopment` |
| `deploymentConfig` | `DEPLOYMENT_MODE` + `isCloud()` / `isSelfHosted()` helpers |

## Schema Hierarchy

There are exactly two deployment modes and two schema files (plus a shared base):

```
base.ts              <-- Required for ALL modes (DATABASE_URL, JWT_SECRET, PORT, ...)
  |-- cloud.ts       <-- SaaS: all services required (Stripe, Sentry, Resend, ...)
  +-- selfhosted.ts  <-- Self-hosted: most services optional, SSO available
```

> **Note:** `community` and `enterprise` are deprecated aliases for `selfhosted`. They are normalized to `selfhosted` at startup in `config/index.ts` via `normalizeDeploymentMode()`. There are no separate `community.ts` or `enterprise.ts` schema files.

## Deployment Mode Detection

The deployment mode is determined by `DEPLOYMENT_MODE` (defaults to `"selfhosted"`). Deprecated aliases are normalized before schema selection:

```typescript
function normalizeDeploymentMode(raw: string): "cloud" | "selfhosted" {
  if (raw === "cloud") return "cloud";
  if (raw === "selfhosted") return "selfhosted";
  if (["community", "enterprise"].includes(raw)) {
    console.warn(`DEPLOYMENT_MODE="${raw}" is deprecated. Use "selfhosted" instead.`);
    return "selfhosted";
  }
  throw new Error(`Invalid DEPLOYMENT_MODE: ${raw}`);
}

switch (deploymentMode) {
  case "cloud":      return cloudSchema.parse(env);
  case "selfhosted": return selfhostedSchema.parse(env);
}
```

If a required variable is missing for the selected mode, the process exits with a clear validation error.

## Complete Environment Variable Reference

### Base Variables (all modes) -- `apps/api/src/config/schemas/base.ts`

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `NODE_ENV` | `"development" \| "test" \| "production"` | `"production"` | Runtime environment |
| `PORT` | `number` | (required) | Server port |
| `HOST` | `string` | (required) | Server host |
| `LOG_LEVEL` | `"error" \| "warn" \| "info" \| "debug"` | `"info"` | Pino log level |
| `JWT_SECRET` | `string` | (required, min 1) | JWT signing secret |
| `ENCRYPTION_KEY` | `string` | (required, min 32) | Encryption key for sensitive data |
| `DATABASE_URL` | `string` | (required) | PostgreSQL connection string (`postgres://` or `postgresql://`) |
| `CORS_ORIGIN` | `string` | `"*"` | Allowed CORS origins (comma-separated) |
| `ALERT_CHECK_INTERVAL_MS` | `number` | `300000` | Alert check interval (5 minutes) |
| `ALERT_CHECK_CONCURRENCY` | `number` | `10` | Max concurrent alert checks |
| `npm_package_version` | `string` | `"0.0.0"` | Package version (for Sentry releases) |

### Cloud-Only Variables -- `apps/api/src/config/schemas/cloud.ts`

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `DEPLOYMENT_MODE` | `"cloud"` | -- | Must be `"cloud"` |
| `RESEND_API_KEY` | `string` | (required) | Resend email API key |
| `FROM_EMAIL` | `email` | (required) | Sender email address |
| `FRONTEND_URL` | `url` | (required) | Frontend URL for email links |
| `API_URL` | `url` | (required) | Backend API URL for OAuth callbacks |
| `PORTAL_FRONTEND_URL` | `url` | (required) | Portal URL for portal email links |
| `ENABLE_EMAIL` | `boolean` | `true` | Enable email features |
| `EMAIL_PROVIDER` | `"resend" \| "smtp"` | `"resend"` | Email provider |
| `SMTP_HOST` | `string` | (optional) | SMTP server hostname |
| `SMTP_PORT` | `number` | (optional) | SMTP server port |
| `SMTP_USER` | `string` | (optional) | SMTP username |
| `SMTP_PASS` | `string` | (optional) | SMTP password |
| `STRIPE_SECRET_KEY` | `string` | (required) | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | `string` | (required) | Stripe webhook signing secret |
| `STRIPE_DEVELOPER_MONTHLY_PRICE_ID` | `string` | (required) | Stripe price ID |
| `STRIPE_DEVELOPER_YEARLY_PRICE_ID` | `string` | (required) | Stripe price ID |
| `STRIPE_ENTERPRISE_MONTHLY_PRICE_ID` | `string` | (required) | Stripe price ID |
| `STRIPE_ENTERPRISE_YEARLY_PRICE_ID` | `string` | (required) | Stripe price ID |
| `SENTRY_DSN` | `string` | (required) | Sentry DSN |
| `SENTRY_ENABLED` | `boolean` | `true` | Enable Sentry error tracking |
| `GOOGLE_CLIENT_ID` | `string` | (required) | Google OAuth client ID |
| `ENABLE_OAUTH` | `boolean` | `true` | Enable Google OAuth |
| `LICENSE_PRIVATE_KEY` | `string` | (required) | RSA private key for generating customer licenses |
| `LICENSE_PUBLIC_KEY` | `string` | (optional) | RSA public key |
| `NOTION_API_KEY` | `string` | (optional) | Notion API key |
| `NOTION_DATABASE_ID` | `string` | (optional) | Notion database ID |
| `NOTION_SYNC_ENABLED` | `boolean` | `false` | Enable Notion sync |
| `ENABLE_NOTION` | `boolean` | `false` | Enable Notion integration |

### Self-Hosted Variables -- `apps/api/src/config/schemas/selfhosted.ts`

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `DEPLOYMENT_MODE` | `"selfhosted"` | -- | Must be `"selfhosted"` |
| `ENABLE_REGISTRATION` | `boolean` | `true` | Allow new user registration |
| `ADMIN_EMAIL` | `email` | (optional) | Bootstrap admin email (first boot) |
| `ADMIN_PASSWORD` | `string (min 8)` | (optional) | Bootstrap admin password (first boot) |
| `ENABLE_EMAIL` | `boolean` | `false` | Enable email features |
| `EMAIL_PROVIDER` | `"smtp"` | `"smtp"` | Always SMTP for self-hosted |
| `FROM_EMAIL` | `email` | `"noreply@localhost"` | Sender email address |
| `FRONTEND_URL` | `url` | `"http://localhost:8080"` | Frontend URL for email links |
| `API_URL` | `url` | `"http://localhost:3000"` | Backend API URL for SSO callbacks |
| `PORTAL_FRONTEND_URL` | `url` | (optional) | Portal URL for portal email links |
| `SMTP_HOST` | `string` | (optional) | SMTP server hostname |
| `SMTP_PORT` | `number` | `587` | SMTP server port |
| `SMTP_USER` | `string` | (optional) | SMTP username |
| `SMTP_PASS` | `string` | (optional) | SMTP password |
| `SMTP_SERVICE` | `string` | (optional) | SMTP service name for OAuth2 (e.g., `"gmail"`) |
| `SMTP_OAUTH_CLIENT_ID` | `string` | (optional) | OAuth2 client ID for SMTP |
| `SMTP_OAUTH_CLIENT_SECRET` | `string` | (optional) | OAuth2 client secret for SMTP |
| `SMTP_OAUTH_REFRESH_TOKEN` | `string` | (optional) | OAuth2 refresh token for SMTP |
| `SSO_ENABLED` | `boolean` | `false` | Enable SSO |
| `SSO_TYPE` | `"oidc" \| "saml"` | `"oidc"` | SSO protocol |
| `SSO_OIDC_DISCOVERY_URL` | `url` | (optional) | OIDC discovery endpoint |
| `SSO_OIDC_CLIENT_ID` | `string` | (optional) | OIDC client ID |
| `SSO_OIDC_CLIENT_SECRET` | `string` | (optional) | OIDC client secret |
| `SSO_SAML_METADATA_URL` | `url` | (optional) | SAML metadata URL |
| `SSO_SAML_METADATA_RAW` | `string` | (optional) | SAML metadata XML (inline) |
| `SSO_TENANT` | `string` | `"default"` | SSO tenant identifier |
| `SSO_PRODUCT` | `string` | `"qarote"` | SSO product identifier |
| `SSO_BUTTON_LABEL` | `string` | `"Sign in with SSO"` | SSO button text in UI |
| `STRIPE_SECRET_KEY` | `string` | (optional) | Not used in selfhosted |
| `STRIPE_WEBHOOK_SECRET` | `string` | (optional) | Not used in selfhosted |
| `STRIPE_*_PRICE_ID` | `string` | (optional) | Not used in selfhosted |
| `SENTRY_DSN` | `string` | (optional) | Sentry DSN |
| `SENTRY_ENABLED` | `boolean` | `false` | Enable Sentry |
| `GOOGLE_CLIENT_ID` | `string` | (optional) | Not used in selfhosted |
| `ENABLE_OAUTH` | `boolean` | `false` | Not used in selfhosted |
| `NOTION_API_KEY` | `string` | (optional) | Notion API key |
| `NOTION_DATABASE_ID` | `string` | (optional) | Notion database ID |
| `NOTION_SYNC_ENABLED` | `boolean` | `false` | Enable Notion sync |
| `ENABLE_NOTION` | `boolean` | `false` | Enable Notion integration |

### Docker Compose Variables -- `.env.selfhosted.example`

These are consumed by `docker-compose.selfhosted.yml`, not the application directly:

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_PASSWORD` | (generated by `setup.sh`) | PostgreSQL password |
| `POSTGRES_PORT` | `5432` | Host port for PostgreSQL |
| `BACKEND_PORT` | `3000` | Host port for API |
| `FRONTEND_PORT` | `8080` | Host port for frontend |
| `VITE_API_URL` | `http://localhost:3000` | API URL baked into frontend at build time |

### Frontend Variables (build-time, `apps/app`)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | API URL (baked at build time by Vite) |
| `VITE_DEPLOYMENT_MODE` | `"cloud"` or `"selfhosted"` (controls feature visibility) |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `VITE_SENTRY_DSN` | Sentry DSN |
| `VITE_ENABLE_SENTRY` | Enable Sentry (`"true"` / `"false"`) |
| `VITE_APP_VERSION` | App version string |
| `VITE_PORTAL_URL` | Portal URL (used by `apps/web` landing page) |

### Frontend Variables (`apps/web` -- Landing Page)

| Variable | Description |
|----------|-------------|
| `VITE_APP_BASE_URL` | Dashboard app URL |
| `VITE_PORTAL_URL` | Customer portal URL |

### Frontend Variables (`apps/portal` -- Customer Portal)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | API URL |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID |

## Known Exception: `process.env.API_URL` in server.ts

There is one intentional use of raw `process.env` in the codebase:

```typescript
// apps/api/src/server.ts -- runtime config for embedded frontend
const apiUrl = process.env.API_URL || "";
```

This is intentional because the selfhosted schema defaults `API_URL` to `"http://localhost:3000"`, but the runtime frontend config needs `""` (empty string = same-origin) when no `API_URL` is explicitly set. Using `config.API_URL` here would always produce `"http://localhost:3000"`, breaking same-origin requests in binary mode.

**Do not "fix" this to use `config.API_URL`.** The `||` (not `??`) is also deliberate -- it treats both `undefined` and `""` as "not set".

## Frontend Config: Build-time vs Runtime

The frontend (`apps/app`) has two config sources:

| Source | Set when | Mechanism |
|--------|----------|-----------|
| `VITE_API_URL` | Build time | Vite replaces `import.meta.env.VITE_API_URL` at build |
| `window.__QAROTE_CONFIG__` | Runtime | `<script src="/config.js">` served by the API |

Priority order in the frontend (`apps/app/src/lib/trpc/provider.tsx`):

```typescript
const apiUrl = import.meta.env.VITE_API_URL ?? config?.apiUrl;
```

`VITE_API_URL` (build-time) wins over runtime config. This matters because `config.js` defaults `apiUrl` to `""` (same-origin), and `??` correctly preserves that empty string when `VITE_API_URL` is not set.

Deployment mode detection in the frontend (`apps/app/src/lib/featureFlags.ts`):

```typescript
function getDeploymentMode(): "cloud" | "selfhosted" {
  const buildTime = import.meta.env.VITE_DEPLOYMENT_MODE;
  if (buildTime) {
    if (buildTime === "cloud") return "cloud";
    return "selfhosted"; // "selfhosted", "community", "enterprise" all map here
  }
  // Fallback to runtime config from /config.js
  const runtimeConfig = window.__QAROTE_CONFIG__;
  if (runtimeConfig?.deploymentMode && runtimeConfig.deploymentMode !== "cloud") {
    return "selfhosted";
  }
  return "cloud";
}
```

## Adding a New Environment Variable

1. **Pick the right schema:**
   - All modes -> `base.ts`
   - Self-hosted only -> `selfhosted.ts`
   - Cloud only -> `cloud.ts`

2. **Define with Zod:**
   ```typescript
   MY_NEW_VAR: z.coerce.boolean().default(false),
   ```

3. **Export in `config/index.ts`** (if it belongs to a group):
   ```typescript
   export const myFeatureConfig = {
     enabled: config.MY_NEW_VAR,
   } as const;
   ```

4. **Use the validated value:**
   ```typescript
   import { myFeatureConfig } from "@/config";
   if (myFeatureConfig.enabled) { ... }
   ```

5. **Document in `.env.selfhosted.example`** if it's user-facing.

## `.env` Example Files

| File | Purpose |
|------|---------|
| `apps/api/.env.example` | API development (cloud mode, all services) |
| `.env.selfhosted.example` | Self-hosted deployment template (used by `setup.sh`) |
| `apps/app/.env.example` | Frontend development |
| `apps/portal/.env.example` | Portal development |
| `apps/web/.env.example` | Landing page development |

## PEM Keys in `.env`

Multi-line values like PEM keys must be wrapped in double quotes with `\n` for line breaks:

```env
LICENSE_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\nMIICIjAN...\n-----END PUBLIC KEY-----"
```

dotenv interprets `\n` as actual newlines inside double-quoted values.

## Secret Generation

The `setup.sh` script generates secure secrets using `openssl`:

```bash
JWT_SECRET=$(openssl rand -hex 64)        # 128 hex characters
ENCRYPTION_KEY=$(openssl rand -hex 64)    # 128 hex characters
POSTGRES_PASSWORD=$(openssl rand -hex 32) # 64 hex characters
```

When re-running `setup.sh` on an existing `.env`, it preserves `JWT_SECRET`, `ENCRYPTION_KEY`, and `POSTGRES_PASSWORD` to avoid breaking encrypted data, active sessions, or database access.
