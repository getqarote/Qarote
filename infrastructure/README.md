# Rabbit Scout Infrastructure - Pure Dokku

This directory contains a **pure Dokku** deployment setup for Rabbit Scout with:

- **Backend**: Dokku-based deployments (Node.js + PostgreSQL)
- **Frontend**: Cloudflare Pages (global CDN, excellent performance)
- **Database**: PostgreSQL via Dokku plugin

> **🔄 IDEMPOTENT DESIGN**: All setup and deployment scripts are idempotent - run them multiple times safely. They check for existing resources and only create what's missing.

## Architecture Overview

```
┌─────────────────┐ ┌──────────────────┐ ┌─────────────────┐
│    Cloudflare   │ │   Your Dokku     │ │     Dokku       │
│     Pages       │ │     Server       │ │   Services      │
│                 │ │                  │ │                 │
│ • Frontend      │────│ • Backend API    │────│ • PostgreSQL   │
│ • Global CDN    │ │ • Auto SSL       │ │ • Backup        │
│ • Auto Deploy   │ │ • Git Deploy     │ │                 │
└─────────────────┘ └──────────────────┘ └─────────────────┘
```

## Quick Start

### Automated Hetzner Cloud Setup

For a completely automated setup using Hetzner Cloud:

1. **Get Hetzner API Token**:
   - Go to [Hetzner Cloud Console](https://console.hetzner.cloud/projects)
   - Create or select your project
   - Go to Security → API Tokens
   - Create a new token with Read & Write permissions

2. **Configure Environment**:
   ```bash
   cd infrastructure
   cp environments/staging/.env.example environments/staging/.env
   # Add your HETZNER_API_TOKEN to the .env file
   ```

````

3. **Setup Staging** (1x small server) - **IDEMPOTENT**:

   ```bash
   npm run setup staging
   # Safe to run multiple times - checks for existing resources
   ```

4. **Setup Production** (2x standard servers + database + load balancer) - **IDEMPOTENT**:

   ```bash
   npm run setup production
   # Safe to run multiple times - checks for existing resources
   ```

5. **Deploy Applications** - **IDEMPOTENT**:

   ```bash
   npm run deploy staging
   # Safe to run multiple times - smart deployment checks
   ```

6. **Deploy Production** - **IDEMPOTENT**:
   ```bash
   npm run deploy production
   # Safe to run multiple times - smart deployment checks
   ```

### Server Setup Commands

```bash
# Hetzner Cloud automated setup (IDEMPOTENT)
npm run setup staging          # Create staging environment (1 server)
npm run setup production       # Create production environment (3 servers + LB)

# Alternative syntax (same commands)
npm run setup:staging          # Create staging environment
npm run setup:production       # Create production environment

# Custom SSH user (if needed)
npm run setup production ubuntu # Create production with custom SSH user
```

> **💡 IDEMPOTENT OPERATIONS**: All setup commands can be run multiple times safely. They check for existing servers, SSH keys, databases, and configurations before creating new ones.

## Infrastructure Options

### Hetzner Cloud Automated Setup

The new automated setup creates optimal server configurations with proper production architecture:

#### Staging Environment

- **1x CPX11 server** (2 vCPU, 2GB RAM, 40GB SSD) - €4.62/month
- **Architecture**: Single server with both application and database
- **Use case**: Development, testing, staging deployments

#### Production Environment

- **1x CPX31 database server** (4 vCPU, 8GB RAM, 160GB SSD) - €15.72/month
- **2x CPX31 app servers** (4 vCPU, 8GB RAM each) - €31.44/month
- **1x Load Balancer** (LB11) - €5.83/month
- **Total cost**: ~€52.99/month (~$58/month)

**Production Architecture:**

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Load Balancer  │    │  App Server 1    │    │  Database       │
│  (Entry Point)  │────│  (cx31)          │────│  Server         │
│                 │    │                  │    │  (cx21)         │
│                 │────│  App Server 2    │────│  PostgreSQL     │
│                 │    │  (cx31)          │    │  Only           │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

**Key Benefits:**

- ✅ **Data Consistency**: Single database shared by all app servers
- ✅ **High Availability**: Load balancer with automatic failover
- ✅ **Scalability**: Easy to add more app servers
- ✅ **Performance**: Dedicated database server
- ✅ **Cost-Effective**: Optimized server sizes for each role
- ✅ **Idempotent Setup**: Safe to run setup scripts multiple times
- ✅ **Production-Ready**: Automated SSL, backups, and monitoring

Features:

- ✅ **Idempotent automation** - Run setup scripts multiple times safely
- ✅ Automatic server creation and configuration
- ✅ Smart SSH key management (reuses existing keys)
- ✅ Firewall setup (UFW with proper ports)
- ✅ Docker and Dokku installation
- ✅ **Dedicated database server for production**
- ✅ Load balancer for production high availability
- ✅ Health checks and automatic failover
- ✅ Cost-effective pricing with proper separation of concerns
- ✅ Comprehensive error handling and recovery

### Manual Setup

If you prefer to use other cloud providers, you can still use any Ubuntu 22.04+ server with the Dokku setup scripts included in this project.

## Directory Structure

```
infrastructure/
├── README.md                 # This file
├── QUICKSTART.md            # Step-by-step deployment guide
├── scripts/                 # Deployment and management scripts
│   ├── setup-server.sh     # One-time server setup with Dokku
│   ├── deploy.sh           # Deploy to environment
│   ├── status.sh           # Check deployment status
│   ├── logs.sh             # View application logs
│   ├── scale.sh            # Scale applications
│   ├── backup.sh           # Database backup
│   └── destroy.sh          # Remove applications
├── dokku/                  # Dokku-specific configurations
│   ├── apps/               # App-specific configs
│   ├── nginx/              # Custom nginx configs
│   └── scripts/            # Helper scripts
├── cloudflare/             # Cloudflare Pages configuration
│   └── wrangler.toml
└── environments/           # Environment configurations
    ├── staging/
    └── production/
```

## Supported Environments

- **staging**: Development environment for testing
- **production**: Live production environment

## Available Commands

### Server Setup Commands

```bash
# Automated Hetzner Cloud setup
npm run setup:staging          # Create staging environment (1 server)
npm run setup:production       # Create production environment (2 servers + LB)

# Manual setup on existing servers
npm run setup manual <ip>      # Setup Dokku on existing server
npm run setup manual <ip> ubuntu # Setup with custom SSH user

# Legacy format (still supported)
npm run setup <ip>             # Same as manual setup
```

### Deployment Commands

```bash
# Deploy applications
npm run deploy:staging         # Deploy both frontend and backend to staging
npm run deploy:production      # Deploy both frontend and backend to production

# Check status and logs
npm run status:staging         # Check staging deployment status
npm run status:production      # Check production deployment status
npm run logs:staging           # View staging logs
npm run logs:production        # View production logs

# Scaling and management
npm run scale:staging          # Scale staging services
npm run scale:production       # Scale production services
npm run backup:staging         # Backup staging database
npm run backup:production      # Backup production database

# Maintenance mode
npm run maintenance on staging     # Enable maintenance mode for staging
npm run maintenance off staging    # Disable maintenance mode for staging
npm run maintenance status staging # Check maintenance status for staging
npm run maintenance on production  # Enable maintenance mode for production
npm run maintenance off production # Disable maintenance mode for production
npm run maintenance status production # Check maintenance status for production

# Cleanup
npm run destroy:staging        # Destroy staging environment
npm run destroy:production     # Destroy production environment
```

## Environment Variables

### Required for Hetzner Cloud Automation

```bash
# Get from: https://console.hetzner.cloud/projects
HETZNER_API_TOKEN=your-hetzner-api-token
```

### Server Configuration

```bash
# Your server details
DOKKU_HOST=your-server-ip
DOMAIN_BACKEND=api.yourdomain.com
DOMAIN_FRONTEND=yourdomain.com
```

See `environments/staging/.env.example` and `environments/production/.env.example` for complete configuration options.

## Prerequisites

- A server with Ubuntu 20.04+ (DigitalOcean, Hetzner, AWS, etc.)
- Domain name pointing to your server (for SSL)
- SSH access to your server

## Cost Optimization

- **Server**: $5-20/month (depending on provider and size)
- **Cloudflare Pages**: Free tier (25,000 requests/month)
- **PostgreSQL**: Included with Dokku setup
- **Total**: ~$5-20/month for full stack

## Key Features

- **Git-based Deployments**: Push to deploy
- **Automatic SSL**: Let's Encrypt certificates
- **Zero-downtime Deployments**: Built into Dokku
- **Easy Scaling**: Scale with simple commands
- **Database Management**: PostgreSQL with automatic backups
- **Monitoring**: Built-in logs and status monitoring

## Monitoring & Alerts

- **Dokku**: Built-in monitoring via `dokku ps` and `dokku logs`
- **Cloudflare**: Analytics dashboard
- **Uptime**: Configure external monitoring (UptimeRobot, Pingdom)
- **Sentry**: Error tracking (configured via environment variables)

## Backup Strategy

- **Database**: Daily automated backups via `./scripts/backup.sh`
- **Code**: Git repositories on GitHub
- **Configuration**: Infrastructure as Code in this repository

## Security Features

- **SSL/TLS**: Automatic Let's Encrypt certificates via Dokku
- **SSH**: Key-based authentication only
- **Secrets**: Environment variables via Dokku config
- **Firewall**: Basic firewall setup during server initialization

## Scaling

```bash
# Scale backend processes
./scripts/scale.sh production 3

# Scale frontend (automatically handled by Cloudflare)
# No manual scaling needed for frontend
```

## Script Options

We provide **two sets of equivalent scripts**:

### 🔧 Bash Scripts (Original)

Located in `scripts/` with `.sh` extension:

```bash
./scripts/setup-server.sh
./scripts/deploy.sh staging
./scripts/status.sh staging
```

### 🚀 TypeScript Scripts (Modern)

Modern, type-safe alternatives with enhanced features:

```bash
npm run setup your-server-ip
npm run deploy:staging
npm run status:staging
```

**TypeScript scripts provide:**

- ✅ Type safety and validation
- ✅ Enhanced error handling
- ✅ Interactive prompts
- ✅ Better documentation
- ✅ Consistent CLI interface

See `scripts/README.md` for detailed TypeScript script documentation.

## Maintenance Mode

All servers are equipped with the dokku-maintenance plugin for zero-downtime maintenance.

### Automated Management (Recommended)

Use the TypeScript maintenance script to manage maintenance mode across all servers:

```bash
# Enable maintenance mode
npm run maintenance on staging
npm run maintenance on production

# Disable maintenance mode
npm run maintenance off staging
npm run maintenance off production

# Check maintenance status
npm run maintenance status staging
npm run maintenance status production
```

### Manual Management

For direct server access, you can use SSH commands:

```bash
# Enable maintenance mode
ssh root@your-server-ip "dokku maintenance:on rabbit-hq"

# Disable maintenance mode
ssh root@your-server-ip "dokku maintenance:off rabbit-hq"

# Check maintenance status
ssh root@your-server-ip "dokku maintenance:report rabbit-hq"

# Set custom maintenance page
ssh root@your-server-ip "dokku maintenance:custom-page rabbit-hq /path/to/maintenance.html"
```

### Production Environment Maintenance

The automated script handles multiple servers automatically. For manual management in production with multiple app servers, enable maintenance mode on all servers:

```bash
# Enable on all app servers
ssh root@app-server-1-ip "dokku maintenance:on rabbit-hq"
ssh root@app-server-2-ip "dokku maintenance:on rabbit-hq"

# Disable on all app servers
ssh root@app-server-1-ip "dokku maintenance:off rabbit-hq"
ssh root@app-server-2-ip "dokku maintenance:off rabbit-hq"
```

The maintenance plugin shows a customizable maintenance page to users while you perform updates, ensuring professional communication during downtime.

## Support

For issues or questions:

1. Check logs: `./scripts/logs.sh production`
2. Check status: `./scripts/status.sh production`
3. Review documentation in `docs/`
4. Open GitHub issue

## 🗄️ Database Architecture

### **Staging Environment**

- **Location**: PostgreSQL runs as a Docker container on the single staging server
- **Access**: Local database accessible only within the server
- **Backup**: Single server backup includes both app and database

### **Production Environment**

- **Location**: Dedicated database server (cx21) with PostgreSQL only
- **Access**: App servers connect via private network to database server
- **Backup**: Dedicated database server with isolated backup process
- **Security**: Database server only accepts connections from app servers
- **Performance**: Dedicated resources ensure consistent database performance

### **Connection Details**

```bash
# Staging: Local database
DATABASE_URL=postgres://username:password@localhost:5432/rabbit-scout

# Production: External database server
DATABASE_URL=postgres://username:password@db-server-ip:5432/rabbit-scout
```

The production setup ensures:

- ✅ **Data Consistency**: All app servers use the same database
- ✅ **No Split-Brain**: Single source of truth for all data
- ✅ **Backup Simplicity**: One database to backup and restore
- ✅ **Performance**: Database gets dedicated CPU and memory
- ✅ **Scalability**: Add app servers without database concerns

## 🔄 Idempotent Operations & Safe Usage

All infrastructure scripts are designed to be **idempotent** - meaning they can be run multiple times safely without causing conflicts or duplicating resources.

### What "Idempotent" Means

- ✅ **Safe to re-run**: Scripts check for existing resources before creating new ones
- ✅ **No duplicates**: Won't create multiple servers with the same name
- ✅ **Smart recovery**: Can recover from partial failures by re-running
- ✅ **Incremental setup**: Only performs operations that haven't been completed yet

### Idempotent Operations Examples

```bash
# Server Creation - checks for existing servers first
npm run setup staging
# First run: Creates new server
# Second run: "Server 'rabbit-hq-staging' already exists, using existing server"

# SSH Key Management - reuses existing keys
# First run: Creates SSH key in Hetzner Cloud
# Second run: "Found existing SSH key: <key-name>"

# Database Setup - checks for existing databases
# First run: Creates PostgreSQL database
# Second run: "Database 'rabbit-hq-db' already exists, skipping creation..."

# Plugin Installation - checks installed plugins
# First run: Installs Dokku plugins
# Second run: "PostgreSQL plugin already installed, skipping..."

# Deployment - smart deployment checks
npm run deploy staging
# Only deploys if changes are detected or forced
```

### Safe Recovery Patterns

```bash
# If setup fails halfway through, just re-run:
npm run setup production
# Script will:
# ✅ Skip servers that already exist
# ✅ Skip SSH keys that already exist
# ✅ Continue from where it left off
# ✅ Only create missing resources

# If deployment fails, re-run safely:
npm run deploy production
# Will check current state and only deploy necessary changes

# Configuration updates are also safe:
npm run setup production  # Update server configurations
npm run deploy production # Deploy latest code
```

### When to Re-run Scripts

**Safe to re-run anytime:**

- After failed setup attempts
- To update server configurations
- To ensure all components are properly installed
- After manual changes that might have broken something
- To apply new script improvements

**Common use cases:**

```bash
# Scenario 1: Setup failed during plugin installation
npm run setup staging          # Re-run to complete setup

# Scenario 2: Want to ensure latest configurations
npm run setup production       # Apply any new settings

# Scenario 3: Database seems broken
npm run setup staging          # Will check and recreate if needed

# Scenario 4: After script updates
npm run setup production       # Apply any script improvements
```

### Performance Benefits

```bash
# First-time setup:
npm run setup staging          # ~9 minutes (full setup)

# Subsequent runs (idempotent checks):
npm run setup staging          # ~2 minutes (verification only)
```

## 🔍 Understanding Script Output

The setup scripts provide detailed logging to help you understand what's happening:

### Setup Script Output Examples

```bash
$ npm run setup staging

🔧 Setting up Hetzner Cloud infrastructure for staging...
📋 Checking SSH key in Hetzner Cloud...
✅ Found existing SSH key: rabbit-hq-deploy-1684567890
📋 Checking if server 'rabbit-hq-staging' exists...
✅ Server 'rabbit-hq-staging' already exists, using existing server
📋 Server IP: 1.2.3.4
📋 Setting up staging server with Dokku (app + database)...
📋 Testing SSH connection...
✅ SSH connection successful
📋 Creating database server setup script...
📋 Uploading and running database setup script...

🗄️  Starting Database Server setup...
📦 Updating system packages...
🔒 Configuring firewall for database server...
🚀 Installing Dokku...
✅ Dokku already installed, skipping...
🔌 Installing PostgreSQL and maintenance plugins...
✅ PostgreSQL plugin already installed, skipping...
✅ Maintenance plugin already installed, skipping...
💾 Creating swap file for database server...
✅ Swap file already exists, checking if active...
✅ Swap file already active
🗄️  Creating main database...
✅ Database 'rabbit-hq-db' already exists, skipping creation...
🔗 Configuring PostgreSQL for external connections...
✅ PostgreSQL already exposed on port 5432, skipping...
✅ Database server setup complete!

✅ Staging server is ready!
📋 Staging URL: http://1.2.3.4
```

### Understanding Status Messages

- **📋 Blue messages**: Informational steps
- **✅ Green messages**: Successful operations
- **⚠️ Yellow messages**: Warnings or skipped operations
- **❌ Red messages**: Errors that need attention

### Common "Skipped" Messages (Normal)

```bash
✅ Server 'rabbit-hq-staging' already exists, using existing server
✅ Found existing SSH key: <key-name>
✅ Dokku already installed, skipping...
✅ PostgreSQL plugin already installed, skipping...
✅ Database 'rabbit-hq-db' already exists, skipping creation...
✅ Swap file already active
```

These messages are **normal and expected** when re-running scripts - they indicate the idempotent checks are working correctly.

## 🚨 Troubleshooting Common Issues

### Issue: "SSH connection failed"

```bash
❌ SSH connection failed
```

**Causes & Solutions:**

1. **Server still booting** (most common):
   ```bash
   # Wait 2-3 minutes and try again
   npm run setup staging
   ```

2. **SSH key not uploaded**:
   ```bash
   # Check if key exists locally
   ls ~/.ssh/id_rsa.pub

   # If not, create it
   ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa

   # Re-run setup
   npm run setup staging
   ```

3. **Firewall blocking SSH**:
   ```bash
   # Access via Hetzner Cloud Console
   # Check firewall rules allow port 22
   ```

### Issue: "HETZNER_API_TOKEN environment variable is required"

```bash
❌ Error: HETZNER_API_TOKEN environment variable is required
```

**Solution:**
```bash
# Check if token is set
echo $HETZNER_API_TOKEN

# If empty, add to .env file:
echo "HETZNER_API_TOKEN=your-token-here" >> .env

# Or set temporarily:
export HETZNER_API_TOKEN=your-token-here
npm run setup staging
```

### Issue: "Database setup script failed"

```bash
❌ Database setup script failed with exit code: 1
```

**Recovery steps:**
```bash
# 1. SSH to server and check logs
ssh root@<server-ip>
sudo journalctl -u dokku --no-pager -n 50

# 2. Check disk space
df -h

# 3. Check if Dokku is running
systemctl status dokku

# 4. Re-run setup (idempotent)
npm run setup staging
```

### Issue: "Load balancer creation failed"

```bash
❌ Failed to check/create load balancer
```

**Common causes:**
1. **Quota limits**: Check Hetzner Cloud Console for limits
2. **Network issues**: Temporary API problems
3. **Server dependencies**: App servers must exist first

**Solution:**
```bash
# Wait a few minutes and retry
npm run setup production
```

### Issue: Plugin installation failures

```bash
❌ Plugin installation failed
```

**Recovery steps:**
```bash
# SSH to server
ssh root@<server-ip>

# Check internet connectivity
ping -c 3 google.com

# Check Dokku status
dokku version

# Remove corrupted plugin and reinstall
dokku plugin:uninstall postgres
dokku plugin:install https://github.com/dokku/dokku-postgres.git postgres

# Re-run setup
npm run setup staging
```

### Complete Reset (Nuclear Option)

If everything is broken and you want to start fresh:

```bash
# WARNING: This deletes all resources!
npm run destroy staging     # or production
npm run setup staging       # Create everything from scratch
```
````
