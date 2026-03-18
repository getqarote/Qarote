# Organization vs Workspace Architecture

## Entity Hierarchy

```
Organization (billing entity)
├── Subscription (1:1, Stripe-managed)
├── OrganizationMember[] (OWNER / ADMIN / MEMBER)
└── Workspace[] (operational containers)
    ├── WorkspaceMember[] (ADMIN / MEMBER / READONLY)
    ├── Server[]
    ├── Alert[]
    └── Invitation[]
```

- **Organization** is the **billing boundary**. One Organization has exactly one Subscription (or none → FREE plan). All Stripe fields (`stripeCustomerId`, `stripeSubscriptionId`) live on Organization, not on User.
- **Workspace** is the **operational boundary**. Servers, alerts, and team collaboration happen inside a workspace. A workspace belongs to exactly one Organization (`workspace.organizationId`).
- **User** has no billing fields. A user accesses workspaces through `WorkspaceMember` records and belongs to organizations through `OrganizationMember` records.

---

## Plan Resolution Chain

```
Workspace
  → organizationId
    → Organization
      → Subscription (findUnique where organizationId)
        → plan (FREE | DEVELOPER | ENTERPRISE)
```

### Key Helpers (`apps/api/src/services/plan/plan.service.ts`)

- **`getWorkspacePlan(workspaceId)`** — Entry point for any "what plan does this workspace have?" check. Looks up `workspace.organizationId`, then delegates to `getOrgPlan()`.
- **`getOrgPlan(orgId)`** — Finds the subscription for the org, returns `subscription.plan ?? UserPlan.FREE`.

Every router/service that needs plan info calls `getWorkspacePlan(workspaceId)` — never reads stripe fields from User or resolves plan via `ownerId`.

---

## Subscription Model

| Field | Location | Notes |
|---|---|---|
| `stripeCustomerId` | `Organization` | Stripe customer ID |
| `stripeSubscriptionId` | `Organization` | Stripe subscription ID |
| `plan` | `Subscription` | FREE / DEVELOPER / ENTERPRISE |
| `Subscription.organizationId` | `Subscription` | FK to Organization (1:1) |
| `Subscription.userId` | `Subscription` | Legacy field, kept for backward compat |

Stripe webhooks resolve the org via `resolveOrgFromStripeCustomerId()` and write to Organization/Subscription only.

---

## Registration & Workspace Creation Flow

1. **User registers** → `User` record created
2. **User creates workspace** →
   - `Organization` created (if user doesn't have one)
   - `OrganizationMember` created with `role: OWNER`
   - `Workspace` created with `organizationId` set
   - `WorkspaceMember` created with `role: ADMIN`
   - `workspace.ownerId` set (audit field only — not used for auth)

---

## Invitation Flow

1. Admin sends invitation → `Invitation` record with `workspaceId`
2. Plan check via `getWorkspacePlan(workspaceId)` to enforce member limits
3. Invitee accepts → `WorkspaceMember` created + `OrganizationMember` created (if not already in org)

---

## Authorization Model

| Check | How It Works |
|---|---|
| "Can user access workspace?" | `WorkspaceMember` exists for (userId, workspaceId) |
| "Is user workspace admin?" | `getUserWorkspaceRole()` returns ADMIN |
| "Can user delete workspace?" | `getUserWorkspaceRole()` returns ADMIN |
| "Can user manage billing?" | `OrganizationMember` with role OWNER or ADMIN |
| "Can user invite members?" | WorkspaceMember ADMIN + plan allows invites |
| "Can user remove members?" | `OrganizationMember` with role OWNER |

**`Workspace.ownerId` is NOT used for authorization.** It's kept as an audit field recording who originally created the workspace.

### Key Auth Helpers

- **`getUserWorkspaceRole(userId, workspaceId)`** (`apps/api/src/core/workspace-access.ts`) — Returns the user's role from `WorkspaceMember`, or null if no access.
- **`hasWorkspaceAccess`** middleware (`apps/api/src/middlewares/workspace.ts`) — Uses `WorkspaceMember` lookup only.

---

## Stripe Webhook Handling

All webhook handlers in `apps/api/src/services/stripe/webhook-handlers.ts`:

1. Receive Stripe event with `customer` ID
2. Call `resolveOrgFromStripeCustomerId(customerId)` to find the Organization
3. Update Organization and/or Subscription records
4. **Never write to User** — no dual-write pattern

---

## What `ownerId` Does Now

- **Stored on**: `Workspace.ownerId`
- **Written when**: Workspace is created (audit trail)
- **Used for**: Data export, migration scripts, cosmetic "isOwner" display in `getUserWorkspaces` response
- **NOT used for**: Authorization, plan resolution, billing, access control

---

## Self-Hosted License Fallback

In self-hosted mode (`isSelfHostedMode()`), if a workspace's org has no Stripe subscription (FREE plan), the system checks for a license JWT via `getLicensePayload()`. The license tier overrides FREE but does NOT override an active Stripe subscription.

```
if plan === FREE && isSelfHostedMode:
  check license JWT → use license.tier if valid
```

---

## Database Models (Key Fields)

### Organization
```prisma
model Organization {
  id                   String   @id @default(cuid())
  name                 String
  slug                 String   @unique
  stripeCustomerId     String?  @unique
  stripeSubscriptionId String?  @unique
  contactEmail         String?
  workspaces           Workspace[]
  members              OrganizationMember[]
  subscription         Subscription?
}
```

### OrganizationMember
```prisma
model OrganizationMember {
  id             String       @id @default(cuid())
  userId         String
  organizationId String
  role           OrgRole      // OWNER, ADMIN, MEMBER
  @@unique([userId, organizationId])
}
```

### Workspace
```prisma
model Workspace {
  id             String   @id @default(cuid())
  name           String
  ownerId        String?  // audit field only
  organizationId String?  // FK to Organization
  members        WorkspaceMember[]
  servers        Server[]
}
```

### WorkspaceMember
```prisma
model WorkspaceMember {
  id          String    @id @default(cuid())
  userId      String
  workspaceId String
  role        UserRole  // ADMIN, MEMBER, READONLY
  @@unique([userId, workspaceId])
}
```
