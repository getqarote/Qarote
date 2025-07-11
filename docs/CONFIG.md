# Configuration Management

This document describes the centralized configuration management system using Zod validation.

## Overview

The configuration system provides:

- **Type-safe environment variable validation** using Zod schemas
- **Centralized configuration management** in `src/config/index.ts`
- **Automatic validation** on startup with helpful error messages
- **Environment-specific helpers** for different deployment scenarios

## Configuration Structure

### Main Config File: `src/config/index.ts`

The main configuration file exports:

- `config` - Validated configuration object
- Environment-specific getters:
  - `serverConfig` - Server port, host, environment
  - `authConfig` - JWT secrets, encryption keys
  - `databaseConfig` - Database connection
  - `corsConfig` - CORS settings
  - `emailConfig` - Email service configuration
  - `stripeConfig` - Stripe payment configuration
  - `logConfig` - Logging configuration
  - `sentryConfig` - Error monitoring configuration

### Environment Variables

All environment variables are validated according to the schema in `config/index.ts`:

#### Required Variables

- `JWT_SECRET` - JWT signing secret (minimum 1 character)
- `ENCRYPTION_KEY` - Data encryption key (minimum 32 characters)
- `DATABASE_URL` - PostgreSQL connection URL
- `FRONTEND_URL` - Frontend application URL

#### Optional Variables

- `NODE_ENV` - Environment mode (development/test/production, defaults to "development")
- `PORT` - Server port (defaults to 3000)
- `HOST` - Server host (defaults to "localhost")
- `CORS_ORIGIN` - CORS origin (defaults to "\*")
- `LOG_LEVEL` - Logging level (error/warn/info/debug, defaults to "info")
- `RESEND_API_KEY` - Email service API key
- `FROM_EMAIL` - Email sender address (defaults to "noreply@rabbithq.com")
- `SENTRY_DSN` - Sentry error tracking DSN
- `SENTRY_ENABLED` - Enable Sentry in development (defaults to false)
- `STRIPE_SECRET_KEY` - Stripe payment processor key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook verification secret
- Stripe Price IDs for different plans

## Usage Examples

### Importing Configuration

```typescript
// Import specific config sections
import { serverConfig, authConfig, emailConfig } from "@/config";

// Import utilities
import { isDevelopment, isProduction } from "@/config";

// Import the full config object
import { config } from "@/config";
```

### Using Configuration

```typescript
// Server configuration
const { port, host, nodeEnv } = serverConfig;

// Auth configuration
const { jwtSecret, encryptionKey } = authConfig;

// Conditional logic based on environment
if (isDevelopment()) {
  // Development-only code
  console.log("Debug token:", token);
}

// Email configuration
const emailResult = await resend.emails.send({
  from: emailConfig.fromEmail,
  to: user.email,
  // ...
});
```

## Migration from process.env

All direct `process.env` usage has been replaced with the config system:

### Before

```typescript
const port = parseInt(process.env.PORT!);
const jwtSecret = process.env.JWT_SECRET!;
if (process.env.NODE_ENV === "development") {
  // ...
}
```

### After

```typescript
import { serverConfig, authConfig, isDevelopment } from "@/config";

const { port } = serverConfig;
const { jwtSecret } = authConfig;
if (isDevelopment()) {
  // ...
}
```

## Error Handling

The configuration system validates all environment variables on startup. If validation fails, the application will exit with a detailed error message:

```
Configuration validation failed:
JWT_SECRET: String must contain at least 1 character(s)
ENCRYPTION_KEY: String must contain at least 32 character(s)
DATABASE_URL: Invalid url
```

## Environment Files

Use the provided `.env.example` files as templates:

```bash
# Copy the example file
cp .env.example .env

# Edit with your values
vim .env
```

## Benefits

1. **Type Safety** - All configuration is typed and validated
2. **Early Error Detection** - Invalid configuration caught at startup
3. **Centralized Management** - Single source of truth for configuration
4. **Environment Helpers** - Easy environment-specific logic
5. **Documentation** - Self-documenting configuration schema
6. **Maintainability** - Easy to add/modify configuration options

## Adding New Configuration

To add new environment variables:

1. Add to the `envSchema` in `src/config/index.ts`:

```typescript
const envSchema = z.object({
  // ... existing config ...
  MY_NEW_CONFIG: z.string().optional(),
});
```

2. Export a typed getter:

```typescript
export const myConfig = {
  newValue: config.MY_NEW_CONFIG,
} as const;
```

3. Update the `.env.example` file with the new variable
4. Update this documentation
