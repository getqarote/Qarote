# Auth API Migration to tRPC - Complete

## ✅ Migration Status: COMPLETE

All authentication-related API endpoints have been successfully migrated from REST (Hono controllers) to tRPC.

## New tRPC Procedures Added

### Auth Router (`authRouter`)

#### Google OAuth
- ✅ `auth.googleLogin` - Public procedure
  - Replaces: `POST /auth/google`
  - Input: `{ credential: string }`
  - Returns: `{ user: SafeUser, token: string }`

#### Email Change
- ✅ `auth.requestEmailChange` - Protected procedure
  - Replaces: `POST /auth/email-change/request`
  - Input: `{ newEmail: string, password: string }`
  - Returns: `{ message: string, pendingEmail: string }`

- ✅ `auth.cancelEmailChange` - Protected procedure
  - Replaces: `POST /auth/email-change/cancel`
  - Input: None
  - Returns: `{ message: string }`

#### Invitation Management (Public)
- ✅ `auth.getInvitationDetails` - Public procedure
  - Replaces: `GET /invitations/:token`
  - Input: `{ token: string }`
  - Returns: Invitation details with workspace and inviter info

- ✅ `auth.acceptInvitation` - Public procedure
  - Replaces: `POST /auth/invitation/accept` (from auth/invitation.controller.ts)
  - Input: `{ token: string, password?: string, firstName?: string, lastName?: string }`
  - Returns: `{ user: SafeUser, token: string, workspace: Workspace }`

- ✅ `auth.acceptInvitationWithRegistration` - Public procedure
  - Replaces: `POST /invitations/:token/accept`
  - Input: `{ token: string, password: string, firstName: string, lastName: string }`
  - Returns: `{ message: string, user: User, workspace: Workspace, token: string }`

- ✅ `auth.acceptInvitationWithGoogle` - Public procedure
  - Replaces: `POST /invitations/:token/accept-google`
  - Input: `{ token: string, credential: string }`
  - Returns: `{ message: string, user: User, workspace: Workspace, token: string, isNewUser: boolean }`

### Workspace Router (`workspaceRouter`)

#### Invitation Management (Workspace-specific)
- ✅ `workspace.getInvitations` - Protected procedure
  - Replaces: `GET /workspaces/invitations`
  - Input: None (uses user's workspaceId from context)
  - Returns: `{ success: boolean, invitations: InvitationWithInviter[], count: number }`

- ✅ `workspace.sendInvitation` - Admin procedure
  - Replaces: `POST /workspaces/invitations`
  - Input: `{ email: string, role: "MEMBER" | "ADMIN", message?: string }`
  - Returns: `{ success: boolean, message: string, invitation: {...}, emailResult: {...} }`

- ✅ `workspace.revokeInvitation` - Admin procedure
  - Replaces: `DELETE /workspaces/invitations/:id`
  - Input: `{ invitationId: string }`
  - Returns: `{ success: boolean, message: string }`

## Migration Summary

### Total Endpoints Migrated: 9

1. ✅ Google OAuth Login
2. ✅ Request Email Change
3. ✅ Cancel Email Change
4. ✅ Get Invitation Details
5. ✅ Accept Invitation
6. ✅ Accept Invitation with Registration
7. ✅ Accept Invitation with Google
8. ✅ Send Invitation (Workspace)
9. ✅ Revoke Invitation (Workspace)

### Already Migrated (from previous work)

- ✅ Login
- ✅ Register
- ✅ Get Session/Profile
- ✅ Password Reset (request & reset)
- ✅ Change Password
- ✅ Email Verification (verify, resend, status)
- ✅ User Profile Management
- ✅ Workspace Users

## Next Steps for Frontend

1. **Update `authClient.ts` methods to use tRPC:**
   - Replace `googleLogin()` → `trpc.auth.googleLogin.useMutation()`
   - Replace `requestEmailChange()` → `trpc.auth.requestEmailChange.useMutation()`
   - Replace `cancelEmailChange()` → `trpc.auth.cancelEmailChange.useMutation()`
   - Replace `getInvitationDetails()` → `trpc.auth.getInvitationDetails.useQuery()`
   - Replace `acceptInvitation()` → `trpc.auth.acceptInvitation.useMutation()`
   - Replace `acceptInvitationWithRegistration()` → `trpc.auth.acceptInvitationWithRegistration.useMutation()`
   - Replace `acceptInvitationWithGoogle()` → `trpc.auth.acceptInvitationWithGoogle.useMutation()`
   - Replace `getInvitations()` → `trpc.workspace.getInvitations.useQuery()` (no workspaceId needed)
   - Replace `sendInvitation()` → `trpc.workspace.sendInvitation.useMutation()`
   - Replace `revokeInvitation()` → `trpc.workspace.revokeInvitation.useMutation()`

2. **Update components** that use these methods to use tRPC hooks instead

3. **Remove or deprecate** the REST endpoint controllers once frontend migration is complete

## Files Modified

### Backend
- `apps/api/src/trpc/routers/auth.ts` - Added 7 new procedures
- `apps/api/src/trpc/routers/workspace.ts` - Added 3 new procedures

### Documentation
- `apps/app/AUTH_MIGRATION_STATUS.md` - Initial migration analysis
- `apps/app/AUTH_MIGRATION_COMPLETE.md` - This file

## Notes

- All procedures maintain the same business logic as the original REST controllers
- Error handling and validation are preserved
- Audit logging is maintained where applicable
- Notion integration is preserved
- Email services are properly integrated
- All procedures use appropriate authentication levels (public, protected, admin)

