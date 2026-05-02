# Plan: Unified "Messages" UX — Live Tap + Recorder

_Reviewed by Backend, Frontend, and Architecture agents. All blockers and concerns are incorporated. Depends on **ADR-002 (Feature Gate Composition)** and **`version-and-capability-gating.md`**._

## Why this plan exists

Today, observing message flow on a broker is split across two unrelated surfaces:

- **Spy** lives inside `QueueDetail` — `apps/app/src/components/QueueDetail/QueueSpy.tsx`, called via `spyOnQueue` (`apps/api/src/trpc/routers/rabbitmq/queues.ts:921`). Per-queue, ephemeral, no persistence.
- **Tracing** is a top-level page — `apps/app/src/pages/Tracing.tsx`, fed by the firehose service (`apps/api/src/ee/services/tracing/firehose.service.ts`). Vhost-wide, persisted in PostgreSQL, replayable.

For the user this is two mental models for *"show me the messages"*. Worse, when the `rabbitmq_tracing` plugin is not installed (or the user explicitly opts out of firehose for performance reasons), the Tracing page is dead and Spy is hidden inside a queue detail tab — the user doesn't know that the closest equivalent already exists.

We unify under a single concept: **Messages**. Two modes inside one page: **Live** (Spy mechanism) and **Recorded** (Firehose). Capability gating from `version-and-capability-gating.md` decides which modes are available, the user is told *why* if one is not.

This plan **does not delete** the underlying Spy or Firehose backends. They remain as-is. We restructure the surface, not the engine.

---

## Outcomes

1. One menu item: **Messages** (replaces "Tracing").
2. One page with a mode switcher: `Live` / `Recorded`.
3. Live mode works on every broker that exposes AMQP — no plugin required.
4. Recorded mode works only when the firehose is available, with a clear `FeatureUnavailableCard` otherwise (offers Live as the fallback).
5. The QueueDetail page keeps a "Tap this queue" entry that deep-links into Messages → Live, scoped to the queue. We don't rebuild the Spy UI in two places.
6. Free plan preview semantics from `premium-preview-and-retention.md` continue to apply — they slot into the unified component instead of two separate ones.

---

## Conceptual model

| Concept | Live mode | Recorded mode |
|---|---|---|
| Source | Per-queue spy (auto-delete queue replicating bindings) | Firehose (`amq.rabbitmq.trace`) → DB |
| Time | Now → forward only | Range query (last 24 h, custom) |
| Scope | Single queue or single binding pattern | Whole vhost |
| Persistence | None | Configurable retention |
| Cost on broker | Low (one ephemeral queue) | Moderate (firehose duplicates traffic) |
| Required broker capability | AMQP reachable | `rabbitmq_tracing` plugin enabled |

The mode switcher is the only thing the user thinks about. Everything else (filters, payload viewer, copy buttons, JSON formatting) is shared.

---

## Information architecture

Replace `apps/app/src/pages/Tracing.tsx` with `apps/app/src/pages/Messages.tsx`:

```text
/messages
  ├── ?mode=live   → LiveMessagesView   (default if firehose unavailable)
  ├── ?mode=recorded → RecordedMessagesView (default if firehose available)
  └── ?queue=<name>&vhost=<vh> → forces Live mode, scoped
```

Routes & nav:

- Rename the route in the app router from `/tracing` → `/messages`. Add a 301-style redirect inside the SPA (`<Navigate to="/messages" replace />`) so any bookmark survives.
- Sidebar entry text changes from "Tracing" to "Messages". i18n key: rename `nav.tracing` → `nav.messages` across `apps/app/public/locales/{en,fr,es,zh}`.
- Update the docs link `docs/features/tracing.md` to also be reachable as `docs/features/messages.md` (alias) — file rename is fine, just keep an old-name redirect on the docs site for one release.

QueueDetail integration:

- Today's `<QueueSpy>` component inside `QueueDetail.tsx` becomes a thin wrapper that opens `/messages?mode=live&queue=<name>&vhost=<vh>` in the same tab. We do **not** keep a duplicated Spy UI in QueueDetail — single source of truth for the messages experience.
- The "Tap this queue" button stays where it is (queue context page) — that's the natural discovery point.

---

## Component layout

```text
<MessagesPage>
  ├── <MessagesHeader>            (title, capability-aware mode switcher)
  ├── <MessagesFiltersBar>        (shared: exchange, routing key, payload contains, message id)
  └── <MessagesViewport>
       ├── <LiveMessagesView>     when mode=live
       │    ├── <LiveControlBar>  (queue picker, start/pause, autoscroll toggle)
       │    └── <MessageList />   (shared row component)
       │
       └── <RecordedMessagesView> when mode=recorded
            ├── <RecordedControlBar> (time range, infinite scroll cursor info)
            └── <MessageList />   (shared row component)
```

The mode switcher is the **only** mode-aware UI in the header. Everything else inside a mode is mode-specific but visually consistent (same row component, same payload viewer, same copy actions).

### Shared row component

`apps/app/src/components/messages/MessageRow.tsx` — replaces `TracingMessageRow.tsx` and `SpyMessageRow.tsx`. Per architecture review, **the wire types stay separate** (different domain entities, different lifetimes, different identifiers); the merge happens only at the React layer.

The row receives a `column-config` prop, not a discriminated union check inside JSX:

```ts
type ColumnConfig = {
  showRedelivered: boolean;     // live mode has it, recorded doesn't
  showRoutedQueues: boolean;    // recorded has it, live doesn't
  timestampMode: "wallclock" | "delta";
  // …
};

<MessageRow message={msg} columns={columns} />
```

Spy and TraceEvent each have their own normaliser → common `DisplayFields` → row renders. This keeps column alignment correct across rows in the same mode and lets either mode evolve independently. The unified row is more work than a discriminated union, but it's the only honest way to share without coupling.

**Keyboard nav**: arrow keys move row focus; `Enter` expands; `Esc` collapses; `c` copies payload (Radix `Tooltip` exposes the shortcut).

**Screen reader**: list has `role="log"` + `aria-live="polite"`. Live mode rate-limits announcements to 1/s to avoid flooding.

### Shared payload viewer

`apps/app/src/components/messages/PayloadViewer.tsx` — already exists in `tracing/`, move it up one directory to `messages/` and use from both modes.

---

### URL & redirect semantics (preserve query string)

`/tracing` → `/messages` redirect uses a custom component, **not** `<Navigate replace />` (which loses `location.search`):

```tsx
function TracingRedirect() {
  const loc = useLocation();
  return <Navigate to={{ pathname: "/messages", search: loc.search, hash: loc.hash }} replace />;
}
```

This preserves bookmarked filters and time ranges.

### Mode resolution race & flicker

When the user lands on `/messages` without `?mode=`:

1. While `useFeatureGate("message_recording")` is still loading: render a **mode-skeleton**, not a default mode (avoids flicker between Recorded and Live as the gate resolves).
2. Once the gate settles: pick the default (Recorded if available, else Live), call `navigate(?mode=<resolved>, { replace: true })` so the URL matches what the user sees. Back-button revisits land on the right mode.
3. If the URL `?mode=` is set but that mode is blocked, render `<FeatureGateCard>` for that mode with the gate's `fallback` (if any) as a one-click switch.

### Mode persistence

Last-used mode persisted in `localStorage` keyed by workspace: `qarote.messages.lastMode.{workspaceId}`. Returning users land in the mode they last used, overriding the capability-default but never overriding an explicit URL `?mode=`.

### Vhost in deep-links

`/messages?mode=live&queue=<name>&vhost=<vh>` — vhost names contain `/`. URL builder uses `encodeURIComponent`; route reader uses `decodeURIComponent` and validates `workspaceOwnsVhost(serverId, vhost)` server-side before subscribing.

### Mode switch lifecycle

Switching from Live → Recorded → Live restarts the tap (does not preserve the buffer). UI banner: *"Switching modes ends the current tap. New messages will appear after reconnecting."* Avoids confusion about why the buffer empties.

## Mode availability logic

Drives both the mode switcher and the empty-state copy. Implemented as a **thin wrapper around the generic `useFeatureGate` from ADR-002**, not a bespoke hook:

```ts
// apps/app/src/hooks/useMessagesAvailability.ts
export function useMessagesAvailability() {
  const live = useFeatureGate("message_tap");
  const recorded = useFeatureGate("message_recording");
  return { live, recorded };
}
```

`useFeatureGate` already composes capability + license + plan and returns a `FeatureGateResult`. We don't reinvent the composition here. Workspace-level config like `traceEnabled` (whether the user has clicked "Start Recording") is **not** part of the gate — it's UI state showing a "Start Recording" CTA inside an otherwise-available Recorded mode.

Decision table:

| `enabledPlugins` has `rabbitmq_tracing` | `traceEnabled` | `amqpReachable` | Live | Recorded |
|---|---|---|---|---|
| yes | yes | yes | available | available |
| yes | no | yes | available | available (with "click to start" CTA) |
| no | — | yes | available | unavailable (plugin missing) |
| — | — | no | unavailable (AMQP unreachable) | (irrelevant; broker is unreachable) |
| — | — | — when capability snapshot missing | unknown — show re-check CTA | unknown |

Default mode selection:
- If `recorded.available` → `recorded` (the more powerful mode).
- Else if `live.available` → `live`.
- Else show a full-page `FeatureUnavailableCard` explaining both modes are unavailable.

When the user explicitly picks a mode via URL, we honour it even if the *other* mode is the default — and if the picked mode is unavailable, we render the `FeatureUnavailableCard` for that mode with a "Switch to <other>" button when the other mode is available.

---

## Backend: minimal changes

Backend services stay where they are. We don't merge the firehose service with the Spy procedure — they have different lifecycles, different transports, different failure modes.

### Naming ontology — durable, no "Live" in the wire protocol

Per architecture review, "Live" is a UI label only. The wire protocol uses domain nouns:

| UI label | Wire (tRPC) | Underlying mechanism |
|---|---|---|
| **Live mode** | `messages.tap.*` | Per-queue Spy (ephemeral AMQP queue) |
| **Recorded mode** | `messages.recording.*` | Firehose persisted in DB |
| (Recorded mode, real-time view) | `messages.recording.subscribe` | Firehose live subscription, not a "Live tail" |

Specifically:
- `tracing.firehoseStatus` → `messages.recording.status`
- `tracing.liveTail` → `messages.recording.subscribe` (firehose live subscription, **never called "live"**)
- `tracing.query` → `messages.recording.query`
- `rabbitmq.spyOnQueue` → `messages.tap.subscribe`

### Router-level middleware re-application

Moving `spyOnQueue` out of the `rabbitmq.*` router silently drops any middleware composed at that router level (workspace ACL, server-belongs-to-workspace assertions, vhost ownership). When relocating to `messages.tap`, **explicitly re-apply** all those checks. Don't rely on inheritance from a router we're moving away from.

### tRPC alias mechanism (concrete)

> **Implementation note (2026-05):** the alias period below was abandoned during the build slice in favour of an atomic migration (per the "no legacy management; migrate everything at once" directive). The legacy `rabbitmq.tracing.*` and `rabbitmq.queues.spyOnQueue` mounts were removed in the same commit that shipped the new `messages.*` namespace; no alias procedures were created. The pseudocode below is preserved as the original plan but is **not** how the code is wired today (it also wouldn't compile — tRPC routers don't expose procedures as object properties for direct re-mount; you have to call the procedure builder per path or use `mergeRouters`).
>
> Shipped reality: see `apps/api/src/ee/trpc/routers/messages/{index,recording,tap}.ts` for the actual mount; `rabbitmq.tracing` and `rabbitmq.queues.spyOnQueue` no longer exist.

`@trpc/server` has no built-in alias. The original plan was to achieve "alias" by registering both paths pointing at the same handler factory:

```ts
// apps/api/src/trpc/routers/index.ts
const recordingRouter = createRecordingRouter();
export const appRouter = t.router({
  messages: t.router({ tap: tapRouter, recording: recordingRouter }),
  tracing: t.router({                          // alias for one minor release
    firehoseStatus: recordingRouter.status,
    liveTail: recordingRouter.subscribe,
    query: recordingRouter.query,
  }),
  rabbitmq: t.router({
    spyOnQueue: tapRouter.subscribe,           // alias for one minor release
    /* … */
  }),
});
```

> The snippet above is **invalid tRPC** (you cannot reference a router's individual procedures as `recordingRouter.status`). Had the alias period actually been implemented, the right pattern would have been either (a) extract resolvers into standalone functions called from both `messages.recording.status` and `tracing.firehoseStatus` definitions, or (b) `t.mergeRouters()` for whole-namespace composition. Documenting the correction here for posterity since CodeRabbit caught it.

Originally a middleware on each alias procedure was meant to log `tracing.alias_called` with `{ caller, ip, userAgent }` so PR-C (cleanup) was data-driven.

**Alias lifetime (originally planned): 2 minor releases**, not 1 — gives external integrations a buffer. Listed in `CHANGELOG.md` under "Deprecated" at PR-A and "Breaking" at PR-C.

### WebSocket / SSE channel names stay stable

The real-time channel namespace is **not renamed** in PR-A or PR-B. Renaming would break tabs open during deploy. Today's wire identifier is the literal string `tracing.liveTail` (used by tRPC subscription routing); keep that exact value on the wire regardless of the tRPC procedure name. Any change to this identifier is a separate breaking change requiring a deprecation window.

### Streaming preview enforcement

`messages.tap.subscribe` is a streaming subscription. Server-side preview enforcement for FREE plan: emit a final `{ kind: "preview_limit", hiddenCountFromHere: -1 }` envelope after `FREE_SPY_PREVIEW_COUNT` messages, then close. Same pattern for `messages.recording.subscribe`. Frontend's `MessageList` renders the banner when it sees that envelope.

### Resource ceilings (server-side)

- Concurrent `messages.tap` subscriptions per workspace: hard cap of 3 (`MAX_CONCURRENT_TAPS_PER_WORKSPACE` in `tap.ts`), regardless of plan. Excess subscriptions receive `kind: "blocked", blockedBy: "plan"` per ADR-002.
- Per-tap max duration: 30 min. After that, the server gracefully closes the subscription with a `kind: "tap_timeout"` envelope; UI offers one-click resume.
- Mode-switch debounce: 1 s — prevents flapping subscriptions when the user toggles fast.

### Capability composition

`messages.tap` and `messages.recording` procedures call `resolveFeatureGate(ctx, feature)` (ADR-002). Capability-axis comes first; if `messages.recording` is blocked by missing firehose, the gate's `fallback` populates `messages.tap`, and the UI offers Live mode automatically.

### Authorization hardening

Today `spyOnQueue` is `workspaceProcedure` — extend to also assert read role on the queue's vhost. A workspace member with read-only role currently can tap any queue; restrict to vhosts they have access to.

---

## i18n

New namespace: `messages` (replaces `tracing`). Gate-related strings live in the shared `gate` namespace per ADR-002, **not** here.

- **Codemod, not manual rename.** Tooling: `i18next-parser` extracts keys; a small migration script renames `nav.tracing` → `nav.messages` and copies values across all four locales. Manual rename across 4 locale files mid-flight (with current uncommitted changes in `tracing.json`) would be error-prone.
- **Coordinate with in-flight work.** Per `git status`, locale `tracing.json` files have uncommitted modifications. PR-A waits until those land or rebases on top.
- **Keep `tracing` namespace as alias-load for one release.** `i18next` can be configured to fall back from `messages.foo` to `tracing.foo` during the transition, suppressing `missingKey` warnings.
- **CI parity check.** A new GitHub Actions step runs `i18next-parser` and fails the build if any of `en`, `es`, `fr`, `zh` is missing keys present in another. Added once, applies to all future i18n work — covers `messages`, `gate`, and existing namespaces.
- Languages: en, es, fr, zh (existing four).
- Active-route highlight in `AppSidebar.tsx` matches both `/tracing` (alias period) and `/messages`.

Naming convention inside the namespace:

```text
messages.modes.live.label
messages.modes.live.description
messages.modes.recorded.label
messages.modes.recorded.description
messages.empty.bothUnavailable
messages.empty.recordedUnavailable.fallbackToLive
messages.empty.liveUnavailable.fallbackToRecorded
```

---

## Free-plan preview integration

The preview pattern from `premium-preview-and-retention.md` already exists for both Tracing and Spy. After unification:

- Live mode preview: `FREE_SPY_PREVIEW_COUNT` (existing constant) — applies on the Live tap server-side.
- Recorded mode preview: `FREE_TRACE_PREVIEW_COUNT` (existing constant) — applies on the Recorded query server-side.

The preview banner is rendered by the shared `MessageList` component when the response carries `isPreview: true`, so we have one banner UI, not two.

---

## Onboarding & education

First-time visit on the Messages page (per workspace, persisted in `localStorage`):

- A two-card welcome banner: *"Two ways to inspect messages — pick a mode anytime."* Each card has the mode name, a one-liner, and an "i" tooltip pointing at docs.
- Dismissable; never re-shown after dismissal for that workspace.

This is a small but important UX investment because we're collapsing two existing concepts the user may have already learned. Operators who knew "Tracing" need to be reassured the recorder is still there; operators who knew "Spy" need to discover the upgrade path.

---

## Documentation

- New page `docs/features/messages.md` — explains the two modes, when to use each, capability prerequisites.
- Existing `docs/features/tracing.md` — kept, with a banner at top: *"Tracing is now the Recorded mode of Messages."* Links to the new page.
- Update `docs/FEATURE_COMPARISON.md` — replace "Tracing" row with "Messages", note that Live mode is available on all editions/brokers, Recorded requires the firehose plugin and a paid plan.
- Update marketing copy (`apps/web/`) where "Message Spy" or "Tracing" appear as separate pillars — present them as one pillar "Messages" with two modes. (Out of scope of code, but listed here so it's not forgotten.)

---

## Migration & rollout

**Hard prerequisites in order**: ADR-002 implementation → `version-and-capability-gating.md` PR-A. Only then this plan starts.

Single PR strategy is too big. Split:

1. **PR A — backend rename + alias.** New tRPC namespaces `messages.tap.*`, `messages.recording.*`. Aliases registered for `tracing.*` and `rabbitmq.spyOnQueue`. Alias procedures log deprecation hits with `{ caller, ip, userAgent }`. No UI change. No user-visible change. Capability preconditions consume the resolver from `version-and-capability-gating.md`.

2. **PR B — unified page.** New `Messages.tsx`, mode switcher (Radix `Tabs` with mobile overflow scroll, not a desktop-only segmented control), shared `MessageRow` with `column-config`. Old `/tracing` route renders `<TracingRedirect>` (preserves query string). `QueueSpy` becomes a deep-link launcher. i18n codemod. Onboarding banner persisted as `qarote.messages.onboarded.{workspaceId}` in localStorage; dismissal logged to PostHog. **PR-B does not delete `tracing` i18n keys** — alias-load fallback keeps them live until PR-C.

3. **PR C — cleanup.** Driven by alias-hit telemetry: only delete a tRPC alias when the deprecation log shows zero hits over the last release window. Remove `Tracing.tsx`, remove `tracing` i18n namespace. Ship **two** minor releases after PR-B (per architecture review — gives external integrations a buffer).

Cross-page links updated in PR-B:
- Diagnosis recommendations referencing "Spy" → deep-link `/messages?mode=live&queue=<name>&vhost=<vh>`.
- Marketing copy on `apps/web/` is tracked as a coordinated launch dependency (separate PR), not a footnote.

Feature flag is **not** required — these are pure UX changes on top of stable backends. Risk is contained to navigation and naming, not data.

---

## Acceptance criteria

- `/tracing?…` redirects to `/messages?…` preserving query string; mode auto-selected after gate resolution (no flicker).
- A user on RabbitMQ without `rabbitmq_tracing` enabled sees Live mode active by default, with `<FeatureGateCard>` explaining (in their language) why Recorded mode is unavailable and a "Switch to Live" CTA.
- A user with both modes available sees Recorded by default (or their last-used mode from localStorage) and can switch to Live in one click.
- `QueueDetail` "Tap this queue" navigates to `/messages?mode=live&queue=…&vhost=…` and the live tap starts immediately.
- One `MessageRow`, one `PayloadViewer` in the codebase. `SpyMessageRow.tsx`, `TracingMessageRow.tsx`, `tracing/PayloadViewer.tsx` deleted in PR-C.
- All four locales (en, es, fr, zh) populated; CI key-parity check passes.
- Free-plan preview banners still appear, with the same counts; streaming preview enforced server-side via final envelope.
- Concurrent tap cap and 30 min duration enforced server-side; UI shows a graceful "resume" affordance on timeout.
- Diagnosis cards' "Spy"-referencing recommendations deep-link into the new route.
- PostHog events emitted: `messages_mode_switched`, `messages_onboarding_dismissed`, `tracing_alias_called`.

---

## Out of scope

- Writing back to the broker (publish from the UI, requeue from the recorder). Read-only by design.
- Cross-broker correlation (federated traces). Single-broker view continues.
- Stream-specific live tap (today Spy can't tail a stream — that's a capability error, not a UX problem; this plan inherits the existing limitation).
- Search-as-you-type across recorded payloads (full-text search on `traceEvents.payload`) — separate plan, depends on schema and indexing decisions.
