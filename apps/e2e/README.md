# E2E Testing Setup & Troubleshooting

This document explains how to set up and run E2E tests for Qarote.

## 🚀 Quick Start

### 1. Prerequisites

- Docker and Docker Compose
- Node.js 24.x (currently using 22.x may cause warnings)
- pnpm 9.0+

### 2. Environment Setup

Copy the environment file:
```bash
cp .env.test .env.test.local  # Optional: customize your local settings
```

### 3. Start Test Services

Start the required PostgreSQL and RabbitMQ services:
```bash
# From the e2e directory
cd apps/e2e
docker compose -f docker/docker-compose.e2e.yml up -d
```

Wait for services to be healthy:
```bash
docker compose -f docker/docker-compose.e2e.yml ps
```

### 4. Install Dependencies

From the project root:
```bash
cd ../..  # Go to project root
pnpm install
```

### 5. Run Tests

```bash
# From the e2e directory
cd apps/e2e

# Run all tests
pnpm test

# Run specific test suites
pnpm test:smoke      # Smoke tests only
pnpm test:selfhosted # Self-hosted mode tests
pnpm test:p0         # Priority 0 tests only

# Run with UI (interactive mode)
pnpm test:ui
```

## 🐛 Common Issues & Solutions

### Issue 1: Docker Permission Denied

**Error:** `docker: Permission denied`

**Solution:**
```bash
# Add your user to docker group (requires logout/login)
sudo usermod -aG docker $USER

# Or use sudo for docker commands
sudo docker compose -f docker/docker-compose.e2e.yml up -d
```

### Issue 2: Database Connection Failed

**Error:** `Database not available after 30 seconds`

**Solutions:**
1. Check if PostgreSQL is running:
   ```bash
   docker ps | grep qarote_e2e_postgres
   ```

2. Check database health:
   ```bash
   docker compose -f docker/docker-compose.e2e.yml logs postgres
   ```

3. Verify connection:
   ```bash
   psql "postgres://postgres:password@localhost:5433/qarote_e2e" -c "SELECT 1;"
   ```

### Issue 3: Node.js Version Warning

**Error:** `Unsupported engine: wanted: {"node":"24.x"} (current: {"node":"v22.22.0"})`

**Solutions:**
1. **Recommended:** Update to Node.js 24.x
   ```bash
   nvm install 24
   nvm use 24
   ```

2. **Temporary:** Force install (may cause issues)
   ```bash
   pnpm install --force
   ```

### Issue 4: Prisma Generate Failed

**Error:** `prisma generate: Permission denied`

**Solutions:**
1. Install Prisma globally:
   ```bash
   npm install -g prisma
   ```

2. Generate manually:
   ```bash
   cd apps/api
   npx prisma generate
   ```

### Issue 5: Playwright Not Found

**Error:** `Cannot find package '@playwright/test'`

**Solutions:**
1. Install Playwright browsers:
   ```bash
   cd apps/e2e
   npx playwright install
   ```

2. Install dependencies in e2e directory:
   ```bash
   cd apps/e2e
   pnpm install
   ```

## 🔧 Service Ports

| Service | Port | Purpose |
|---------|------|---------|
| PostgreSQL | 5433 | Test database |
| RabbitMQ AMQP | 5682 | Message queue |
| RabbitMQ Management | 15682 | Management UI |
| API | 3001 | Backend API |
| Frontend | 8081 | React app |

## 📋 Test Structure

```
tests/
├── auth/           # Authentication tests
├── smoke/          # Basic functionality
├── rabbitmq/       # RabbitMQ management
├── workspace/      # Workspace features
├── alerts/         # Alert system
├── profile/        # User profile
└── license/        # License validation
```

## 🎯 Test Categories

- **@smoke** - Basic functionality (fastest)
- **@p0** - Priority 0 (critical paths)
- **@p1** - Priority 1 (important features)

## 💡 Development Tips

1. **Run specific tests:**
   ```bash
   pnpm test tests/auth/sign-in.spec.ts
   ```

2. **Debug mode:**
   ```bash
   pnpm test:ui  # Interactive mode
   ```

3. **Generate test code:**
   ```bash
   pnpm test:codegen  # Record interactions
   ```

4. **View test reports:**
   ```bash
   pnpm report
   ```

## 🧹 Cleanup

Stop test services:
```bash
docker compose -f docker/docker-compose.e2e.yml down -v
```

Remove test containers:
```bash
docker system prune -f
```