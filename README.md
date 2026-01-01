# Qarote - RabbitMQ Dashboard & Monitoring

Qarote is a modern, user-friendly dashboard for monitoring and managing RabbitMQ servers. It provides real-time visibility into queues, exchanges, connections, and system health.

## Editions

Qarote is available in two editions:

### Community Edition (Open Source)

- **License**: MIT
- **Price**: Free
- **Features**: Core RabbitMQ monitoring (queues, exchanges, vhosts, users)
- **Documentation**: [docs/COMMUNITY_EDITION.md](docs/COMMUNITY_EDITION.md)

### Enterprise Edition (Licensed)

- **License**: Commercial
- **Price**: Paid
- **Features**: All Community features plus workspace management, alerting, integrations (Slack, webhooks), and data export
- **Documentation**: [docs/ENTERPRISE_EDITION.md](docs/ENTERPRISE_EDITION.md)

**Feature Comparison**: See [docs/FEATURE_COMPARISON.md](docs/FEATURE_COMPARISON.md) for a detailed comparison.

**Deployment Guide**: See [docs/SELF_HOSTED_DEPLOYMENT.md](docs/SELF_HOSTED_DEPLOYMENT.md) for deployment instructions.

## Self-Hosted Deployment

### Community Edition - Recommended: Dokku

**We recommend using Dokku for self-hosting the Community Edition.** It provides a simple, Heroku-like deployment experience:

```bash
# 1. Install Dokku on your server
# 2. Create app and database
ssh dokku@your-server apps:create qarote
dokku postgres:create qarote-db && dokku postgres:link qarote-db qarote

# 3. Set environment variables
dokku config:set qarote DEPLOYMENT_MODE=community JWT_SECRET=... ENCRYPTION_KEY=...

# 4. Deploy
git remote add dokku dokku@your-server:qarote
git push dokku main
```

See [docs/COMMUNITY_EDITION.md](docs/COMMUNITY_EDITION.md#recommended-dokku-deployment) for complete Dokku instructions.

### Alternative: Docker Compose

Both Community and Enterprise editions can also be self-hosted using Docker Compose:

```bash
# 1. Copy environment file
cp .env.selfhosted.example .env

# 2. Edit .env and set DEPLOYMENT_MODE
#    - For Community: DEPLOYMENT_MODE=community
#    - For Enterprise: DEPLOYMENT_MODE=enterprise (also set LICENSE_FILE_PATH and LICENSE_PUBLIC_KEY)

# 3. Start services
docker-compose -f docker-compose.selfhosted.yml up -d
```

See [docs/SELF_HOSTED_DEPLOYMENT.md](docs/SELF_HOSTED_DEPLOYMENT.md) for complete instructions.

---

## Docker Development Setup

This directory contains Docker configuration files for running a complete development environment with RabbitMQ, PostgreSQL, and sample data.

## Services

### PostgreSQL Database

- **Port**: 5432
- **Database**: qarote
- **Username**: postgres
- **Password**: password

### RabbitMQ Server

- **AMQP Port**: 5672
- **Management UI**: http://localhost:15672
- **Username**: admin
- **Password**: admin123

## Quick Start

1. **Start the services**:

   ```bash
   docker-compose up -d
   ```

2. **Wait for services to be ready** (about 30-60 seconds):

   ```bash
   docker-compose logs -f rabbitmq
   ```

   Wait until you see "Server startup complete" message.

3. **Populate RabbitMQ with sample data**:

   ```bash
   docker exec rabbit_dashboard_qarote /etc/rabbitmq/populate-data.sh
   ```

4. **Access the RabbitMQ Management UI**:
   Open http://localhost:15672 in your browser
   - Username: `admin`
   - Password: `admin123`

5. **Start your backend API** (in another terminal):

   ```bash
   cd apps/api
   pnpm run dev
   ```

6. **Start your frontend** (in another terminal):
   ```bash
   cd apps/app
   pnpm run dev
   ```

## Pre-configured Data

The RabbitMQ instance comes pre-configured with:

### Users

- **admin** (administrator) - Password: admin123
- **guest** (management) - Password: admin123
- **producer** (producer role) - Password: admin123
- **consumer** (consumer role) - Password: admin123

### Virtual Hosts

- `/` (default)
- `/production`
- `/staging`

### Exchanges

- **notifications.direct** - Direct exchange for notifications
- **events.topic** - Topic exchange for events
- **analytics.fanout** - Fanout exchange for analytics
- **user.events** - Topic exchange for user events
- **system.alerts** - Direct exchange for system alerts

### Queues

- **email.notifications** - Email notification queue (TTL: 1 hour, Max: 10,000)
- **sms.notifications** - SMS notification queue (TTL: 30 min, Max: 5,000)
- **user.registration.events** - User registration events
- **user.login.events** - User login events
- **order.processing** - Order processing queue (TTL: 2 hours, Max: 1,000)
- **payment.processing** - Payment processing queue (TTL: 5 min)
- **analytics.clicks** - Click analytics (Max: 50,000)
- **analytics.pageviews** - Pageview analytics (Max: 100,000)
- **critical.alerts** - Critical system alerts (TTL: 24 hours)
- **warning.alerts** - Warning alerts (TTL: 12 hours)
- **info.alerts** - Info alerts (TTL: 1 hour, Max: 1,000)

## Sample Data

After running the populate script, you'll have realistic message counts in each queue:

- Email notifications: ~70 messages
- SMS notifications: ~15 messages
- User events: ~80 messages
- Order processing: ~48 messages
- Payment processing: ~30 messages
- Analytics: ~205 messages
- System alerts: ~26 messages

## Useful Commands

### View logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f rabbitmq
docker-compose logs -f postgres
```

### Stop services

```bash
docker-compose down
```

### Stop and remove volumes (clean slate)

```bash
docker-compose down -v
```

### Restart RabbitMQ

```bash
docker-compose restart rabbitmq
```

### Access RabbitMQ container shell

```bash
docker exec -it rabbit_dashboard_qarote sh
```

### Re-populate sample data

```bash
docker exec rabbit_dashboard_qarote /etc/rabbitmq/populate-data.sh
```

## Adding Your Own Server

In your frontend application, use the "Add Server" form with these settings:

- **Name**: Local Development
- **Host**: localhost
- **Port**: 15672
- **Username**: admin
- **Password**: admin123
- **Use SSL**: No

## Monitoring

The RabbitMQ Management UI provides comprehensive monitoring:

- Queue depths and message rates
- Exchange message rates
- Connection and channel information
- Node health and memory usage
- User permissions and virtual host management

## Configuration Files

- `docker-compose.yml` - Main Docker Compose configuration
- `docker/rabbitmq/rabbitmq.conf` - RabbitMQ server configuration
- `docker/rabbitmq/definitions.json` - Pre-configured exchanges, queues, users, and bindings
- `docker/rabbitmq/populate-data.sh` - Script to add sample messages

## Troubleshooting

### RabbitMQ won't start

- Check if port 5672 or 15672 are already in use
- Ensure Docker has enough memory allocated (at least 2GB recommended)

### Can't access Management UI

- Wait for the service to fully start (check logs)
- Ensure port 15672 is not blocked by firewall
- Try accessing via http://127.0.0.1:15672 instead of localhost

### Sample data script fails

- Ensure RabbitMQ is fully started before running the script
- Check that the management plugin is enabled
- Verify the container can reach the RabbitMQ management API

### Database connection issues

- Ensure PostgreSQL is running and healthy
- Check that port 5432 is accessible
- Verify database credentials in your backend configuration
