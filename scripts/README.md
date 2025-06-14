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
