# Plan: Premium Feature Previews + Plan-Tiered Retention

_Reviewed by Backend, Frontend, and Architecture agents. All blockers and concerns are incorporated._

## Context

Qarote is a RabbitMQ monitoring dashboard (freemium). The license system uses JWT keys validated offline. Three plan tiers: FREE, DEVELOPER ($29/mo), ENTERPRISE ($99/mo). Premium features live in `apps/api/src/ee/`.

Two orthogonal gating axes exist today:
- **License-based**: `isFeatureEnabled(feature)` / `requirePremiumFeature()` — reads license JWT, binary yes/no (self-hosted)
- **Plan-based**: `getOrgPlan(orgId)` — reads subscription tier, used for soft previews

The existing alerting preview is the reference pattern: backend filters data and returns real totals; frontend shows a teaser. This plan extends that model to Tracing, Diagnosis, and Spy, and adds plan-tiered retention for both trace events and queue metric snapshots.

---

## Change 0 — Shared preview utilities

**New file:** `apps/api/src/ee/routers/rabbitmq/preview.utils.ts`

Rather than inlining preview logic three times, extract a shared helper (parallel to `alerts.utils.ts`):

```ts
export function sliceWithPreview<T>(
  items: T[],
  previewCount: number
): { items: T[]; hiddenCount: number; isPreview: boolean } {
  if (items.length <= previewCount) return { items, hiddenCount: 0, isPreview: false };
  return { items: items.slice(0, previewCount), hiddenCount: items.length - previewCount, isPreview: true };
}
```

Each feature defines its own constant (`FREE_TRACE_PREVIEW_COUNT`, `FREE_DIAGNOSIS_PREVIEW_COUNT`, `FREE_SPY_PREVIEW_COUNT`) and calls this util. This makes the pattern obvious for future features.

---

## Change 1 — New feature flag: `message_spy`

**File:** `apps/api/src/config/features.ts`

- Add `"message_spy"` to `PremiumFeature` union type
- Add `MESSAGE_SPY: "message_spy" as const` to `FEATURES` object
- Add `message_spy: "Message Spy"` to `FEATURE_DESCRIPTIONS`

**Architecture note:** `message_spy` is **plan-gated only** (via `getOrgPlan`), not license-gated (no `requirePremiumFeature` call). In cloud mode this is fine because `isFeatureEnabled` returns true for everything. On self-hosted, the feature flag entry exists for naming/UI purposes only — plan enforcement is the gate. This is an intentional, documented decision.

---

## Change 2 — Plan limits in `PlanFeatures`

**File:** `apps/api/src/services/plan/features.service.ts`

Add two new fields to the `PlanFeatures` interface:

```ts
maxTraceRetentionHours: number;
maxMetricsRetentionHours: number;
```

Values:

| Plan | `maxTraceRetentionHours` | `maxMetricsRetentionHours` |
|---|---|---|
| FREE | 24 | 24 |
| DEVELOPER | 168 (7 days) | 168 (7 days) |
| ENTERPRISE | 720 (30 days) | 720 (30 days) |

These are operational quotas, not display features. A future refactor can extract a `PlanLimits` type to separate them from billing/display metadata — that is out of scope here but noted.

---

## Change 3 — Message Tracing: soft preview for free users

### Backend (`apps/api/src/ee/trpc/routers/messages/tap.ts` + `recording.ts`)

**Current:** All procedures gated with `requirePremiumFeature(FEATURES.MESSAGE_TRACING)`.

**Constants:**

```ts
const FREE_TRACE_PREVIEW_COUNT = 10;
```

**Procedures and new behavior:**

- **`setTraceEnabled`** — stays gated (`requirePremiumFeature`). Free users must not be able to enable the RabbitMQ firehose at the broker level.
- **`checkFirehoseStatus`** — **ungate**. Free users need to see that a firehose session is active before they can see preview data.
- **`getTraceStats`** — **ungate**. Stats (event counts, throughput) are the "hook" that makes the preview compelling.
- **`getTraces`** (historical, cursor-based):
  - Remove gate
  - If FREE plan:
    - Ignore any `from`/`to` window parameters — force query to last 24h only (matching plan retention). This prevents free users from reconstructing full history via repeated calls with different time windows.
    - Return the 10 most recent events + real `total` count within that 24h window + `isPreview: true`
  - If PAID: existing behavior unchanged, except the `MAX_QUERY_WINDOW_MS` cap (currently hardcoded to 7 days / 168h) must become plan-aware: `getPlanFeatures(plan).maxTraceRetentionHours * 60 * 60 * 1000`
- **`watchTraces`** (live DB-polling subscription):
  - Remove gate
  - If FREE plan: maintain a counter across poll ticks (outside the batch loop). When the running total reaches `FREE_TRACE_PREVIEW_COUNT`, slice the current batch to fill exactly to the cap, yield the sliced events, then yield `{ type: "preview_limit", totalSeen: FREE_TRACE_PREVIEW_COUNT }` and return. This prevents overshooting the cap within a single batch (batches can be up to 100 events).
  - If PAID: existing behavior unchanged.

**Plan resolution:** Use `ctx.resolveOrg()` + `getOrgPlan()` — the same pattern as `incident.ts`. Verify that `resolveOrg()` is request-scoped (memoized per request context) to avoid a bare DB query per procedure call.

### Frontend (`apps/app/src/pages/Messages.tsx`)

- Remove `<FeatureGate feature="message_tracing">` wrapper
- Historical list: when `isPreview: true && hiddenCount > 0`, render a teaser banner below the list (matching alerting style: `AlertTriangle` icon + i18n key + `getUpgradePath()` CTA)
- Live tail: handled via hook changes below

**File to update:** `apps/app/src/hooks/queries/useMessageRecording.ts`

- Add `"preview_limit"` case to the `onData` switch in `useWatchTraces`
- Expose `isPreviewLimited: boolean` and `previewTotalSeen: number` from the hook
- `LiveTail` reads these flags to freeze the event list and show the teaser

**i18n keys to add** (all locale files):
- `messages.previewHiddenCount` — "X more events hidden"
- `messages.previewUpgradeHint` — upgrade call-to-action copy

---

## Change 4 — Incident Diagnosis: soft preview for free users

### Backend (`apps/api/src/ee/routers/rabbitmq/incident.ts`)

**Constants:**

```ts
const FREE_DIAGNOSIS_PREVIEW_COUNT = 2;
```

- Remove `requirePremiumFeature` middleware
- Remove the `UserPlan.FREE → FORBIDDEN` block
- Run the full diagnosis engine regardless of plan
- If FREE plan: use `sliceWithPreview(findings, FREE_DIAGNOSIS_PREVIEW_COUNT)` — return first 2 findings + `hiddenCount`
- Always return the severity summary (critical/warning/info counts) regardless of plan — this is the urgency signal
- If PAID: return full results unchanged

### Frontend (`apps/app/src/pages/Diagnosis.tsx`)

- Remove `<FeatureGate feature="incident_diagnosis">` wrapper
- Remove the `isForbidden` error branch (backend will no longer return FORBIDDEN for this procedure)
- Remove the `enabled: hasDiagnosisFeature` guard from `useDiagnosis` — free users must trigger the query
- When `hiddenCount > 0`, render a teaser below the findings list (same style as tracing teaser)

**i18n keys to add:**
- `diagnosis.previewHiddenCount`
- `diagnosis.previewUpgradeHint`

---

## Change 5 — Message Spy: premium feature with soft preview

### Backend (`apps/api/src/trpc/routers/rabbitmq/queues.ts`)

**Constants:**

```ts
const FREE_SPY_PREVIEW_COUNT = 5;
```

- Resolve org plan at the start of `spyOnQueue` (same pattern: `ctx.resolveOrg()` + `getOrgPlan()`)
- If FREE plan: maintain a counter. After yielding `FREE_SPY_PREVIEW_COUNT` messages, yield `{ type: "preview_limit", totalSeen: 5 }` and return. The `finally` block handles AMQP teardown as today.
- If PAID: existing behavior unchanged.

### Frontend (`apps/app/src/components/QueueDetail/QueueSpy.tsx`)

- On receiving `{ type: "preview_limit" }`:
  - Freeze the message list
  - Switch the live-dot indicator from green pulse to static amber (no longer "live")
  - Render teaser: "Stream paused after 5 messages — upgrade to spy without limits" + `getUpgradePath()` CTA

**i18n keys to add:**
- `spy.previewLimitReached`
- `spy.previewUpgradeHint`

---

## Change 6 — Trace retention: user-configurable, plan-tiered

### Plan limits

| Plan | Configurable? | Min | Max | Default |
|---|---|---|---|---|
| FREE | No (fixed) | — | 24h | 24h |
| DEVELOPER | Yes | 1h | 168h (7 days) | 24h |
| ENTERPRISE | Yes | 1h | 720h (30 days) | 168h |

Free users cannot configure retention. Paid users get a configurable window within plan bounds.

### Backend

**`apps/api/src/schemas/workspace.ts`** _(newly identified file)_
- Add `traceRetentionHours: z.number().int().min(1).max(720).optional()` to `UpdateWorkspaceSchema`
- Server-side plan validation: after resolving the plan, reject values > `getPlanFeatures(plan).maxTraceRetentionHours` with a `BAD_REQUEST` error

**`apps/api/src/trpc/routers/workspace/management.ts`** _(newly identified file)_
- The workspace update mutation (`workspace.update`) must enforce the plan-aware validation when `traceRetentionHours` is present in the request

**`apps/api/src/ee/services/tracing/trace-cleanup.service.ts`**
- Remove hardcoded `MAX_RETENTION_HOURS = 168`
- Replace with: resolve workspace plan → `Math.min(workspace.traceRetentionHours, getPlanFeatures(plan).maxTraceRetentionHours)`
- Keep an absolute safety ceiling of 720h in case plan resolution fails
- Add a code comment: on plan downgrade, existing data older than the new limit persists until the next cleanup run — this is acceptable (cleanup is not a real-time flush)

### Frontend (Settings page)

**New file:** `apps/app/src/pages/settings/TracingSection.tsx`
- FREE: read-only field showing "24 hours — upgrade to configure"
- DEVELOPER/ENTERPRISE: numeric input (or slider), max bound from `getPlanFeatures(plan).maxTraceRetentionHours`
- Label: "Max 7 days on Developer plan" / "Max 30 days on Enterprise plan"
- Client-side validation before submit; server-side validation is the authoritative check

**`apps/app/src/pages/settings/index.tsx` (or equivalent settings router)**
- Wire `TracingSection` into the settings page

**Surfacing plan limits to frontend:**
- Add `maxTraceRetentionHours` and `maxMetricsRetentionHours` to `UserContextDefinition.ts` and the `useCurrentPlan` query response shape so components have typed access to these values

---

## Change 7 — Queue metrics retention: fixed per plan, no UI setting

Unlike trace retention, this is an infrastructure concern. No user-facing setting is exposed. Aligned with the queryable range:

| Plan | DB retention | Max queryable range |
|---|---|---|
| FREE | 24h | 6h (existing clamp — unchanged) |
| DEVELOPER | 7 days (168h) | 7 days |
| ENTERPRISE | 30 days (720h) | 30 days |

### Backend

**`apps/api/src/ee/services/metrics/queue-metrics.service.ts`**

Avoid N+1 plan lookups. Implementation:
1. In the cleanup job, fetch all workspaces with their org subscriptions in a **single query** (join `Workspace → Organization → Subscription`)
2. Bucket them into at most 3 groups by plan tier (FREE, DEVELOPER, ENTERPRISE)
3. Issue **at most 3 DELETE statements** — one per tier with the appropriate cutoff timestamp:
   ```sql
   DELETE FROM QueueMetricSnapshot
   WHERE workspaceId IN (...FREE workspace IDs...)
   AND recordedAt < NOW() - INTERVAL '24 hours'
   ```
   Repeat for DEVELOPER (168h) and ENTERPRISE (720h).

Remove hardcoded `RETENTION_DAYS = 7`. Add code comment about downgrade behavior (same as trace cleanup).

**`apps/api/src/services/metrics/resolve-allowed-range.ts`**
- Resolve plan → `getPlanFeatures(plan).maxMetricsRetentionHours`
- FREE: clamp to 6h (existing behavior — free users query 6h max even though retention is 24h)
- DEVELOPER: max 168h
- ENTERPRISE: max 720h

### Frontend

**`apps/app/src/components/HistoricalRangeSelector.tsx`**
- Change `isPremium: boolean` prop to `maxRangeHours: number`
- Add `{ label: "30d", hours: 720 }` to `RANGE_OPTIONS`
- Hide or disable options where `hours > maxRangeHours` (disabled with upgrade tooltip, not hidden — user should see what they're missing)
- Update all callers (currently only `QueueDetail.tsx:326`)

**`apps/app/src/pages/QueueDetail.tsx`**
- Pass `maxRangeHours` derived from `useCurrentPlan()` → `getPlanFeatures(plan).maxMetricsRetentionHours` to `HistoricalRangeSelector`

---

## Tests

### Unit tests (Vitest)

Convention: mock `@/core/prisma` and `@/core/logger` via `vi.mock()`, use `vi.useFakeTimers()` for time-sensitive assertions. Files live in `__tests__/` next to the source.

---

#### `apps/api/src/ee/routers/rabbitmq/__tests__/preview-utils.test.ts` _(new)_

Tests for the shared `sliceWithPreview` helper (Change 0).

| Test | Assertion |
|---|---|
| empty array → `isPreview: false`, `hiddenCount: 0` | items=[], previewCount=10 → isPreview false |
| fewer items than limit → `isPreview: false` | 5 items, limit=10 → all 5 returned, isPreview false |
| exactly at limit → `isPreview: false` | 10 items, limit=10 → all returned |
| over limit → `isPreview: true`, correct `hiddenCount` | 15 items, limit=10 → 10 returned, hiddenCount=5 |
| does not mutate original array | reference equality check before/after |

---

#### `apps/api/src/ee/routers/rabbitmq/__tests__/tracing-free-preview.test.ts` _(new)_

Tests for the FREE-plan preview logic in `getTraces` and `watchTraces` (Change 3).

| Test | Assertion |
|---|---|
| `getTraces` FREE → forces 24h window regardless of `from`/`to` | mocked DB query receives `timestamp >= now-24h` regardless of input |
| `getTraces` FREE → returns ≤10 events + real `total` + `isPreview: true` | 50 events in DB → 10 returned, total=50, isPreview=true |
| `getTraces` FREE → returns all events when total ≤ 10 | 5 events → 5 returned, isPreview=false |
| `getTraces` DEVELOPER → no window forced, no preview flag | existing behavior unchanged |
| `getTraces` ENTERPRISE → `MAX_QUERY_WINDOW_MS` derived from 720h, not 168h | query window cap uses plan max |
| `watchTraces` FREE — counter doesn't overshoot on large batch | batch of 15 events → yields first 10, then `preview_limit`; event 11-15 never emitted |
| `watchTraces` FREE — `preview_limit` event has correct shape | `{ type: "preview_limit", totalSeen: 10 }` |
| `watchTraces` FREE — subscription ends after cap (generator returns) | no further yields after `preview_limit` |

---

#### `apps/api/src/ee/routers/rabbitmq/__tests__/diagnosis-free-preview.test.ts` _(new)_

Tests for the FREE-plan preview in `getIncidentDiagnosis` (Change 4).

| Test | Assertion |
|---|---|
| FREE + 5 findings → returns first 2, `hiddenCount: 3` | sliceWithPreview applied correctly |
| FREE + 1 finding → returns 1, `hiddenCount: 0`, `isPreview: false` | no teaser when all fit |
| severity summary always present regardless of plan | FREE and DEVELOPER responses both include summary |
| DEVELOPER → returns all findings, no `hiddenCount` | full results unchanged |
| ENTERPRISE → returns all findings | full results unchanged |

---

#### `apps/api/src/trpc/routers/rabbitmq/__tests__/spy-free-preview.test.ts` _(new)_

Tests for the FREE-plan cap in `spyOnQueue` (Change 5). Generator behavior mocked at the AMQP layer.

| Test | Assertion |
|---|---|
| FREE → yields exactly 5 messages then `preview_limit` | 10 incoming AMQP messages → 5 yielded + `{ type: "preview_limit", totalSeen: 5 }` |
| FREE → subscription terminates cleanly after `preview_limit` | no further yields; finally block (AMQP teardown) runs |
| DEVELOPER → yields all messages without cap | 10 messages → 10 yielded, no `preview_limit` |
| `preview_limit` event has correct `totalSeen` count | totalSeen matches `FREE_SPY_PREVIEW_COUNT` |

---

#### `apps/api/src/ee/services/tracing/__tests__/trace-cleanup.service.test.ts` _(update existing)_

The existing test caps at 168h. Update to reflect plan-aware behavior (Change 6).

| Test | Change |
|---|---|
| ~~"caps retention at 168h even when workspace sets higher value"~~ → split into 3 plan-specific tests | FREE workspace + traceRetentionHours=999 → capped at 24h |
| DEVELOPER workspace + traceRetentionHours=999 → capped at 168h | new |
| ENTERPRISE workspace + traceRetentionHours=999 → capped at 720h | new |
| Absolute safety ceiling still applies (plan resolution failure → falls back to safety ceiling) | new |
| Downgrade scenario: workspace was ENTERPRISE, now FREE → data older than 24h deleted on next run | new |

---

#### `apps/api/src/ee/services/metrics/__tests__/queue-metrics-cleanup.test.ts` _(new)_

Tests for the batched per-tier metrics cleanup (Change 7).

| Test | Assertion |
|---|---|
| Empty workspace list → no DELETEs issued | `deleteMany` not called |
| All FREE workspaces → single DELETE with 24h cutoff | exactly 1 `deleteMany` call; cutoff = now − 24h |
| Mixed FREE + DEVELOPER → 2 DELETEs with correct cutoffs | 2 `deleteMany` calls; FREE cutoff=24h, DEV cutoff=168h |
| All three tiers present → exactly 3 DELETEs | max 3 `deleteMany` calls |
| Single query fetches all workspaces with plan (no N+1) | `prisma.workspace.findMany` called once total |
| Cleanup skips workspaces with null organizationId | no DELETE for unaffiliated workspace |

---

#### `apps/api/src/services/metrics/__tests__/resolve-allowed-range.test.ts` _(new)_

Tests for plan-aware queryable range (Change 7).

| Test | Assertion |
|---|---|
| FREE + requested 6h → allowed 6h, `wasClamped: false` | within FREE limit |
| FREE + requested 24h → clamped to 6h, `wasClamped: true` | FREE hard cap is 6h for querying |
| DEVELOPER + requested 72h → allowed 72h, `wasClamped: false` | within 168h limit |
| DEVELOPER + requested 720h → clamped to 168h, `wasClamped: true` | over DEVELOPER max |
| ENTERPRISE + requested 720h → allowed 720h, `wasClamped: false` | within 720h limit |
| ENTERPRISE + requested 721h → clamped to 720h, `wasClamped: true` | absolute ceiling |

---

#### `apps/api/src/services/plan/__tests__/plan-limits.test.ts` _(new)_

Simple regression guard for the new `PlanFeatures` fields (Change 2). Guards against typos.

| Test | Assertion |
|---|---|
| FREE `maxTraceRetentionHours` === 24 | |
| DEVELOPER `maxTraceRetentionHours` === 168 | |
| ENTERPRISE `maxTraceRetentionHours` === 720 | |
| FREE `maxMetricsRetentionHours` === 24 | |
| DEVELOPER `maxMetricsRetentionHours` === 168 | |
| ENTERPRISE `maxMetricsRetentionHours` === 720 | |
| DEVELOPER limit > FREE limit for both fields | ordering invariant |
| ENTERPRISE limit > DEVELOPER limit for both fields | ordering invariant |

---

### E2E tests (Playwright)

Convention: use `test-base.js` fixtures (`adminPage`, `db`, `api`). `db.clearSystemSetting("license_jwt")` in `beforeEach`. Tags: `@p1` for gating/preview flows, `@p2` for UI detail.

---

#### `apps/e2e/tests/messages/messages.spec.ts` _(update existing)_

The existing tests assert on the `FeatureGate` paywall (now removed). Update accordingly.

| Test | Change |
|---|---|
| ~~"should show upgrade paywall without Enterprise license"~~ | **Remove** — page no longer hard-gated |
| ~~"should show upgrade options for message_tracing feature"~~ | **Remove** |
| "should navigate to /messages" | Keep |
| "should show FirehoseDisabledState when firehose is inactive" | Keep (still valid without a license) |
| **New** "FREE plan sees preview teaser on messages page" `@p1` | Without license: page loads, shows FirehoseDisabledState or limited events, teaser text visible |
| **New** "DEVELOPER license removes preview teaser" `@p1` | Set DEVELOPER license JWT → teaser not present |
| **New** "sidebar nav item for Messages links to /messages" | Keep (rename from existing) |

---

#### `apps/e2e/tests/rabbitmq/diagnosis.spec.ts` _(new)_

| Test | Assertion |
|---|---|
| "FREE plan: diagnosis page loads without paywall" `@p1` | No FeatureGate overlay visible |
| "FREE plan: shows partial findings with teaser" `@p1` | Teaser text with "upgrade" visible; diagnosis results partially shown |
| "DEVELOPER license: shows full diagnosis without teaser" `@p1` | Set DEVELOPER license JWT → teaser not present |
| "diagnosis page navigable from sidebar" `@p2` | Nav link exists and routes correctly |

Note: since no real broker runs in E2E, diagnosis may return an empty/error state — tests check the gate/teaser UI layer only, not actual findings content.

---

#### `apps/e2e/tests/rabbitmq/queue-detail.spec.ts` _(update existing)_

Add to the existing `Queue Detail` describe block:

| Test | Assertion |
|---|---|
| **New** "FREE plan: history range selector shows only up to 6h" `@p2` | Options for 24h/72h/168h/720h are disabled or show upgrade tooltip |
| **New** "DEVELOPER license: range selector allows up to 168h" `@p2` | 24h/72h/168h enabled; 720h disabled |
| **New** "ENTERPRISE license: range selector allows 720h (30d)" `@p2` | All options including 30d enabled |
| **New** "FREE plan: spy tab shows upgrade teaser (no real broker needed)" `@p1` | Spy tab accessible; after connection attempt, preview teaser visible |

---

#### `apps/e2e/tests/settings/tracing-settings.spec.ts` _(new)_

| Test | Assertion |
|---|---|
| "FREE plan: trace retention shows as read-only 24h" `@p1` | Input/field is disabled or read-only; value shows "24 hours" |
| "DEVELOPER license: trace retention input enabled, max 168" `@p2` | Input enabled; attempting to submit 169 shows validation error |
| "ENTERPRISE license: trace retention input enabled, max 720" `@p2` | Input enabled; 720 accepted; 721 rejected |
| "DEVELOPER: saving valid retention hours persists" `@p2` | Submit 72h → reload → field shows 72h |

---

#### `apps/e2e/tests/license/license-feature-gating.spec.ts` _(update existing)_

Add assertions that cover the soft-preview model for features that were previously hard-gated:

| Test | Assertion |
|---|---|
| **New** "messages page accessible without license (soft preview)" `@p1` | No paywall overlay on `/messages` |
| **New** "diagnosis page accessible without license (soft preview)" `@p1` | No paywall overlay on `/diagnosis` |
| **Update** "should show paywall for premium features without license" | Scope to features that remain hard-gated (alerts, topology, etc.); exclude tracing and diagnosis |

---

### Test file summary

| File | Type | Status |
|---|---|---|
| `apps/api/src/ee/routers/rabbitmq/__tests__/preview-utils.test.ts` | Unit | New |
| `apps/api/src/ee/routers/rabbitmq/__tests__/tracing-free-preview.test.ts` | Unit | New |
| `apps/api/src/ee/routers/rabbitmq/__tests__/diagnosis-free-preview.test.ts` | Unit | New |
| `apps/api/src/trpc/routers/rabbitmq/__tests__/spy-free-preview.test.ts` | Unit | New |
| `apps/api/src/ee/services/tracing/__tests__/trace-cleanup.service.test.ts` | Unit | Update |
| `apps/api/src/ee/services/metrics/__tests__/queue-metrics-cleanup.test.ts` | Unit | New |
| `apps/api/src/services/metrics/__tests__/resolve-allowed-range.test.ts` | Unit | New |
| `apps/api/src/services/plan/__tests__/plan-limits.test.ts` | Unit | New |
| `apps/e2e/tests/tracing/tracing.spec.ts` | E2E | Update |
| `apps/e2e/tests/rabbitmq/diagnosis.spec.ts` | E2E | New |
| `apps/e2e/tests/rabbitmq/queue-detail.spec.ts` | E2E | Update |
| `apps/e2e/tests/settings/tracing-settings.spec.ts` | E2E | New |
| `apps/e2e/tests/license/license-feature-gating.spec.ts` | E2E | Update |

---

## Complete file change list

### Backend
| File | Change |
|---|---|
| `apps/api/src/config/features.ts` | Add `message_spy` feature flag |
| `apps/api/src/services/plan/features.service.ts` | Add `maxTraceRetentionHours`, `maxMetricsRetentionHours` to PlanFeatures |
| `apps/api/src/ee/routers/rabbitmq/preview.utils.ts` | **New** — shared `sliceWithPreview` helper |
| `apps/api/src/ee/routers/rabbitmq/tracing.ts` | Remove gate on most procedures, add FREE preview logic, fix `MAX_QUERY_WINDOW_MS` |
| `apps/api/src/ee/routers/rabbitmq/incident.ts` | Remove gate, add FREE preview logic |
| `apps/api/src/trpc/routers/rabbitmq/queues.ts` | Add FREE cap to `spyOnQueue` |
| `apps/api/src/ee/services/tracing/trace-cleanup.service.ts` | Plan-aware retention cap |
| `apps/api/src/ee/services/metrics/queue-metrics.service.ts` | Batched per-tier cleanup (max 3 DELETEs) |
| `apps/api/src/services/metrics/resolve-allowed-range.ts` | Plan-aware queryable range |
| `apps/api/src/schemas/workspace.ts` | Add `traceRetentionHours` to `UpdateWorkspaceSchema` with plan validation |
| `apps/api/src/trpc/routers/workspace/management.ts` | Enforce plan-aware validation on `traceRetentionHours` update |

### Frontend
| File | Change |
|---|---|
| `apps/app/src/hooks/queries/useMessageTracing.ts` | Add `preview_limit` case, expose `isPreviewLimited` flag |
| `apps/app/src/pages/Tracing.tsx` | Remove FeatureGate, add preview teaser |
| `apps/app/src/pages/Diagnosis.tsx` | Remove FeatureGate, remove `isForbidden` branch, remove `enabled` guard, add teaser |
| `apps/app/src/components/QueueDetail/QueueSpy.tsx` | Add `preview_limit` handling, freeze dot indicator, show teaser |
| `apps/app/src/components/HistoricalRangeSelector.tsx` | `isPremium → maxRangeHours`, add 30d option, disable by plan |
| `apps/app/src/pages/QueueDetail.tsx` | Pass `maxRangeHours` from plan context to HistoricalRangeSelector |
| `apps/app/src/pages/settings/TracingSection.tsx` | **New** — plan-aware retention input |
| `apps/app/src/pages/settings/index.tsx` | Wire TracingSection |
| `UserContextDefinition.ts` + `useCurrentPlan` query | Surface `maxTraceRetentionHours`, `maxMetricsRetentionHours` |
| All locale files | New i18n keys for tracing, diagnosis, spy teasers |

### Documentation
| File | Change |
|---|---|
| `docs/adr/` | **New ADR** — soft preview model rationale (hard block → soft preview, plan-aware retention design decisions) |

---

## What is NOT changing
- `setTraceEnabled` stays license-gated (`requirePremiumFeature`) — free users must not enable the RabbitMQ firehose at the broker level
- Free user queryable range clamp of 6h (kept, now derived from `maxMetricsRetentionHours` with a separate 6h cap for FREE)
- Alert preview mechanism (already implemented, not touched)
- Daily digest partial preview (FieldLock pattern, not touched)
- Queue metrics snapshot poll interval
