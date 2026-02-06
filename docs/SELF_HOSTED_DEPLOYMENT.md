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
     NODE_ID=community-1 \
     NODE_ENV=production \
     LOG_LEVEL=info \
     JWT_SECRET=$(openssl rand -base64 32) \
     ENCRYPTION_KEY=$(openssl rand -base64 32) \
     CORS_ORIGIN=* \
     FRONTEND_URL=https://your-domain.com \
     ENABLE_EMAIL=false
   ```

   **Note:** `DATABASE_URL` is automatically set by Dokku when you link the PostgreSQL service. `PORT` and `HOST` are also set automatically by Dokku.

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
   git clone https://github.com/getqarote/Qarote.git
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
   docker compose -f docker-compose.selfhosted.yml up -d
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

**Note:** OAuth authentication (Google Sign-In) is only available in cloud deployments. Self-hosted deployments use email/password authentication.

## Enterprise Edition

The Enterprise Edition requires a valid license file to unlock premium features.

### Obtaining a License

1. **Purchase a license** from the [Customer Portal](https://portal.qarote.io)
2. **Download your license file** (JSON format, cryptographically signed)
3. **Upload the license file** to your server

### Deployment

1. **Clone the repository:**

   ```bash
   git clone https://github.com/getqarote/Qarote.git
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
   docker compose -f docker-compose.selfhosted.yml up -d
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

**Note:** OAuth authentication (Google Sign-In) is only available in cloud deployments. Self-hosted deployments use email/password authentication.

## Prerequisites

- Docker and Docker Compose installed
- PostgreSQL database (included in Docker Compose)
- Minimum 2GB RAM, 10GB disk space
- For Enterprise: Valid license file and public key

## Quick Start

### Community Edition

```bash
# 1. Clone repository
git clone https://github.com/getqarote/Qarote.git
cd qarote

# 2. Set required environment variables
export JWT_SECRET=$(openssl rand -base64 32)
export ENCRYPTION_KEY=$(openssl rand -base64 32)
export POSTGRES_PASSWORD=$(openssl rand -base64 16)

# 3. Start services
export DEPLOYMENT_MODE=community
docker compose -f docker-compose.selfhosted.yml up -d

# 4. Run migrations
docker exec qarote_backend_community npm run db:migrate:dev

# 5. Access application
open http://localhost:8080
```

### Enterprise Edition

```bash
# 1. Clone repository
git clone https://github.com/getqarote/Qarote.git
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
docker compose -f docker-compose.selfhosted.yml up -d

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

# Note: OAuth (Google Sign-In) is only available in cloud deployments.
# Self-hosted deployments use email/password authentication.

# SMTP Configuration (if ENABLE_EMAIL=true)
# Option 1: Basic Authentication
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASS=password
FROM_EMAIL=noreply@qarote.io

# Option 2: OAuth2 (Recommended - see SMTP Configuration section)
# SMTP_SERVICE=gmail
# SMTP_OAUTH_CLIENT_ID=your-client-id
# SMTP_OAUTH_CLIENT_SECRET=your-client-secret
# SMTP_OAUTH_REFRESH_TOKEN=your-refresh-token

# CORS
CORS_ORIGIN=*
```

#### Frontend Configuration

```env
# API URL
VITE_API_URL=http://localhost:3000

# Deployment Mode
VITE_DEPLOYMENT_MODE=community  # or "enterprise"
```

### Generating Secrets

Use the built-in setup script to generate all required secrets:

```bash
# Generate and display secrets
pnpm setup:selfhosted

# Generate and write to .env file
pnpm setup:selfhosted --write
```

This generates:

- `JWT_SECRET` (64 bytes)
- `ENCRYPTION_KEY` (64 bytes)
- `POSTGRES_PASSWORD` (32 bytes)

Alternatively, generate manually with OpenSSL:

```bash
# JWT Secret (min 32 characters)
openssl rand -base64 32

# Encryption Key (min 32 characters)
openssl rand -base64 32

# Database Password
openssl rand -base64 16
```

### SMTP Configuration

Email features are **disabled by default** for self-hosted deployments. To enable email (for password resets, invitations, notifications), configure SMTP settings.

#### Authentication Methods

**OAuth2 (Recommended)**

For production environments, OAuth2 is the recommended authentication method as it's more secure than app passwords and doesn't require storing credentials directly. OAuth2 is especially recommended for Gmail and Office 365.

**Benefits:**
- More secure than app-specific passwords
- Tokens can be revoked without changing account passwords
- Better for enterprise and high-volume sending
- Compliant with modern security standards

**Setup Guide:**
For detailed OAuth2 configuration instructions, see the [Nodemailer OAuth2 Documentation](https://nodemailer.com/smtp/oauth2/). The setup process varies by provider but generally involves:
1. Creating OAuth2 credentials in your email provider's console
2. Configuring the OAuth2 settings in your `.env` file
3. Obtaining and refreshing access tokens

See provider-specific OAuth2 examples below.

#### Supported SMTP Providers

**Gmail**

*Option 1: App Password (Simple)*
```env
ENABLE_EMAIL=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=your-email@gmail.com
```

**Requirements:**
- Enable 2FA on your Google account first
- Generate an [App Password](https://support.google.com/accounts/answer/185833) (not your regular password)
- **Sending limits:** 500 emails/day for free Gmail accounts, 2,000/day for Google Workspace

*Option 2: OAuth2 (Recommended for production)*
```env
ENABLE_EMAIL=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_SERVICE=gmail
SMTP_OAUTH_CLIENT_ID=your-client-id.apps.googleusercontent.com
SMTP_OAUTH_CLIENT_SECRET=your-client-secret
SMTP_OAUTH_REFRESH_TOKEN=your-refresh-token
FROM_EMAIL=your-email@gmail.com
```

**OAuth2 Setup Steps:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use existing)
3. Enable Gmail API for your project
4. Create OAuth 2.0 credentials (OAuth client ID → Web application)
5. Add `https://developers.google.com/oauthplayground` to authorized redirect URIs
6. Use [OAuth2 Playground](https://developers.google.com/oauthplayground/) to get refresh token:
   - Click the gear icon (⚙️) in top right
   - Check "Use your own OAuth credentials"
   - Enter your Client ID and Client Secret
   - In "Select & authorize APIs", enter `https://mail.google.com/`
   - Click "Authorize APIs" and grant access
   - Click "Exchange authorization code for tokens"
   - Copy the refresh token

For detailed instructions, see [Nodemailer Gmail OAuth2 Guide](https://nodemailer.com/smtp/oauth2/#example-3)

**SendGrid**
```env
ENABLE_EMAIL=true
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
FROM_EMAIL=noreply@yourdomain.com
```

**Requirements:**
- Username is literally `apikey` (not your email address)
- Password is your SendGrid API key (create at Settings → API Keys)
- Verify your sender domain in SendGrid dashboard first
- **Free tier:** 100 emails/day

**Mailgun**
```env
ENABLE_EMAIL=true
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@your-domain.mailgun.org
SMTP_PASS=your-mailgun-password
FROM_EMAIL=noreply@yourdomain.com
```

**Requirements:**
- Add and verify your domain in Mailgun dashboard first
- Username format: `postmaster@your-domain.mailgun.org`
- Find SMTP credentials in Mailgun → Sending → Domain settings
- **Free tier:** First 3 months free (up to 5,000/month), then paid only

**Office 365 / Outlook (Business)**

*Option 1: Basic Authentication (Requires SMTP AUTH enabled)*
```env
ENABLE_EMAIL=true
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=your-email@yourdomain.com
SMTP_PASS=your-password
FROM_EMAIL=your-email@yourdomain.com
```

**Important - Modern Authentication Required:**

Office 365 uses Modern Authentication. Before using SMTP, you must:

1. **Enable SMTP AUTH** in Microsoft 365 admin center:
   - Go to Microsoft 365 admin center → Settings → Org settings
   - Select "Modern authentication"
   - Enable SMTP AUTH for your organization

2. **For accounts with 2FA/MFA enabled:**
   - Generate an App Password from your Microsoft account security settings
   - Use the App Password instead of your regular password

3. **Alternative:** Contact your Microsoft 365 administrator to enable SMTP AUTH for your account.

*Option 2: OAuth2 (Recommended for enterprise)*

OAuth2 is recommended for Office 365/Outlook as it doesn't require enabling legacy SMTP AUTH. See [Nodemailer OAuth2 Documentation](https://nodemailer.com/smtp/oauth2/) for detailed setup instructions for Microsoft 365.

**Note**: Personal @outlook.com or @hotmail.com accounts should use `smtp-mail.outlook.com` instead of `smtp.office365.com`.

**Custom SMTP Server**
```env
ENABLE_EMAIL=true
SMTP_HOST=mail.yourcompany.com
SMTP_PORT=587
SMTP_USER=smtp-user
SMTP_PASS=smtp-password
FROM_EMAIL=noreply@yourcompany.com
```

**Additional OAuth2 Providers**

For OAuth2 configuration with other providers (Outlook.com, Yahoo, AOL, etc.), refer to the comprehensive [Nodemailer OAuth2 Documentation](https://nodemailer.com/smtp/oauth2/). It includes:
- Step-by-step setup guides for major providers
- Code examples for token generation and refresh
- Troubleshooting common OAuth2 issues
- Security best practices

#### Testing SMTP Configuration

After configuring SMTP, verify your setup with the built-in testing script:

**Test connection only:**
```bash
pnpm test:smtp
```

**Send test email via real SMTP:**
```bash
pnpm test:smtp --send admin@yourcompany.com

# Or test with production React Email template
pnpm test:smtp --send admin@yourcompany.com --template
```

**Development Testing with Ethereal:**

For development and testing without a real SMTP server, use Ethereal Email:

```bash
# Verify Ethereal connection
pnpm test:smtp:ethereal

# Send simple test email and get preview URL
pnpm test:smtp:ethereal --send test@example.com

# Test with production React Email templates
pnpm test:smtp:ethereal --send test@example.com --template
```

**What is Ethereal?**

Ethereal is a fake SMTP service that:
- Never actually delivers emails
- Provides web preview URLs to view rendered emails
- Requires no configuration or API keys
- Perfect for testing email templates during development

The script will display a preview URL where you can view the test email in your browser.

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
   docker compose restart backend
   ```


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

- Verify PostgreSQL container is running: `docker compose ps postgres`
- Check `DATABASE_URL` format: `postgres://user:password@host:port/database`
- Ensure database exists: `docker exec qarote_postgres psql -U postgres -c "CREATE DATABASE qarote;"`

### Services Not Starting

**Check logs:**

```bash
# Backend logs
docker compose logs backend

# Frontend logs
docker compose logs frontend

# Database logs
docker compose logs postgres
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
   docker compose -f docker-compose.selfhosted.yml up -d
   ```

### Updating Qarote

Run the update script from the Qarote root directory:

```bash
./scripts/update.sh
```

This will:
1. Pull latest changes from git
2. Rebuild Docker containers
3. Restart services (database migrations run automatically on start)

**Manual update (alternative):**

```bash
git pull origin main
docker compose -f docker-compose.selfhosted.yml build
docker compose -f docker-compose.selfhosted.yml up -d
```

### Update Notifications

If you purchased an Enterprise license, Qarote will automatically notify you by email when a new version is available. Notifications are sent to the email address associated with your license once every 24 hours when a new release is detected.

## Air-Gapped Deployments

For completely offline deployments:

1. **Set all external services to disabled:**

   ```env
   ENABLE_EMAIL=false
   ENABLE_OAUTH=false
   ```

2. **Use SMTP for email** (if needed):

   **Gmail (App Password):**
   ```env
   ENABLE_EMAIL=true
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   FROM_EMAIL=your-email@gmail.com
   ```
   Note: Enable 2FA first, then generate an [App Password](https://support.google.com/accounts/answer/185833). Limit: 500 emails/day (free) or 2,000/day (Workspace).
   
   **For production, consider OAuth2** (more secure): See [SMTP Configuration](#smtp-configuration) section for OAuth2 setup.

   **SendGrid:**
   ```env
   ENABLE_EMAIL=true
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_USER=apikey
   SMTP_PASS=your-sendgrid-api-key
   FROM_EMAIL=noreply@yourdomain.com
   ```
   Note: Username is `apikey` (literal string). Password is your SendGrid API key. Verify sender domain first. Free tier: 100 emails/day.

   **Mailgun:**
   ```env
   ENABLE_EMAIL=true
   SMTP_HOST=smtp.mailgun.org
   SMTP_PORT=587
   SMTP_USER=postmaster@your-domain.mailgun.org
   SMTP_PASS=your-mailgun-password
   FROM_EMAIL=noreply@yourdomain.com
   ```
   Note: Verify domain first. Username format: `postmaster@your-domain.mailgun.org`. Find credentials in Mailgun dashboard (Sending → Domain settings).

   **Office 365 / Outlook (Business):**
   ```env
   ENABLE_EMAIL=true
   SMTP_HOST=smtp.office365.com
   SMTP_PORT=587
   SMTP_USER=your-email@yourdomain.com
   SMTP_PASS=your-password
   FROM_EMAIL=your-email@yourdomain.com
   ```
   
   **Important:** Office 365 requires Modern Authentication. Enable SMTP AUTH in Microsoft 365 admin center (Settings → Org settings → Modern authentication). For 2FA/MFA accounts, use an App Password instead of your regular password.

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
