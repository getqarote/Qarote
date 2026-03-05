# Environment Variable Management

This document explains how environment variables are loaded, validated, and consumed in the Qarote API.

## Architecture Overview

```
.env file
  ↓  (dotenv)
process.env
  ↓  (Zod schemas)
config object (validated & typed)
  ↓  (re-exported)
serverConfig, authConfig, sentryConfig, emailConfig, ...
```

Environment variables flow through three layers:

1. **dotenv** loads `.env` into `process.env`
2. **Zod schemas** validate and parse `process.env` into a typed `config` object
3. **Named config exports** group related settings for convenient access

All three steps happen in `apps/api/src/config/index.ts`.

## The Golden Rule

**Always use the validated `config` from `@/config` — never read `process.env` directly.**

```typescript
// Good
import { sentryConfig } from "@/config";
if (sentryConfig.enabled) { ... }

// Bad
if (process.env.ENABLE_SENTRY === "true") { ... }
```

Why:

- **Type safety** — `config.PORT` is a `number`, not `string | undefined`
- **Validation** — Zod rejects invalid values at startup, not at runtime
- **Defaults** — Schema defaults (e.g. `SENTRY_ENABLED` → `false`) are applied once, in one place
- **Coercion** — Boolean and number env vars are coerced automatically (`"true"` → `true`, `"3000"` → `3000`)

## Config Modules

| Import | Contains |
|--------|----------|
| `config` | Raw validated config (all fields) |
| `serverConfig` | `PORT`, `HOST`, `NODE_ENV` |
| `authConfig` | `JWT_SECRET`, `ENCRYPTION_KEY` |
| `corsConfig` | `CORS_ORIGIN` |
| `emailConfig` | Email provider, SMTP, OAuth2 settings |
| `sentryConfig` | `SENTRY_DSN`, `SENTRY_ENABLED`, sample rates |
| `stripeConfig` | Stripe keys and price IDs |
| `googleConfig` | Google OAuth client ID |
| `ssoConfig` | SSO type, OIDC/SAML settings |
| `licenseConfig` | License file path, keys |
| `notionConfig` | Notion API key, sync settings |
| `alertConfig` | Alert check interval, concurrency |
| `deploymentConfig` | Deployment mode + helper functions |

## Schema Hierarchy

Schemas are layered by deployment mode:

```
base.ts              ← Required for ALL modes (DATABASE_URL, JWT_SECRET, PORT, ...)
  ├── cloud.ts       ← SaaS: all services required (Stripe, Sentry, Resend, ...)
  └── selfhosted.ts  ← Self-hosted base: most services optional
        ├── community.ts   ← DEPLOYMENT_MODE=community, no license required
        └── enterprise.ts  ← DEPLOYMENT_MODE=enterprise, license required
```

Adding a new env var:

1. Add it to the appropriate schema file
2. Access it via the validated `config` object
3. If it belongs to a logical group, add it to the corresponding named export in `config/index.ts`

## Deployment Mode Detection

The deployment mode is determined by `DEPLOYMENT_MODE` (defaults to `"community"`). The correct Zod schema is selected at startup:

```typescript
switch (deploymentMode) {
  case "cloud":      return cloudSchema.parse(env);
  case "enterprise": return enterpriseSchema.parse(env);
  case "community":  return communitySchema.parse(env);
}
```

If a required variable is missing for the selected mode, the process exits with a clear validation error.

## Known Exception: `process.env.API_URL` in server.ts

There is one intentional use of raw `process.env` in the codebase:

```typescript
// apps/api/src/server.ts — runtime config for embedded frontend
const apiUrl = process.env.API_URL || "";
```

This is intentional because the selfhosted schema defaults `API_URL` to `"http://localhost:3000"`, but the runtime frontend config needs `""` (empty string = same-origin) when no `API_URL` is explicitly set. Using `config.API_URL` here would always produce `"http://localhost:3000"`, breaking same-origin requests in binary mode.

**Do not "fix" this to use `config.API_URL`.** The `||` (not `??`) is also deliberate — it treats both `undefined` and `""` as "not set".

## Frontend Config: Build-time vs Runtime

The frontend (`apps/app`) has two config sources:

| Source | Set when | Mechanism |
|--------|----------|-----------|
| `VITE_API_URL` | Build time | Vite replaces `import.meta.env.VITE_API_URL` at build |
| `window.__QAROTE_CONFIG__` | Runtime | `<script src="/config.js">` served by the API |

Priority order in the frontend:

```typescript
const apiUrl = import.meta.env.VITE_API_URL ?? config?.apiUrl;
```

`VITE_API_URL` (build-time) wins over runtime config. This matters because `config.js` defaults `apiUrl` to `""` (same-origin), and `??` correctly preserves that empty string when `VITE_API_URL` is not set.

## Adding a New Environment Variable

1. **Pick the right schema:**
   - All modes → `base.ts`
   - Self-hosted only → `selfhosted.ts`
   - Enterprise only → `enterprise.ts`
   - Cloud only → `cloud.ts`

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

## PEM Keys in `.env`

Multi-line values like PEM keys must be wrapped in double quotes with `\n` for line breaks:

```env
LICENSE_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\nMIICIjAN...\n-----END PUBLIC KEY-----"
```

dotenv interprets `\n` as actual newlines inside double-quoted values.
