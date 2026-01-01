# Qarote Standalone Deployment Guide

This guide covers deploying Qarote as a standalone, self-hosted application.

## Overview

Qarote can be deployed in two modes:

- **Cloud Mode**: Full SaaS deployment with all services mandatory
- **Self-Hosted Mode**: Standalone deployment with optional services

## Prerequisites

- Docker and Docker Compose installed
- PostgreSQL database (included in Docker Compose)
- License key (purchased from Customer Portal)
- Minimum 2GB RAM, 10GB disk space

## Quick Start

### 1. Purchase a License

Visit the [Customer Portal](https://portal.qarote.io) to purchase a license:

- Developer License: $29/month or $290/year
- Enterprise License: $99/month or $990/year

After purchase, you'll receive a license key via email.

### 2. Deploy Enterprise Edition

```bash
export DEPLOYMENT_MODE=enterprise
docker-compose -f docker-compose.selfhosted.yml up -d
```

**Note:** Enterprise customers provide their own RabbitMQ servers. For development/testing with RabbitMQ, use the main `docker-compose.yml` file.

### 3. Configure Environment Variables

Create `.env` files in `apps/api/` and `apps/app/` directories:

**Backend (environment variables in docker-compose or .env):**

```env
# Required
DEPLOYMENT_MODE=enterprise
LICENSE_FILE_PATH=./license.json
LICENSE_PUBLIC_KEY=your-public-key-here
DATABASE_URL=postgres://postgres:changeme@postgres:5432/qarote
JWT_SECRET=your-jwt-secret-min-32-chars
ENCRYPTION_KEY=your-encryption-key-min-32-chars

# Optional (can be disabled for air-gapped)
ENABLE_SENTRY=false
ENABLE_EMAIL=false
ENABLE_OAUTH=false
```

**Frontend (environment variables in docker-compose or .env):**

```env
VITE_API_URL=http://localhost:3000
VITE_DEPLOYMENT_MODE=enterprise
```

### 4. Run Database Migrations

```bash
cd apps/api
npm run db:migrate:dev
```

### 5. Start Services

```bash
export DEPLOYMENT_MODE=enterprise
docker-compose -f docker-compose.selfhosted.yml up -d
```

## License Activation

1. Purchase license from Customer Portal
2. Download license file (JSON format, cryptographically signed)
3. Place license file at `./license.json` (or set `LICENSE_FILE_PATH`)
4. Set `LICENSE_PUBLIC_KEY` environment variable (provided with license)
5. Restart backend service

The license is validated offline using cryptographic signatures - no internet connection required.

The license is validated periodically (daily/weekly) with the Qarote license server.

## Configuration

### Required Configuration

- `LICENSE_KEY`: Your license key from Customer Portal
- `LICENSE_VALIDATION_URL`: URL for license validation (default: https://api.qarote.io)
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret for JWT tokens (min 32 characters)
- `ENCRYPTION_KEY`: Key for encrypting credentials (min 32 characters)

### Optional Services

All external services can be disabled for air-gapped deployments:

**Sentry (Error Tracking)**

```env
ENABLE_SENTRY=false
SENTRY_DSN=
```

**Email Service**

```env
ENABLE_EMAIL=false
# Or use SMTP:
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASS=password
```

**OAuth Authentication**

```env
ENABLE_OAUTH=false
GOOGLE_CLIENT_ID=
```

**Other Services**

```env
ENABLE_NOTION=false
ENABLE_SLACK=false
```

## Air-Gapped Deployments

For completely offline deployments:

1. Set all `ENABLE_*` flags to `false`
2. Use SMTP for email (if needed) instead of Resend
3. License validation uses a grace period for offline periods
4. Configure `LICENSE_VALIDATION_URL` to point to your internal license server (if applicable)

## Troubleshooting

### License Validation Failed

- Check `LICENSE_KEY` is set correctly
- Verify `LICENSE_VALIDATION_URL` is accessible
- Check network connectivity to license server
- Review backend logs for validation errors

### Services Not Starting

- Verify all required environment variables are set
- Check Docker logs: `docker-compose logs backend`
- Ensure PostgreSQL is healthy: `docker-compose ps`

### Database Connection Issues

- Verify `DATABASE_URL` format: `postgres://user:pass@host:port/dbname`
- Check PostgreSQL container is running: `docker-compose ps postgres`
- Review PostgreSQL logs: `docker-compose logs postgres`

## Support

For more information:

- Documentation: https://qarote.io/docs
- Customer Portal: https://portal.qarote.io
- Support: support@qarote.io
