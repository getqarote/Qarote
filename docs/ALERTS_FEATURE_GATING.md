# Alerts Feature Gating

This document explains how the alerts feature is gated based on the environment.

## Overview

The alerts feature is implemented with environment-based access control:

- **Development Mode**: Full access to alerts functionality
- **Production Mode**: Shows "Coming Soon" page and blocks API access

## Implementation

### Frontend

**Files:**

- `front-end/src/lib/alerts-feature-flag.ts` - Feature flag utility
- `front-end/src/pages/Alerts.tsx` - Alerts page with gating logic
- `front-end/src/components/ComingSoonPage.tsx` - "Coming Soon" component
- `front-end/src/components/AppSidebar.tsx` - Sidebar with "Soon" badge

**Behavior:**

- In development (`import.meta.env.MODE === 'development'`): Full access to alerts
- In production: Shows ComingSoonPage component
- Sidebar always shows "Soon" badge for the Alerts menu item

### Backend

**Files:**

- `back-end/src/core/alerts-feature-flag.ts` - Feature flag utility and middleware
- `back-end/src/controllers/alert.controller.ts` - Alert controller with gating

**Behavior:**

- In development (`process.env.NODE_ENV === 'development'`): Full API access
- In production: Returns 403 with "Feature not available" message

## Environment Variables

### Backend

```bash
NODE_ENV=development  # or 'production'
```

### Frontend

The frontend uses Vite's built-in `import.meta.env.MODE` which is automatically set to:

- `development` when running `npm run dev`
- `production` when running `npm run build`

## Usage

### Testing in Development

1. Ensure `NODE_ENV=development` in backend `.env`
2. Run `npm run dev` in both frontend and backend
3. Alerts page should be fully functional

### Testing in Production

1. Set `NODE_ENV=production` in backend `.env`
2. Build and run production builds
3. Alerts page should show "Coming Soon"
4. API calls should return 403 errors

## API Response Example

When alerts are disabled in production:

```json
{
  "error": "Feature not available",
  "message": "Alerts feature is coming soon. Currently available in development mode only.",
  "environment": "production"
}
```

## UI Indicators

1. **Sidebar Badge**: "Soon" badge always shown next to Alerts menu item
2. **Coming Soon Page**: Displayed when accessing `/alerts` in production
3. **Environment Info**: Shows current environment in the coming soon page
