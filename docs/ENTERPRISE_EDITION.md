# Qarote Licensed Features

Qarote offers premium features that are unlocked by activating a license key through the application UI. No env vars, file management, or restarts needed.

## Overview

Licensed features are designed for organizations that need:
- Team collaboration and workspace management
- Advanced alerting and monitoring
- Integration with external services (Slack, webhooks)
- Data export capabilities
- Advanced alert rules

## Features

Licensed editions include all free features plus:

### Premium Features

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

### License Types

- **Developer License** ($348/year) - Includes workspace management, alerting, and data export
- **Enterprise License** ($1,188/year) - Includes all premium features

### Annual Licensing Model

**Self-hosted licenses are annual subscriptions:**
- **365-day validity** - Each license is valid for one year from purchase
- **Automatic renewal** - Subscriptions renew automatically each year
- **New license key** - You'll receive a new license key via email after each renewal
- **No trial period** - Use the free tier for testing before purchasing

### Obtaining a License

1. **Purchase a license** from the [Customer Portal](https://portal.qarote.io)
2. **Copy your license key** (a JWT string provided after purchase)
3. **In Qarote**, go to **Settings → License** and paste your key

### License Renewal Process

**Before expiration:**
- **30 days before**: Email reminder to prepare for renewal
- **15 days before**: Email reminder with renewal status
- **7 days before**: Final reminder email
- **Renewal day**: Automatic payment and new license key generated
- **After renewal**: Email with new license key

**What you need to do:**
1. Receive email with new license key
2. Go to Settings → License in Qarote
3. Paste the new license key and click Activate

**If renewal fails:**
- **14-day grace period**: Your current license continues to work
- **Payment retry**: Stripe automatically retries failed payments
- **Warning emails**: You'll receive notifications during the grace period
- **After 14 days**: License is deactivated if payment still fails

### License Format

Licenses are cryptographically signed JWTs that contain:
- License ID (unique identifier)
- Tier (Developer or Enterprise)
- Expiration date (365 days from issue/renewal)
- Enabled features
- Cryptographic signature (for offline validation)

### Offline Validation

Qarote validates licenses **offline** (no internet required):
- Validates cryptographic signature using a baked-in public key
- Checks expiration date locally
- Works in air-gapped environments

## Activation

### Activating a License

1. Open Qarote and navigate to **Settings → License**
2. Paste your license key in the input field
3. Click **Activate**
4. Features unlock immediately — no restart required

### Deactivating a License

1. Navigate to **Settings → License**
2. Click **Deactivate**
3. Premium features will be disabled

## Troubleshooting

### License Expired

**Solution**: Renew your license at the [Customer Portal](https://portal.qarote.io) and activate the new key in Settings → License.

### Feature Not Included

**Error**: `[Feature] is not included in your license`

**Solution**: The requested feature is not included in your license tier. Upgrade to Enterprise tier for all features.

### Premium Features Not Available

- Verify your license is active in Settings → License
- Check that the license includes the required features
- Check backend logs for license validation errors

## Support

Licensed customers receive priority support:

- **Email**: support@qarote.io
- **Customer Portal**: https://portal.qarote.io
- **Documentation**: [Self-Hosted Deployment Guide](SELF_HOSTED_DEPLOYMENT.md)

## Upgrading License

To upgrade your license or add features:

1. Log in to the [Customer Portal](https://portal.qarote.io)
2. Navigate to your licenses
3. Purchase an upgrade or additional features
4. Copy the new license key
5. Activate in Settings → License

## License Terms

Licensed features are subject to the commercial license terms. See your license agreement for details.

## Security

For security vulnerabilities, please email security@qarote.io instead of using the public issue tracker.
