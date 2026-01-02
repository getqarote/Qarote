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

- **Developer License** - Includes workspace management, alerting, and data export
- **Enterprise License** - Includes all premium features

### Obtaining a License

1. **Purchase a license** from the [Customer Portal](https://portal.qarote.io)
2. **Download your license file** (JSON format, cryptographically signed)
3. **Upload the license file** to your server

### License File Format

License files are cryptographically signed JSON files that include:
- License key
- Tier (Developer or Enterprise)
- Customer email
- Expiration date (or null for perpetual licenses)
- Enabled features
- Optional instance ID (for license locking)

## Installation

### Prerequisites

- Docker and Docker Compose
- PostgreSQL 15+ (or use the included PostgreSQL container)
- Valid Enterprise Edition license file
- License public key (provided with your license)

### Quick Start

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-org/qarote.git
   cd qarote
   ```

2. **Copy environment file:**
   ```bash
   cp .env.selfhosted.example .env
   # Edit .env and set DEPLOYMENT_MODE=enterprise
   ```

3. **Place your license file:**
   ```bash
   cp /path/to/your/license.json ./license.json
   ```

4. **Configure environment variables:**
   ```bash
   # Required
   DEPLOYMENT_MODE=enterprise
   LICENSE_FILE_PATH=./license.json
   LICENSE_PUBLIC_KEY=your-public-key-here
   JWT_SECRET=your-secret-key-min-32-chars
   ENCRYPTION_KEY=your-encryption-key-min-32-chars
   POSTGRES_PASSWORD=your-secure-password
   ```

5. **Start services:**
   ```bash
   export DEPLOYMENT_MODE=enterprise
   docker-compose -f docker-compose.selfhosted.yml up -d
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
- `LICENSE_FILE_PATH` - Path to your license file (default: `./license.json`)
- `LICENSE_PUBLIC_KEY` - Public key for license verification
- `JWT_SECRET` - Secret for JWT token signing (minimum 32 characters)
- `ENCRYPTION_KEY` - Key for encrypting RabbitMQ credentials (minimum 32 characters)
- `POSTGRES_PASSWORD` - PostgreSQL database password

#### Optional

- `INSTANCE_ID` - Override instance fingerprint (for testing)
- `ENABLE_EMAIL` - Enable email features
- `ENABLE_OAUTH` - Enable OAuth authentication
- `ENABLE_SENTRY` - Enable error tracking

### License File Security

For security, ensure your license file has restricted permissions:

```bash
chmod 600 license.json
```

The license file should be readable only by the application user.

## License Validation

Enterprise Edition validates licenses offline using cryptographic signatures:

1. **Signature Verification** - License files are signed with RSA-SHA256
2. **Expiration Check** - Validates license expiration (if applicable)
3. **Instance Locking** - Optional instance ID validation prevents license sharing
4. **Feature Checking** - Validates that requested features are included in the license

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

### Instance ID Mismatch

**Error**: `License instance ID does not match current instance`

**Solution**: Your license is locked to a specific server. Contact support if you need to transfer the license to a new server.

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

