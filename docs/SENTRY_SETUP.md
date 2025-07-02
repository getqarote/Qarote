# Sentry Integration Setup

This document describes the Sentry integration for error monitoring and performance tracking in the Rabbit Scout application.

## Environment Variables

### Backend (.env)

```bash
# Sentry Configuration
SENTRY_DSN=your_backend_sentry_dsn_here
SENTRY_ENABLED=true  # Set to enable Sentry in development
SENTRY_RELEASE=rabbit-scout-backend@1.0.0  # Optional: release version
```

### Frontend (.env)

```bash
# Sentry Configuration
VITE_SENTRY_DSN=your_frontend_sentry_dsn_here
VITE_SENTRY_ENABLED=true  # Set to enable Sentry in development
VITE_SENTRY_RELEASE=rabbit-scout-frontend@1.0.0  # Optional: release version
VITE_APP_VERSION=1.0.0  # Fallback for release tracking
```

## Features

### Backend Monitoring

- **Error Tracking**: Automatic capture of unhandled exceptions and errors
- **Performance Monitoring**: Request tracing and database query monitoring
- **Custom Instrumentation**:
  - RabbitMQ operation errors
  - Message processing errors
  - Streaming errors
- **User Context**: Automatic user and workspace context setting on authentication
- **Security**: Sensitive headers (authorization, cookies) are filtered out

### Frontend Monitoring

- **Error Tracking**: Component and JavaScript error capture with React error boundaries
- **Performance Monitoring**: Page load and interaction tracing
- **Session Replay**: User session recordings (production only, with privacy masking)
- **Custom Instrumentation**:
  - UI component errors
  - API request/response errors
  - Streaming connection errors
- **User Context**: Automatic user and workspace context setting

## Setup Instructions

### 1. Create Sentry Projects

1. Go to [Sentry.io](https://sentry.io) and create an account
2. Create two projects:
   - **Backend Project**: Node.js platform
   - **Frontend Project**: React platform
3. Copy the DSN from each project

### 2. Configure Environment Variables

1. Add the DSNs to your environment files as shown above
2. Set `SENTRY_ENABLED=true` and `VITE_SENTRY_ENABLED=true` for development testing
3. For production, these can be omitted (Sentry auto-enables in production)

### 3. Deploy Configuration

1. Set environment variables in your deployment platform
2. Configure release tracking:

   ```bash
   # Backend
   SENTRY_RELEASE=rabbit-scout-backend@$(git rev-parse --short HEAD)

   # Frontend
   VITE_SENTRY_RELEASE=rabbit-scout-frontend@$(git rev-parse --short HEAD)
   ```

### 4. Release Tracking (Optional)

For advanced release tracking, you can use the Sentry CLI:

```bash
# Install Sentry CLI
npm install -g @sentry/cli

# Configure
export SENTRY_AUTH_TOKEN=your_auth_token
export SENTRY_ORG=your_org_slug

# Create release and upload source maps
sentry-cli releases new $RELEASE_VERSION
sentry-cli releases files $RELEASE_VERSION upload-sourcemaps ./dist
sentry-cli releases finalize $RELEASE_VERSION
```

## Error Boundary

The frontend includes a global error boundary that catches unhandled React errors and displays a user-friendly fallback UI while reporting the error to Sentry.

## Privacy and Security

- **Data Filtering**: Sensitive information is automatically filtered
- **Session Replay**: Only enabled in production with full text/media masking
- **User Data**: Only non-sensitive user identifiers are sent to Sentry
- **Development**: HMR and development-specific errors are filtered out

## Testing

### Backend Testing

```bash
# Trigger a test error
curl -X POST http://localhost:3000/api/test/sentry-error
```

### Frontend Testing

```bash
# In browser console
throw new Error("Test Sentry integration");
```

## Monitoring Dashboard

Once configured, you can monitor your application at:

- Backend: `https://[your-org].sentry.io/projects/rabbit-scout-backend/`
- Frontend: `https://[your-org].sentry.io/projects/rabbit-scout-frontend/`

## Troubleshooting

### Common Issues

1. **No events appearing**: Check DSN configuration and network connectivity
2. **Too many events**: Adjust sample rates in Sentry configuration
3. **Missing context**: Ensure user authentication flow sets Sentry context
4. **Development noise**: Verify filtering rules for development environments

### Debug Mode

Add to your environment to enable Sentry debug logging:

```bash
# Backend
SENTRY_DEBUG=true

# Frontend
VITE_SENTRY_DEBUG=true
```
