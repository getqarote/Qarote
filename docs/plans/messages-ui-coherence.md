# Plan: Messages Page UI Coherence

**Status:** Proposed
**Date:** 2026-05-07
**Author:** Brice
**Related:**
- [Plan: Firehose Stream Migration](./firehose-stream-migration.md) — backend phases this UI plan dovetails with
- [ADR-003: Firehose Message Loss](../adr/003-firehose-message-loss.md) — why honesty in UI copy matters

## Goal

The Messages page UI tells three different stories about the same feature. After an audit prompted by the Phase 2 backend rework, three classes of problem surfaced:

1. **Terminology drift.** Six words for overlapping concepts (Firehose, Tracing, Recording, Capture, Spy, Live), and "Live" used with three different meanings on the same page.
2. **Over-promising copy.** Strings like *"Messages will appear as they flow through the broker"* imply complete capture. Pre-Phase-2 this was a silent lie. Post-Phase-2 it is still misleading because the Firehose itself is best-effort by design.
3. **Missing health signals.** The backend Phase 2 makes broker queue depth and capture lag the canonical health signals — the UI surfaces neither.

This plan fixes those without inflating scope into a full redesign.

## Non-goals

- Backend changes (handled in `firehose-stream-migration.md`).
- New Spy / Tap functionality — Spy stays as it is, only its terminology / placement is touched.
- A full Messages-page redesign or layout change.
- Per-message payload capture (separate feature).

## Current state (audit findings)

### Terminology

| Term | Where it appears | Concept |
|---|---|---|
| **Firehose** | `FirehoseDisabledState`, `useFirehoseStatus`, `empty.firehose.*`, `confirmTitle: "Enable RabbitMQ Firehose?"` | The RabbitMQ broker mechanism (`amq.rabbitmq.trace`) |
| **Tracing** | i18n namespace `tracing`, `setTraceEnabled`, `useTraces`, `TracingMessageRow`, `useTracingFilters`, page comment "Message Tracing" | Sometimes the user feature, sometimes the broker setting |
| **Recording** | `useMessageRecording.ts`, `trpc.messages.recording.*`, `mode.recorded: "Recorded"` | The Qarote-side capture |
| **Capture** | `empty.firehose.description: "start capturing events"` | Synonym for recording |
| **Spy** | `mode.spy: "Live"` (button labeled Live but mode value is `spy`), `QueueSpy`, `LiveSpyContent`, `spy.queueLabel` | Per-queue tap, separate code path |
| **Live / Stream / Live Tail** | top-level button `mode.spy: "Live"`, sub-tab `mode.live: "Stream"`, tooltip `mode.tipLive: "Live Tail shows…"` | Three different surfaces all called "Live" |

### Concrete bugs and over-promises

- `payload.metadataOnly` ("Body not captured") is translated but **not rendered anywhere** in `PayloadViewer.tsx`. Users see an empty payload tab with no explanation.
- `live.description: "Messages will appear as they flow through the broker."` — implies completeness; firehose is sampled / best-effort by design.
- `mode.tipLive: "Live Tail shows messages flowing through the broker right now"` — same problem.
- `stats.published` / `stats.delivered` are presented as authoritative counts with no "captured" qualifier. If the recorder dropped events, the numbers undercount silently.
- `stats.retention: "Data kept for 7 days"` is hardcoded in copy. Retention is a backend setting that varies by tier.
- `live.errorTitle: "Lost connection to the stream"` conflates "tRPC subscription died" with "broker firehose stopped".

### Missing health surface

Currently shown: client-side `dropped` (subscription buffer evictions only), `totalReceived`, `events.length`. Nothing from the backend.

Not shown anywhere:
- Capture lag (broker timestamp vs ingestion).
- Broker queue depth for `qarote.trace.v2.*` (the Phase 2 canonical health signal).
- Server-reported drops (the subscription throws away `data.dropped` to avoid double-counting client-side drops, then never surfaces it).
- Worker / consumer health.

### Accessibility nits

- `live.dropped` Badge uses colour only; no `role="status"`, no `aria-live`.
- StatsBar is a row of `<span>`s with no semantic grouping (should be `<dl>`).
- `from`/`to` datetime-local inputs have no min/max, no validation when `from > to`, no warning when range exceeds retention.
- Pause button auto-disables when empty but `aria-label` doesn't communicate why.
- TracingMessageRow uses `<button>` containing truncate `<span>`s — screen reader announces concatenated text only.

## Decision: pick one word per concept

| Concept | Chosen term | Where else it may appear |
|---|---|---|
| The user feature in the product | **Tracing** | UI labels, tab names, page title |
| The RabbitMQ broker mechanism | **Firehose** | Only inside the enable-confirm dialog and admin docs |
| The captured stored data | (no UI term — call it **traces**) | DB rows are `MessageTraceEvent`, plural "traces" |
| The per-queue interactive tap (separate feature) | **Spy** | Stays as is, just no longer mislabelled "Live" |
| Real-time view of incoming traces | **Live tail** | Sub-tab inside Tracing |
| Historical query view | **History** | Sub-tab inside Tracing |

"Live" never appears as a standalone label — always paired ("Live tail"). "Recording" / "Capture" disappear from user-facing copy entirely. Internals (file names, hook names, tRPC routes) align where cheap; we do **not** rename Prisma models or tRPC namespaces in this plan because that ripples into mobile clients and migration scripts — out of scope.

## Phases

Two phases, independently shippable. Phase A is a self-contained coherence pass that can land immediately. Phase B depends on backend Phase 1 (tracing health snapshots) being live.

---

### Phase A — Coherence + honesty fixes (~1.5 days)

**Goal:** stop misleading users with terminology and copy. Fix the rendering bug. No new health surface yet.

#### A.1 Fix the `payload.metadataOnly` rendering bug

`PayloadViewer.tsx` translates the string but never renders it. Add the disclosure inside the empty body state. Estimate: 15 min including a snapshot test that the string is visible.

#### A.2 Terminology pass

Sweep the user-facing strings to use the chosen vocabulary. Concretely:

- `tracing.json`:
  - `mode.spy` (currently "Live") → split into a top-level mode label and a sub-tab label that don't share a key.
  - `mode.live` (currently "Stream") → "Live tail".
  - `mode.recorded` (currently "Recorded") → "Tracing" (or remove if the tab structure is reorganised — see A.3).
  - `mode.tipLive` → reword to clarify it's the Tracing live tail, not the Spy live tap.
  - `empty.firehose.*` keys: keep "Firehose" only inside the confirm dialog title; the surrounding copy uses "Tracing".
  - `live.description`, `live.errorTitle`, `live.errorHint` → reword to be honest about best-effort capture and to distinguish broker-side from client-side problems.
  - `stats.published`, `stats.delivered` → suffix label with "(captured)" or footnote so the numbers are not read as authoritative broker totals.
  - `stats.retention` → make it accept a `{{days}}` interpolation instead of a hard-coded "7".

- Component renames where the public name diverges from the new term:
  - `FirehoseDisabledState.tsx` → `TracingDisabledState.tsx`. Internal mention of "RabbitMQ Firehose" stays in the confirm dialog only.
  - Component-level `aria-label`s updated to match.

- File / hook / route renames are **out of scope**. The file is `Messages.tsx`, the component is `Tracing` — that's fine internally; only the *displayed* terminology is the problem.

#### A.3 Reorganise the mode toggle so "Live" never has two meanings

Today: top-level toggle has values `live` (= Spy) and `recorded` (= Tracing). Inside Recorded, sub-tabs `live` and `query` exist with their own meanings.

Proposed shape (no layout change, just labels and values):

```
[ Tracing ]  [ Spy ]            ← top level, named after features
  └── inside Tracing:  [ Live tail ]  [ History ]
```

The internal mode values stay (`spy`, `live`, etc.) to avoid breaking deep links and tests; only the **user-visible labels** change. If a value-rename is needed for clarity in code reviews, it goes in a follow-up.

#### A.4 Stats semantic + accessibility

- Wrap StatsBar in a `<dl>` with `<dt>` / `<dd>` pairs. Each stat gets a programmatic label.
- The `dropped` Badge gets `role="status"` and `aria-live="polite"` so screen-reader users hear about drops.
- The Pause button gets a contextual `aria-label` ("Pause stream" / "No events to pause").

#### A.5 Filter input validation

- Add `max` to the `from` datetime-local equal to current `to`, and vice versa.
- Surface a small validation message when the chosen range exceeds the workspace retention (use `useTracingRetention` or a similar existing hook; if none, expose a constant from the tier config).

#### A.6 "Tracing vs Spy" docs page + contextual links

Tracing and Spy answer different questions but the names alone don't make that obvious. A short docs page explains the difference; the UI links to it from the few surfaces where the distinction actually matters.

**Doc page — drafted.** Lives at `apps/web/src/content/docs/tracing-vs-spy.mdx`, served from `/docs/tracing-vs-spy/` (option 1 from earlier discussion: Astro static route, same domain, no new infra). Polished by the Technical Writer agent. Sections in order:

1. **One-sentence each** — *Tracing is your broker's audit log. Spy is a stethoscope on one queue.*
2. **At a glance** — comparison table.
3. **How they work** — two ASCII data-flow diagrams (rendered via Shiki `text` blocks, no Mermaid dependency) showing the parallel side-paths off the broker exchange.
4. **When to use which** — concrete bullets for Tracing-first, Spy-first, and combined workflows (with a payment-failure walkthrough as the worked example).
5. **Cost and impact** — explicit on Tracing's broker CPU overhead (5–15 % at high msg/s) and Postgres retention; explicit on Spy's zero-broker-cost / RAM-only nature. A `<Callout type="warning">` on Tracing's best-effort guarantee.
6. **Choosing in two questions** — "do you need the body? do you need the past?" — each with a bold verdict.
7. **Further reading** — link to the existing Spy reference page; pointer to in-app *Settings → Tracing*.

The page is one desktop screen (~520 words after the writer's polish). It does NOT cite ADR-003 or internal plan documents — the audience is operators, not Qarote contributors.

**Verified facts at draft time.** The Spy session lifecycle is `TAP_SESSION_TTL_MS = 90 s` with a 30 s heartbeat (see `apps/api/src/ee/trpc/routers/messages/tap.ts:105`); the page documents the session as "stays open while watched, expires 90 s after disconnect", not the previously-circulated "60 s" figure.

**UI link points** — small `?` icon or inline `Learn more →` link, never a wall of explanation in the UI itself:

- Next to the top-level `[ Tracing ] [ Spy ]` toggle, a `(?)` icon → opens a tiny popover with a one-liner of each + a `Read the full guide →` link to the docs page.
- In the Tracing **plugin_off** empty state, the body text ends with *"Looking for a way to inspect a single queue without enabling Firehose? Use Spy instead — [Learn more →]"*.
- In the Spy queue picker / empty state, mirror copy: *"Need history or broker-wide capture? Use Tracing — [Learn more →]"*.
- In the **Enable Firehose** confirm dialog, an inline *"What's the difference with Spy? →"* link as a second CTA next to Cancel/Enable, opening the docs in a new tab.

**Acceptance criteria**

- All four link points resolve to `/docs/tracing-vs-spy/` and the page renders with the diagrams un-collapsed (Shiki applies, no broken code-block).
- At least one link is reachable in two clicks from a fresh `/messages` visit (measure during Phase A QA).
- Tracking events fire on link clicks so we can see if anyone reads the page (signals whether the explanation actually helped).
- Open follow-ups resolved:
  - **Nav placement** — page stays under `section: "Messages"` only. The existing Spy CTA on the queue detail page already redirects users to `/messages`; cross-linking the docs page in the Queues nav would duplicate without adding discoverability.
  - **CPU benchmark sourcing** — no internal benchmark exists. The "5–15 % CPU at >10 k msg/s" figure stays as the conservative public estimate; revisit if a measured number becomes available.
  - **Diagram format** — migrate the two ASCII diagrams to Mermaid (decided: SVG output preferred). Implementation: client-side Mermaid via a small `<Mermaid />` Astro component in `apps/web/src/components/`, ships ~500 KB of mermaid runtime on the docs page only. Zero build-time dependency on Playwright/Puppeteer.

#### Acceptance criteria

- No user-facing string contains "Recording" or "Capture" (grep clean across the `app/` workspace).
- The word "Live" never appears alone as a label — always part of "Live tail" or "Live tap (Spy)".
- The empty payload tab visibly explains "Body not captured by tracing".
- Manual screen-reader pass on Messages page: drops, stats, mode toggle, and pause button are all announced with intent.
- A snapshot test asserts that the StatsBar uses `<dl>` markup.
- An i18n-completeness test asserts every key referenced from `Messages.tsx` and its children exists in `tracing.json` (already exists for many namespaces — extend if missing).

#### Risk

Low. All changes are presentational. No backend contract changes, no migration. Worst case: a few keys that other pages also reference need to be touched — they're inside the `tracing` namespace so the blast radius is clear.

---

### Phase B — Tracing health surface (~2 days)

**Goal:** make Phase 2's backpressure and Phase 1's metrics visible to the user. Replace the implicit "everything is fine" assumption with a continuous health signal.

**Prerequisite:** backend Phase 1 (`FirehoseHealthSnapshot` + `tracing.health.get` tRPC procedure) shipped. Without those, this phase has nothing to read.

#### B.1 Tracing health badge

A small status pill near the top of the Messages page (next to the Tracing / Spy toggle) showing `Healthy` / `Degraded` / `Unavailable`, derived from the latest snapshot.

States:

- **Healthy**: zero drops in the last hour, capture lag < 5 s, broker queue < 10 k.
- **Degraded**: any of: rolling 1 h drops > 0, lag ≥ 5 s, broker queue ≥ 10 k.
- **Unavailable**: capability snapshot says firehose plugin off, OR no snapshot in the last 5 minutes (worker likely down).

Click → opens a popover with the underlying numbers.

#### B.2 Lag and queue depth in StatsBar

Extend the existing StatsBar with two new stats:
- `Lag — 1.2 s` (capture delay)
- `Queue — 0` (broker-side backlog of unacked messages)

Both source from the latest `FirehoseHealthSnapshot` row.

#### B.3 Drop banner with "Why?"

When the snapshot shows non-zero drops in the rolling 1 h window, render an info banner above the messages list:
*"Tracing dropped N events in the last hour. [Why?]"*

The popover lists which loss vector was active during the window (parse failures, broker queue full, snapshot gap, etc.). Translate per-vector reasons in `tracing.json`.

#### B.4 Empty / disabled states refined

Today's `FirehoseDisabledState` (now `TracingDisabledState`) only knows about the RabbitMQ plugin being off. Add three additional states:

| State | Trigger | Copy |
|---|---|---|
| `plugin_off` | Capability says firehose unsupported | Existing copy + `rabbitmqctl trace_on` snippet |
| `plugin_off_per_vhost` | Plugin on cluster-wide but off on user's filtered vhost | List vhosts with status, highlight the filtered one |
| `consumer_down` | No snapshot in last 5 min | "Tracing worker not reporting — capture is paused. [Operator docs →]" |
| `pg_outage` | Snapshot exists but `flushFailures > 0` rising | "Tracing is queueing events but cannot flush them — check Postgres health." |

Each state has its own translation key + remediation hint.

#### B.5 Honest connection error split

`live.errorTitle: "Lost connection to the stream"` becomes two distinct messages:

- `live.error.subscription`: tRPC websocket dropped → "Reconnecting…" (auto-retry).
- `live.error.firehose`: backend reports the broker firehose stopped delivering → "Tracing has stopped capturing — investigate broker."

Backend already distinguishes; the UI just needs to pick the right key.

#### Acceptance criteria

- Disconnecting the firehose-worker process on a test broker flips the badge to `Unavailable` within 5 minutes and shows the `consumer_down` empty state.
- Inducing 1 k drops via a load test causes the rolling-1h drop banner to appear within 60 s of the next snapshot.
- The lag stat reflects actual capture delay (verify against a known broker timestamp).
- All four `TracingDisabledState` variants have screenshots in the visual review.
- No new backend routes — only consume `tracing.health.get`.

#### Risk

Low-to-medium. Hinges on the snapshot freshness contract. If snapshots are sometimes 90 s old in normal operation, the 5-minute "stale = unavailable" threshold may flap. Tune after Phase 1 is in production for a week.

---

## Rollout sequence

1. Phase A ships as a standalone PR — no backend dependency, can land immediately after backend Phase 2.
2. Backend Phase 1 (`FirehoseHealthSnapshot` etc.) ships per `firehose-stream-migration.md`.
3. Phase B ships once backend Phase 1 has been generating snapshots in staging for at least 48 h (so we know the freshness budget).

## Out of scope

- Renaming `MessageTraceEvent` Prisma model, `tracing` tRPC namespace, or hook file names. Pure naming churn with downstream blast radius; cosmetic only.
- Adding payload body capture. Different feature, different ADR.
- Spy redesign. Spy works; only its label changes (so it stops sharing the word "Live" with Tracing).
- Workspace-level retention configuration UI. Currently a tier-config constant; surfacing it as a per-workspace setting is its own scoping discussion.

## Open questions

1. The `mode.recorded` label currently reads "Recorded" — once we strip "Recording" from user vocabulary, the top-level toggle becomes `[ Tracing ] [ Spy ]`. But "Tracing" is also the page-level concept. Are we OK with the toggle visually reading `Tracing / Spy` and the page title also reading "Tracing"? Mild redundancy, but probably fine.
2. Should the drop banner be dismissable (per-session) or persistent until drops stop? Lean dismissable — operators have other things to look at — but worth confirming.
3. For `consumer_down` empty state, do we show the page in a degraded read-only mode (last-known events, greyed out) or a full empty state? Read-only is more useful for postmortem; full empty is clearer about state. Lean read-only.
