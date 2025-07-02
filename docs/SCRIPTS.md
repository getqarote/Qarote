# Scripts

This folder contains utility scripts for the RabbitMQ Dashboard project.

## Scripts

### Test Data Seeding Scripts

Comprehensive test data seeding scripts to quickly test UX bottlenecks and plan validation across different user scenarios.

#### 🚀 Quick Start

```bash
# Seed all test scenarios
tsx scripts/seed-test-data.ts

# Or seed specific types
tsx scripts/seed-test-data.ts --type=users
tsx scripts/seed-test-data.ts --type=limits
tsx scripts/seed-test-data.ts --type=email
```

#### 📋 Test Scenarios

**1. Main User Scenarios (`seed-test-users.ts`)**

- Solo Developer (FREE): 1 user, 1 server, 1 queue
- Developer Studio (DEVELOPER): 2 users, 2 servers, 8 queues
- TechStart Inc (STARTUP): 5 users, 6 servers, 35 queues
- Enterprise Corp (BUSINESS): 11 users, 25 servers, 150 queues

**2. Plan Limit Tests (`seed-limit-tests.ts`)**

- Users at exact plan limits
- Users over limits (legacy scenarios)
- Users near limits
- Heavy usage scenarios

**3. Email Verification Tests (`seed-email-verification-tests.ts`)**

- Unverified users (fresh and old signups)
- Users with pending email changes
- Expired verification tokens
- Team member verification states

#### 📊 Test Credentials

All test users use password: `password123`

**Quick Access:**

- `free@test.com` - FREE plan user
- `developer@test.com` - DEVELOPER plan user
- `admin@techstart.com` - STARTUP team admin
- `admin@enterprise.com` - BUSINESS enterprise admin
- `unverified.fresh@test.com` - Needs email verification

See full documentation in individual script files for complete testing guide.

---

### populate-rabbitmq-data.ts

Populates RabbitMQ with sample data for testing and demonstration purposes.

**Usage:**

```bash
# From project root
npm run populate:rabbitmq

# Or run directly with tsx
npx tsx scripts/populate-rabbitmq-data.ts
```

**Environment Variables:**

- `RABBITMQ_HOST` - RabbitMQ host (default: localhost)
- `RABBITMQ_PORT` - RabbitMQ port (default: 5672)
- `RABBITMQ_USER` - RabbitMQ username (default: admin)
- `RABBITMQ_PASS` - RabbitMQ password (default: admin123)
- `RABBITMQ_MANAGEMENT_PORT` - Management UI port (default: 15672)

**What it creates:**

- Creates exchanges: notifications.direct, user.events, events.topic, analytics.fanout, system.alerts
- Creates and binds queues for different message types
- Publishes sample messages:
  - 70 email notification messages
  - 15 SMS notification messages
  - 80 user event messages (registrations, logins)
  - 48 order processing messages
  - 30 payment processing messages
  - 205 analytics events
  - 26 system alert messages

**Total:** ~474 sample messages across different exchanges and queues

---

# Alert Seeding Script

This script creates sample alert rules and alerts for testing and demonstration purposes.

## Usage

### Run the seeding script

```bash
cd back-end
npm run seed:alerts
```

### Clean up test data

```bash
cd back-end
npm run seed:alerts:cleanup
```

## What it creates

### Alert Rules (per server)

- **High Queue Depth**: Triggers when queue depth > 1000 messages
- **Critical Queue Depth**: Triggers when queue depth > 5000 messages
- **Low Message Rate**: Triggers when message rate < 10/sec
- **High Memory Usage**: Triggers when memory usage > 80%
- **Critical Memory Usage**: Triggers when memory usage > 95%
- **No Consumers**: Triggers when consumer count = 0
- **High Connection Count**: Triggers when connections > 100
- **Node Down**: Triggers when RabbitMQ node is unreachable
- **Disk Usage Warning**: Triggers when disk usage > 75%
- **Critical Disk Usage**: Triggers when disk usage > 90%

### Sample Alerts

- Creates ~36 sample alerts with different statuses (Active, Acknowledged, Resolved)
- Includes alerts with realistic values and descriptions
- Distributes alerts across different time periods for testing

### Test Company & User

- Creates "Test Company" with premium plan
- Creates admin user: `admin@testcompany.com`
- **Password**: `password123`
- Creates test RabbitMQ server if none exists

## Login Credentials

After running the seed script, you can log in with:

- **Email**: `admin@testcompany.com`
- **Password**: `password123`

## Script Features

- **Idempotent**: Safe to run multiple times
- **Realistic Data**: Creates alerts with proper relationships and realistic values
- **Time Distribution**: Alerts are spread across different time periods
- **Status Variety**: Mix of active, acknowledged, and resolved alerts
- **Severity Levels**: All severity levels represented (LOW, MEDIUM, HIGH, CRITICAL)
- **Cleanup Option**: Can clean up all test data

## Output

The script provides detailed console output showing:

- Number of alert rules created
- Number of alerts created
- Summary statistics
- Company and user information

This data is perfect for testing the alert dashboard, filtering, pagination, and other alert-related features.
