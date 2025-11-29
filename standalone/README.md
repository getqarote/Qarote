# RabbitHQ Standalone Deployment

This directory contains configuration files and examples for deploying RabbitHQ as a standalone, self-hosted application.

## Quick Start

1. **Choose your deployment option:**
   - **Minimal**: `docker-compose.standalone.yml` - PostgreSQL + Backend + Frontend (you provide RabbitMQ)
   - **With RabbitMQ**: `docker-compose.standalone-rabbitmq.yml` - Includes a RabbitMQ instance

2. **Set up environment variables:**
   - Copy `.env.example.backend` to `back-end/.env`
   - Copy `.env.example.frontend` to `front-end/.env`
   - Update all required values (see below)

3. **Purchase and activate a license:**
   - Visit the Customer Portal at `portal.rabbithq.io`
   - Purchase a license
   - Copy your license key
   - Set `LICENSE_KEY` in your backend `.env` file

4. **Deploy:**
   ```bash
   # Minimal deployment
   docker-compose -f docker-compose.standalone.yml up -d

   # Or with RabbitMQ
   docker-compose -f docker-compose.standalone-rabbitmq.yml up -d
   ```

## Required Configuration

### Backend (.env)

**Mandatory:**
- `LICENSE_KEY` - Your license key from the Customer Portal
- `LICENSE_VALIDATION_URL` - URL to validate licenses (default: https://api.rabbithq.io)
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

## License Activation

1. Purchase a license from the Customer Portal
2. Copy your license key
3. Set `LICENSE_KEY` in your backend environment
4. Restart the backend service

The license will be validated periodically (daily/weekly) with the RabbitHQ license server.

## Air-Gapped Deployments

For completely offline deployments:
- Set all `ENABLE_*` flags to `false`
- Use SMTP for email (if needed) instead of Resend
- License validation will use a grace period for offline periods

## Support

For more information, visit: https://rabbithq.io/docs/standalone

