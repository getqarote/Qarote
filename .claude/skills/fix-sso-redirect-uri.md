# SSO Redirect URI Fix

## Problem

The OAuth `redirect_uri` was incorrectly configured to use the **frontend URL** instead of the **backend API URL**. This caused SSO authentication to fail completely in deployments where the frontend and backend are on different domains (which is typical for production).

### Incorrect Flow (Before Fix)

1. User clicks SSO button → Frontend redirects to `${apiUrl}/sso/authorize`
2. Backend `/sso/authorize` redirects to IdP with `redirect_uri=${frontendUrl}/sso/callback` ❌
3. IdP redirects to `${frontendUrl}/sso/callback` (frontend) ❌
4. **Frontend has no route at `/sso/callback`** (only at `/auth/sso/callback`) ❌
5. **Authentication fails completely** ❌

### Root Cause

The OAuth/OIDC/SAML protocol requires the `redirect_uri` to point to the **backend API** that will:
- Receive the authorization code from the Identity Provider
- Exchange the code for user profile information
- Create/update the user in the database
- Generate a JWT token
- Redirect to the frontend with a temporary auth code

The frontend's role is only to:
- Initiate the flow by redirecting to the backend's `/sso/authorize` endpoint
- Receive the final redirect with a temporary auth code
- Exchange the temp auth code for the JWT token via tRPC

## Solution

Added `API_URL` configuration for the backend API URL and updated all SSO redirect URIs to use it.

## Changes Made

### 1. Configuration Schema - Selfhosted (`apps/api/src/config/schemas/selfhosted.ts`)

Added `API_URL` field:

```typescript
API_URL: z
  .url()
  .optional()
  .default("http://localhost:3000")
  .describe(
    "Backend API URL for OAuth callbacks - only needed if SSO_ENABLED=true"
  ),
```

### 2. Configuration Schema - Cloud (`apps/api/src/config/schemas/cloud.ts`)

Added `API_URL` field (required for cloud):

```typescript
API_URL: z
  .url("API_URL must be a valid URL")
  .describe("Backend API URL for OAuth callbacks"),
```

### 3. Configuration Export (`apps/api/src/config/index.ts`)

Exported `apiUrl` in `emailConfig`:

```typescript
export const emailConfig = {
  // ...
  apiUrl: "API_URL" in config ? config.API_URL : "http://localhost:3000",
  // ...
} as const;
```

### 4. SSO Controller (`apps/api/src/controllers/sso.controller.ts`)

#### GET /sso/authorize

Changed redirect URI to use backend API URL:

```typescript
// Before
const frontendUrl = emailConfig.frontendUrl;
const redirectUrl = `${frontendUrl}/sso/callback`; // ❌ Frontend URL

// After
const apiUrl = emailConfig.apiUrl;
const redirectUrl = `${apiUrl}/sso/callback`; // ✅ Backend API URL
```

#### GET /sso/callback

Changed token exchange to use backend API URL:

```typescript
// Before
redirect_uri: `${frontendUrl}/sso/callback`, // ❌ Frontend URL

// After
const apiUrl = emailConfig.apiUrl;
redirect_uri: `${apiUrl}/sso/callback`, // ✅ Backend API URL
```

Note: The final redirect to frontend remains correct:
```typescript
return c.redirect(`${frontendUrl}/auth/sso/callback?code=${authCode}`); // ✅ Correct
```

### 5. SSO Service (`apps/api/src/services/auth/sso.service.ts`)

#### initialize()

Changed Jackson `externalUrl` to use backend API URL:

```typescript
// Before
externalUrl: config.FRONTEND_URL, // ❌ Frontend URL

// After
externalUrl: config.API_URL || "http://localhost:3000", // ✅ Backend API URL
```

#### ensureConnection()

Changed connection redirect URIs to use backend API URL:

```typescript
// Before
const frontendUrl = config.FRONTEND_URL;
const redirectUrl = `${frontendUrl}/sso/callback`; // ❌ Frontend URL

// After
const apiUrl = config.API_URL || "http://localhost:3000";
const redirectUrl = `${apiUrl}/sso/callback`; // ✅ Backend API URL
```

## Correct Flow (After Fix)

1. User clicks SSO button → Frontend redirects to `${apiUrl}/sso/authorize`
2. Backend `/sso/authorize` redirects to IdP with `redirect_uri=${apiUrl}/sso/callback` ✅
3. **IdP redirects back to `${apiUrl}/sso/callback` (backend)** ✅
4. **Backend exchanges code, creates user, generates JWT and temp auth code** ✅
5. **Backend redirects to `${frontendUrl}/auth/sso/callback?code=${authCode}`** ✅
6. Frontend exchanges temp auth code for JWT via tRPC ✅

## Configuration

### Development (Same Domain)

```env
API_URL=http://localhost:3000
FRONTEND_URL=http://localhost:8080
```

### Production (Different Domains)

```env
API_URL=https://api.qarote.io
FRONTEND_URL=https://app.qarote.io
```

## Benefits

1. **Works with separate frontend/backend domains**: Fixes the core issue
2. **Standard OAuth flow**: Follows OAuth 2.0 specification correctly
3. **Explicit configuration**: Clear separation between API and frontend URLs
4. **Backwards compatible**: Uses sensible defaults for local development

## Testing

1. **Local development**: Verify SSO works with `API_URL=http://localhost:3000`
2. **Production deployment**: Verify SSO works with separate domains
3. **OIDC**: Test with OIDC provider (e.g., Keycloak, Auth0)
4. **SAML**: Test with SAML provider (e.g., Okta, Azure AD)

## Related Documentation

- [SSO Multi-Instance Fix](./fix-sso-multi-instance.md) - Database-backed auth codes for multi-instance support
