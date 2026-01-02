# Qarote Self-Hosted Deployment Guide

This guide covers deploying Qarote as a self-hosted application in either Community Edition (open-source) or Enterprise Edition (licensed).

## Table of Contents

- [Overview](#overview)
- [Community Edition](#community-edition)
- [Enterprise Edition](#enterprise-edition)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [License File Setup](#license-file-setup)
- [Troubleshooting](#troubleshooting)
- [Upgrading](#upgrading)

## Overview

Qarote offers two self-hosted deployment options:

1. **Community Edition** - Open-source (MIT license) with core RabbitMQ monitoring features
2. **Enterprise Edition** - Licensed with workspace management, alerting, and integrations

### Feature Comparison

| Feature                 | Community | Enterprise |
| ----------------------- | --------- | ---------- |
| RabbitMQ Monitoring     | ✅        | ✅         |
| Queue Management        | ✅        | ✅         |
| Exchange Management     | ✅        | ✅         |
| Virtual Host Management | ✅        | ✅         |
| User Management         | ✅        | ✅         |
| Workspace Management    | ❌        | ✅         |
| Team Members            | ❌        | ✅         |
| Alerting System         | ❌        | ✅         |
| Slack Integration       | ❌        | ✅         |
| Webhook Integration     | ❌        | ✅         |
| Data Export             | ❌        | ✅         |
| Advanced Alert Rules    | ❌        | ✅         |

## Community Edition

The Community Edition is free and open-source. It provides core RabbitMQ monitoring capabilities without premium features.

### Recommended: Dokku Deployment

**We recommend using Dokku for self-hosting the Community Edition.** Dokku provides a simple, Heroku-like deployment experience on your own server.

#### Quick Start with Dokku

1. **Install Dokku** on your server (see [Dokku Installation Guide](https://dokku.com/docs/getting-started/installation/))

2. **Create the app and database:**
   ```bash
   ssh dokku@your-server apps:create qarote
   sudo dokku plugin:install https://github.com/dokku/dokku-postgres.git postgres
   dokku postgres:create qarote-db
   dokku postgres:link qarote-db qarote
   ```

3. **Set environment variables:**
   ```bash
   dokku config:set qarote \
     DEPLOYMENT_MODE=community \
     JWT_SECRET=$(openssl rand -base64 32) \
     ENCRYPTION_KEY=$(openssl rand -base64 32) \
     NODE_ENV=production \
     LOG_LEVEL=info
   ```

4. **Deploy:**
   ```bash
   git remote add dokku dokku@your-server:qarote
   git push dokku main
   ```

5. **Set up domain and SSL (optional):**
   ```bash
   dokku domains:set qarote your-domain.com
   dokku letsencrypt:enable qarote
   ```

For more details, see [docs/COMMUNITY_EDITION.md](COMMUNITY_EDITION.md#recommended-dokku-deployment).

### Alternative: Docker Compose Deployment

If you prefer Docker Compose or need more control over the deployment:

1. **Clone the repository:**

   ```bash
   git clone https://github.com/your-org/qarote.git
   cd qarote
   ```

2. **Copy environment file:**

   ```bash
   cp .env.selfhosted.example .env
   # Edit .env and set DEPLOYMENT_MODE=community
   ```

3. **Configure environment variables** (see [Configuration](#configuration))

4. **Start services:**

   ```bash
   export DEPLOYMENT_MODE=community
   docker-compose -f docker-compose.selfhosted.yml up -d
   ```

5. **Run database migrations:**

   ```bash
   docker exec qarote_backend_community npm run db:migrate:dev
   ```

6. **Access the application:**
   - Frontend: http://localhost:8080
   - Backend API: http://localhost:3000

### Environment Variables

**Required:**

- `DEPLOYMENT_MODE=community`
- `JWT_SECRET` - Secret for JWT tokens (min 32 characters)
- `ENCRYPTION_KEY` - Key for encrypting credentials (min 32 characters)
- `DATABASE_URL` - PostgreSQL connection string
- `POSTGRES_PASSWORD` - Database password

**Optional:**

- `ENABLE_EMAIL=false` - Disable email features
- `ENABLE_OAUTH=false` - Disable OAuth authentication
- `ENABLE_SENTRY=false` - Disable error tracking

## Enterprise Edition

The Enterprise Edition requires a valid license file to unlock premium features.

### Obtaining a License

1. **Purchase a license** from the [Customer Portal](https://portal.qarote.io)
2. **Download your license file** (JSON format, cryptographically signed)
3. **Upload the license file** to your server

### Deployment

1. **Clone the repository:**

   ```bash
   git clone https://github.com/your-org/qarote.git
   cd qarote
   ```

2. **Copy environment file:**

   ```bash
   cp .env.selfhosted.example .env
   # Edit .env and set DEPLOYMENT_MODE=community
   ```

3. **Configure environment variables** (see [Configuration](#configuration))

4. **Set up license file:**
   - Place your license file at `./license.json` (or set `LICENSE_FILE_PATH`)
   - Set `LICENSE_PUBLIC_KEY` environment variable (provided with your license)

5. **Start services:**

   ```bash
   export DEPLOYMENT_MODE=enterprise
   docker-compose -f docker-compose.selfhosted.yml up -d
   ```

6. **Run database migrations:**

   ```bash
   docker exec qarote_backend_enterprise npm run db:migrate:dev
   ```

7. **Access the application:**
   - Frontend: http://localhost:8080
   - Backend API: http://localhost:3000

### Environment Variables

**Required:**

- `DEPLOYMENT_MODE=enterprise`
- `LICENSE_FILE_PATH` - Path to license file (default: `./license.json`)
- `LICENSE_PUBLIC_KEY` - Public key for license validation (provided with license)
- `JWT_SECRET` - Secret for JWT tokens (min 32 characters)
- `ENCRYPTION_KEY` - Key for encrypting credentials (min 32 characters)
- `DATABASE_URL` - PostgreSQL connection string
- `POSTGRES_PASSWORD` - Database password

**Optional:**

- `ENABLE_EMAIL=false` - Disable email features (or configure SMTP)
- `ENABLE_OAUTH=false` - Disable OAuth authentication
- `ENABLE_SENTRY=false` - Disable error tracking

## Prerequisites

- Docker and Docker Compose installed
- PostgreSQL database (included in Docker Compose)
- Minimum 2GB RAM, 10GB disk space
- For Enterprise: Valid license file and public key

## Quick Start

### Community Edition

```bash
# 1. Clone repository
git clone https://github.com/your-org/qarote.git
cd qarote

# 2. Set required environment variables
export JWT_SECRET=$(openssl rand -base64 32)
export ENCRYPTION_KEY=$(openssl rand -base64 32)
export POSTGRES_PASSWORD=$(openssl rand -base64 16)

# 3. Start services
export DEPLOYMENT_MODE=community
docker-compose -f docker-compose.selfhosted.yml up -d

# 4. Run migrations
docker exec qarote_backend_community npm run db:migrate:dev

# 5. Access application
open http://localhost:8080
```

### Enterprise Edition

```bash
# 1. Clone repository
git clone https://github.com/your-org/qarote.git
cd qarote

# 2. Set required environment variables
export JWT_SECRET=$(openssl rand -base64 32)
export ENCRYPTION_KEY=$(openssl rand -base64 32)
export POSTGRES_PASSWORD=$(openssl rand -base64 16)
export LICENSE_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"

# 3. Place license file
cp /path/to/your/license.json ./license.json

# 4. Start services
export DEPLOYMENT_MODE=enterprise
docker-compose -f docker-compose.selfhosted.yml up -d

# 5. Run migrations
docker exec qarote_backend_enterprise npm run db:migrate:dev

# 6. Access application
open http://localhost:8080
```

## Configuration

### Environment Variables

Create a `.env` file in the project root or set environment variables:

#### Backend Configuration

```env
# Deployment Mode
DEPLOYMENT_MODE=community  # or "enterprise"

# Database
DATABASE_URL=postgres://postgres:changeme@postgres:5432/qarote
POSTGRES_PASSWORD=changeme

# Security
JWT_SECRET=your-jwt-secret-min-32-characters-long
ENCRYPTION_KEY=your-encryption-key-min-32-characters-long

# License (Enterprise only)
LICENSE_FILE_PATH=./license.json
LICENSE_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----

# Optional Services
ENABLE_EMAIL=false
ENABLE_OAUTH=false
ENABLE_SENTRY=false

# Email Configuration (if ENABLE_EMAIL=true)
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASS=password
FROM_EMAIL=noreply@qarote.io

# CORS
CORS_ORIGIN=*
```

#### Frontend Configuration

```env
# API URL
VITE_API_URL=http://localhost:3000

# Deployment Mode
VITE_DEPLOYMENT_MODE=community  # or "enterprise"

# Optional
VITE_ENABLE_SENTRY=false
VITE_SENTRY_DSN=
```

### Generating Secrets

Generate secure random secrets:

```bash
# JWT Secret (min 32 characters)
openssl rand -base64 32

# Encryption Key (min 32 characters)
openssl rand -base64 32

# Database Password
openssl rand -base64 16
```

## License File Setup

### License File Format

Enterprise licenses are provided as JSON files with cryptographic signatures:

```json
{
  "version": "1.0",
  "licenseKey": "RABBIT-ENT-ABC123...",
  "tier": "ENTERPRISE",
  "customerEmail": "customer@example.com",
  "issuedAt": "2025-01-01T00:00:00.000Z",
  "expiresAt": "2025-12-31T23:59:59.999Z",
  "features": [
    "workspace_management",
    "alerting",
    "slack_integration",
    "webhook_integration",
    "data_export",
    "advanced_alert_rules"
  ],
  "maxInstances": 1,
  "instanceId": "optional-instance-id",
  "signature": "base64-encoded-signature"
}
```

### Installing License File

1. **Download license file** from Customer Portal
2. **Place license file** on your server:

   ```bash
   # Default location
   cp /path/to/downloaded/license.json ./license.json

   # Or specify custom path
   export LICENSE_FILE_PATH=/secure/path/to/license.json
   ```

3. **Set public key** (provided with your license):

   ```bash
   export LICENSE_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----
   ...
   -----END PUBLIC KEY-----"
   ```

4. **Set file permissions** (recommended):

   ```bash
   chmod 600 license.json
   ```

5. **Restart backend service:**
   ```bash
   docker-compose restart backend
   ```

### Instance ID (Optional)

If your license specifies an `instanceId`, the license will only work on that specific server. The instance ID is generated from:

- Hostname
- Platform and architecture
- Network interface MAC address

To get your instance ID:

```bash
docker exec qarote_backend node -e "const {getInstanceId} = require('./dist/core/instance-fingerprint'); console.log(getInstanceId());"
```

When purchasing a license, you can optionally provide your instance ID to lock the license to that server.

## Troubleshooting

### License Validation Failed

**Error:** "License signature verification failed"

**Solutions:**

- Verify `LICENSE_PUBLIC_KEY` is set correctly (include `-----BEGIN PUBLIC KEY-----` and `-----END PUBLIC KEY-----`)
- Ensure license file hasn't been modified
- Check license file path is correct

**Error:** "License expired"

**Solutions:**

- Check license expiration date
- Renew your license from Customer Portal

**Error:** "License instance ID mismatch"

**Solutions:**

- Your license is locked to a specific instance ID
- Ensure you're using the license on the correct server
- Contact support to update instance ID

### Premium Features Not Available

**In Community Edition:**

- This is expected - premium features require Enterprise Edition
- Upgrade prompts will be shown in the UI

**In Enterprise Edition:**

- Verify license file is valid and not expired
- Check license file includes the required features
- Ensure `LICENSE_FILE_PATH` and `LICENSE_PUBLIC_KEY` are set correctly
- Check backend logs for license validation errors

### Database Connection Issues

**Error:** "Connection refused" or "Database not found"

**Solutions:**

- Verify PostgreSQL container is running: `docker-compose ps postgres`
- Check `DATABASE_URL` format: `postgres://user:password@host:port/database`
- Ensure database exists: `docker exec qarote_postgres psql -U postgres -c "CREATE DATABASE qarote;"`

### Services Not Starting

**Check logs:**

```bash
# Backend logs
docker-compose logs backend

# Frontend logs
docker-compose logs frontend

# Database logs
docker-compose logs postgres
```

**Common issues:**

- Missing required environment variables
- Port conflicts (3000, 5432, 8080)
- Insufficient disk space or memory

## Upgrading

### Upgrading Community to Enterprise

1. **Purchase Enterprise license** from Customer Portal
2. **Download license file**
3. **Update environment variables:**
   ```bash
   DEPLOYMENT_MODE=enterprise
   LICENSE_FILE_PATH=./license.json
   LICENSE_PUBLIC_KEY="..."
   ```
4. **Place license file** on server
5. **Restart services:**
   ```bash
   export DEPLOYMENT_MODE=enterprise
   docker-compose -f docker-compose.selfhosted.yml up -d
   ```

### Updating Qarote

1. **Pull latest changes:**

   ```bash
   git pull origin main
   ```

2. **Rebuild containers:**

   ```bash
   docker-compose build
   docker-compose up -d
   ```

3. **Run migrations:**
   ```bash
   docker exec qarote_backend npm run db:migrate:dev
   ```

## Air-Gapped Deployments

For completely offline deployments:

1. **Set all external services to disabled:**

   ```env
   ENABLE_EMAIL=false
   ENABLE_OAUTH=false
   ENABLE_SENTRY=false
   ```

2. **Use SMTP for email** (if needed):

   ```env
   ENABLE_EMAIL=true
   EMAIL_PROVIDER=smtp
   SMTP_HOST=your-smtp-server
   SMTP_PORT=587
   SMTP_USER=user@example.com
   SMTP_PASS=password
   ```

3. **License validation is offline** - no network required after initial license file setup

## Support

- **Documentation:** https://qarote.io/docs
- **Community Edition:** GitHub Issues
- **Enterprise Edition:** support@qarote.io
- **Customer Portal:** https://portal.qarote.io

## Security Best Practices

1. **Keep license file secure:**
   - Store in secure location with restricted permissions
   - Never commit license files to version control
   - Use `chmod 600` for license file

2. **Use strong secrets:**
   - Generate random secrets (32+ characters)
   - Rotate secrets periodically
   - Never share secrets

3. **Network security:**
   - Use private networks when possible
   - Restrict database access
   - Use HTTPS in production

4. **Regular updates:**
   - Keep Qarote updated
   - Monitor security advisories
   - Apply patches promptly
