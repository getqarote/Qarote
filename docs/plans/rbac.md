# RBAC Redesign — Basic (Developer) + Advanced (Enterprise)

**Status:** Plan, not implementation. Replaces abandoned PR [getqarote/Qarote-EE#3](https://github.com/getqarote/Qarote-EE/pull/3). Validated by backend, security, and frontend reviews.

**Pricing alignment** (decided 2026-05-05):

- Community: no RBAC
- Developer ($348/yr): RBAC basic — 4 fixed workspace roles
- Enterprise ($1,188/yr): RBAC advanced — custom roles + granular permissions + (separate plan) audit log

---

## 1. Why this exists

The current code has two confirmed privilege-escalation vulnerabilities and a structural conflation that produced them:

1. **Cross-workspace bypass** at `apps/api/src/trpc/trpc.ts:103-114`. `adminProcedure` checks only `ctx.user.role === UserRole.ADMIN` (global). Any user marked global ADMIN is treated as admin in EVERY workspace.
2. **Membership bypass** at `apps/api/src/trpc/trpc.ts:299`. `workspaceProcedure` has an explicit branch: `if (ctx.user.role === UserRole.ADMIN) { return next() }` that skips the `WorkspaceMember` lookup entirely.
3. **Enum conflation.** `UserRole` (ADMIN, MEMBER, READONLY) is reused for `User.role` (global), `WorkspaceMember.role`, and `Invitation.role`. Same enum, three scopes, no type-level guard against mixing them.
4. **Inconsistent gating across routers.** RabbitMQ destructive operations use `authorize([UserRole.ADMIN])` (global). Some procedures accept `[ADMIN, MEMBER]`. Server CRUD uses `adminPlanValidationProcedure`. Workspace CRUD uses OrgRole. No unifying contract.
5. **Frontend ad hoc checks.** No `useWorkspaceRole` hook. `SettingsSidebar`, `HomePulse`, `WorkspaceSelector`, `OrgMembersCard`, `InviteMemberDialog` all check `user?.role === UserRole.ADMIN` directly — and all use the global role, not workspace context.

The redesign untangles these scopes, deletes the bypasses, replaces the global-role check pattern with workspace-permission procedures, and lays the groundwork for custom roles on Enterprise.

---

## 2. Schema design

### 2.1 New `WorkspaceRole` enum

Add to `apps/api/prisma/schema.prisma`, strictly separate from `UserRole`:

```prisma
enum WorkspaceRole { OWNER ADMIN MEMBER READONLY }
```

`OWNER` is new and intentionally absent from `UserRole`. It gates `workspace:delete` and `workspace:transfer_ownership`.

### 2.2 Migration path (atomic, single-step)

One migration, one PR. The legacy `role: UserRole` column is renamed to `role: WorkspaceRole` in place — no transitional dual-column state. Application code that referenced the old type breaks at compile time, surfacing every workspace-vs-platform conflation at once. That is the feature.

The migration does, in order:

- Create `WorkspaceRole` enum (`OWNER`, `ADMIN`, `MEMBER`, `READONLY`).
- Add a temporary working column on `WorkspaceMember` and `Invitation` typed `WorkspaceRole`, populated with the 1:1 mapping from `UserRole` (`ADMIN→ADMIN`, `MEMBER→MEMBER`, `READONLY→READONLY`).
- Promote a single `OWNER` per workspace in the working column: prefer `Workspace.ownerId`, fall back to the earliest `WorkspaceMember` by `createdAt ASC`. Log a notice per ambiguous case.
- Drop `WorkspaceMember.role` and `Invitation.role` (the old `UserRole` columns), then rename the working column to `role`. The new column is `NOT NULL` for `WorkspaceMember`; `Invitation.role` follows the existing default (`MEMBER`).

The migration is a single SQL file; Postgres runs it in a single transaction so partial states are not observable.

Schema invariant: every workspace has ≥1 OWNER. Enforced at the application layer via transaction (§3.3); not encoded as a Postgres CHECK because it would block legitimate intermediate states during ownership transfer.

### 2.3 What happens to global `User.role`

**Recommendation: keep, narrow semantics, rename in code.** It serves Qarote-staff-internal needs (support, billing/abuse ops). Becomes platform-scope only:

- New name: `PlatformRole` (TS alias initially, full enum rename in a follow-up).
- Values: `USER`, `STAFF`, `SUPERADMIN`. `ADMIN`, `MEMBER`, `READONLY` are removed from this enum.
- **`PlatformRole` MUST NOT participate in any workspace authorization decision, ever.** A lint rule in CI fails if `User.role` is referenced inside `apps/api/src/trpc/routers/`.
- Cross-workspace staff access uses a separate `staffSupportProcedure` (§4) with explicit auditing, time-boxing, and customer notification — not a silent bypass.

### 2.4 Advanced RBAC tables (designed now, created in Phase 3)

```
Role            id, workspaceId, name, description, isSystem(bool), createdAt, createdById
Permission      key (PK, e.g. "queue:purge"), description, category
RolePermission  roleId, permissionKey, scopeJson(nullable)  -- composite PK
WorkspaceMember adds: customRoleId(FK Role, nullable)
```

`WorkspaceMember` constraint: `(role IS NOT NULL) <> (customRoleId IS NOT NULL)` — exactly one is set. On plan downgrade from Enterprise, custom-role members are coerced to `MEMBER` at resolution time without dropping `customRoleId`, so re-upgrade restores their assignment.

**Decision: enum for built-ins + nullable FK for custom**, not fully dynamic. Rationale: faster path for the 95% built-in case, graceful plan-downgrade behavior, simpler tests. Cost: resolver has two branches.

### 2.5 Invitation hardening

`Invitation` model needs (per security review):

- `tokenHash: String` replaces raw `token`. Tokens are 256-bit random; only the hash is stored. Compare in constant time on lookup.
- `acceptedAt: DateTime?`, `acceptedByUserId: String?`, `revokedAt: DateTime?` — full audit trail.
- Status transition PENDING → ACCEPTED/REVOKED is atomic (conditional update).
- Default expiry 7 days.

---

## 3. tRPC middleware redesign

Target file: `apps/api/src/trpc/trpc.ts`.

### 3.1 New procedure ladder

| Procedure | Guarantees |
|---|---|
| `publicProcedure` | unchanged |
| `protectedProcedure` | authenticated user |
| `orgScopedProcedure` / `orgAdminProcedure` | unchanged (already cleanly isolated) |
| `workspaceProcedure` | authenticated + member of `input.workspaceId`. **The line-299 bypass is deleted.** |
| `workspaceAdminProcedure` | member with `OWNER` or `ADMIN` |
| `workspaceOwnerProcedure` | member with `OWNER` only |
| `workspacePermissionProcedure(key, resourceCtx?)` | resolves the member's permission set (built-in bundle OR custom role) and asserts `key` is present, optionally with resource scope |
| `staffSupportProcedure` | new, replaces global-`adminProcedure` for cross-tenant ops; gated by `PlatformRole` + active Support Session (§4) |

`adminProcedure` is **deleted**. `authorize([UserRole.ADMIN])` is **deleted**. The bypass at `trpc.ts:299` is **deleted**.

### 3.2 Anti-escalation guards

Helper at `apps/api/src/auth/workspace-roles.ts`:

```
assertCanGrantRole(grantorRole, targetRole)
```

Rules:

- `OWNER` can grant any role including `OWNER` (co-owner pattern, with at least one OWNER session active).
- `ADMIN` can grant `ADMIN`, `MEMBER`, `READONLY`. Cannot grant `OWNER`.
- `MEMBER`, `READONLY` cannot grant.
- A user **cannot modify their own role**. No self-promotion. No self-demotion of the last OWNER.
- Invoked by `member.update`, `member.invite`, `invitation.create`, and re-validated at `invitation.accept` (the inviter may have been demoted in the interim — auto-revoke the invite if their current role no longer dominates the invited role).

For Phase 3 (custom roles), generalizes: a grantor cannot assign a role whose permission set is a strict superset of their own. Built-in roles trivially satisfy this via the lattice OWNER ⊃ ADMIN ⊃ MEMBER ⊃ READONLY.

### 3.3 Last-OWNER invariant

Every transaction that demotes or removes a member runs:

```
SELECT count(*) FROM WorkspaceMember
  WHERE workspaceId = $1 AND role = 'OWNER'
  FOR UPDATE
```

If post-mutation count would drop below 1, abort with a typed error `LAST_OWNER_BLOCKED`. Ownership transfer is an atomic two-step inside one transaction: promote target to OWNER, then demote self to ADMIN.

### 3.4 IDOR guard

Every mutation taking a `memberId` / `invitationId` / any workspace-scoped record id MUST query with `where: { id, workspaceId: ctx.workspaceId }`. Lint rule (`@qarote/no-bare-id-lookup`) fails CI on bare `findUnique({ where: { id } })` for workspace-scoped models.

### 3.5 Default-deny on mutations

A tRPC base middleware asserts that any procedure of type `mutation` has called `requireWorkspaceRole(...)` or `workspacePermissionProcedure(...)` exactly once. Mutations lacking it fail closed at construction time. Tested in `trpc.test.ts`.

---

## 4. Replacing the bypass: `staffSupportProcedure`

Qarote staff MUST NOT have implicit cross-workspace access. The current bypass is a backdoor.

The replacement, when staff genuinely need to inspect a customer workspace:

1. Lives in its own router (`/trpc/support/*`), behind a feature flag, **compiled out of self-hosted builds**.
2. Requires `PlatformRole.STAFF` AND an active **Support Session**: `{staffUserId, targetWorkspaceId, reason, ticketRef, expiresAt: now()+30min, approvedBy?}`.
3. Time-boxed (default 30 min, max 4h). Two-person approval for write operations.
4. **Workspace OWNER receives email + in-app banner the moment a session opens** — "Qarote staff member X is viewing your workspace until 14:32 UTC; reason: ticket #1234". Transparency is non-negotiable.
5. Every action under a session is written to an append-only audit log (audit log work tracked separately under issue #49). Exportable for the customer on request.
6. Read-only by default. Mutations require an additional `--write` capability flag on the session, separate approval, and a redacted post-hoc diff to the OWNER.

Self-hosted: `if (config.deployment === "selfhosted") return null` — Qarote Inc. has no business inside a customer's self-hosted instance.

---

## 5. Permission catalog (advanced RBAC)

Seed file `apps/api/src/auth/permissions.ts`. Initial set (~30 keys):

- **Workspace** — `workspace:read`, `workspace:update`, `workspace:delete`, `workspace:transfer_ownership`
- **Member** — `member:read`, `member:invite`, `member:update_role`, `member:remove`
- **Role (Enterprise)** — `role:read`, `role:manage`
- **Server** — `server:read`, `server:create`, `server:update`, `server:delete`, `server:test_connection`
- **Queue** — `queue:read`, `queue:create`, `queue:delete`, `queue:purge`, `queue:pause`, `queue:resume`
- **Exchange** — `exchange:read`, `exchange:create`, `exchange:delete`
- **Binding** — `binding:read`, `binding:create`, `binding:delete`
- **Policy** — `policy:read`, `policy:write`, `policy:delete`
- **Message** — `message:peek`, `message:publish`, `message:requeue`
- **Definitions** — `definitions:export`, `definitions:import`
- **Alerting** — `alerting:read`, `alerting:write`, `alerting:acknowledge`
- **SSO** — `sso:read`, `sso:configure`
- **Integration** — `integration:read`, `integration:write`, `integration:delete`
- **Audit** — `audit:read`, `audit:export` (Enterprise only, surface gated by plan)

Built-in role bundles (static maps in same file):

- `OWNER`: all permissions including `workspace:delete`, `workspace:transfer_ownership`, `role:manage`, `sso:configure`.
- `ADMIN`: all except `workspace:delete`, `workspace:transfer_ownership`, `role:manage`.
- `MEMBER`: all `:read`, plus non-destructive writes (queue/exchange/binding/message create, policy:write). No `*:delete`, no `queue:purge`, no `definitions:import`.
- `READONLY`: all `:read` only.

---

## 6. Resource-scoped permissions (advanced, Phase 3)

**Use case**: "READ-ONLY on prod servers, full on staging."

**Approach**: scoped JSON on `RolePermission`.

```
RolePermission { roleId, permissionKey, scopeJson }
scopeJson: { "server.environment": ["staging", "dev"] }
         | { "server.id": ["uuid-1", "uuid-2"] }
         | null  // unconditional
```

Resolver receives permission key + resource context (`{ serverId, environment }`) at call site. Predicates AND within a row, OR across rows. Required schema addition: `Server.environment: String?` (`production` | `staging` | `dev` | custom per workspace).

Call site shape: `workspacePermissionProcedure("queue:purge", (input) => ({ serverId: input.serverId }))`.

**Deferred to v2 of advanced RBAC**: full ABAC, OPA/Rego, Cedar. Overkill for current scale.

---

## 7. Procedure migration map

Every existing privileged procedure → new variant + permission key. Files under `apps/api/src/trpc/routers/`.

| Current call site | Today | New procedure | Permission key |
|---|---|---|---|
| `rabbitmq/queue.purge` | `authorize([ADMIN])` | `workspacePermissionProcedure` | `queue:purge` |
| `rabbitmq/queue.delete` | `authorize([ADMIN])` | `workspacePermissionProcedure` | `queue:delete` |
| `rabbitmq/queue.pause`/`resume` | inconsistent | `workspacePermissionProcedure` | `queue:pause`/`resume` |
| `rabbitmq/queue.getPauseStatus` | `[ADMIN, MEMBER]` | `workspaceProcedure` | `queue:read` |
| `rabbitmq/exchange.delete` | `authorize([ADMIN])` | `workspacePermissionProcedure` | `exchange:delete` |
| `rabbitmq/binding.create`/`delete` | mixed | `workspacePermissionProcedure` | `binding:create`/`delete` |
| `rabbitmq/message.publish`/`peek`/`requeue` | mixed | `workspacePermissionProcedure` | `message:*` |
| `rabbitmq/policy.*` | mixed | `workspacePermissionProcedure` | `policy:*` |
| `rabbitmq/definitions.export`/`import` | `adminProcedure` | `workspacePermissionProcedure` | `definitions:export`/`import` |
| `server.create`/`update`/`delete` | `adminPlanValidationProcedure` | `workspaceAdminProcedure` + plan check | `server:create`/`update`/`delete` |
| `server.testConnection` | varies | `workspaceProcedure` | `server:test_connection` |
| `workspace.update` | `planValidationProcedure` (OrgRole) | `workspaceAdminProcedure` | `workspace:update` |
| `workspace.delete` | OrgRole | `workspaceOwnerProcedure` | `workspace:delete` |
| `invitation.create` | `adminProcedure` | `workspaceAdminProcedure` + `assertCanGrantRole` | `member:invite` |
| `invitation.revoke` | `adminProcedure` | `workspaceAdminProcedure` | `member:invite` |
| `member.updateRole` | `adminProcedure` | `workspaceAdminProcedure` + `assertCanGrantRole` | `member:update_role` |
| `member.remove` | `adminProcedure` | `workspaceAdminProcedure` (OWNER for removing ADMINs) | `member:remove` |
| `alerting.*` | mixed | `workspacePermissionProcedure` | `alerting:*` |
| `integration.*` | mixed | `workspacePermissionProcedure` | `integration:*` |
| `sso.configure` | OrgRole | OrgRole + `workspaceOwnerProcedure` (workspace-level SSO) | `sso:configure` |
| Any cross-workspace staff op | `adminProcedure` (global) | `staffSupportProcedure` | n/a |

`planValidationProcedure` and `workspaceAdminPlanValidationProcedure` are the only plan-gate-aware middlewares. `withPlanFeature("rbac.basic")` runs alongside, not instead of, role checks.

---

## 8. Threat model & security requirements

Numbered requirements, each testable.

- **R-AUTHZ-1** All workspace authorization resolves from `WorkspaceMember.role` for the request's `workspaceId`. `User.role` MUST NOT influence any workspace ACL decision. Test: a user with `User.role=ADMIN` and no `WorkspaceMember` row for workspace W receives `FORBIDDEN` on every workspace endpoint.
- **R-AUTHZ-2** The bypass at `trpc.ts:299` is deleted in the same PR that introduces `requireWorkspaceRole`. CI lint rule fails on `User.role` references outside billing/platform-admin paths.
- **R-AUTHZ-3** Role grant requires `caller.role > target.role` (strict). Granting equal-or-higher returns `FORBIDDEN`. Exception: OWNER may add another OWNER.
- **R-AUTHZ-4** Workspace OWNER count invariant (§3.3).
- **R-INV-1** Invitation tokens are 256-bit random, single-use, ≤7d expiry, revocable, hash-only storage, constant-time compare.
- **R-INV-2** On accept, verified email of accepting account MUST equal `Invitation.email` (case-insensitive, trimmed). Mismatch → `FORBIDDEN` + structured log.
- **R-INV-3** Inviting a role higher than inviter's role rejected at create time AND re-validated at accept time.
- **R-PLAN-1** Plan downgrades MUST NOT silently revoke access. On downgrade with members over cap: workspace flagged `MEMBER_OVER_LIMIT`, member CRUD frozen, 30-day grace period with email notification, OWNER explicitly chooses retention. Excess members are SUSPENDED, never deleted. Re-upgrade restores access.
- **R-RBAC-2-1** (Phase 3) Custom role creation requires meta-permission `role:manage`, AND the new role's permission set MUST be a subset of the creator's permission set, computed server-side.
- **R-CACHE-1** Permission revocation effective within 60s end-to-end. Integration test: demote user mid-session, next mutation receives `FORBIDDEN`.
- **R-AUDIT-1** Every authorization denial emits `{userId, workspaceId, procedure, requiredRole, actualRole, requestId}`. Schema-stable for audit-log integration.
- **R-MUT-1** Default-deny on mutations (§3.5).
- **R-IDOR-1** Every workspace-scoped record mutation queries with `where: { id, workspaceId }` (§3.4).
- **R-RBAC-MIG-1** `UserRole` enum split into `PlatformRole` and `WorkspaceRole`. No shared enum.
- **R-SSO-1** SSO auto-provisioned users land with **zero workspace memberships** by default. If org enables a default workspace policy, default role is capped at `READONLY`. OWNER is never auto-provisionable.

### Defense-in-depth

- Server is source of truth. Frontend role checks are UX hints. Documented in ADR.
- Procedure-level gating, not router-level (top-of-router `.use()` is bypassable).
- Property-based matrix tests: every (role × procedure) pair, snapshot of declarative allow/deny table; PRs changing the snapshot require security review.
- Negative tests outnumber positive tests by ≥3×.
- Independent rate-limit bucket on member/invitation mutations (30/min per user per workspace).
- Row-level filter helper `forWorkspace(ctx)` for all Prisma queries on workspace-scoped tables — even if an authz check is missed, IDOR cannot read another tenant's row.

---

## 9. Frontend plan

### 9.1 Hooks (`apps/app/src/hooks/rbac/`)

- `useCurrentWorkspaceRole()` → `{ role, isLoading, isOwner, isAdmin }`. Backed by new `trpc.workspace.me.useQuery({ workspaceId })` returning `{ role, permissions: string[], plan }`.
- `usePermission(key)` → `boolean`. Same snapshot via TanStack Query selector.
- `usePermissions(keys[])` → `Record<key, boolean>` for components testing several keys.
- `useCanGrantRole(targetRole)` → `{ allowed, reason }` for UI tooltips.

**Cache: stale-while-revalidate.** `staleTime: 60s`, `gcTime: 5m`. Invalidate `workspace.me` on workspace switch, member-role mutation success, license change.

**Default-deny while loading.** `usePermission` returns `false` until snapshot resolves. Skeleton during fetch, never an unauthorized flash.

### 9.2 Component refactor

| File | Today | Replacement |
|---|---|---|
| `SettingsSidebar.tsx` | `user.role === ADMIN` | `usePermissions(["workspace:settings:read","member:read","role:read","integration:read"])` per section |
| `HomePulse.tsx` | admin gate on action shortcuts | `usePermission("workspace:settings:read")` for settings shortcut; remove gate from informational tiles |
| `WorkspaceSelector.tsx` create button | admin check | `org:workspace:create` (org-scoped) from `trpc.organization.me` |
| `OrgMembersCard.tsx` | `isOrgAdmin && member.role !== OWNER` | `usePermission("member:write")` + `useCanGrantRole(member.role)` per row |
| `InviteMemberDialog.tsx` | admin check | `usePermission("member:invite")` to open; role select filtered by `useCanGrantRole(opt)` |

**Discovery list — additional surfaces to gate** (audit pass during Phase 2): queue purge/delete buttons, exchange delete, binding delete, policy CRUD, broker user/vhost CRUD, server add/edit/remove, alert rule CRUD, integration connect/disconnect, audit log read, export CSV.

### 9.3 UI patterns

- `<RequirePermission permission="..." fallback={...}>` for sections/routes/tabs. Default fallback `null`. `mode="disable"` wraps with `aria-disabled` + tooltip.
- **Disable-with-tooltip is the default for individual actions.** Tooltip: "Requires <role> in this workspace" — preserves discoverability and the ask-your-admin nudge.
- **Hide** only when (a) action exposes a feature the user shouldn't know about, or (b) entire route is denied (redirect + toast).
- **Empty state for READONLY**: pages render normally, mutating affordances disappear, soft banner explains read-only access.

### 9.4 Members & Roles pages

`apps/app/src/pages/settings/MembersPage.tsx` (new, refactor from `OrgMembersCard`):

- Member table with role column, inline `<Select>` gated by `member:write`, options filtered by `useCanGrantRole`.
- Optimistic update with rollback on tRPC error.
- Remove disabled for self always; disabled if last OWNER.
- Pending invitations section (resend/revoke gated by `member:invite`).
- Confirm `<AlertDialog>` for: role downgrade, removal, revoke invite. Role-aware copy.

`apps/app/src/pages/settings/RolesPage.tsx` (Phase 3, Enterprise, gated by `features.advancedRbac`):

- List system roles (badge "System", read-only) + custom roles (editable).
- Permission picker: grouped accordion by resource, "select all" + indeterminate, search box, read/write pairs visually linked (write implies read).
- Create/edit dialog: name, description, color/icon, permission set.
- Delete blocked if any member assigned (show count + reassign nudge).
- Member list role dropdown shows system + custom roles.

### 9.5 i18n keys

New file `apps/app/public/locales/{en,fr,es,zh}/rbac.json`:

- `roles.{owner,admin,member,readonly}.{name,description}`
- `permissions.{group}.{key}.{name,description}` for all ~30 keys
- `members.{title,inviteCta,roleColumn,removeConfirm,lastOwnerBlocked,selfRemoveBlocked}`
- `roles.page.{title,createCta,deleteBlockedAssigned,systemBadge}`
- `gating.{requiresRole,requiresPermission,readonlyBanner,askAdmin}`

Extend `auth.json`: `workspaceAdminRequired`, `workspacePermissionRequired`, `cannotGrantHigherRole`.

### 9.6 Error handling

Global tRPC error link: `FORBIDDEN` with `cause.code === "WORKSPACE_PERMISSION"` → toast role-aware message ("Requires Admin in *Production*"). Suppress duplicates within 2s. Snapshot fetch failure → treat as denied + retry banner.

---

## 10. Phasing

### Phase 1 — Basic RBAC, Developer plan ship

**Backend:**

- Schema migration step 1 (additive + backfill, §2.2).
- `WorkspaceRole` enum.
- New procedure ladder (§3.1) without `workspacePermissionProcedure`.
- `assertCanGrantRole` + last-OWNER invariant.
- `staffSupportProcedure` skeleton (no break-glass UI yet, just the explicit boundary).
- Rewrite every call site in §7 to `workspaceProcedure` / `workspaceAdminProcedure` / `workspaceOwnerProcedure`.
- Delete `adminProcedure` and the line-299 bypass.
- `Invitation` hardening (§2.5).
- Lint rule against `User.role` references in routers.

**Frontend:**

- Hooks scaffold (`useCurrentWorkspaceRole`, `usePermission` reading from a static client-side `ROLE_TO_PERMISSIONS` map mirroring backend).
- Refactor the 5 listed components.
- Members page basic.
- Default-deny + global 403 handler.
- Plan-feature flag `advancedRbac` off everywhere.

**Acceptance:**

- `grep -r "User\.role\|user\.role\b" apps/api/src/trpc apps/api/src/routers` returns zero results in workspace-context routers. Platform-staff features (`feedback`, `selfhosted-license`, `selfhosted-smtp`) keep their explicit `authorize([UserRole.ADMIN])` gating until `staffSupportProcedure` ships (rbac.md §4); the lint rule (#13) allowlists those files.
- Property-based matrix test passes for all (role × procedure) pairs.
- Existing data migrated with logged OWNER-backfill warnings only.
- 41 unit + 12 e2e tests (parity with abandoned PR #3).

### Phase 2 — Permission abstraction layer

**Backend:**

- Introduce `workspacePermissionProcedure(key)` driven by static built-in → permissions map (`apps/api/src/auth/permissions.ts`).
- Rewrite all router call sites to use permission keys instead of role names.
- `workspace.me` returns `permissions: string[]` from the resolver.

**Frontend:**

- Drop the static client-side map; read `permissions[]` from snapshot.
- Audit pass: gate every surface in the §9.2 discovery list.

**Acceptance:** zero references to `WorkspaceRole.ADMIN`/`MEMBER`/`READONLY` in router business logic; only inside the resolver and `assertCanGrantRole`.

### Phase 3 — Advanced RBAC, Enterprise plan ship

**Backend:**

- Schema for `Role`, `Permission`, `RolePermission`, `WorkspaceMember.customRoleId` (§2.4).
- Custom role CRUD endpoints, gated by `role:manage` + `withPlanFeature("rbac.advanced")`.
- Resource scopes (§6) wired into resolver.
- Plan-downgrade coercion to `MEMBER` without dropping `customRoleId`.

**Frontend:**

- `RolesPage`, custom role assignment in members, permission picker UI.
- Plan-gated entry points.

---

## 11. Tests

- **Backend unit** (`apps/api/src/auth/__tests__/`): exhaustive `assertCanGrantRole` matrix, last-OWNER invariant, IDOR guard.
- **Backend integration**: every privileged procedure × every role → expected allow/deny. Parameterized fixture. Negative tests outnumber positive.
- **Property-based matrix snapshot**: declarative table of (role × procedure) → expected outcome, snapshot-tested. PRs that change it require security review.
- **Frontend Vitest** (`apps/app/src/hooks/rbac/__tests__/`): hooks (cache hit/miss, workspace switch invalidation), `useCanGrantRole` 4×4 matrix.
- **Storybook**: per-role stories (OWNER, ADMIN, MEMBER, READONLY) for `MembersPage`, `InviteMemberDialog`, `SettingsSidebar`, queue action bar, `RolesPage`. `WithWorkspaceRole` decorator seeds tRPC mock.
- **Playwright** (`apps/e2e/`): 4 roles × {invite, change role, remove member, purge queue, edit policy, open settings tab, create workspace, create custom role (Enterprise)} ≈ 12-16 specs. One fixture per role.

---

## 12. Risks & tradeoffs

- **Migration — OWNER backfill ambiguity.** Workspaces without a clear creator get the earliest member promoted. SQL backfill always picks ≥1 member per workspace; structured log per ambiguous case for staff review. Cannot leave a workspace ownerless.
- **Migration — TypeScript ripple.** Switching `WorkspaceMember.role` from `UserRole` to `WorkspaceRole` surfaces every conflated reference at compile time. The pain is the feature.
- **Performance — permission resolution.** Phase 1: enum lookup. Phase 2: static map lookup. Phase 3: join on `RolePermission`. Cache: per-request memoization in tRPC context keyed by `(userId, workspaceId)`. No Redis until p99 budget pressures it.
- **Testing burden.** Mitigated by exhaustive resolver unit tests + parameterized integration fixture + one Playwright e2e per critical destructive path.
- **Custom role design — enum + nullable FK.** Hybrid choice: two resolver branches, but graceful plan-downgrade and fast built-in path. Worth the cost.
- **`User.role` retention.** Kept short-term for staff access. Long-term, drop in favor of explicit `StaffMembership` table — out of scope here, separate initiative.

---

## 13. Files this plan touches

**Modified:**

- `apps/api/prisma/schema.prisma` — `WorkspaceRole` enum, column splits, `Invitation` hardening, `Role`/`Permission`/`RolePermission` (Phase 3).
- `apps/api/src/trpc/trpc.ts` — delete `adminProcedure` (lines 103-114), delete bypass (line 299), new procedure ladder.
- Every file under `apps/api/src/trpc/routers/` — rewrite call sites per §7.
- 5 frontend components listed in §9.2 + discovery list in Phase 2.

**Created:**

- `apps/api/src/auth/workspace-roles.ts` — `assertCanGrantRole`, last-OWNER invariant helper.
- `apps/api/src/auth/permissions.ts` — permission catalog + built-in role bundles.
- `apps/api/src/trpc/routers/support.ts` — `staffSupportProcedure` (or wherever support router lives).
- `apps/app/src/hooks/rbac/{useCurrentWorkspaceRole,usePermission,useCanGrantRole,index}.ts`
- `apps/app/src/components/rbac/RequirePermission.tsx`
- `apps/app/src/pages/settings/MembersPage.tsx`
- `apps/app/src/pages/settings/RolesPage.tsx` (Phase 3)
- `apps/app/src/lib/rbac/rolePermissions.ts` (Phase 1, removed in Phase 2)
- `apps/app/public/locales/{en,fr,es,zh}/rbac.json`

---

## 14. References

- Abandoned PR: [getqarote/Qarote-EE#3](https://github.com/getqarote/Qarote-EE/pull/3) — useful for test-suite reference (41 unit + 12 e2e), not for implementation.
- Audit log expansion (separate plan, separate session): [getqarote/Qarote-EE#49](https://github.com/getqarote/Qarote-EE/issues/49). RBAC changes here emit denial events in a schema-stable shape (R-AUDIT-1) so audit log can ingest them later without churn.
- Pricing decision (2026-05-05): RBAC basic on Developer, RBAC advanced + audit log on Enterprise.
