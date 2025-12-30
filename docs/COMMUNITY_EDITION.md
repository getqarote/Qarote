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

### Prerequisites

- Docker and Docker Compose
- PostgreSQL 15+ (or use the included PostgreSQL container)
- Node.js 24+ (for development)

### Quick Start

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-org/qarote.git
   cd qarote
   ```

2. **Copy environment file:**
   ```bash
   cp .env.community.example .env
   ```

3. **Configure environment variables:**
   ```bash
   # Required
   DEPLOYMENT_MODE=community
   JWT_SECRET=your-secret-key-min-32-chars
   ENCRYPTION_KEY=your-encryption-key-min-32-chars
   POSTGRES_PASSWORD=your-secure-password
   
   # Optional
   ENABLE_EMAIL=false
   ENABLE_OAUTH=false
   ENABLE_SENTRY=false
   ```

4. **Start services:**
   ```bash
   docker-compose -f docker-compose.community.yml up -d
   ```

5. **Run database migrations:**
   ```bash
   docker exec qarote_backend_community pnpm run db:migrate
   ```

6. **Access the application:**
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
- `ENABLE_OAUTH=false` - Disable OAuth authentication (default: false)
- `ENABLE_SENTRY=false` - Disable error tracking (default: false)
- `CORS_ORIGIN` - CORS origin (default: `*`)
- `LOG_LEVEL` - Logging level (default: `info`)

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

