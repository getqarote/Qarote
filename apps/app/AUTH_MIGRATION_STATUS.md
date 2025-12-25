# Auth API Migration to tRPC - Status Report

## Overview
This document tracks the migration of authentication-related API endpoints from REST (Hono controllers) to tRPC.

## Migration Status Summary

### ✅ Fully Migrated to tRPC

#### Authentication & Session
- ✅ `login` → `auth.login` (tRPC)
- ✅ `register` → `auth.register` (tRPC)
- ✅ `getSession` / `getProfile` → `auth.getSession` (tRPC) / `user.getProfile` (tRPC)
- ✅ `googleLogin` → ❌ **NOT MIGRATED** (still in `google.controller.ts`)

#### Password Management
- ✅ `requestPasswordReset` → `auth.requestPasswordReset` (tRPC)
- ✅ `resetPassword` → `auth.resetPassword` (tRPC)
- ✅ `changePassword` → `auth.changePassword` (tRPC)

#### Email Verification
- ✅ `verifyEmail` → `auth.verifyEmail` (tRPC)
- ✅ `resendVerificationEmail` → `auth.resendVerification` (tRPC)
- ✅ `getVerificationStatus` → `auth.getVerificationStatus` (tRPC)

#### User Profile
- ✅ `getProfile` → `user.getProfile` (tRPC)
- ✅ `updateProfile` → `user.updateProfile` (tRPC)
- ✅ `getWorkspaceUsers` → `user.getWorkspaceUsers` (tRPC)

### ❌ NOT Migrated to tRPC (Still using REST)

#### Google OAuth
- ❌ `googleLogin` (`POST /auth/google`)
  - **Location**: `apps/api/src/controllers/auth/google.controller.ts`
  - **Status**: Still using REST endpoint
  - **tRPC Router**: `authRouter` (needs `googleLogin` procedure)

#### Email Change
- ❌ `requestEmailChange` (`POST /auth/email-change/request`)
  - **Location**: `apps/api/src/controllers/auth/email.controller.ts`
  - **Status**: Still using REST endpoint
  - **tRPC Router**: `authRouter` (needs `requestEmailChange` procedure)

- ❌ `cancelEmailChange` (`POST /auth/email-change/cancel`)
  - **Location**: `apps/api/src/controllers/auth/email.controller.ts`
  - **Status**: Still using REST endpoint
  - **tRPC Router**: `authRouter` (needs `cancelEmailChange` procedure)

#### Invitation Management
- ❌ `getInvitations` (`GET /workspaces/invitations`)
  - **Location**: `apps/api/src/controllers/workspace/invitation.controller.ts`
  - **Status**: Still using REST endpoint
  - **tRPC Router**: `userRouter` (has `getInvitations` but requires `workspaceId` input)
  - **Note**: Frontend calls `/workspaces/invitations` without workspaceId

- ❌ `sendInvitation` (`POST /workspaces/invitations`)
  - **Location**: `apps/api/src/controllers/workspace/invitation.controller.ts`
  - **Status**: Still using REST endpoint
  - **tRPC Router**: Needs to be added to `workspaceRouter` or `userRouter`

- ❌ `revokeInvitation` (`DELETE /workspaces/invitations/:id`)
  - **Location**: `apps/api/src/controllers/workspace/invitation.controller.ts`
  - **Status**: Still using REST endpoint
  - **tRPC Router**: Needs to be added to `workspaceRouter` or `userRouter`

- ❌ `getInvitationDetails` (`GET /invitations/:token`)
  - **Location**: `apps/api/src/controllers/public-invitation.controller.ts`
  - **Status**: Still using REST endpoint (PUBLIC endpoint)
  - **tRPC Router**: Needs to be added to `authRouter` as public procedure

- ❌ `acceptInvitation` (`POST /invitations/:token/accept`)
  - **Location**: `apps/api/src/controllers/public-invitation.controller.ts`
  - **Status**: Still using REST endpoint (PUBLIC endpoint)
  - **tRPC Router**: Needs to be added to `authRouter` as public procedure

- ❌ `acceptInvitationWithRegistration` (`POST /auth/invitation/accept`)
  - **Location**: `apps/api/src/controllers/auth/invitation.controller.ts`
  - **Status**: Still using REST endpoint
  - **tRPC Router**: Needs to be added to `authRouter` as public procedure

- ❌ `acceptInvitationWithGoogle` (`POST /invitations/:token/accept-google`)
  - **Location**: `apps/api/src/controllers/public-invitation.controller.ts`
  - **Status**: Still using REST endpoint (PUBLIC endpoint)
  - **tRPC Router**: Needs to be added to `authRouter` as public procedure

#### Workspace Profile
- ❌ `updateWorkspace` (`PUT /workspaces/:workspaceId/users/profile/workspace`)
  - **Location**: `apps/api/src/controllers/user.controller.ts`
  - **Status**: Still using REST endpoint
  - **tRPC Router**: `workspaceRouter` (has `update` but may need different structure)

- ❌ `getCompanyUsers` (`GET /users/profile/company/users`)
  - **Location**: `apps/api/src/controllers/user.controller.ts`
  - **Status**: Still using REST endpoint
  - **Note**: This endpoint seems deprecated or unused

## Frontend Usage Analysis

### Methods in `authClient.ts` that need migration:

1. ✅ `login` - **MIGRATED** (can use `trpc.auth.login.useMutation()`)
2. ✅ `register` - **MIGRATED** (can use `trpc.auth.register.useMutation()`)
3. ❌ `googleLogin` - **NOT MIGRATED**
4. ✅ `getProfile` - **MIGRATED** (can use `trpc.user.getProfile.useQuery()`)
5. ✅ `updateProfile` - **MIGRATED** (can use `trpc.user.updateProfile.useMutation()`)
6. ❌ `updateWorkspace` - **NOT MIGRATED**
7. ❌ `getCompanyUsers` - **NOT MIGRATED** (likely deprecated)
8. ✅ `getWorkspaceUsers` - **MIGRATED** (can use `trpc.user.getWorkspaceUsers.useQuery()`)
9. ❌ `getInvitations` - **PARTIALLY MIGRATED** (tRPC version requires workspaceId)
10. ❌ `sendInvitation` - **NOT MIGRATED**
11. ❌ `revokeInvitation` - **NOT MIGRATED**
12. ❌ `getInvitationDetails` - **NOT MIGRATED**
13. ❌ `acceptInvitation` - **NOT MIGRATED**
14. ❌ `acceptInvitationWithRegistration` - **NOT MIGRATED**
15. ❌ `acceptInvitationWithGoogle` - **NOT MIGRATED**
16. ✅ `verifyEmail` - **MIGRATED** (can use `trpc.auth.verifyEmail.useMutation()`)
17. ✅ `resendVerificationEmail` - **MIGRATED** (can use `trpc.auth.resendVerification.useMutation()`)
18. ✅ `getVerificationStatus` - **MIGRATED** (can use `trpc.auth.getVerificationStatus.useQuery()`)
19. ❌ `requestEmailChange` - **NOT MIGRATED**
20. ❌ `cancelEmailChange` - **NOT MIGRATED**

## Migration Priority

### High Priority (Core Auth Flow)
1. **Google OAuth Login** - Used for authentication
2. **Email Change** - Used in profile management
3. **Invitation Acceptance** - Critical for onboarding

### Medium Priority (Workspace Management)
4. **Send Invitation** - Used for team management
5. **Revoke Invitation** - Used for team management
6. **Get Invitation Details** - Used in invitation flow
7. **Update Workspace** - Used in profile settings

### Low Priority
8. **Get Company Users** - May be deprecated
9. **Get Invitations** - Already partially migrated, needs frontend update

## Next Steps

1. **Create tRPC procedures for missing endpoints:**
   - `auth.googleLogin` - Public procedure
   - `auth.requestEmailChange` - Protected procedure
   - `auth.cancelEmailChange` - Protected procedure
   - `auth.getInvitationDetails` - Public procedure (token-based)
   - `auth.acceptInvitation` - Public procedure
   - `auth.acceptInvitationWithRegistration` - Public procedure
   - `auth.acceptInvitationWithGoogle` - Public procedure
   - `workspace.sendInvitation` - Admin procedure
   - `workspace.revokeInvitation` - Admin procedure
   - `user.updateWorkspace` - Protected procedure (or move to workspace router)

2. **Update frontend to use tRPC:**
   - Replace REST calls in `authClient.ts` with tRPC hooks
   - Update components that use these methods
   - Remove or deprecate `authClient.ts` methods once migrated

3. **Testing:**
   - Test all migrated endpoints
   - Ensure backward compatibility during migration
   - Update API documentation

## Files to Update

### Backend (tRPC Routers)
- `apps/api/src/trpc/routers/auth.ts` - Add missing auth procedures
- `apps/api/src/trpc/routers/workspace.ts` - Add invitation procedures
- `apps/api/src/trpc/routers/user.ts` - Add workspace update procedure

### Frontend
- `apps/app/src/lib/api/authClient.ts` - Update to use tRPC or mark as deprecated
- Components using `authClient` methods - Update to use tRPC hooks

