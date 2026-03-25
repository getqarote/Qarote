# ADR-001: Add Organization Entity

**Status:** Proposed
**Date:** 2026-03-15
**Author:** Brice

## Context

Qarote currently models billing as user-scoped (`Subscription.userId @unique`) and SSO as workspace-scoped (`WorkspaceSsoConfig`). Workspace ownership is tracked via `Workspace.ownerId`.

This creates friction for companies that need multiple workspaces (e.g., prod/staging/dev):

- **Billing:** Tied to the workspace owner's personal Stripe customer. One subscription per user, plan limits checked against the owner. No way to share a single subscription across multiple workspaces.
- **SSO:** Currently workspace-scoped (`WorkspaceSsoConfig`) and only deployed to staging, not production. The workspace-scoped design would require a company with three workspaces to configure SSO three times with the same IdP.
- **Ownership:** `Workspace.ownerId` is a single user. No concept of shared administrative control or role hierarchy above workspace level.

## Decision

Introduce an **Organization** entity that sits above workspaces. An organization owns billing (Stripe customer/subscription), SSO configuration, and workspace membership. Users belong to organizations via `OrganizationMember` with roles (OWNER, ADMIN, MEMBER).

## Alternatives Considered

### 1. Extend User-owns-Workspace model

Add multi-workspace billing by allowing a user's subscription to cover multiple workspaces. Keep SSO per-workspace.

- **Pros:** Minimal schema change, no new entity.
- **Cons:** Billing remains personal (tied to one user's account). No path to shared admin control. SSO duplication remains. Does not model the real-world concept of a company/team.

**Rejected because** it solves billing partially but leaves SSO fragmented and has no clean model for shared ownership.

### 2. Use better-auth's built-in Organization plugin

better-auth ships an organization concept with `SsoProvider.organizationId` already in the schema.

- **Pros:** Less custom code, follows the auth library's conventions.
- **Cons:** Tightly coupled to better-auth's opinionated model. Limited control over role hierarchy, billing integration, and migration strategy. The existing `SsoProvider.organizationId` field was added by the plugin but is unused — adopting it fully would require conforming to better-auth's org lifecycle, which does not align with our billing and workspace model.

**Rejected because** we need full control over org lifecycle, billing integration, and the migration path. The better-auth plugin field (`SsoProvider.organizationId`) should be acknowledged and either repurposed or removed to avoid confusion.

### 3. "Team" model scoped under workspaces

Add a Team entity within a workspace for grouping users, but keep billing and SSO as-is.

- **Pros:** Simpler change, useful for RBAC within a workspace.
- **Cons:** Does not solve the cross-workspace billing or SSO problems at all.

**Rejected because** it solves a different problem (intra-workspace RBAC) and does not address the core need.

## Approach

Four independently deployable phases:

1. **Schema + Data Migration** — Add Organization/OrganizationMember models, migrate existing data, no runtime behavior change.
2. **Move Billing to Organization** — Subscription, plan limits, and Stripe become org-scoped. Split into read-path (2a) and write-path (2b) for safety.
3. **Build SSO as Org-Scoped** — Since SSO is only on staging (no production data), build it org-scoped from the start. Drop `WorkspaceSsoConfig` directly instead of migrating. No dual-write or backward-compat needed.
4. **Frontend + Cleanup** — Org UI, remove deprecated fields.

## Trade-offs Accepted

### What we gain

- Single billing relationship per company, shared across all their workspaces
- SSO configured once per organization, not per workspace
- Role hierarchy (Org OWNER/ADMIN/MEMBER) above workspace-level roles
- Clean model for multi-workspace companies
- Foundation for future org-level features (audit logs, org-wide policies)

### What we give up

- **Simplicity:** Every plan check now resolves through an org join. `getUserPlan(userId)` becomes a two-step lookup (user -> org -> subscription).
- **Migration risk:** Large data migration touching billing and workspace ownership. Mitigated by phasing and dual-write strategy. SSO risk is minimal since it has no production data — it can be rebuilt org-scoped directly.
- **Self-hosted complexity:** Even single-tenant deployments get an implicit "Default" org, adding a layer of indirection that does not benefit them.

## Risks and Mitigations

| Risk                                                                | Mitigation                                                                                                                          |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Phase 2 Stripe webhook failures during dual-write transition        | Feature flag (`USE_ORG_BILLING`) for per-tenant rollout. Keep User.stripeCustomerId as read-only lookup during transition.          |
| Users with subscriptions but no workspaces missed by migration      | Second migration pass: create orgs for users with Subscription but no owned workspaces.                                             |
| Multi-org membership creates ambiguous resource counting            | Define policy: resource limits are per-org, not per-user. A user in two orgs consumes quota in each independently.                  |
| `ownerId` referenced in 21+ files; removal is high-risk             | Keep `Workspace.ownerId` as denormalized audit field. Authorization moves to OrgMember roles, but ownerId stays for history.        |
| `SsoProvider.organizationId` already exists from better-auth plugin | Audit usage. If unused, remove in Phase 3 or repurpose it to point to our Organization model.                                       |
| No verification before destructive Phase 4 cleanup                  | Add Phase 3.5 verification gate: assert every workspace has org, every org has subscription, no code path uses deprecated fields.   |
| SSO staging-only data may conflict with new org-scoped schema       | Drop `WorkspaceSsoConfig` and staging SSO data in Phase 3. Rebuild SSO config as `OrgSsoConfig` from scratch — no migration needed. |

## Rollback Strategy

- **Phase 1:** Drop new tables and column. No runtime code changed, so rollback is a reverse migration.
- **Phase 2a (read path):** Revert `getUserPlan` to direct user lookup. Feature flag off.
- **Phase 2b (write path):** Stop writing to org Stripe fields. Stripe customer stays on User. Feature flag off.
- **Phase 3:** Revert SSO router and drop `OrgSsoConfig`. Since SSO has no production data, rollback is just removing the new code — no data migration needed in either direction.
- **Phase 4:** No rollback — this is the point of no return. Only execute after Phase 3.5 verification passes in production.
