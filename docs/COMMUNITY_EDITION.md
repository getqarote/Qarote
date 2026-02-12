# Qarote Community Edition

Qarote Community Edition is the open-source version of Qarote, released under the MIT license. It provides core RabbitMQ monitoring capabilities for free.

## Overview

The Community Edition includes all essential RabbitMQ monitoring features, making it perfect for:

- Individual developers
- Small teams
- Development and testing environments
- Organizations that need basic monitoring without premium features

## Features

### ✅ Included Features

- **RabbitMQ Server Management**
  - Connect to multiple RabbitMQ servers
  - View server overview and statistics
  - Monitor cluster nodes and their health

- **Queue Management**
  - View all queues across virtual hosts
  - Monitor queue depth, message rates, and consumers
  - Inspect queue details and messages
  - Publish and consume messages

- **Exchange Management**
  - View all exchanges
  - Inspect exchange bindings
  - Monitor exchange statistics

- **Virtual Host Management**
  - View and manage virtual hosts
  - Monitor virtual host statistics
  - View permissions

- **User Management**
  - View RabbitMQ users
  - Inspect user permissions
  - Monitor user activity

- **Connection & Channel Monitoring**
  - View active connections
  - Monitor channels
  - Track connection statistics

### ❌ Premium Features (Enterprise Only)

The following features require an Enterprise Edition license:

- Workspace Management
- Team Member Invitations
- Alerting System
- Slack Integration
- Webhook Integration
- Data Export
- Advanced Alert Rules

## Installation

### Recommended: Dokku Deployment

**We recommend using Dokku for self-hosting the Community Edition.** Dokku provides a simple, Heroku-like deployment experience on your own server.

#### Why Dokku?

- **Easy deployment**: Git push to deploy, just like Heroku
- **Automatic SSL**: Let's Encrypt certificates out of the box
- **Process management**: Built-in process scaling and monitoring
- **Database plugins**: Easy PostgreSQL setup with plugins
- **Zero configuration**: Works with minimal setup

#### Dokku Quick Start

1. **Install Dokku** on your server (see [Dokku Installation Guide](https://dokku.com/docs/getting-started/installation/))

2. **Create the app:**

   ```bash
   ssh dokku@your-server apps:create qarote
   ```

3. **Install PostgreSQL plugin:**

   ```bash
   sudo dokku plugin:install https://github.com/dokku/dokku-postgres.git postgres
   dokku postgres:create qarote-db
   dokku postgres:link qarote-db qarote
   ```

4. **Set environment variables:**

   ```bash
   dokku config:set qarote \
     DEPLOYMENT_MODE=community \
     NODE_ENV=production \
     LOG_LEVEL=info \
     JWT_SECRET=$(openssl rand -hex 64) \
     ENCRYPTION_KEY=$(openssl rand -hex 64) \
     CORS_ORIGIN=* \
     API_URL=https://your-domain.com \
     FRONTEND_URL=https://your-domain.com \
     ENABLE_EMAIL=false
   ```

   **Note:**
   - `DATABASE_URL` is automatically set by Dokku when you link the PostgreSQL service
   - `PORT` and `HOST` are automatically set by Dokku
   - Replace `https://your-domain.com` with your actual domain (or set it after configuring the domain in step 6)

5. **Deploy:**

   ```bash
   git remote add dokku dokku@your-server:qarote
   git push dokku main
   ```

6. **Set up domain (optional):**
   ```bash
   dokku domains:set qarote your-domain.com
   dokku letsencrypt:enable qarote
   ```

That's it! Your app will be available at `https://your-domain.com` (or your server's IP).

For more details, see the [Dokku Documentation](https://dokku.com/docs/).

---

### Alternative: Docker Compose

If you prefer Docker Compose or need more control over the deployment, you can use the Docker Compose method below.

#### Prerequisites

- Docker and Docker Compose
- PostgreSQL 15+ (or use the included PostgreSQL container)

#### Quick Start

1. **Clone the repository:**

   ```bash
   git clone https://github.com/getqarote/Qarote.git /opt/qarote
   cd /opt/qarote
   ```

   > `/opt/qarote` is the recommended path on Linux (follows the [FHS](https://refspecs.linuxfoundation.org/FHS_3.0/fhs/ch03s13.html) convention for optional software). On Windows (WSL2), use `C:\qarote`. Any directory works.

2. **Run the setup script:**

   ```bash
   ./setup.sh community
   ```

   This creates a `.env` file with secure random secrets and sets `DEPLOYMENT_MODE=community`. No Node.js required.

3. **Start services:**

   ```bash
   docker compose -f docker-compose.selfhosted.yml up -d
   ```

4. **Run database migrations:**

   ```bash
   docker exec qarote_backend_community pnpm run db:migrate
   ```

5. **Access the application:**
   - Frontend: http://localhost:8080
   - Backend API: http://localhost:3000

## Configuration

### Environment Variables

#### Required

- `DEPLOYMENT_MODE=community` - Set to community mode
- `JWT_SECRET` - Secret for JWT token signing (minimum 32 characters)
- `ENCRYPTION_KEY` - Key for encrypting RabbitMQ credentials (minimum 32 characters)
- `POSTGRES_PASSWORD` - PostgreSQL database password

#### Optional

- `ENABLE_EMAIL=false` - Disable email features (default: false)
- `CORS_ORIGIN` - CORS origin (default: `*`)
- `LOG_LEVEL` - Logging level (default: `info`)

**Note:** OAuth authentication (Google Sign-In) is only available in cloud deployments. Community Edition uses email/password authentication.

## Usage

### Adding RabbitMQ Servers

1. Log in to the application
2. Navigate to the servers page
3. Click "Add Server"
4. Enter your RabbitMQ connection details:
   - Server name
   - Host and port
   - Username and password
   - Virtual host (default: `/`)

### Monitoring Queues

1. Select a server from the sidebar
2. Navigate to the Queues page
3. View queue statistics and details
4. Click on a queue to see detailed information and messages

### Publishing Messages

1. Navigate to a queue detail page
2. Click "Publish Message"
3. Enter message content and properties
4. Send the message

## License

Qarote Community Edition is licensed under the MIT License. See the [LICENSE](../LICENSE) file for details.

## Support

- **Documentation**: [docs/README.md](README.md)
- **Issues**: GitHub Issues
- **Community**: GitHub Discussions

## Upgrading to Enterprise Edition

If you need premium features like workspace management, alerting, or integrations, you can upgrade to Enterprise Edition. See [ENTERPRISE_EDITION.md](ENTERPRISE_EDITION.md) for more information.

## Contributing

Contributions are welcome! Please see our contributing guidelines for more information.

## Security

For security vulnerabilities, please email security@qarote.io instead of using the public issue tracker.
