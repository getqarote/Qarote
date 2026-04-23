# SSO Multi-Instance Fix

## Problem

Auth codes were stored in an in-memory `Map` within the `SSOService` singleton. In deployments with multiple API server instances (common for production), the SSO callback may hit instance A (which stores the code), but the subsequent `exchangeCode` tRPC call from the frontend may be routed to instance B (which doesn't have the code). This caused SSO authentication to randomly fail depending on load balancer routing.

## Solution

Moved auth code storage from in-memory to the PostgreSQL database, making it accessible across all API instances.

## Changes Made

### 1. Database Schema (`apps/api/prisma/schema.prisma`)

Added new `SsoAuthCode` table to store temporary auth codes:

```prisma
model SsoAuthCode {
  id        String   @id @default(uuid())
  code      String   @unique
  jwt       String   @db.Text
  userData  Json
  isNewUser Boolean
  expiresAt DateTime
  createdAt DateTime @default(now())

  @@index([code])
  @@index([expiresAt])
}
```

**Key Features:**
- `code`: Unique 64-character hex string (256-bit entropy)
- `jwt`: The JWT token to return after successful exchange
- `userData`: Serialized user object for frontend
- `isNewUser`: Flag indicating if this is a new user registration
- `expiresAt`: 60-second TTL for automatic expiration
- Indexes on `code` (for fast lookups) and `expiresAt` (for cleanup queries)

### 2. Migration (`apps/api/prisma/migrations/20260208000000_add_sso_auth_code_table/migration.sql`)

Created migration to add the new table with proper indexes.

### 3. SSO Service (`apps/api/src/services/auth/sso.service.ts`)

**Removed:**
- In-memory `Map` storage: `private authCodes = new Map<string, AuthCodeEntry>()`

**Updated:**
- `storeAuthCode()`: Now async, stores codes in database
- `exchangeAuthCode()`: Now async, retrieves and deletes codes atomically from database
- Added automatic cleanup of expired codes (fire-and-forget)

**Key Implementation Details:**

#### `storeAuthCode()`
- Creates database record with 60-second TTL
- Automatically cleans up expired codes (non-blocking)
- Returns the generated code

#### `exchangeAuthCode()`
- Uses atomic `delete()` operation (retrieves and deletes in one query)
- Single-use by design - code is deleted immediately
- Checks expiration after retrieval
- Returns `null` if code doesn't exist, was already used, or is expired

### 4. SSO Controller (`apps/api/src/controllers/sso.controller.ts`)

Updated SSO callback handler to await `storeAuthCode()`:

```typescript
const authCode = await ssoService.storeAuthCode(
  jwt,
  UserMapper.toApiResponse(user) as Record<string, unknown>,
  isNewUser
);
```

### 5. SSO tRPC Router (`apps/api/src/trpc/routers/auth/sso.ts`)

Updated `exchangeCode` mutation to await `exchangeAuthCode()`:

```typescript
const result = await ssoService.exchangeAuthCode(input.code);
```

### 6. Interface Cleanup (`apps/api/src/services/auth/sso.interfaces.ts`)

Removed unused `AuthCodeEntry` interface (no longer needed for in-memory storage).

## Benefits

1. **Multi-Instance Support**: Auth codes are now shared across all API server instances
2. **Atomic Operations**: Uses database transactions to prevent race conditions
3. **Automatic Cleanup**: Expired codes are automatically cleaned up
4. **Single-Use Guarantee**: Codes are deleted immediately upon use (atomic operation)
5. **Persistent Storage**: Codes survive API server restarts (within their 60s TTL)

## Security

- Codes are 256-bit random hex strings (highly secure)
- 60-second TTL minimizes window of vulnerability
- Single-use design prevents replay attacks
- Atomic delete operation prevents concurrent use
- Database constraints enforce uniqueness

## Testing Recommendations

1. **Multi-Instance Testing**: Deploy to environment with multiple API instances and verify SSO works consistently
2. **Load Testing**: Use load balancer to distribute SSO requests across instances
3. **TTL Testing**: Verify codes expire after 60 seconds
4. **Single-Use Testing**: Verify codes cannot be used twice
5. **Cleanup Testing**: Verify expired codes are cleaned up automatically

## Migration Instructions

1. Run the migration: `pnpm db:migrate:dev` (development) or `pnpm db:migrate` (production)
2. Restart all API server instances
3. Test SSO authentication flow

## Notes

- The migration is non-destructive (adds new table only)
- No downtime required during deployment
- Existing SSO configurations remain unchanged
- No changes required to frontend code
