# Testing GitHub Actions Locally with `act`

This repository uses [`act`](https://github.com/nektos/act) to test GitHub Actions workflows locally before pushing to GitHub.

## Installation

**Note**: `act` must be installed locally on your machine. It is not available via docker-compose.

### macOS

```bash
brew install act
```

### Linux

```bash
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash
```

### Windows

```bash
# Using Chocolatey
choco install act-cli

# Or using Scoop
scoop install act
```

### Verify Installation

```bash
act --version
```

## Quick Start

### Test workflows using npm scripts (Recommended)

```bash
# List all available workflows
pnpm run act:list

# Test staging workflows
pnpm run act:test:api          # API staging quality checks
pnpm run act:test:frontend     # Frontend staging quality checks
pnpm run act:test:landing      # Landing staging quality checks
pnpm run act:test:portal       # Portal staging quality checks
pnpm run act:test:worker       # Worker staging quality checks

# Test production workflows (workflow_dispatch)
pnpm run act:test:api:prod     # API production
pnpm run act:test:frontend:prod # Frontend production
pnpm run act:test:landing:prod  # Landing production
pnpm run act:test:portal:prod   # Portal production
pnpm run act:test:worker:prod   # Worker production
```

### Use act directly

```bash
# Test a specific job
act -j quality-checks -W .github/workflows/deploy-api-staging.yml

# List all workflows
pnpm run act:list
# or
act -l
```

## Configuration

The repository includes a `.actrc` file with default settings:

- Uses `catthehacker/ubuntu:act-latest` image (medium size, good compatibility)
- Uses `linux/amd64` architecture for Apple Silicon compatibility

## Known Issues & Solutions

### Rollup Native Module Error

**Problem**: Tests fail with error: `Cannot find module @rollup/rollup-linux-x64-gnu`

**Cause**: The host's macOS `node_modules` (with macOS-specific binaries) are copied into the Linux container, causing platform mismatches.

**Solution**: Remove `node_modules` before running act, or ensure the workflow's `npm ci` step properly handles platform-specific dependencies:

```bash
# Option 1: Remove node_modules before testing
rm -rf node_modules
act -j quality-checks -W .github/workflows/deploy-api-staging.yml
npm install  # Restore after testing

# Option 2: Use the npm scripts which handle this
pnpm run act:test:api
```

### Docker Not Running

Make sure Docker Desktop is running before using `act`.

### Secrets and Environment Variables

To test workflows that require secrets:

```bash
act -j deploy-backend \
    -W .github/workflows/deploy-api-staging.yml \
    --secret DOKKU_SSH_PRIVATE_KEY="$(cat ~/.ssh/id_rsa)" \
    --env DOKKU_HOST=your-host
```

Or create a `.secrets` file:

```
DOKKU_SSH_PRIVATE_KEY=your-key-here
```

Then use:

```bash
act --secret-file .secrets
```

### Testing Deploy Jobs

To test the `deploy-backend` job (will fail at SSH/deployment steps, but you can verify corepack setup):

```bash
# Using npm script (recommended)
pnpm run act:test:api:deploy

# Or directly with act (requires secrets)
act -j deploy-backend \
    -W .github/workflows/deploy-api-staging.yml \
    --skip-checkout \
    --secret DOKKU_SSH_PRIVATE_KEY="$(cat ~/.ssh/id_rsa)" \
    --env DOKKU_HOST=your-dokku-host
```

**Note**: The deploy job will fail when trying to SSH to Dokku (expected in local testing), but you can verify that:
- Corepack setup scripts run correctly
- Environment variables are properly configured
- The workflow structure is correct

### Testing Corepack Setup Locally

To test the corepack setup without running the full deployment:

```bash
pnpm run test:corepack
```

This script simulates the Heroku buildpack behavior and tests:
- `bin/prebuild` script execution
- `heroku-prebuild` script execution  
- Corepack availability and pnpm preparation
- Simulates the `binaries.sh: line 244` check that fails in Dokku

## Testing Different Workflows

```bash
# Using npm scripts (recommended)
pnpm run act:test:api
pnpm run act:test:frontend
pnpm run act:test:landing
pnpm run act:test:portal
pnpm run act:test:worker

# Or use act directly
act -j quality-checks -W .github/workflows/deploy-api-staging.yml
act -j quality-checks -W .github/workflows/deploy-frontend-staging.yml

# Production workflows (workflow_dispatch)
pnpm run act:test:api:prod
# or
act workflow_dispatch -W .github/workflows/deploy-api-production.yml --input confirm_production=DEPLOY
```

## Limitations

- **Deployment steps**: SSH and deployment actions won't work the same way locally
- **Third-party actions**: Some marketplace actions may have limited compatibility
- **Secrets**: Must be provided manually using `--secret` flags
- **Platform-specific dependencies**: May need to clean `node_modules` before testing

## Useful Commands

```bash
# Dry run (see what would execute)
act -j quality-checks -W .github/workflows/deploy-api-staging.yml --dry-run

# Verbose output
act -j quality-checks -W .github/workflows/deploy-api-staging.yml -v

# List workflows
act -l

# Run with specific event
act push
act pull_request
act workflow_dispatch
```

## Resources

- [act Documentation](https://nektosact.com/)
- [act GitHub Repository](https://github.com/nektos/act)
