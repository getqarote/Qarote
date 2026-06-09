# Qarote Self-Hosted Deployment Guide

This guide covers deploying Qarote as a self-hosted application. All self-hosted instances start with core features; premium features are activated by entering a license key in Settings → License.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Quick Start: Binary](#quick-start-binary)
- [Quick Start: Docker Compose](#quick-start-docker-compose)
- [Quick Start: Docker Compose (Enterprise Edition)](#quick-start-docker-compose-enterprise-edition)
- [Quick Start: Dokku](#quick-start-dokku)
- [Configuration](#configuration)
- [SMTP Configuration](#smtp-configuration)
- [SSO Configuration](#sso-configuration)
- [Testing SSO with Keycloak](#testing-sso-with-keycloak)
- [License Activation](#license-activation)
- [Updating](#updating)
- [Troubleshooting](#troubleshooting)
- [Air-Gapped Deployments](#air-gapped-deployments)
- [Security Best Practices](#security-best-practices)
- [Support](#support)

## Overview

Qarote self-hosted provides core RabbitMQ monitoring out of the box. Premium features (workspace management, alerting, integrations) are unlocked by activating a license key through the UI — no env vars, no file management, no restart needed.

### Feature Comparison

| Feature                 | Free | Licensed |
| ----------------------- | ---- | -------- |
| RabbitMQ Monitoring     | ✅   | ✅       |
| Queue Management        | ✅   | ✅       |
| Exchange Management     | ✅   | ✅       |
| Virtual Host Management | ✅   | ✅       |
| User Management         | ✅   | ✅       |
| Workspace Management    | ❌   | ✅       |
| Team Members            | ❌   | ✅       |
| Alerting System         | ✅   | ✅       |
| Slack Integration       | ❌   | ✅       |
| Webhook Integration     | ❌   | ✅       |
| Data Export             | ❌   | ✅       |
| Advanced Alert Rules    | ❌   | ✅       |

## Prerequisites

Requirements depend on your deployment method:

- **Binary:** PostgreSQL 17+ **with the TimescaleDB extension** (no Docker, Node.js, or web server needed)
- **Docker Compose:** Docker and Docker Compose (a TimescaleDB-enabled PostgreSQL is included)
- **Dokku:** Dokku installed on your server (the Postgres service must use a TimescaleDB image — see below)
- Minimum 2GB RAM, 10GB disk space

> ### ⚠️ TimescaleDB is required (not optional)
>
> Qarote stores time-series data (`queue_metric_snapshots`,
> `MessageTraceEvent`) in **TimescaleDB hypertables**. On every startup the
> API runs `prisma migrate deploy`, which executes
> `CREATE EXTENSION IF NOT EXISTS timescaledb`. If the Postgres server does
> **not** ship the TimescaleDB extension, that statement fails and **the API
> crash-loops on boot** — it is not a silent degradation.
>
> Use a TimescaleDB-enabled image/package everywhere:
>
> - **Docker Compose:** `timescale/timescaledb-ha:pg17` (the bundled compose
>   files already pin this). The HA image stores its data under
>   `/home/postgres/pgdata` (`PGDATA=/home/postgres/pgdata/data`), **not**
>   `/var/lib/postgresql/data` — the compose files mount the volume there
>   accordingly.
> - **Dokku:** the NON-HA `timescale/timescaledb` image (`latest-pg17`). The
>   `dokku-postgres` plugin mounts data at `/var/lib/postgresql/data`, which the
>   standard image uses — so data persists. Do **not** use `timescaledb-ha`
>   under dokku-postgres (it writes outside the plugin's volume). See the Dokku
>   section below.
> - **Binary / bare-metal:** install the `timescaledb` package into your
>   PostgreSQL 17 server (see the Binary section below).
>
> Retention is handled entirely by TimescaleDB: metrics are kept for **30
> days** and trace events for **7 days** via chunk-drop policies — there are no
> per-tenant cleanup cron jobs to configure.

> ### ⬆️ Upgrading an existing (pre-TimescaleDB) deployment
>
> Earlier releases ran a plain `postgres:17-alpine` image with the data volume
> mounted at `/var/lib/postgresql/data`. The TimescaleDB image stores data at
> `/home/postgres/pgdata/data`, and the compose files now mount the
> `postgres_data` volume at `/home/postgres/pgdata`. **If you just pull the new
> images and `up -d`, Postgres will initialise an empty database at the new path
> and your existing data (accounts, servers, licenses) will appear "lost"** —
> it's still in the volume, just at the old location.
>
> Before upgrading: **back up first** (`pg_dump` against the running old
> container), then migrate the data into the new layout. The simplest, safest
> path:
>
> ```bash
> # 1. With the OLD stack still running, dump everything:
> docker compose -f docker-compose.selfhosted.yml exec postgres \
>   pg_dump -U postgres -Fc qarote > qarote-backup.dump
>
> # 2. Pull the new images, recreate the postgres service on a FRESH volume
> #    (rename or remove the old postgres_data volume so the HA image initdb's
> #    cleanly at /home/postgres/pgdata/data), then bring up only postgres:
> docker compose -f docker-compose.selfhosted.yml up -d postgres
>
> # 3. Restore into the new TimescaleDB-backed database, then start the rest.
> #    (The app's migrations run CREATE EXTENSION + create_hypertable on boot;
> #    restoring the schema-only dump first is unnecessary — let migrations build
> #    the hypertables, then restore data, OR pg_restore the full dump which
> #    re-creates tables as plain tables. If you pg_restore the full dump,
> #    convert the two time-series tables afterwards — but for most installs the
> #    metric/trace history is disposable, so restoring only the non-time-series
> #    data and letting history rebuild from live polling is simplest.)
> cat qarote-backup.dump | docker compose -f docker-compose.selfhosted.yml \
>   exec -T postgres pg_restore -U postgres -d qarote --no-owner
> docker compose -f docker-compose.selfhosted.yml up -d
> ```
>
> Preserve volume ownership/permissions (and SELinux labels on RHEL-family
> hosts) when copying data directories by hand. **Verify your backup restores
> before deleting the old volume.**

### Why PostgreSQL specifically

Qarote depends on a few PostgreSQL features that have no portable
equivalents in MySQL, SQLite, or other engines:

- **TimescaleDB hypertables, compression, and retention policies** — the two
  highest-volume tables are partitioned by time; retention is a chunk-drop
  policy, not a `DELETE` sweep. This is the hard requirement above.
- **`pgcrypto` extension** (`digest`, `gen_random_uuid`) — used for
  the append-only audit-log trigger and the RBAC scope-fingerprint
  generated column.
- **`GENERATED ALWAYS AS ... STORED` columns** —
  `RolePermission.scopeFingerprint` derives a deterministic SHA-256
  hash of the canonical scope text server-side, so two equivalent
  scopes always compare equal regardless of insert order.
- **Partial unique indexes** (`WHERE` clause) — `Role` uses these to
  enforce case-insensitive name uniqueness per scope without
  conflating `NULL` workspaceId rows (RBAC Phase 3).
- **SERIALIZABLE isolation with `FOR UPDATE`** — RBAC Phase 3 mutation
  paths rely on Postgres' SSI semantics to detect write-skew on
  concurrent role edits.

If you're running an internal pgbouncer, configure it for **session
mode** (not transaction mode) so prepared statements + `SET LOCAL`
behave as expected.

## Quick Start: Binary

Qarote is available as a single binary that embeds both the API and frontend. No Docker, Node.js, or web server required — only PostgreSQL.

> **Check if PostgreSQL is already installed:**
>
> ```bash
> psql --version              # Check if installed
> systemctl status postgresql  # Check if running (Linux)
> ```
>
> **Install PostgreSQL 17 _with TimescaleDB_** if you don't have it. A plain
> PostgreSQL install is **not** sufficient — the API crash-loops without the
> `timescaledb` extension (see the warning above).
>
> - **macOS:** `brew install postgresql@17 timescaledb` then run
>   `timescaledb-tune` and restart Postgres.
> - **Ubuntu/Debian:** add the TimescaleDB apt repo, then
>   `sudo apt install timescaledb-2-postgresql-17` and run `timescaledb-tune`.
>   See the [TimescaleDB self-hosted install guide](https://docs.timescale.com/self-hosted/latest/install/).
> - **Any OS via Docker:** run `timescale/timescaledb:latest-pg17` instead (the
>   non-HA image uses the standard `/var/lib/postgresql/data` path).

### Database Setup

After installing PostgreSQL with TimescaleDB, create a dedicated user and database:

```bash
# 1. Create a user and database for Qarote
sudo -u postgres psql -c "CREATE USER qarote WITH PASSWORD 'your-secure-password';"
sudo -u postgres psql -c "CREATE DATABASE qarote OWNER qarote;"

# 2. Ensure shared_preload_libraries includes timescaledb, then restart Postgres.
#    (timescaledb-tune does this for you.) The API's migrations run
#    `CREATE EXTENSION timescaledb` automatically on first boot.
#
#    IMPORTANT: `ALTER SYSTEM SET` *replaces* the whole value — it does not
#    append, and it cannot evaluate SQL expressions. So read the current value
#    with `SHOW shared_preload_libraries` and build the merged string in the
#    shell, adding timescaledb only when it's absent (preserves e.g.
#    pg_stat_statements). This block is idempotent:
current=$(sudo -u postgres psql -tAc "SHOW shared_preload_libraries" | tr -d '[:space:]')
if ! printf '%s' "$current" | grep -qw timescaledb; then
  merged=$([ -n "$current" ] && printf '%s,timescaledb' "$current" || printf 'timescaledb')
  sudo -u postgres psql -c "ALTER SYSTEM SET shared_preload_libraries = '$merged';"
fi

# 3. Configure idle connection timeouts (prevents zombie connections)
sudo -u postgres psql -c "ALTER SYSTEM SET idle_session_timeout = '30min';"
sudo -u postgres psql -c "ALTER SYSTEM SET idle_in_transaction_session_timeout = '5min';"
sudo -u postgres psql -c "SELECT pg_reload_conf();"

# Restart Postgres so shared_preload_libraries takes effect:
sudo systemctl restart postgresql
```

Your database URL will be: `postgresql://qarote:your-secure-password@localhost:5432/qarote`

<!-- Downloads the latest release automatically. Browse all releases: https://github.com/getqarote/Qarote/releases -->

```bash
# 3. Download and extract for your platform (auto-detects OS and architecture)
# Windows users: run this inside WSL2
PLATFORM="$(uname -s | tr '[:upper:]' '[:lower:]')-$(uname -m | sed 's/x86_64/x64/' | sed 's/aarch64/arm64/')"
curl -L "https://github.com/getqarote/Qarote/releases/latest/download/qarote-${PLATFORM}.tar.gz" | tar xz --strip-components=1

# 4. Interactive setup (generates .env, tests database connection)
./qarote setup

# 5. Start Qarote (opens on http://localhost:3000)
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

| Flag / Command                        | Description                                       |
| ------------------------------------- | ------------------------------------------------- |
| `./qarote setup`                      | Interactive setup wizard (generates `.env`)       |
| `-v`, `--version`                     | Print version and exit                            |
| `--database-url <url>`                | PostgreSQL connection URL                         |
| `--jwt-secret <secret>`               | JWT signing secret (min 32 characters)            |
| `--encryption-key <key>`              | Encryption key (min 32 characters)                |
| `-p`, `--port <port>`                 | Server port (default: 3000)                       |
| `-h`, `--host <host>`                 | Server host (default: localhost)                  |
| `--enable-email <bool>`               | Enable email features (default: false)            |
| `--from-email <email>`                | Sender email address (default: noreply@localhost) |
| `--smtp-host <host>`                  | SMTP server hostname                              |
| `--smtp-port <port>`                  | SMTP server port (default: 587)                   |
| `--smtp-user <user>`                  | SMTP username                                     |
| `--smtp-pass <pass>`                  | SMTP password                                     |
| `--smtp-service <name>`               | SMTP service for OAuth2 (e.g., `gmail`)           |
| `--smtp-oauth-client-id <id>`         | OAuth2 client ID                                  |
| `--smtp-oauth-client-secret <secret>` | OAuth2 client secret                              |
| `--smtp-oauth-refresh-token <token>`  | OAuth2 refresh token                              |
| `--sso-enabled <bool>`                | Enable SSO authentication (default: false)        |
| `--sso-type <type>`                   | SSO type: `oidc` or `saml` (default: oidc)        |
| `--sso-oidc-discovery-url <url>`      | OIDC discovery URL                                |
| `--sso-oidc-client-id <id>`           | OIDC client ID                                    |
| `--sso-oidc-client-secret <secret>`   | OIDC client secret                                |
| `--sso-saml-metadata-url <url>`       | SAML metadata URL                                 |
| `--sso-button-label <label>`          | SSO login button text (default: Sign in with SSO) |
| `--api-url <url>`                     | Backend API URL for SSO callbacks                 |
| `--frontend-url <url>`                | Frontend URL for SSO redirects                    |

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

## Quick Start: Docker Compose (Enterprise Edition)

This path pulls signed images from GitHub Container Registry (GHCR) instead of building locally. It's the recommended deployment for Enterprise customers — no source clone, no build step, faster `up -d`.

> **Prerequisites:** an active Enterprise license. Pull credentials (`GHCR_ROBOT_USERNAME` and `GHCR_ROBOT_TOKEN`) are delivered in your license activation email and visible at [portal.qarote.io](https://portal.qarote.io).

```bash
# 1. Get the compose file and example env. Both files are fetched without
#    overwriting anything — the example lands as .env.selfhosted.example,
#    and if an existing .env is present it is automatically renamed to
#    .env.backup.<timestamp> before the new .env is created.
curl -O https://raw.githubusercontent.com/getqarote/Qarote/main/docker-compose.selfhosted-ee.yml
curl -O https://raw.githubusercontent.com/getqarote/Qarote/main/.env.selfhosted.example
[ -e .env ] && mv .env ".env.backup.$(date +%s)"
cp .env.selfhosted.example .env

# 2. Fill in your .env. At minimum:
#    - POSTGRES_PASSWORD, JWT_SECRET, ENCRYPTION_KEY (generate with `openssl rand -hex 32`)
#    - VITE_API_URL, VITE_PORTAL_URL (the URLs your browser will use)
#    - GHCR_ROBOT_USERNAME, GHCR_ROBOT_TOKEN (from your license email)
#    - QAROTE_VERSION (e.g. 1.2.3, or `latest` to track the newest release)

# 3. Authenticate Docker to GHCR (one-time per host)
echo "${GHCR_ROBOT_TOKEN}" | docker login ghcr.io -u "${GHCR_ROBOT_USERNAME}" --password-stdin

# 4. Pull and start (Docker Compose auto-loads .env from the current directory)
#    Migrations apply automatically on backend startup — no manual step needed.
docker compose -f docker-compose.selfhosted-ee.yml up -d

# 5. Access application
# Frontend: http://localhost:8080
# Backend API: http://localhost:3000
```

**Pinning a version.** Set `QAROTE_VERSION=1.2.3` in your `.env` to pin both `qarote-ee-api` and `qarote-ee-app` to a specific release. We publish new tags for every release; `latest` always tracks the newest stable tag. For air-gapped or change-controlled environments, **always pin** rather than tracking `latest`.

**Runtime configuration.** The frontend image is built without baking `VITE_API_URL` or `VITE_PORTAL_URL`, so a single published image works for any tenant's domain. At container start, the nginx entrypoint generates `/usr/share/nginx/html/config.js` from the values in your `.env`. To change either URL post-deploy, edit `.env` and `docker compose ... up -d` to restart the frontend container — no rebuild needed.

**Why two compose files?** `docker-compose.selfhosted.yml` (CE) builds everything locally from the public source and is MIT-licensed. `docker-compose.selfhosted-ee.yml` (EE) pulls pre-built images that include licensed features (workspaces, alerting, integrations) which only activate when you enter a valid license key in **Settings → License**.

## Quick Start: Dokku

1. **Install Dokku** on your server (see [Dokku Installation Guide](https://dokku.com/docs/getting-started/installation/))

2. **Create the app and database:**

   The `dokku-postgres` plugin defaults to a plain PostgreSQL image. Qarote
   requires TimescaleDB, so point the plugin at a TimescaleDB image **before**
   creating the service (`CREATE EXTENSION` runs on the first app boot — a plain
   image makes the API crash-loop):

   ```bash
   ssh dokku@your-server apps:create qarote
   sudo dokku plugin:install https://github.com/dokku/dokku-postgres.git postgres

   # Use the NON-HA timescaledb image for dokku-postgres. The plugin mounts the
   # data volume at /var/lib/postgresql/data, which timescale/timescaledb (the
   # standard postgres entrypoint) uses — so data persists. Do NOT use
   # timescaledb-ha here: it stores data under /home/postgres/pgdata, outside the
   # plugin's volume, so your data would be lost on every container recreate.
   export POSTGRES_IMAGE="timescale/timescaledb"
   export POSTGRES_IMAGE_VERSION="latest-pg17"
   dokku postgres:create qarote-db --image "$POSTGRES_IMAGE" --image-version "$POSTGRES_IMAGE_VERSION"
   dokku postgres:link qarote-db qarote
   ```

   > **Migrating an existing plain-Postgres service?** Because the extension is
   > created at boot, the image swap must land **before or atomically with** the
   > deploy that runs the new migrations. For a pre-launch / empty database the
   > simplest path is to destroy and recreate the service on the TimescaleDB
   > image (`dokku postgres:destroy qarote-db` → recreate as above → relink),
   > since there is no data to preserve.

3. **Set environment variables:**

   ```bash
   dokku config:set qarote \
     JWT_SECRET=$(openssl rand -hex 64) \
     ENCRYPTION_KEY=$(openssl rand -hex 64) \
     TZ=UTC \
     ENABLE_EMAIL=false
   ```

   To enable email, set `ENABLE_EMAIL=true` and add SMTP settings:

   ```bash
   dokku config:set qarote \
     ENABLE_EMAIL=true \
     FROM_EMAIL=noreply@yourdomain.com \
     SMTP_HOST=smtp.gmail.com \
     SMTP_PORT=587 \
     SMTP_USER=your-email@gmail.com \
     SMTP_PASS=your-app-password
   ```

   See [SMTP Configuration](#smtp-configuration) for provider-specific examples and OAuth2 setup.

   To enable SSO, set SSO variables:

   ```bash
   # OIDC:
   dokku config:set qarote \
     SSO_ENABLED=true \
     SSO_TYPE=oidc \
     SSO_OIDC_DISCOVERY_URL=https://your-idp.com/realms/qarote/.well-known/openid-configuration \
     SSO_OIDC_CLIENT_ID=qarote \
     SSO_OIDC_CLIENT_SECRET=your-client-secret \
     SSO_BUTTON_LABEL="Sign in with SSO" \
     API_URL=https://api.your-domain.com \
     FRONTEND_URL=https://your-domain.com

   # SAML (alternative):
   # dokku config:set qarote \
   #   SSO_ENABLED=true \
   #   SSO_TYPE=saml \
   #   SSO_SAML_METADATA_URL=https://your-idp.com/metadata.xml \
   #   API_URL=https://api.your-domain.com \
   #   FRONTEND_URL=https://your-domain.com
   ```

   See [SSO Configuration](#sso-configuration) for detailed setup instructions.

   > `DATABASE_URL` is automatically set by Dokku when you link the PostgreSQL service. `NODE_ENV`, `PORT`, and `HOST` are also set automatically by Dokku. `DEPLOYMENT_MODE`, `LOG_LEVEL`, and other defaults are handled by the application.

4. **Deploy:**

   ```bash
   git remote add dokku dokku@your-server:qarote
   git push dokku main
   ```

5. **Run database migrations:**

   ```bash
   dokku run qarote pnpm run db:migrate
   ```

6. **Domain and SSL (optional):**

   ```bash
   dokku domains:set qarote your-domain.com
   dokku letsencrypt:enable qarote
   ```

## Configuration

### Environment Variables

Create a `.env` file or use `./setup.sh` to generate one:

```env
# Database
DATABASE_URL=postgresql://postgres:changeme@postgres:5432/qarote
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

### Configuration Methods

SMTP can be configured in three ways (in order of priority):

1. **Admin UI** — Settings → Email Settings (requires admin role, self-hosted only)
2. **Setup Wizard** — `./qarote setup` prompts for SMTP settings during initial setup
3. **Environment Variables** — set directly or via `dokku config:set`

The Admin UI settings (stored in the database) take priority over environment variables. This lets you reconfigure SMTP at runtime without restarting the application.

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

## SSO Configuration

Qarote supports Single Sign-On (SSO) via OIDC and SAML 2.0, powered by BoxyHQ SAML-Jackson. SSO lets your team authenticate through your existing identity provider (Keycloak, Okta, Azure AD, Auth0, Google Workspace, etc.).

### Configuration Methods

SSO can be configured in three ways (in order of priority):

1. **Admin UI** — Settings → SSO Settings (requires admin role, self-hosted only)
2. **Setup Wizard** — `./qarote setup` prompts for SSO settings during initial setup
3. **Environment Variables** — set directly or via `dokku config:set`

The Admin UI settings (stored in the database) take priority over environment variables. This lets you reconfigure SSO at runtime without restarting the application.

### Environment Variable Reference

| Variable                 | Description                                                                                                                                 | Default                 |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| `SSO_ENABLED`            | Enable SSO authentication                                                                                                                   | `false`                 |
| `SSO_TYPE`               | Protocol: `oidc` or `saml`                                                                                                                  | `oidc`                  |
| `SSO_OIDC_DISCOVERY_URL` | OIDC discovery endpoint URL                                                                                                                 | —                       |
| `SSO_OIDC_CLIENT_ID`     | OIDC client ID                                                                                                                              | —                       |
| `SSO_OIDC_CLIENT_SECRET` | OIDC client secret                                                                                                                          | —                       |
| `SSO_SAML_METADATA_URL`  | SAML IdP metadata URL                                                                                                                       | —                       |
| `API_URL`                | Backend URL (for SSO callback)                                                                                                              | `http://localhost:3000` |
| `FRONTEND_URL`           | Frontend URL (for post-login redirect). In binary/single-port mode the frontend is served from the backend, so use `http://localhost:3000`. | `http://localhost:8080` |
| `SSO_BUTTON_LABEL`       | Login button text                                                                                                                           | `Sign in with SSO`      |

### OIDC Setup (Recommended)

OIDC is the recommended protocol. Configure your identity provider to create a client, then set:

```env
SSO_ENABLED=true
SSO_TYPE=oidc
SSO_OIDC_DISCOVERY_URL=https://your-idp.com/realms/qarote/.well-known/openid-configuration
SSO_OIDC_CLIENT_ID=qarote
SSO_OIDC_CLIENT_SECRET=your-client-secret
API_URL=http://localhost:3000
FRONTEND_URL=http://localhost:8080
```

The OIDC discovery URL must end with `/.well-known/openid-configuration`. Your IdP must support the `openid`, `email`, and `profile` scopes.

**Callback URL:** Register `{API_URL}/sso/callback` as an authorized redirect URI in your IdP (e.g., `http://localhost:3000/sso/callback`).

### SAML Setup

For SAML-based identity providers:

```env
SSO_ENABLED=true
SSO_TYPE=saml
SSO_SAML_METADATA_URL=https://your-idp.com/metadata.xml
API_URL=http://localhost:3000
FRONTEND_URL=http://localhost:8080
```

**ACS URL:** Register `{API_URL}/sso/acs` as the Assertion Consumer Service URL in your IdP.

## Testing SSO with Keycloak

[Keycloak](https://www.keycloak.org/) is a free, open-source identity provider. A Docker Compose file is included for quick local testing.

### 1. Start Keycloak

```bash
docker compose -f docker-compose.keycloak.yml up -d
```

Keycloak admin console will be available at **http://localhost:8180** with credentials `admin` / `admin`.

### 2. Create a Realm

1. Open http://localhost:8180 and log in with `admin` / `admin`
2. Click the dropdown in the top-left (shows "master") → **Create realm**
3. Set **Realm name** to `qarote` → click **Create**

### 3. Create a Client

1. In the `qarote` realm, go to **Clients** → **Create client**
2. Set:
   - **Client type:** OpenID Connect
   - **Client ID:** `qarote`
3. Click **Next**, then enable:
   - **Client authentication:** ON
4. Click **Next**, set:
   - **Valid redirect URIs:** `http://localhost:3000/sso/callback`
   - **Web origins:** `http://localhost:8080`
5. Click **Save**
6. Go to the **Credentials** tab and copy the **Client secret**

### 4. Create a Test User

1. Go to **Users** → **Add user**
2. Set:
   - **Username:** `testuser`
   - **Email:** `testuser@example.com`
   - **Email verified:** ON
   - **First name:** `Test`
   - **Last name:** `User`
3. Click **Create**
4. Go to the **Credentials** tab → **Set password**
5. Set a password and turn off **Temporary**

### 5. Configure Qarote

Set the following environment variables (in `.env`, docker-compose, or via the Admin UI):

```env
SSO_ENABLED=true
SSO_TYPE=oidc
SSO_OIDC_DISCOVERY_URL=http://localhost:8180/realms/qarote/.well-known/openid-configuration
SSO_OIDC_CLIENT_ID=qarote
SSO_OIDC_CLIENT_SECRET=<paste-client-secret-from-step-3>
API_URL=http://localhost:3000
FRONTEND_URL=http://localhost:8080
SSO_BUTTON_LABEL=Sign in with Keycloak
```

> **Note:** Using `http://localhost:8180` for the discovery URL works for the manual login flow, but the **Test Connection** button in the Admin UI requires a reachable HTTPS URL and will reject local/internal hostnames. To use the connection test, point to your Keycloak instance via a public HTTPS URL.

### 6. Test the Flow

1. Restart Qarote (if using env vars) or save settings (if using Admin UI)
2. Go to the Qarote login page — you should see a **"Sign in with Keycloak"** button
3. Click it → you'll be redirected to Keycloak's login page
4. Log in with `testuser` / your password
5. You'll be redirected back to Qarote, authenticated

> **Note:** The first time a user logs in via SSO, a Qarote account is automatically created using their email from the IdP. If an account with that email already exists, the SSO login is linked to the existing account.

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
# Record current version and create a backup
./qarote --version
cp qarote qarote.backup

# Stop the running instance
kill $(pgrep -f './qarote') 2>/dev/null || true

# Download latest release (auto-detects OS and architecture)
# Browse all releases: https://github.com/getqarote/Qarote/releases
PLATFORM="$(uname -s | tr '[:upper:]' '[:lower:]')-$(uname -m | sed 's/x86_64/x64/' | sed 's/aarch64/arm64/')"
curl -L "https://github.com/getqarote/Qarote/releases/latest/download/qarote-${PLATFORM}.tar.gz" | tar xz --strip-components=1

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
docker exec qarote_backend pnpm run db:migrate
```

### Docker Compose (Enterprise Edition)

No rebuild — just pull the new images and restart:

```bash
# Optionally bump QAROTE_VERSION in .env to pin a specific release.
# Otherwise this re-resolves the `latest` tag.
docker compose -f docker-compose.selfhosted-ee.yml pull
docker compose -f docker-compose.selfhosted-ee.yml up -d
# Migrations apply automatically on backend startup.
```

If `docker compose pull` fails with `unauthorized`, your `GHCR_ROBOT_TOKEN` may have rotated — check your latest license email for refreshed credentials and re-run:

```bash
echo "${GHCR_ROBOT_TOKEN}" | docker login ghcr.io -u "${GHCR_ROBOT_USERNAME}" --password-stdin
```

### Dokku

```bash
git push dokku main
```

### Rolling Deploys (Multi-Replica)

If you run more than one Qarote replica behind a load balancer, schema and behavioural changes ship in a single deploy — Qarote does **not** carry parallel "old" and "new" code paths. The implications during a rolling restart:

- **Database migrations apply once.** On startup, the first replica to boot the new version runs `prisma migrate deploy`. Older replicas continue serving requests against the new schema until they cycle. This works because every migration is written backward-compatible for the duration of one deploy window: new columns are nullable or have defaults, removed columns are dropped only after the code that writes them is gone, and renamed columns ship as a two-step (add new, dual-write, drop old) across two releases when needed.
- **No long-lived "legacy mode."** Qarote does not gate features on a version flag or read both old and new wire shapes simultaneously. A given release reads/writes one shape. Rolling forward through a feature flag (PostHog) is supported; rolling forward through a wire-shape change is not — that requires a brief full-fleet restart.
- **Live message tap sessions reconnect.** The live message tap feature holds a server-side AMQP consumer per browser session. When a replica restarts, any active tap sessions on that replica are automatically re-established by the frontend against the new replica. Expect a 1–3 second blank window during the cycle.
- **Cron singletons.** Daily jobs (incident-diagnosis-cleanup, queue-metrics-cron, server-capabilities-cron) are idempotent — running them twice on the same day does no harm, so the metrics-monitor worker can restart freely. They use Postgres-side `WHERE` predicates rather than in-memory locks, so concurrent execution from two replicas during the cycle is safe.

The practical recommendation: deploy during low-traffic windows and let the load balancer drain connections (30s grace) before terminating each replica. This keeps tap/recording session interruptions to the cycle window itself.

### License Cache Coherency

Each Qarote process keeps a 60-second in-memory cache of the active license JWT. When you activate or deactivate a license, peer processes (other web replicas, the alert worker, the digest worker) need to clear theirs so they stop serving stale entitlement decisions — for example, the alert worker continuing to send Slack/webhook notifications under a deactivated license.

Qarote uses Postgres `LISTEN`/`NOTIFY` on the `license_invalidated` channel for this. No additional infrastructure is required, but two operational notes apply:

- **PgBouncer in transaction-pooling mode breaks LISTEN.** Each query may be assigned to a different backend, so the LISTEN session does not persist between commands. If PgBouncer fronts your database, either switch to **session pooling** for Qarote's connection, or have Qarote connect directly to Postgres on a separate URL. Dokku-managed PG, RDS, and Cloud SQL accept both modes.
- **Failure mode is graceful.** If `NOTIFY` cannot be delivered, peers will still resync on the next cache miss after the 60-second TTL. The window during which a stale license can be observed widens to up to 60 seconds. Logs include a `license-invalidation: NOTIFY failed` warn line on the originating process when this happens.

The mechanism is automatic and requires no operator configuration as long as your Postgres user can issue `NOTIFY` (any role with `CONNECT` privilege can; this is the default for application roles).

## Troubleshooting

### "Exec format error" (Binary)

This means you downloaded the wrong architecture. Check your platform with `uname -m`:

- `x86_64` → use the `-x64` variant
- `aarch64` (Linux) or `arm64` (macOS) → use the `-arm64` variant

Then re-download the correct binary in-place:

```bash
# Example: switch from linux-x64 to linux-arm64
curl -L https://github.com/getqarote/Qarote/releases/latest/download/qarote-linux-arm64.tar.gz | tar xz --strip-components=1
./qarote  # your existing .env is preserved
```

> **Tip:** Multipass on Apple Silicon creates ARM64 VMs — use `linux-arm64`, not `linux-x64`. macOS users on Apple Silicon should pick `darwin-arm64`.

### Database Connection Issues

**Error:** "Connection refused" or "Database not found"

Check `DATABASE_URL` format: `postgresql://user:password@host:port/database`

Verify PostgreSQL is running (method depends on your deployment):

- **Binary:** `systemctl status postgresql` or `pg_isready -U qarote`
- **Docker Compose:** `docker compose -f docker-compose.selfhosted.yml ps postgres`
- **Dokku:** `dokku postgres:info qarote-db`

Also ensure database migrations have been run (see [Updating](#updating) for the command for your deployment method).

### Message Rate Charts Are Blank

If the "Messages rates" chart shows an empty graph while "Queued messages" works fine, your RabbitMQ server's `rates_mode` is set to `basic` (the default). In this mode, the management API only returns instantaneous rates without historical sample data, so there's nothing to plot.

**Fix:** Set `rates_mode` to `detailed` in your RabbitMQ configuration:

```ini
# rabbitmq.conf
management.rates_mode = detailed
```

Or apply at runtime without restarting:

```bash
rabbitmqctl eval 'application:set_env(rabbitmq_management, rates_mode, detailed).'
```

> **Note:** `detailed` mode increases memory usage on the RabbitMQ server slightly, as it retains sample history for each metric. This is the same mode the official RabbitMQ Management UI uses internally to render its charts. Qarote's bundled `docker-compose.yml` already sets this for you.

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
