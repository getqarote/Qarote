# Qarote Enterprise Edition

Qarote Enterprise Edition is the licensed version of Qarote that unlocks premium features including workspace management, alerting, and integrations.

## Overview

Enterprise Edition is designed for organizations that need:
- Team collaboration and workspace management
- Advanced alerting and monitoring
- Integration with external services (Slack, webhooks)
- Data export capabilities
- Advanced alert rules

## Features

Enterprise Edition includes all Community Edition features plus:

### ✅ Premium Features

- **Workspace Management**
  - Create and manage multiple workspaces
  - Organize servers by workspace
  - Switch between workspaces

- **Team Collaboration**
  - Invite team members to workspaces
  - Manage user roles and permissions
  - Track team activity

- **Alerting System**
  - Real-time alerts for RabbitMQ issues
  - Email notifications
  - Alert history and resolution tracking
  - Customizable alert thresholds

- **Advanced Alert Rules**
  - Create custom alert rules
  - Set up complex alert conditions
  - Configure alert actions

- **Slack Integration**
  - Send alerts to Slack channels
  - Configure multiple Slack workspaces
  - Customize alert formatting

- **Webhook Integration**
  - Send alerts to custom webhooks
  - Configure webhook endpoints
  - Customize payload format

- **Data Export**
  - Export workspace data
  - Backup and restore capabilities
  - CSV and JSON export formats

## Licensing

Enterprise Edition requires a valid license file to unlock premium features.

### License Types

- **Developer License** ($348/year) - Includes workspace management, alerting, and data export
- **Enterprise License** ($1,188/year) - Includes all premium features

### Annual Licensing Model

**Self-hosted licenses are annual subscriptions:**
- **365-day validity** - Each license is valid for one year from purchase
- **Automatic renewal** - Subscriptions renew automatically each year
- **New license file** - You'll receive a new license file via email after each renewal
- **No trial period** - Use Community Edition for testing before purchasing

### Obtaining a License

1. **Purchase a license** from the [Customer Portal](https://portal.qarote.io)
2. **Download your license file** (JSON format, cryptographically signed)
3. **Upload the license file** to your server at `LICENSE_FILE_PATH` location

### License Renewal Process

**Before expiration:**
- **30 days before**: Email reminder to prepare for renewal
- **15 days before**: Email reminder with renewal status
- **7 days before**: Final reminder email
- **Renewal day**: Automatic payment and new license file generated
- **After renewal**: Email with new license file attached

**What you need to do:**
1. Receive email with new license file
2. Download the new license JSON file (format: `qarote-license-{uuid}.json`)
3. Replace the old license file on your server
4. Restart Qarote (if configured to reload on file change)

**If renewal fails:**
- **14-day grace period**: Your current license continues to work
- **Payment retry**: Stripe automatically retries failed payments
- **Warning emails**: You'll receive notifications during the grace period
- **After 14 days**: License is deactivated if payment still fails

### License File Format

License files are cryptographically signed JSON files that include:
- License key (unique identifier)
- Tier (Developer or Enterprise)
- Customer email
- Expiration date (365 days from issue/renewal)
- Enabled features
- Cryptographic signature (for offline validation)

### Offline Validation

Qarote validates licenses **offline** (no internet required):
- Validates cryptographic signature using public key
- Checks expiration date locally
- Works in air-gapped environments

## Installation

### Prerequisites

- Docker and Docker Compose
- PostgreSQL 15+ (or use the included PostgreSQL container)
- Valid Enterprise Edition license file
- License public key (provided with your license)

### Quick Start

1. **Clone the repository:**
   ```bash
   git clone https://github.com/getqarote/Qarote.git
   cd qarote
   ```

2. **Copy environment file:**
   ```bash
   cp .env.selfhosted.example .env
   # Edit .env and set DEPLOYMENT_MODE=enterprise
   ```

3. **Place your license file:**
   ```bash
   # License files are downloaded with format: qarote-license-{uuid}.json
   cp /path/to/your/qarote-license-*.json ./qarote-license.json
   ```

4. **Configure environment variables:**
   ```bash
   # Required
   DEPLOYMENT_MODE=enterprise
   LICENSE_FILE_PATH=./qarote-license.json

   # Public key for license validation (provided via email with your license)
   # IMPORTANT: Wrap the entire key in double quotes, use \n for line breaks
   LICENSE_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\nMIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEA...\n-----END PUBLIC KEY-----"

   # Secrets are generated automatically by ./setup.sh enterprise
   JWT_SECRET=your-secret-key-min-32-chars
   ENCRYPTION_KEY=your-encryption-key-min-32-chars
   POSTGRES_PASSWORD=your-secure-postgres-password
   ```

5. **Start services:**
   ```bash
   docker compose -f docker-compose.selfhosted.yml up -d
   ```

6. **Run database migrations:**
   ```bash
   docker exec qarote_backend_enterprise pnpm run db:migrate
   ```

7. **Access the application:**
   - Frontend: http://localhost:8080
   - Backend API: http://localhost:3000

## Configuration

### Environment Variables

#### Required

- `DEPLOYMENT_MODE=enterprise` - Set to enterprise mode
- `LICENSE_FILE_PATH` - Path to your license file (format: `qarote-license-{uuid}.json`)
- `LICENSE_PUBLIC_KEY` - Public key for license verification
- `JWT_SECRET` - Secret for JWT token signing (minimum 32 characters) - Generate with: `./setup.sh enterprise`
- `ENCRYPTION_KEY` - Key for encrypting RabbitMQ credentials (minimum 32 characters) - Generate with: `./setup.sh enterprise`
- `POSTGRES_PASSWORD` - PostgreSQL database password - Generate with: `./setup.sh enterprise`

#### Optional

- `ENABLE_EMAIL` - Enable email features

**Note:** OAuth authentication (Google Sign-In) is only available in cloud deployments. Enterprise Edition self-hosted deployments use email/password authentication.

### License File Security

For security, ensure your license file has restricted permissions:

```bash
chmod 600 qarote-license.json
```

The license file should be readable only by the application user.

## License Validation

Enterprise Edition validates licenses offline using cryptographic signatures:

1. **Signature Verification** - License files are signed with RSA-SHA256
2. **Expiration Check** - Validates license expiration (if applicable)
3. **Feature Checking** - Validates that requested features are included in the license

License validation occurs on every premium feature access to ensure license compliance.

## Air-Gapped Deployments

Enterprise Edition supports air-gapped (offline) deployments:

- No network connection required for license validation
- License files are validated using embedded public keys
- All validation happens locally

## Troubleshooting

### License File Not Found

**Error**: `License file not found`

**Solution**: Ensure `LICENSE_FILE_PATH` points to the correct location and the file exists.

### Invalid License Signature

**Error**: `License signature verification failed`

**Solution**: Verify that `LICENSE_PUBLIC_KEY` matches the public key used to sign your license file.

### License Expired

**Error**: `License expired on [date]`

**Solution**: Renew your license or contact support for a new license file.

### Feature Not Included

**Error**: `[Feature] is not included in your license`

**Solution**: The requested feature is not included in your license tier. Upgrade to Enterprise tier for all features.

## Support

Enterprise Edition customers receive priority support:

- **Email**: support@qarote.io
- **Customer Portal**: https://portal.qarote.io
- **Documentation**: [docs/README.md](README.md)

## Upgrading License

To upgrade your license or add features:

1. Log in to the [Customer Portal](https://portal.qarote.io)
2. Navigate to your licenses
3. Purchase an upgrade or additional features
4. Download the new license file
5. Replace the existing license file
6. Restart the application

## License Terms

Enterprise Edition licenses are subject to the commercial license terms. See your license agreement for details.

## Security

For security vulnerabilities, please email security@qarote.io instead of using the public issue tracker.

