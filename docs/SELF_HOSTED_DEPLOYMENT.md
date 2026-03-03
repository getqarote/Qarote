# Qarote Self-Hosted Deployment Guide

This guide covers deploying Qarote as a self-hosted application. All self-hosted instances start with core features; premium features are activated by entering a license key in Settings → License.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Quick Start: Binary](#quick-start-binary)
- [Quick Start: Docker Compose](#quick-start-docker-compose)
- [Quick Start: Dokku](#quick-start-dokku)
- [Configuration](#configuration)
- [SMTP Configuration](#smtp-configuration)
- [License Activation](#license-activation)
- [Updating](#updating)
- [Troubleshooting](#troubleshooting)
- [Air-Gapped Deployments](#air-gapped-deployments)
- [Security Best Practices](#security-best-practices)
- [Support](#support)

## Overview

Qarote self-hosted provides core RabbitMQ monitoring out of the box. Premium features (workspace management, alerting, integrations) are unlocked by activating a license key through the UI — no env vars, no file management, no restart needed.

### Feature Comparison

| Feature                 | Free  | Licensed |
| ----------------------- | ----- | -------- |
| RabbitMQ Monitoring     | ✅    | ✅       |
| Queue Management        | ✅    | ✅       |
| Exchange Management     | ✅    | ✅       |
| Virtual Host Management | ✅    | ✅       |
| User Management         | ✅    | ✅       |
| Workspace Management    | ❌    | ✅       |
| Team Members            | ❌    | ✅       |
| Alerting System         | ❌    | ✅       |
| Slack Integration       | ❌    | ✅       |
| Webhook Integration     | ❌    | ✅       |
| Data Export             | ❌    | ✅       |
| Advanced Alert Rules    | ❌    | ✅       |

## Prerequisites

Requirements depend on your deployment method:

- **Binary:** PostgreSQL 15+ (no Docker, Node.js, or web server needed)
- **Docker Compose:** Docker and Docker Compose (PostgreSQL is included)
- **Dokku:** Dokku installed on your server
- Minimum 2GB RAM, 10GB disk space

## Quick Start: Binary

Qarote is available as a single binary that embeds both the API and frontend. No Docker, Node.js, or web server required — only PostgreSQL.

> **Install PostgreSQL** if you don't have it:
> - **macOS:** `brew install postgresql@15`
> - **Ubuntu/Debian:** `sudo apt install postgresql`
> - **Windows (WSL2):** `sudo apt install postgresql`

### Database Setup

After installing PostgreSQL, create a dedicated user and database:

```bash
# 1. Create a user and database for Qarote
sudo -u postgres psql -c "CREATE USER qarote WITH PASSWORD 'your-secure-password';"
sudo -u postgres psql -c "CREATE DATABASE qarote OWNER qarote;"
```

Your database URL will be: `postgresql://qarote:your-secure-password@localhost:5432/qarote`

<!-- Update VERSION below to match the latest release from https://github.com/getqarote/Qarote/releases -->

```bash
VERSION=v1.2.0-beta.1

# 2. Download and extract for your platform
# Linux x64
curl -L https://github.com/getqarote/Qarote/releases/download/$VERSION/qarote-linux-x64.tar.gz | tar xz --strip-components=1
# Linux ARM64
curl -L https://github.com/getqarote/Qarote/releases/download/$VERSION/qarote-linux-arm64.tar.gz | tar xz --strip-components=1
# macOS Apple Silicon (M1/M2/M3)
curl -L https://github.com/getqarote/Qarote/releases/download/$VERSION/qarote-darwin-arm64.tar.gz | tar xz --strip-components=1
# macOS Intel
curl -L https://github.com/getqarote/Qarote/releases/download/$VERSION/qarote-darwin-x64.tar.gz | tar xz --strip-components=1
# Windows: use Linux x64 inside WSL2
# Multipass on Apple Silicon: VMs are ARM64, use linux-arm64 (not linux-x64)

# 3. Interactive setup (generates .env, tests database connection)
./qarote setup

# 4. Start Qarote (opens on http://localhost:3000)
./qarote
```

The `setup` command will:
1. Ask for your PostgreSQL URL and verify the connection
2. **Create an admin account** (recommended) — a pre-created user written directly to the database on first boot, so you can log in immediately without signing up
3. **Configure public registration** — whether the `/auth/sign-up` page is open to anyone. If you created an admin account, you can safely disable this and invite team members later via invite links
4. Generate secure secrets (`JWT_SECRET`, `ENCRYPTION_KEY`)
5. Write a `.env` file in the current directory

> **Tip:** For a secure self-hosted setup, say **Yes** to admin account and **No** to public registration. This way only you have access, and you can invite others from within the app.

The binary serves both the API and frontend on a single port (default: 3000). Database migrations run automatically on startup. The `migrations/` directory must remain alongside the binary.

### Manual Setup (without the wizard)

You can skip `./qarote setup` and configure directly:

```bash
./qarote \
  --database-url postgresql://user:pass@localhost/qarote \
  --jwt-secret $(openssl rand -hex 64) \
  --encryption-key $(openssl rand -hex 64)
```

To enable email, add SMTP flags:

```bash
./qarote \
  --database-url postgresql://user:pass@localhost/qarote \
  --jwt-secret $(openssl rand -hex 64) \
  --encryption-key $(openssl rand -hex 64) \
  --enable-email true \
  --smtp-host smtp.gmail.com \
  --smtp-port 587 \
  --smtp-user your-email@gmail.com \
  --smtp-pass your-app-password
```

### CLI Reference

| Flag / Command | Description |
|----------------|-------------|
| `./qarote setup` | Interactive setup wizard (generates `.env`) |
| `--database-url <url>` | PostgreSQL connection URL |
| `--jwt-secret <secret>` | JWT signing secret (min 32 characters) |
| `--encryption-key <key>` | Encryption key (min 32 characters) |
| `-p`, `--port <port>` | Server port (default: 3000) |
| `-h`, `--host <host>` | Server host (default: localhost) |
| `--enable-email <bool>` | Enable email features (default: false) |
| `--smtp-host <host>` | SMTP server hostname |
| `--smtp-port <port>` | SMTP server port (default: 587) |
| `--smtp-user <user>` | SMTP username |
| `--smtp-pass <pass>` | SMTP password |
| `--smtp-service <name>` | SMTP service for OAuth2 (e.g., `gmail`) |
| `--smtp-oauth-client-id <id>` | OAuth2 client ID |
| `--smtp-oauth-client-secret <secret>` | OAuth2 client secret |
| `--smtp-oauth-refresh-token <token>` | OAuth2 refresh token |

## Quick Start: Docker Compose

```bash
# 1. Clone repository
git clone https://github.com/getqarote/Qarote.git qarote
cd qarote

# 2. Generate .env with secure secrets
./setup.sh

# 3. Start services
docker compose -f docker-compose.selfhosted.yml up -d

# 4. Run migrations
docker exec qarote_backend pnpm run db:migrate

# 5. Access application
# Frontend: http://localhost:8080
# Backend API: http://localhost:3000
```


## Quick Start: Dokku

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
     JWT_SECRET=$(openssl rand -hex 64) \
     ENCRYPTION_KEY=$(openssl rand -hex 64) \
     ENABLE_EMAIL=false
   ```

   To enable email, set `ENABLE_EMAIL=true` and add SMTP settings:

   ```bash
   dokku config:set qarote \
     ENABLE_EMAIL=true \
     SMTP_HOST=smtp.gmail.com \
     SMTP_PORT=587 \
     SMTP_USER=your-email@gmail.com \
     SMTP_PASS=your-app-password
   ```

   See [SMTP Configuration](#smtp-configuration) for provider-specific examples and OAuth2 setup.

   > `DATABASE_URL` is automatically set by Dokku when you link the PostgreSQL service. `NODE_ENV`, `PORT`, and `HOST` are also set automatically by Dokku. `DEPLOYMENT_MODE`, `LOG_LEVEL`, and other defaults are handled by the application.

4. **Deploy:**

   ```bash
   git remote add dokku dokku@your-server:qarote
   git push dokku main
   ```

5. **Domain and SSL (optional):**

   ```bash
   dokku domains:set qarote your-domain.com
   dokku letsencrypt:enable qarote
   ```

## Configuration

### Environment Variables

Create a `.env` file or use `./setup.sh` to generate one:

```env
# Database
DATABASE_URL=postgres://postgres:changeme@postgres:5432/qarote
POSTGRES_PASSWORD=changeme

# Security (generate with: openssl rand -hex 64)
JWT_SECRET=your-jwt-secret-min-32-characters-long
ENCRYPTION_KEY=your-encryption-key-min-32-characters-long

# Optional: Email (disabled by default)
ENABLE_EMAIL=false
```

### Generating Secrets

Use the setup script:

```bash
./setup.sh
```

Or generate manually with OpenSSL:

```bash
openssl rand -hex 64  # JWT_SECRET
openssl rand -hex 64  # ENCRYPTION_KEY
openssl rand -hex 32  # POSTGRES_PASSWORD
```

## SMTP Configuration

Email features are **disabled by default** for self-hosted deployments. To enable email (for password resets, invitations, notifications), configure SMTP settings.

### Authentication Methods

**OAuth2 (Recommended)**

For production environments, OAuth2 is the recommended authentication method as it's more secure than app passwords and doesn't require storing credentials directly.

**Benefits:**

- More secure than app-specific passwords
- Tokens can be revoked without changing account passwords
- Better for enterprise and high-volume sending
- Compliant with modern security standards

For detailed OAuth2 configuration instructions, see the [Nodemailer OAuth2 Documentation](https://nodemailer.com/smtp/oauth2/).

### Supported SMTP Providers

**Gmail**

_Option 1: App Password (Simple)_

```env
ENABLE_EMAIL=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

**Requirements:**

- Enable 2FA on your Google account first
- Generate an [App Password](https://support.google.com/accounts/answer/185833) (not your regular password)
- **Sending limits:** 500 emails/day for free Gmail accounts, 2,000/day for Google Workspace

_Option 2: OAuth2 (Recommended for production)_

```env
ENABLE_EMAIL=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_SERVICE=gmail
SMTP_OAUTH_CLIENT_ID=your-client-id.apps.googleusercontent.com
SMTP_OAUTH_CLIENT_SECRET=your-client-secret
SMTP_OAUTH_REFRESH_TOKEN=your-refresh-token
```

**OAuth2 Setup Steps:**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use existing)
3. Enable Gmail API for your project
4. Create OAuth 2.0 credentials (OAuth client ID → Web application)
5. Add `https://developers.google.com/oauthplayground` to authorized redirect URIs
6. Use [OAuth2 Playground](https://developers.google.com/oauthplayground/) to get refresh token:
   - Click the gear icon → Use your own OAuth credentials
   - Enter your Client ID and Client Secret
   - In "Select & authorize APIs", enter `https://mail.google.com/`
   - Authorize APIs and grant access
   - Exchange authorization code for tokens
   - Copy the refresh token

For detailed instructions, see [Nodemailer Gmail OAuth2 Guide](https://nodemailer.com/smtp/oauth2/#example-3)

**SendGrid**

```env
ENABLE_EMAIL=true
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
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
```

**Requirements:**

- Add and verify your domain in Mailgun dashboard first
- Username format: `postmaster@your-domain.mailgun.org`
- Find SMTP credentials in Mailgun → Sending → Domain settings
- **Free tier:** First 3 months free (up to 5,000/month), then paid only

**Amazon SES**

```env
ENABLE_EMAIL=true
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-ses-smtp-username
SMTP_PASS=your-ses-smtp-password
```

**Requirements:**

- Replace `us-east-1` with your SES region (e.g., `eu-west-1`)
- SMTP credentials are **not** your AWS access keys — generate them in SES console → SMTP Settings
- Verify your sender email or domain in SES before sending
- New accounts start in **sandbox mode** (can only send to verified addresses) — request production access to remove limits
- **Free tier:** 62,000 emails/month when sent from an EC2 instance, otherwise $0.10 per 1,000 emails

**Office 365 / Outlook**

_Option 1: Basic Authentication_

```env
ENABLE_EMAIL=true
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=your-email@yourdomain.com
SMTP_PASS=your-password
```

**Important:** Enable SMTP AUTH in Microsoft 365 admin center (Settings → Org settings → Modern authentication). For 2FA/MFA accounts, use an App Password.

_Option 2: OAuth2 (Recommended)_

OAuth2 is recommended for Office 365/Outlook as it doesn't require enabling legacy SMTP AUTH. See [Nodemailer OAuth2 Documentation](https://nodemailer.com/smtp/oauth2/) for setup instructions.

**Note**: Personal @outlook.com accounts should use `smtp-mail.outlook.com` instead.

**Custom SMTP Server**

```env
ENABLE_EMAIL=true
SMTP_HOST=mail.yourcompany.com
SMTP_PORT=587
SMTP_USER=smtp-user
SMTP_PASS=smtp-password
```

### Testing SMTP Configuration

```bash
# Docker Compose
docker exec qarote_backend pnpm run test:smtp
docker exec qarote_backend pnpm run test:smtp -- --send admin@yourcompany.com

# Dokku
dokku run qarote pnpm run test:smtp -- --send admin@yourcompany.com
```

## License Activation

Premium features are activated through the UI — no env vars or file management needed.

1. **Purchase a license** from the [Customer Portal](https://portal.qarote.io)
2. **Copy your license key** (a JWT string provided after purchase)
3. **In Qarote**, go to **Settings → License**
4. **Paste your license key** and click Activate

Features unlock immediately — no restart required. To deactivate, use the same settings page.

## Updating

### Binary

```bash
# Check the latest release at https://github.com/getqarote/Qarote/releases
VERSION=v1.2.0-beta.1

# Record current version and create a backup
./qarote --version
cp qarote qarote.backup

# Stop the running instance
kill $(pgrep -f './qarote') 2>/dev/null || true

# Download and extract in-place (pick your platform)
# Linux x64
curl -L https://github.com/getqarote/Qarote/releases/download/$VERSION/qarote-linux-x64.tar.gz | tar xz --strip-components=1
# Linux ARM64
curl -L https://github.com/getqarote/Qarote/releases/download/$VERSION/qarote-linux-arm64.tar.gz | tar xz --strip-components=1
# macOS Apple Silicon
curl -L https://github.com/getqarote/Qarote/releases/download/$VERSION/qarote-darwin-arm64.tar.gz | tar xz --strip-components=1
# macOS Intel
curl -L https://github.com/getqarote/Qarote/releases/download/$VERSION/qarote-darwin-x64.tar.gz | tar xz --strip-components=1

# Verify the new version
./qarote --version

# Restart — new migrations are applied automatically on startup
./qarote
```

Your `.env` file is preserved. New database migrations are applied automatically on startup.

> **Rollback:** If the new version has issues, restore the backup: `mv qarote.backup qarote && ./qarote`

### Docker Compose

```bash
git pull origin main
docker compose -f docker-compose.selfhosted.yml build
docker compose -f docker-compose.selfhosted.yml up -d
```

### Dokku

```bash
git push dokku main
```

## Troubleshooting

### "Exec format error" (Binary)

This means you downloaded the wrong architecture. Check your platform with `uname -m`:

- `x86_64` → use the `-x64` variant
- `aarch64` (Linux) or `arm64` (macOS) → use the `-arm64` variant

Then re-download the correct binary in-place:

```bash
# Example: switch from linux-x64 to linux-arm64
VERSION=v1.2.0-beta.1  # or your installed version
curl -L https://github.com/getqarote/Qarote/releases/download/$VERSION/qarote-linux-arm64.tar.gz | tar xz --strip-components=1
./qarote setup
```

> **Tip:** Multipass on Apple Silicon creates ARM64 VMs — use `linux-arm64`, not `linux-x64`. macOS users on Apple Silicon should pick `darwin-arm64`.

### Database Connection Issues

**Error:** "Connection refused" or "Database not found"

- Verify PostgreSQL is running: `docker compose ps postgres`
- Check `DATABASE_URL` format: `postgres://user:password@host:port/database`
- Wait for PostgreSQL to fully initialize (check health status)
- Ensure database migrations have been run

### Services Not Starting

```bash
# Check logs
docker compose -f docker-compose.selfhosted.yml logs
```

**Common issues:**

- Missing required environment variables — verify `.env` file
- Port conflicts (3000, 5432, 8080) — ensure ports are available
- Insufficient disk space or memory

### License Issues

- Verify your license key is valid and not expired
- Re-activate your license from Settings → License
- Check license expiration date in the license settings page
- Contact support@qarote.io if issues persist

### Premium Features Not Available

- Verify your license is active in Settings → License
- Check that the license includes the required features
- Check backend logs for license validation errors

## Air-Gapped Deployments

For completely offline deployments:

1. **Disable external services:**

   ```env
   ENABLE_EMAIL=false
   ENABLE_OAUTH=false
   ```

2. **Configure SMTP** if email is needed (see [SMTP Configuration](#smtp-configuration))

3. **License validation is offline** — no network required after activation

## Security Best Practices

1. **Use strong secrets:** Generate random values (32+ characters) for `JWT_SECRET` and `ENCRYPTION_KEY` if not using setup-generated defaults
2. **Keep your license key private** — do not share it publicly
3. **Restrict database access** — use private networks when possible
4. **Regularly update** to the latest version

## Support

- **Documentation:** https://qarote.io/docs
- **Community:** GitHub Issues
- **Licensed users:** support@qarote.io
- **Customer Portal:** https://portal.qarote.io
