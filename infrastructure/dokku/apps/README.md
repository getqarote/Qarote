# Dokku App Configuration

This directory contains app-specific configurations for Dokku deployments.

## Backend Configuration

The backend is deployed as a Node.js application with the following setup:

### Buildpacks

- Node.js buildpack (automatically detected)

### Processes

- Web process: `npm start`
- Default port: 5000

### Linked Services

- PostgreSQL database

### Environment Variables

All environment variables are automatically configured during deployment from the environment files.

### SSL/TLS

Let's Encrypt certificates are automatically provisioned and renewed.

## Database Configuration

### PostgreSQL

- Version: Latest stable
- Automatic backups: Available via `./scripts/backup.sh`
- Connection: Automatically linked to backend app

## Scaling

By default, apps run with 1 process. Scale using:

```bash
./scripts/scale.sh <environment> <number-of-processes>
```

## Monitoring

Monitor apps using:

```bash
./scripts/status.sh <environment>
./scripts/logs.sh <environment>
```

## Custom Domains

Domains are automatically configured during deployment:

- Staging: staging-api.yourdomain.com
- Production: api.yourdomain.com

## Zero-Downtime Deployments

Dokku provides zero-downtime deployments by default:

1. Builds new version
2. Runs health checks
3. Switches traffic to new version
4. Removes old version
