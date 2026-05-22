# Plan: RBAC Phase 2 PR-B — Router migration to permission keys

## Goal

Replace every `workspaceAdminProcedure` / `workspaceOwnerProcedure` / `workspaceProcedure` *role-based* gate in routers with `workspacePermissionProcedure(<key>)` driven by the catalog at `apps/api/src/auth/permissions.ts`.

**Acceptance** (`rbac.md` §10 Phase 2): zero references to `WorkspaceRole.ADMIN`/`MEMBER`/`READONLY` in router *business logic*. References inside `auth/workspace-roles.ts` (last-OWNER, `assertCanGrantRole`), `auth/permissions.ts` (the catalog itself), and `core/workspace-access.ts` remain legitimate.

`WorkspaceRole.OWNER` may still appear in routers — for last-OWNER guards, ownership transfer, etc. — those are invariants, not permission decisions.

---

## Scope

**102 call sites** across 26 router files (full audit in §6). Three classes:

| Current procedure | Count | Migration |
|---|---|---|
| `workspaceAdminProcedure` | 39 | → `workspacePermissionProcedure("<key>")` |
| `workspaceOwnerProcedure` | 1 | → `workspacePermissionProcedure("workspace:delete")` |
| `workspaceAdminPlanValidationProcedure` | 2 | → `workspacePermissionPlanValidationProcedure("<key>")` (new factory) |
| `workspaceProcedure` (read with semantics) | ~50 | → `workspacePermissionProcedure("<read-key>")` |
| `workspaceProcedure` (auth-only, no permission semantics) | 4 | **stays** — see §3 |

**Will NOT change in this PR**: `workspaceProcedure` itself, `workspaceAdminProcedure`, `workspaceOwnerProcedure` — they stay exported, just unused by routers. Removed in a follow-up cleanup PR once we're sure no consumer regresses.

---

## 1. Catalog additions

The current catalog has **13 keys**. PR-B adds **~25** to cover all migrated call sites. Final catalog ~38 keys. Naming convention follows `rbac.md` §5 (`<resource>:<verb>` or `<resource>:<sub>:<verb>`).

### Existing (kept as-is)

```
workspace:read         READONLY
workspace:update       ADMIN
workspace:delete       OWNER
member:invite          ADMIN
member:remove          ADMIN
member:update_role     ADMIN
server:read            READONLY
server:create          ADMIN
server:update          ADMIN
server:delete          ADMIN
queue:read             READONLY
queue:write            MEMBER         ← unused so far; see §5 open question
queue:purge            ADMIN
```

### Additions (PR-B)

```
member:read                       READONLY    list workspace members + invitations
server:test_connection            ADMIN       split from server:update per rbac.md §170
broker:read                       READONLY    overview, nodes, memory (cluster-level telemetry)
broker:connections:read           READONLY    connections + channels (exposes client IPs/auth — split for Phase 3 custom roles)
broker:update                     ADMIN       setClusterName only (broker-state mutation)
vhost:read                        READONLY
vhost:create                      ADMIN
vhost:update                      ADMIN
vhost:delete                      ADMIN
vhost:permissions:write           ADMIN       set/delete vhost-level permissions
vhost:limits:write                ADMIN       set/delete vhost limits
queue:create                      ADMIN
queue:delete                      ADMIN
queue:pause                       ADMIN       covers pauseQueue + resumeQueue
binding:read                      READONLY
exchange:read                     READONLY
exchange:create                   ADMIN
exchange:delete                   ADMIN
policy:read                       READONLY
policy:write                      ADMIN
policy:delete                     ADMIN
message:publish                   ADMIN       preserves current workspaceAdmin gate
message:tap                       ADMIN       live spy — surfaces payload contents (PII/secrets risk)
message:record:read               ADMIN       recorded payloads — same data-exposure surface as tap
broker_user:read                  ADMIN       broker users — sensitive
broker_user:write                 ADMIN       create/update broker users
broker_user:delete                ADMIN
broker_user:permissions:write     ADMIN       set/delete broker user permissions
definitions:export                OWNER       full broker config dump — closest thing to "give me the keys"
metric:read                       READONLY    rates, history, watchers
alerting:read                     READONLY    alerts, rules, health, notification settings, watch
alerting:write                    ADMIN       create/update rules, update notification settings
alerting:delete                   ADMIN
slack_config:read                 READONLY
slack_config:write                ADMIN
slack_config:delete               ADMIN
webhook:read                      READONLY
webhook:write                     ADMIN
webhook:delete                    ADMIN
llm_config:read                   READONLY
llm_config:write                  ADMIN       update + test connection
digest:read                       ADMIN       preserves current workspaceAdmin gate
digest:write                      ADMIN
topology:read                     READONLY
incident:read                     READONLY    incident diagnosis read
scan:read                         READONLY    config-checker — read-only sampling (verb :read for catalog consistency)
```

`audit:read` and `audit:export` are **not** added here — they belong to the audit log PR.

---

## 2. Mapping table

Format: `path → currentProcedure → targetKey`.

### `apps/api/src/trpc/routers/workspace/`

| Path | Current | Target |
|---|---|---|
| `core.ts:getMyRole` | workspaceProcedure | **stays** workspaceProcedure (auth-only, no permission decision — see §3) |
| `core.ts:getById` | workspaceProcedure | `workspace:read` |
| `management.ts:update` | workspaceAdminProcedure | `workspace:update` |
| `management.ts:delete` | workspaceOwnerProcedure | `workspace:delete` |
| `management.ts:switch` | workspaceProcedure | **stays** workspaceProcedure (user-scoped action) |
| `invitation.ts:getInvitations` | workspaceAdminProcedure | `member:read` |
| `invitation.ts:sendInvitation` | workspaceAdminPlanValidationProcedure | `workspacePermissionPlanValidationProcedure("member:invite")` |
| `invitation.ts:revokeInvitation` | workspaceAdminProcedure | `member:invite` |

### `apps/api/src/trpc/routers/user.ts`

| Path | Current | Target |
|---|---|---|
| `getWorkspaceUsers` | workspaceProcedure | `member:read` |
| `getUser` | workspaceProcedure | `member:read` |
| `removeFromWorkspace` | workspaceAdminProcedure | `member:remove` |
| `updateMemberRole` | workspaceAdminProcedure | `member:update_role` |

### `apps/api/src/trpc/routers/rabbitmq/`

| Path | Current | Target |
|---|---|---|
| `overview.ts:getOverview` | workspaceProcedure | `broker:read` |
| `overview.ts:setClusterName` | workspaceAdminProcedure | `broker:update` |
| `infrastructure.ts:getNodes` | workspaceProcedure | `broker:read` |
| `infrastructure.ts:getConnections` | workspaceProcedure | `broker:connections:read` |
| `infrastructure.ts:getChannels` | workspaceProcedure | `broker:connections:read` |
| `infrastructure.ts:getExchanges` | workspaceProcedure | `exchange:read` |
| `infrastructure.ts:createExchange` | workspaceAdminProcedure | `exchange:create` |
| `infrastructure.ts:deleteExchange` | workspaceAdminProcedure | `exchange:delete` |
| `memory.ts:getNodeMemory` | workspaceProcedure | `broker:read` |
| `definitions.ts:getDefinitions` | workspaceAdminProcedure | `definitions:export` |
| `vhost.ts:getVHosts` | workspaceProcedure | `vhost:read` |
| `vhost.ts:getVHost` | workspaceProcedure | `vhost:read` |
| `vhost.ts:createVHost` | workspaceAdminProcedure | `vhost:create` |
| `vhost.ts:updateVHost` | workspaceAdminProcedure | `vhost:update` |
| `vhost.ts:deleteVHost` | workspaceAdminProcedure | `vhost:delete` |
| `vhost.ts:setPermissions` | workspaceAdminProcedure | `vhost:permissions:write` |
| `vhost.ts:deletePermissions` | workspaceAdminProcedure | `vhost:permissions:write` |
| `vhost.ts:setLimit` | workspaceAdminProcedure | `vhost:limits:write` |
| `vhost.ts:deleteLimit` | workspaceAdminProcedure | `vhost:limits:write` |
| `users.ts:getUsers` | workspaceAdminProcedure | `broker_user:read` |
| `users.ts:getUser` | workspaceAdminProcedure | `broker_user:read` |
| `users.ts:createUser` | workspaceAdminProcedure | `broker_user:write` |
| `users.ts:updateUser` | workspaceAdminProcedure | `broker_user:write` |
| `users.ts:deleteUser` | workspaceAdminProcedure | `broker_user:delete` |
| `users.ts:setPermissions` | workspaceAdminProcedure | `broker_user:permissions:write` |
| `users.ts:deletePermissions` | workspaceAdminProcedure | `broker_user:permissions:write` |
| `policies.ts:getPolicies` | workspaceProcedure | `policy:read` |
| `policies.ts:createOrUpdatePolicy` | workspaceAdminProcedure | `policy:write` |
| `policies.ts:deletePolicy` | workspaceAdminProcedure | `policy:delete` |
| `messages.ts:publishMessage` | workspaceAdminProcedure | `message:publish` |
| `queues.ts:getQueues` | workspaceProcedure | `queue:read` |
| `queues.ts:getQueue` | workspaceProcedure | `queue:read` |
| `queues.ts:getQueueConsumers` | workspaceProcedure | `queue:read` |
| `queues.ts:getQueueBindings` | workspaceProcedure | `binding:read` |
| `queues.ts:createQueue` | workspaceAdminProcedure | `queue:create` |
| `queues.ts:purgeQueue` | workspaceAdminProcedure | `queue:purge` |
| `queues.ts:deleteQueue` | workspaceAdminProcedure | `queue:delete` |
| `queues.ts:pauseQueue` | workspaceAdminProcedure | `queue:pause` |
| `queues.ts:resumeQueue` | workspaceAdminProcedure | `queue:pause` |
| `queues.ts:watchQueues` | workspaceProcedure | `queue:read` |
| `queues.ts:getPauseStatus` | workspaceProcedure | `queue:read` |
| `metrics.ts:getMetrics` | workspaceProcedure | `metric:read` |
| `metrics.ts:getRates` | workspaceProcedure | `metric:read` |
| `metrics.ts:getQueueRates` | workspaceProcedure | `metric:read` |
| `metrics.ts:watchMetrics` | workspaceProcedure | `metric:read` |
| `metrics.ts:getQueueHistory` | workspaceProcedure | `metric:read` |
| `metrics.ts:getServerQueueHistory` | workspaceProcedure | `metric:read` |
| `metrics.ts:watchRates` | workspaceProcedure | `metric:read` |
| `server.ts:getServers` | workspaceProcedure | `server:read` |
| `server.ts:getServer` | workspaceProcedure | `server:read` |
| `server.ts:createServer` | workspaceAdminPlanValidationProcedure | `workspacePermissionPlanValidationProcedure("server:create")` |
| `server.ts:updateServer` | workspaceAdminProcedure | `server:update` |
| `server.ts:deleteServer` | workspaceAdminProcedure | `server:delete` |
| `server.ts:testConnection` | workspaceAdminProcedure | `server:test_connection` |
| `server.ts:getCapabilities` | workspaceProcedure | `server:read` |
| `server.ts:recheckCapabilities` | workspaceProcedure | `server:update` (mutates *server record's* capability snapshot, not broker state) |

### `apps/api/src/ee/routers/`

| Path | Current | Target |
|---|---|---|
| `rabbitmq/scan.ts:triggerScan` | workspaceProcedure | `scan:read` |
| `rabbitmq/scan.ts:getFindings` | workspaceProcedure | `scan:read` |
| `rabbitmq/topology.ts:getTopology` | workspaceProcedure | `topology:read` |
| `rabbitmq/incident.ts:getIncidentDiagnosis` | workspaceProcedure | `incident:read` |
| `rabbitmq/alerts.ts:getAlerts` | workspaceProcedure | `alerting:read` |
| `rabbitmq/alerts.ts:getResolvedAlerts` | workspaceProcedure | `alerting:read` |
| `rabbitmq/alerts.ts:getHealthCheck` | workspaceProcedure | `alerting:read` |
| `rabbitmq/alerts.ts:getNotificationSettings` | workspaceProcedure | `alerting:read` |
| `rabbitmq/alerts.ts:updateNotificationSettings` | workspaceProcedure | `alerting:write` ⚠️ **fixes silent gap** |
| `rabbitmq/alerts.ts:watchAlerts` | workspaceProcedure | `alerting:read` |
| `alerts/rules.ts:getRules` | workspaceProcedure | `alerting:read` |
| `alerts/rules.ts:getRule` | workspaceProcedure | `alerting:read` |
| `alerts/rules.ts:createRule` | workspaceProcedure | `alerting:write` ⚠️ **fixes silent gap** |
| `alerts/rules.ts:updateRule` | workspaceProcedure | `alerting:write` ⚠️ **fixes silent gap** |
| `alerts/rules.ts:deleteRule` | workspaceProcedure | `alerting:delete` ⚠️ **fixes silent gap** |
| `alerts/slack.ts:getConfigs` | workspaceProcedure | `slack_config:read` |
| `alerts/slack.ts:createConfig` | workspaceProcedure | `slack_config:write` ⚠️ **fixes silent gap** |
| `alerts/slack.ts:updateConfig` | workspaceProcedure | `slack_config:write` ⚠️ **fixes silent gap** |
| `alerts/slack.ts:deleteConfig` | workspaceProcedure | `slack_config:delete` ⚠️ **fixes silent gap** |
| `alerts/webhook.ts:getWebhooks` | workspaceProcedure | `webhook:read` |
| `alerts/webhook.ts:createWebhook` | workspaceProcedure | `webhook:write` ⚠️ **fixes silent gap** |
| `alerts/webhook.ts:updateWebhook` | workspaceProcedure | `webhook:write` ⚠️ **fixes silent gap** |
| `alerts/webhook.ts:deleteWebhook` | workspaceProcedure | `webhook:delete` ⚠️ **fixes silent gap** |

### `apps/api/src/ee/trpc/routers/`

| Path | Current | Target |
|---|---|---|
| `messages/tap.ts:subscribe` | workspaceProcedure | `message:tap` ⚠️ **was READONLY-effective; now ADMIN — payload exposure** |
| `messages/recording.ts:status` | workspaceProcedure | `message:record:read` ⚠️ **same data-exposure surface — now ADMIN** |
| `messages/recording.ts:query` | workspaceProcedure | `message:record:read` ⚠️ |
| `messages/recording.ts:stats` | workspaceProcedure | `message:record:read` ⚠️ |
| `messages/recording.ts:subscribe` | workspaceProcedure | `message:record:read` ⚠️ |
| `workspace/llm.ts:getConfig` | workspaceProcedure | `llm_config:read` |
| `workspace/llm.ts:updateConfig` | workspaceAdminProcedure | `llm_config:write` |
| `workspace/llm.ts:testConnection` | workspaceAdminProcedure | `llm_config:write` |
| `workspace/digest.ts:getSettings` | workspaceAdminProcedure | `digest:read` |
| `workspace/digest.ts:updateSettings` | workspaceAdminProcedure | `digest:write` |
| `workspace/digest.ts:sendTestDigest` | workspaceAdminProcedure | `digest:write` |

---

## 3. `workspaceProcedure` retentions (2 sites)

These intentionally do NOT receive a permission key. Reasoning: they're auth-required actions where the *only* check is "are you a member of this workspace" — there is no domain-level permission decision to make.

- `workspace.core.getMyRole` — returns the caller's own role. Any member can read their own role.
- `workspace.management.switch` — sets the user's `activeWorkspaceId` to one they're already a member of. Per-user state, no domain authorization.

If the acceptance gate later forbids `workspaceProcedure` in routers entirely, we add `auth:self_read` and `auth:self_write` keys for these and migrate. Out of scope here.

---

## 4. New procedure factory: `workspacePermissionPlanValidationProcedure`

`workspaceAdminPlanValidationProcedure` exists today: it's `workspaceAdminProcedure` + plan-error-to-gate-payload mapping (ADR-002). Two call sites use it: `invitation.sendInvitation`, `server.createServer`.

Add the analog:

```ts
export function workspacePermissionPlanValidationProcedure(
  permission: WorkspacePermission
) {
  return workspacePermissionProcedure(permission).use(async (opts) => {
    try {
      return await opts.next();
    } catch (error) {
      const gate = planErrorToBlockedGate(error);
      if (gate) throwGateError(gate);
      throw error;
    }
  });
}
```

Same structure as the existing one, just composed on `workspacePermissionProcedure(key)` instead of `workspaceAdminProcedure`.

---

## 5. Open questions / decisions

### 5.1 ⚠️ Silent gap fix in `alerts/*` routers (8 call sites)

Currently `alerts/rules.ts:createRule/updateRule/deleteRule`, `alerts/slack.ts:create/update/delete`, `alerts/webhook.ts:create/update/delete`, and `alerts.ts:updateNotificationSettings` use **`workspaceProcedure`** — meaning **READONLY workspace members can create/delete alert rules and notification integrations today**. This is a real gap.

PR-B fixes this by gating these mutations behind `alerting:write`/`alerting:delete` (ADMIN). **User-visible behavior change**: existing READONLY/MEMBER users in production who relied on this will get FORBIDDEN errors after deploy.

**Recommendation**: ship the fix, document in the PR description. The current behavior is unintended; the rbac.md catalog (§5) explicitly puts these under `alerting:write` (ADMIN tier).

### 5.2 `queue:write` permission key

Defined in the existing catalog but currently unused (no router consumes it). The rbac.md plan suggests MEMBER tier could publish messages, create exchanges, etc. (see "Built-in role bundles" §5).

**Recommendation**: keep `queue:write` in the catalog (unused) — drop it in a future PR if no consumer surfaces. Don't add new MEMBER-tier behaviors in this PR; preserving current ADMIN gates avoids scope creep.

### 5.3 `digest:read` at ADMIN tier

Current code uses `workspaceAdminProcedure` for `getSettings`. Mapping to `digest:read` at ADMIN preserves behavior. Could be `READONLY` if we want viewers to see the digest config without being able to change it. Keeping ADMIN preserves current semantics; revisit if frontend needs the read for a non-admin surface.

### 5.4 ESLint acceptance gate

Add a `no-restricted-syntax` rule in `apps/api/eslint.config.cjs` banning `WorkspaceRole.ADMIN`, `WorkspaceRole.MEMBER`, `WorkspaceRole.READONLY` literals in `apps/api/src/trpc/routers/**/*.ts` and `apps/api/src/ee/**/*.ts`. Allowlist:
- `apps/api/src/auth/workspace-roles.ts` (last-OWNER, assertCanGrantRole)
- `apps/api/src/auth/permissions.ts` (the catalog)
- `apps/api/src/core/workspace-access.ts`
- `**/__tests__/**`

`WorkspaceRole.OWNER` is **not** banned — invariants like last-OWNER guards legitimately compare against it.

### 5.5 Single PR or split?

102 call sites is a lot. Two options:
- **A. Single PR** with all 102 migrations + catalog additions + tests + ESLint gate. Heavy review but atomic.
- **B. Split by domain**: PR-B1 (workspace + user + member), PR-B2 (rabbitmq core), PR-B3 (ee — alerts/messages/llm/digest), PR-B4 (ESLint gate + cleanup of unused procedures).

**Recommendation**: **single PR** but bundled, with per-router commits inside the PR so reviewers can read incrementally. Catalog additions and the new factory ship in the first commit; subsequent commits migrate one router at a time. Minimizes context-switch for the reviewer vs B's ~4 separate review cycles.

---

## 6. Implementation order (single PR)

Group catalog comments by resource (`// --- Broker ---`, `// --- Messaging ---`) in `permissions.ts` so the 38-key flat union stays readable.

1. **Commit 1: Catalog + factory**
   - Add ~26 keys to `apps/api/src/auth/permissions.ts` with their min-role; group by resource block.
   - Add `workspacePermissionPlanValidationProcedure(key)` factory in `apps/api/src/trpc/trpc.ts`.
   - Extend `apps/api/src/auth/__tests__/permissions.test.ts` to assert all keys reachable + role-bundle invariants per new key.
   - Add header comment in `permissions.ts` documenting the rule: *"permission keys gate workspace resources, not the caller's own session state"*.
2. **Commits 2-N: Migrate per router** (per-file commits for incremental review)
   - Workspace: core, management, invitation, user (4 files)
   - RabbitMQ core: overview, infrastructure, memory, definitions, vhost, users, policies, messages (8 files)
   - RabbitMQ heavy: queues, server, metrics (3 files)
   - EE messages + workspace: tap, recording, llm, digest (4 files)
   - EE diagnostics: scan, topology, incident (3 files)
3. **Commit N+1: SECURITY fix — alerts/* gap** (separate commit, revertable in isolation)
   - Migrate `alerts/rules.ts`, `alerts/slack.ts`, `alerts/webhook.ts`, `alerts.ts:updateNotificationSettings` from `workspaceProcedure` to `alerting:write` / `alerting:delete` / `slack_config:*` / `webhook:*`.
   - **PR description must include a `before/after` table** for these 8 procedures so operators see the regression risk.
4. **Commit N+2: ESLint acceptance gate**
   - Add `no-restricted-syntax` rule + allowlist (workspace-roles.ts, permissions.ts, workspace-access.ts, `**/__tests__/**`, `scripts/**`).
   - Run `pnpm lint --fix`; final `rg "WorkspaceRole\.(ADMIN|MEMBER|READONLY)" apps/api/src` should produce only allowlist hits.
5. **Commit N+3: Structural completeness test**
   - New test: imports the appRouter, walks every leaf procedure, asserts each one's middleware chain includes `workspacePermissionProcedure` OR is in a `PERMISSION_EXEMPT_PROCEDURES` allowlist (the 4 retentions in §3).
   - This catches the case where ESLint passes but a procedure still uses bare `workspaceProcedure` without intent.
6. **Commit N+4: Procedure-matrix tests**
   - Extend `apps/api/src/trpc/routers/workspace/__tests__/procedure-matrix.test.ts` to cover every new permission gate × every role → allow/deny outcome.
   - Snapshot test for the FORBIDDEN error wire shape per variant (`{ code: "WORKSPACE_PERMISSION", required, actual, permission }`) — frontend PR-C will branch on this.
   - Negative test: READONLY + over-quota on a `workspacePermissionPlanValidationProcedure` returns FORBIDDEN, NOT the gate payload (composition order: permission first, then plan-validation wrap).

---

## 7. Tests

### Unit (catalog)
- Each new key has a `permissionsForRole()` test asserting it's in the right role bundles.
- `hasPermission(role, "<new_key>")` matrix per role.

### Integration (procedure-level)
- Every migrated procedure × every role → expected allow/deny with correct `cause` payload (`{ code: "WORKSPACE_PERMISSION", required, actual, permission }`).
- Plan-validation procedure (new): error from inner procedure → mapped to gate payload (preserves ADR-002 contract).

### Audit / observability
- `logAuthorizationDenial` event shape unchanged (Pino field set, structured cause). R-AUDIT-1 contract preserved.

### Regression
- procedure-matrix.test.ts existing 26 tests must pass unchanged (sanity).
- All ~1500 existing API tests pass.

---

## 8. Out of scope

- **Frontend** (`ROLE_PERMISSIONS` removal, reading `permissions[]` from `getMyRole`) — that's PR-C.
- **Phase 3 schema** (`Role`/`Permission`/`RolePermission`/`customRoleId`) — separate plan.
- **`workspaceAdminProcedure` / `workspaceOwnerProcedure` removal** — they stay exported in this PR; cleanup PR removes them once we're sure no consumer regresses (could be next sprint).
- **`audit:read`/`audit:export` keys** — added in the audit log PR per the AUDIT_LOG plan.
- **`alerting:acknowledge`, `definitions:import`, ownership-transfer keys** — defer until consumed by a router.

---

## 9. Risks

1. **Behavior regressions from gap fixes** (§5.1): READONLY users today can create alert rules; that breaks after deploy. Mitigated by clear PR description + release note.
2. **Reviewer fatigue**: 102 sites in one PR. Mitigated by per-router commits + catalog-first commit so reviewers read the catalog once and check each commit applies it consistently.
3. **Missed call site**: a procedure not in the scan (e.g. behind a re-export) keeps `workspaceProcedure` and ESLint doesn't flag it. ESLint catches *role checks* but not bare `workspaceProcedure` with no role check. Mitigated by the **structural completeness test** (commit N+3) that walks the appRouter and asserts every leaf has a permission gate or sits in `PERMISSION_EXEMPT_PROCEDURES`.
4. **Over-restrictive read keys**: e.g. `metric:read` at READONLY means READONLY can read metrics — but we may discover a customer use case where this is sensitive. Recommendation: ship as-is, tighten in a follow-up if customer feedback demands it.
