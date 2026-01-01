# Qarote Documentation

This directory contains documentation for deploying and using Qarote.

## Editions

- **[Community Edition](COMMUNITY_EDITION.md)** - Open-source edition guide
- **[Enterprise Edition](ENTERPRISE_EDITION.md)** - Licensed edition guide
- **[Feature Comparison](FEATURE_COMPARISON.md)** - Detailed feature comparison between editions

## Self-Hosted Deployment

- **[Self-Hosted Deployment Guide](SELF_HOSTED_DEPLOYMENT.md)** - Complete guide for deploying Community and Enterprise editions
- **[Standalone Deployment](STANDALONE_DEPLOYMENT.md)** - Legacy standalone deployment guide (see SELF_HOSTED_DEPLOYMENT.md for updated information)

## Quick Start

1. **Choose your deployment option:**
   - **Self-Hosted**: `docker-compose.selfhosted.yml` - Supports both Community (open-source) and Enterprise (licensed) editions
   
   Note: For development/testing with RabbitMQ, use the main `docker-compose.yml` file.

2. **Set up environment variables:**
   - Copy `.env.example.backend` to `apps/api/.env`
   - Copy `.env.example.frontend` to `apps/app/.env`
   - Update all required values (see below)

3. **Set deployment mode:**
   - For **Community Edition**: Set `DEPLOYMENT_MODE=community` in your `.env` file
   - For **Enterprise Edition**: Set `DEPLOYMENT_MODE=enterprise` and configure license:
     - Visit the Customer Portal at `portal.qarote.io`
     - Purchase a license
     - Download your license file (JSON format)
     - Place license file at `./license.json` (or set `LICENSE_FILE_PATH`)
     - Set `LICENSE_PUBLIC_KEY` environment variable

4. **Deploy:**

   ```bash
   # Both Community and Enterprise use the same file
   docker-compose -f docker-compose.selfhosted.yml up -d
   ```

## Required Configuration

### Backend (.env)

**Mandatory (Enterprise Edition):**

- `LICENSE_FILE_PATH` - Path to license file (default: `./license.json`)
- `LICENSE_PUBLIC_KEY` - Public key for license validation (provided with license)
- `JWT_SECRET` - Secret for JWT tokens (min 32 characters)
- `ENCRYPTION_KEY` - Key for encrypting credentials (min 32 characters)
- `DATABASE_URL` - PostgreSQL connection string

**Optional (can be disabled for air-gapped deployments):**

- `ENABLE_SENTRY` - Enable error tracking
- `ENABLE_EMAIL` - Enable email notifications
- `ENABLE_OAUTH` - Enable OAuth authentication

### Frontend (.env)

**Mandatory:**

- `VITE_API_URL` - Backend API URL

**Optional:**

- `VITE_ENABLE_SENTRY` - Enable error tracking

## License Activation (Enterprise Edition)

1. Purchase a license from the Customer Portal
2. Download your license file (JSON format, cryptographically signed)
3. Place the license file at `./license.json` (or set `LICENSE_FILE_PATH`)
4. Set `LICENSE_PUBLIC_KEY` environment variable (provided with your license)
5. Restart the backend service

The license is validated offline using cryptographic signatures - no internet connection required.

## Air-Gapped Deployments

For completely offline deployments:

- Set all `ENABLE_*` flags to `false`
- Use SMTP for email (if needed) instead of Resend
- License validation will use a grace period for offline periods

## Support

For more information, visit: https://qarote.io/docs/standalone
