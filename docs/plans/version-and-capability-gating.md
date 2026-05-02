# Plan: Version & Capability Gating for Killer Features

_Reviewed by Backend, Frontend, and Architecture agents. All blockers and concerns are incorporated. Depends on **ADR-002 (Feature Gate Composition)** — this plan implements the **capability axis** of the unified `FeatureGateResult` contract._

## Context

Qarote captures `rabbitmq_version` and `versionMajorMinor` at server registration (`apps/api/src/core/rabbitmq/BaseClient.ts:28`, `apps/api/src/trpc/routers/rabbitmq/server.ts:231`) but never gates UI or backend behaviour on it. The Management API's `/api/overview` already returns `enabled_plugins[]` (`apps/api/src/core/rabbitmq/rabbitmq.interfaces.ts:176`) — we read it, we discard it.

Concrete consequences today:

- A user on RabbitMQ 3.7 with no `rabbitmq_tracing` plugin sees the Tracing tab, clicks "Enable", and gets an opaque AMQP error from `firehose.service.ts:191` when the consumer tries to bind to `amq.rabbitmq.trace`.
- A user on a stripped-down image without `rabbitmq_management_agent` features (rare but real on Bitnami / Azure managed) sees empty queue metrics and assumes Qarote is broken.
- Quorum queues / Streams have different binding semantics. Message Spy (`queues.ts:1039`) replicates bindings onto an `exclusive + autoDelete` classic queue — for a quorum source this works, for a stream source it does **not** (streams use offset-based consumption, not bindings). Today we let the user try and fail.

The fix has three layers: **detect**, **gate**, **explain**.

---

## Capability matrix (source of truth)

| Feature | Hard requirement | Soft requirement | Where checked today |
|---|---|---|---|
| Queue History | Management API reachable; `rabbitmq_management` plugin | RMQ ≥ 3.8 for accurate `messages_ready` per node | Nowhere |
| Smart Alerting | Same as Queue History | — | Nowhere |
| Daily Digest | Same as Queue History | — | Nowhere |
| Incident Diagnosis Engine | Same as Queue History | ≥ 3 hours of accumulated snapshots before useful | Nowhere — empty result silently returned |
| Message Spy | AMQP port reachable; `exclusive` + `autoDelete` + `x-expires` queue args | Source queue is *not* a stream | Nowhere — fails at `assertQueue` |
| Message Tracing (Firehose) | `rabbitmq_tracing` plugin **enabled** OR `rabbitmqctl trace_on` executed; `amq.rabbitmq.trace` exchange exists | Acceptable performance impact (firehose duplicates traffic) | Nowhere — fails at `bindQueue` |

All of this is detectable from data we already fetch.

---

## Change 1 — Persist capability snapshot on the Server model

**File:** `apps/api/prisma/schema.prisma`

Add to `Server`:

```prisma
// Indexable, queryable scalar fields
rabbitmqVersion       String?
productName           String?
// JSON snapshot for evolving fields (plugin list, per-vhost flags…)
capabilities          Json?     // CapabilitySnapshot
capabilitiesAt        DateTime? // when the snapshot was taken
// Support escape hatch — never set automatically; only via support tooling
capabilityOverride    Json?     // Partial<CapabilitySnapshot> merged on top of detected snapshot
```

`CapabilitySnapshot` (TypeScript type for the JSON column):

```ts
type CapabilitySnapshot = {
  schemaVersion: 1;                 // bump when the shape evolves; readers must accept ≤ their max
  enabledPlugins: string[];         // raw list from /api/overview
  hasFirehoseExchange: boolean;     // see "Firehose detection" below — single check, not per-vhost iteration
  amqpReachable: boolean;           // reuses BaseClient state — no fresh connection
  amqpReachableAt: string;          // when amqpReachable was last truthy (so a transient timeout doesn't immediately flip the gate)
  detectedAt: string;               // ISO
};
```

**Migration**: `pnpm db:migrate:dev --name server_capabilities_snapshot`. Nullable columns; existing rows backfilled on the first detector run for that server (triggered immediately at deploy time via a one-shot job, not waiting for the nightly cron — otherwise every feature shows "Cannot verify compatibility" for up to 24 h).

**`schemaVersion`**: every reader must check `caps.schemaVersion <= MAX_SUPPORTED` and degrade gracefully on mismatch (treat as "unknown"). This protects rollback — if v2 of the snapshot adds a field and we revert, v1 readers don't crash on unknown fields.

**`capabilityOverride`**: support-only escape hatch. If the resolver misclassifies a broker (custom plugin name, exotic distribution), support sets `{ hasFirehoseExchange: true }` here; the resolver merges this on top of detected values. Read-only from app code — only writable via internal admin tools.

**Concurrency**: capability writes use `prisma.server.update` with a `WHERE capabilitiesAt < NOW() - INTERVAL '10 seconds' OR capabilitiesAt IS NULL` predicate so a manual refresh and the cron racing on the same server don't ping-pong. Conflicting writes silently no-op — both writers were trying to set "fresh enough" data.

---

## Change 2 — Centralised capability detector

**New file:** `apps/api/src/core/rabbitmq/capabilities.ts` (broker-protocol concern only — see "Boundary" note below).

```ts
export async function detectServerCapabilities(
  client: RabbitMQClient
): Promise<CapabilitySnapshot> { … }
```

Steps:
1. `GET /api/overview` — read `rabbitmq_version`, `product_name`, `enabled_plugins`. Persist `rabbitmqVersion` and `productName` to dedicated Prisma columns (Change 1) for queryability.
2. **Firehose detection (single check, not per-vhost):** `caps.hasFirehoseExchange = enabled_plugins.includes('rabbitmq_tracing') || enabled_plugins.includes('rabbitmq_event_exchange')`. Per-vhost firehose presence is deferred (see "Out of scope"); we check the **primary vhost** the workspace registered with. Iterating all vhosts on a 200-vhost broker would generate 200 HTTPs/refresh — punted to a follow-up.
3. **AMQP reachability — reuse `BaseClient` state, do NOT open a new connection.** `BaseClient` already tracks an open AMQP connection where applicable; cold TLS handshakes against managed brokers (CloudAMQP / Azure) routinely exceed 2 s and would cause false negatives. Detector reads `client.isAmqpReachable()` (new accessor on `BaseClient`). If unknown, default to last-known value with a 24 h TTL via `amqpReachableAt`.
4. `GET /api/whoami` — confirms management API auth still works (most common silent failure mode). Result not stored, but failure → log + abort the refresh (don't overwrite a good snapshot with a bad one).
5. Return the snapshot.

**Refresh triggers**:
- On server registration (existing path that talks to the broker).
- On manual "Test connection" or "Re-check" from the UI — **rate-limited to 1 refresh per server per 60 s** server-side (DoS guard against the user's own broker).
- Nightly cron with **deterministic jitter** keyed by `serverId.hash() % 3600s`, so 5 000 workspaces don't all hit at the same UTC minute.

**Worker integration**: `firehose.service.ts:startConsumer` reads `Server.capabilities` directly via Prisma at start time and bails with a typed error if `hasFirehoseExchange === false`. Worker memory does **not** cache the snapshot — workers are short-lived enough that a fresh DB read per start is cheaper than invalidation.

**Cache invalidation contract** when the snapshot changes:
- TanStack Query keys on the frontend: `["server", serverId, "capabilities"]`, `["server", serverId, "features"]` — invalidated by the `useFeatureGate` hook (ADR-002) on snapshot delta.
- In-process LRU in `feature-availability` resolver: keyed on `serverId + capabilitiesAt`; new `capabilitiesAt` is automatically a new key.
- No worker-side cache to invalidate (per the rule above).

**Failure mode**: detection failure keeps the previous snapshot and logs `capability.detection_failed`. **We never silently mark a feature as available.** A missing snapshot returns `kind: "blocked"` from the resolver with `reasonKey: "compatibility.unknown"`.

**Observability**: emit a structured `capability.changed` log with `{ serverId, before, after }` when the diff is non-empty. Emit a PostHog event `capability_detection_run` with `{ rabbitmqVersion, productName, hasFirehoseExchange, anyChange: bool }` per refresh — answers product-roadmap questions ("what % of brokers have firehose?") for free.

**Boundary note (per architecture review)**: the **detector** lives in `core/rabbitmq/capabilities.ts` — it speaks the broker's protocols. The **resolver** that maps capabilities → product features lives in `services/feature-gate/capability-axis.ts` (per ADR-002). This split keeps `core/rabbitmq` free of product knowledge.

---

## Change 3 — Capability-axis resolver (slots into ADR-002)

**New file:** `apps/api/src/services/feature-gate/capability-axis.ts`

This file implements **only the capability axis** of the unified `FeatureGateResult` from ADR-002. Composition with the license and plan axes is the responsibility of `resolveFeatureGate` (built per ADR-002, separately).

```ts
type FeatureKey =
  | "queue_history" | "smart_alerting" | "daily_digest"
  | "incident_diagnosis" | "message_tap" | "message_recording"; // names align with messages-unified-ux.md

type CapabilityAxisResult =
  | { kind: "ok" }                                    // feature is technically supported
  | { kind: "degraded"; hintKey: string; hintParams?: Record<string, string|number> }
  | { kind: "blocked";                                // technical impossibility
      reasonKey: string;                              // i18n key — NEVER a localised string
      reasonParams?: Record<string, string|number>;
      remediation?: { docsUrl: string; ctaKey: string; commands?: string[] };
      fallback?: { feature: FeatureKey; reasonKey: string }; // ADR-002 fallback support
    };

export function resolveCapabilityAxis(
  feature: FeatureKey,
  caps: CapabilitySnapshot | null,
  context?: { queueType?: "classic" | "quorum" | "stream" }
): CapabilityAxisResult;
```

Rules (one place, easy to audit, easy to test):

- **`message_recording`** blocked when `caps.hasFirehoseExchange === false`.
  - `reasonKey: "gate.capability.tracing.pluginMissing"`, `reasonParams: { broker: server.name }`
  - `remediation.commands: ["rabbitmq-plugins enable rabbitmq_tracing"]`
  - **`fallback: { feature: "message_tap", reasonKey: "gate.capability.tracing.fallbackToTap" }`** — when blocked, suggest Live tap.
- **`message_tap`** blocked when `context.queueType === "stream"`. `reasonKey: "gate.capability.tap.streamUnsupported"`. No fallback (Recorder also can't tap a stream as a unit).
- **`message_tap`** degraded when `caps.amqpReachableAt` is older than 24 h. `hintKey: "gate.capability.tap.amqpUnreliable"`.
- **`incident_diagnosis`** degraded when fewer than 3 h of `queueMetricSnapshot` exist (with concrete count). `hintKey: "gate.capability.diagnosis.warmingUp"`, `hintParams: { availableMinutes: 47, requiredMinutes: 180 }` — frontend renders a progress bar.
- All features blocked when `caps === null`. `reasonKey: "gate.capability.unknown"`. Re-check is the primary CTA.

**i18n contract**: every reason/hint is an i18n key. Backend never returns a localised string. The `gate.*` namespace lives in `apps/app/public/locales/{en,es,fr,zh}/gate.json`. CI parity check (i18next-parser) blocks merges with missing keys — added in this plan, reused by all three.

**Tier B diagnosis rules (per `diagnosis-rules-sourcing.md`) consume this resolver per-snapshot, not at startup** — a workspace with mixed RMQ 3.7 and 4.0 brokers must fire `QUORUM_LEADER_CHURN` only on the 4.0 broker. The diagnosis engine passes the broker's `caps` to each rule.

Tests live next to it: one fixture per RabbitMQ version (3.7, 3.8, 3.12, 4.0, 4.1) × per product flavour (open-source, Tanzu, AWS MQ) with realistic `/api/overview` payloads.

---

## Change 4 — Backend gating (via ADR-002 helpers)

Two enforcement points:

1. **tRPC procedures** — every premium procedure calls `resolveFeatureGate(ctx, feature, context?)` (ADR-002) which composes capability + license + plan. If the result is `kind: "blocked"`, the procedure calls `throwGateError(gate)`:

   ```ts
   const gate = resolveFeatureGate(ctx, "message_recording");
   if (gate.kind === "blocked") throwGateError(gate);
   if (gate.kind === "preview") return { ...result, _preview: gate };
   ```

   The shared `errorFormatter` (per ADR-002) attaches the structured `gate` payload to `shape.data` — **`cause` is NOT used** because tRPC's default formatter strips it. Code is `PRECONDITION_FAILED` for capability-only blocks (user can self-remediate by enabling a plugin), `FORBIDDEN` for license/plan blocks.

   Touch points:
   - `apps/api/src/trpc/routers/rabbitmq/queues.ts:921` (today `spyOnQueue` — moves to `messages.tap` per `messages-unified-ux.md`)
   - `apps/api/src/ee/trpc/routers/tracing.*` (renamed `messages.recorder.*` per the messages plan)
   - `apps/api/src/ee/trpc/routers/incident.*` — diagnose endpoints

2. **Workers** — `firehose.service.ts:startConsumer` reads `Server.capabilities` directly via Prisma at start time and bails with a typed error if `hasFirehoseExchange === false`, instead of looping on bind failures.

3. **Tap authorization & resource ceiling** — when `messages.tap` (formerly `spyOnQueue`) is moved out of the `rabbitmq.*` router, **all middleware applied at the `rabbitmq` router level must be re-applied** to the new path: workspace ACL, server-belongs-to-workspace check, vhost ownership check. Add explicit assertions, don't rely on the old router's middleware chain.

   Per-workspace concurrent-tap caps enforced server-side: FREE = 1, paid = 5. Server-side max-duration on a single tap = 30 min (the `x-expires=300s` queue arg already handles disconnects, but a long-lived tab keeps the queue alive).

4. **Vhost in deep links** — `messages.tap` accepts `{ serverId, queueName, vhost }`. Vhost names can contain `/`, so the URL parser uses `decodeURIComponent` and the procedure asserts `workspaceOwnsVhost(serverId, vhost)` server-side. Don't trust client-supplied vhost.

---

## Change 5 — Frontend explanation surface

The user sees **why** a feature is off, not *that it's off*.

**Component:** `<FeatureGateCard>` (per ADR-002, single component for any blocked gate — capability, license, or plan). This plan does **not** introduce a capability-specific card; it provides the `i18n` keys and the data the shared card consumes.

```tsx
<FeatureGateCard gate={gate} versionInfo={{ rabbitmqVersion, productName }} />
```

Behaviour:
- Replaces the feature's main panel when `kind: "blocked"` — no half-empty UI.
- Shows broker version + product name in a "Last checked: 2 min ago" footer with a "Re-check" button (rate-limited 1/60s server-side, debounced client-side, `aria-live="polite"` for screen reader announcements on result).
- Code blocks (e.g. `rabbitmq-plugins enable rabbitmq_tracing`) have a copy button with `Tooltip`, `kbd` shortcut hint, toast feedback, and `overflow-x-auto` for mobile.
- "Why we need this" link opens docs in a Radix `Sheet`, preserving page state.
- Re-check button **invalidates** TanStack Query keys: `["server", serverId, "capabilities"]`, `["server", serverId, "features"]`, plus any feature-specific keys (`["tracing", …]`, `["diagnosis", …]`). Listed in a single helper `invalidateServerCaches(queryClient, serverId)`.
- For `degraded` (hint, not block): the feature still renders **with an inline banner** showing concrete data, e.g. *"Diagnosis needs 3 hours of metrics — currently have 47 min"* + progress bar. Banner is dismissable (per session, not persisted).
- **Skeleton loading state** when `capabilitiesAt === null && isFetching` — distinct from "Cannot verify compatibility" (final state). No flash of unstyled content.
- **Bookmark preservation**: when `FeatureGateCard` replaces a page body, `location.search` is preserved; clicking Re-check restores the prior view if the gate flips to `ok`.

Touched pages:
- `apps/app/src/pages/Tracing.tsx` (becomes `Messages.tsx` per `messages-unified-ux.md`)
- `apps/app/src/pages/Diagnosis.tsx`
- `apps/app/src/components/QueueDetail/QueueSpy.tsx` — becomes a deep-link launcher per the messages plan; gating happens on the destination page

**i18n**: keys live in the unified `gate` namespace from ADR-002 (`apps/app/public/locales/{en,fr,es,zh}/gate.json`). All four locales are mandatory at merge time — CI runs `i18next-parser` to enforce parity. Backend returns `reasonKey` + `reasonParams`; `<FeatureGateCard>` does the lookup.

---

## Change 6 — Server-list compatibility column

In the server list (`apps/app/src/pages/Servers.tsx`), add a discreet badge per server: `RMQ 3.12 · 4 features ready`. Tooltip lists each feature and its status. This gives the user a one-glance answer to *"will my new broker work with Qarote?"* before they click around.

---

## Documentation

- `docs/FEATURE_COMPARISON.md` — add a "Broker compatibility" section with the matrix from the top of this doc.
- New page `docs/features/compatibility.md` — explain how Qarote detects capabilities, how to enable the firehose plugin, why streams are not supported by Spy, link from every `FeatureUnavailableCard`.
- Add a short "Supported RabbitMQ versions" line to the README.

---

## Rollout order

**Hard prerequisite: ADR-002 implementation lands first** (`resolveFeatureGate` + `errorFormatter` + `useFeatureGate` + `<FeatureGateCard>`). No part of this plan ships without it.

1. ADR-002 implementation PR (separate, prerequisite).
2. Schema + migration + capability detector + immediate one-shot backfill + nightly cron with jitter (no user-visible change yet).
3. Capability-axis resolver + per-version + per-product fixtures.
4. Backend gating: replace existing license-only checks at touch points with `resolveFeatureGate` calls. Existing UI keeps working, just gets clearer errors via `<FeatureGateCard>`.
5. Page integrations (Tracing → Messages depends on the `messages-unified-ux.md` plan; coordinate).
6. Server-list compatibility badge + tooltip (Radix Popover for touch support, not hover-only).
7. Docs + i18n parity check in CI.

Ship 2–4 in one PR (backend), 5–7 in a second PR (UX). Both behind the existing license/plan gates — no new feature flag needed since this is corrective, not additive.

---

## Out of scope

- Auto-enabling the firehose plugin on the user's broker (would require admin AMQP credentials + `rabbitmqctl` access — too invasive).
- Granular per-vhost capability detection beyond firehose presence. We pick the workspace's primary vhost for now; multi-vhost matrix is a follow-up.
- Telling the user *which features they would unlock by upgrading their RabbitMQ version*. Could be a marketing growth lever later — not a v1 concern.
