# Plan: Sourcing the Incident Diagnosis Engine from Real-World RabbitMQ Failures

_Reviewed by Backend, Frontend, and Architecture agents. All blockers and concerns are incorporated. Depends on **ADR-002 (Feature Gate Composition)** and **`version-and-capability-gating.md`**._

## Why this plan exists

The Diagnosis Engine (`apps/api/src/ee/services/incident/`) ships with 6 rules: `consumer-crash`, `slow-consumer`, `queue-backlog`, `producer-spike`, `queue-drain-stall`, `no-activity`. They are derived from observable metrics — none are hallucinated. But every rule we add from now on multiplies the risk of:

- **Inventing patterns** that "feel right" but don't match how RabbitMQ actually fails in production.
- **Generic recommendations** ("investigate further", "check your consumers") that don't help the operator on call at 3 AM.
- **Diagnosing things we can't actually detect** from Management API polling.

This plan establishes a research-driven pipeline to add ~15 more rules, each tied to documented RabbitMQ behaviour and real operator pain.

---

## Corpus

We pull from four sources, in order of authority:

### 1. Official RabbitMQ documentation (highest weight)

Pages we treat as canonical for failure modes:

- `rabbitmq.com/docs/alarms` — memory & disk alarms, flow control mechanics
- `rabbitmq.com/docs/flow-control` — when publishers get blocked
- `rabbitmq.com/docs/memory-use` — what consumes memory, how to diagnose
- `rabbitmq.com/docs/persistence-conf` — fsync semantics, paging
- `rabbitmq.com/docs/quorum-queues` — Raft-specific failure modes (leader churn, log compaction)
- `rabbitmq.com/docs/streams` — stream-specific operational concerns
- `rabbitmq.com/docs/connections` and `/channels` — connection / channel lifecycle and limits
- `rabbitmq.com/docs/networking` — partition handling, `pause_minority` mode
- `rabbitmq.com/docs/cluster-formation` — split-brain scenarios
- `rabbitmq.com/docs/consumer-priority`, `/consumer-prefetch` — qos / prefetch pitfalls

Anything we claim a rule detects must trace to one of these pages.

### 2. RabbitMQ GitHub issues (`rabbitmq/rabbitmq-server`)

Filter: `is:issue is:closed label:bug` and `label:question` from the last 4 years, sorted by reaction count. We're looking for *recurring* incidents, not one-offs.

Tooling: `gh api graphql` query that pulls top 200, exports to JSONL with title + body + comments. We don't redistribute the corpus — it's a research artefact in `docs/research/diagnosis-corpus/` (gitignored or kept summarised, see "Output format" below).

### 3. Stack Overflow

Tags: `rabbitmq`, `rabbitmq-management`, `amqp`, `spring-amqp`. Top 500 questions by votes, plus all questions with > 5 answers (signals controversy / common confusion).

Mining via the SO public dump or Stack Exchange Data Explorer (SQL queries against the public schema, no scraping). One-shot pull, not continuous.

### 4. Mailing list & community forums

- `rabbitmq-users` Google Group archives (read-only HTML, parseable).
- `groups.google.com/g/rabbitmq-users` — same group, different surface.
- `discord.com/channels/...` — RabbitMQ Discord, "operations" channel — manual review only, low priority.

---

## Methodology: the rule qualification gate

Every candidate rule must answer four questions. **A "no" on any question kills the rule.**

1. **Symptom — observable from Management API polling?**
   We poll `/api/queues`, `/api/nodes`, `/api/connections`, `/api/channels`, `/api/exchanges`, `/api/overview`. If the symptom requires log access, AMQP method tracing, Erlang shell, or the firehose, the rule does not belong in the polling-based engine. (It might belong in a future log-ingestion engine — not this one.)

2. **Cause — documented?**
   Cite a URL: official docs, GitHub issue, or SO answer with > 20 upvotes. If the only evidence is a blog post from 2014, downgrade to "candidate" and mark for further research.

3. **Recommendation — actionable in < 5 minutes?**
   "Investigate further" is not a recommendation. "Check that the consumer container is running and reconnecting; if your consumers use prefetch=1, raise it to 50–100 to amortise network round-trips" is. Recommendations should reference specific RabbitMQ commands, config knobs, or client patterns when relevant.

4. **False positive cost — bounded?**
   What's the worst case if we fire this rule and we're wrong? If the operator chases a phantom incident for 30 min, that's bad but tolerable. If they restart a node and lose unack'd messages, the rule needs much stronger signal. Set severity accordingly.

---

## Engine architecture changes (preconditions for sourcing)

Adding 15 rules to a flat array doesn't scale. The plan ships these structural changes **before** the new rules:

### Citations live on the rule, not the finding

Per architecture review: citations are *static* (one rule, one canonical source). Storing `sourceUrl` and `sourceQuotedFact` on every `IncidentDiagnosis` row in DB duplicates data and forces a migration to update a citation. Instead:

- Each `Rule` exports `meta: { id, sourceUrl, sourceQuotedFactKey, severity, … }`.
- `IncidentDiagnosis` gains `ruleId: RuleId` (FK-like enum) — the UI joins rule metadata at render time.
- `IncidentDiagnosis` does **not** carry citation strings.

### Domain allowlist for `sourceUrl`

`sourceUrl` validated at **rule-registration time** against an allowlist: `rabbitmq.com`, `github.com/rabbitmq`, `stackoverflow.com`, `groups.google.com/g/rabbitmq-users`. Rules with off-domain URLs fail to register (caught in tests, never deployed). Prevents future drift to "some blog post."

### Rule registry replaces flat `RULES` array

```ts
// apps/api/src/ee/services/incident/rule-registry.ts
export interface Rule {
  meta: RuleMeta;
  evaluate(ctx: RuleContext): IncidentDiagnosis[];
  // Per-snapshot capability gate (architecture review: runtime, not startup)
  appliesTo?(caps: CapabilitySnapshot, server: Server): boolean;
}
const registry = new Map<RuleId, Rule>();
export function registerRule(rule: Rule): void;
```

Each rule lives in its own file and self-registers via import. The diagnosis service iterates `registry.values()` per-broker, calling `appliesTo` first.

### Per-rule kill-switch without redeploy

A new `DiagnosisRuleConfig` table:

```prisma
model DiagnosisRuleConfig {
  workspaceId String
  ruleId      String
  enabled     Boolean @default(true)
  // Future: per-rule threshold overrides
  @@id([workspaceId, ruleId])
}
```

Support can disable a misbehaving rule for one workspace without a release. Default-enabled, opt-out semantics. UI exposed eventually; for now it's an admin-tooling surface.

### Shared `IncidentSignals` precomputed object

Today every rule does its own DB queries. At 21 rules with multiple queries each, the engine becomes a slow tRPC procedure (per backend review).

Single precompute pass per `diagnoseServer` call:

```ts
type IncidentSignals = {
  alarms: AlarmState[];           // /api/nodes
  connections: ConnectionState[]; // /api/connections
  channels: ChannelState[];       // /api/channels
  queueWindows: QueueWindow[];    // existing
  policies: PolicyState[];        // /api/policies
  // …
};
```

Rules consume `IncidentSignals` synchronously — no rule does its own DB query. 3.5× rule count → near-flat cost.

### Capability gating per-snapshot

Tier B rules call `resolveCapabilityAxis(rule.feature, caps)` at evaluate time, NOT at startup. A workspace with mixed brokers (RMQ 3.7 + 4.0) must fire `QUORUM_LEADER_CHURN` on the 4.0 broker only.

### Fingerprint + dedup

A rule firing every poll for an hour produces 60 identical findings. New `IncidentDiagnosis.fingerprint` column (hash of `ruleId + queueName + vhost + dimension`) + upsert semantics: re-firing within a TTL window updates `lastSeenAt` instead of creating a new row.

### Cascade collapsing (supersedes)

`MEMORY_ALARM_ACTIVE` causes `PUBLISHER_FLOW_CONTROL`. Two findings, one incident. Each rule declares `meta.supersedes: RuleId[]`. Post-pass collapses superseded findings under their cause; UI renders a "Caused by: Memory alarm" footer on the suppressed findings (still visible, but visually subordinate).

### `dryRun` mode

`diagnoseServer({ dryRun: true, lookbackDays: 7 })` runs all rules over historical snapshots and reports what *would* have fired, with no DB writes. Invaluable for tuning thresholds before a rule goes live.

### Rule output → alerts integration

New `meta.alertable: boolean` flag. Default `false` for new rules (diagnosis surface only). Promoting a rule to alerting is a deliberate, per-rule decision — prevents 21 new rules silently flooding the alerting pipeline.

### Backfill semantics

When a new rule ships: **future-only by default**. Backfilling all rules across workspace history would be a load event. A separate admin action runs backfill per-workspace on demand.

### i18n decision (recommendations)

Recommendation strings remain **English-only** for v1 — they reference RabbitMQ commands, config knobs, and AMQP terminology that operators read in English regardless of locale. Documented explicitly in this plan; revisit if zh/fr/es operators report friction. Rule names (e.g. `Publisher flow control`) ARE localised in the `diagnosis` i18n namespace.

---

## Candidate rule catalogue (20)

Format below: **NAME** — symptom (signals) · cause (citation type) · severity · recommendation summary.

### Tier A — high confidence, ship in the first sourcing batch

1. **PUBLISHER_FLOW_CONTROL** — `connection.state === "flow"` on `/api/connections` for ≥ 60 s · cause: memory or disk alarm on a node, well-documented (`rabbitmq.com/docs/flow-control`) · HIGH · supersedes itself when `MEMORY_ALARM_ACTIVE` or `DISK_ALARM_ACTIVE` fires · "Publishers are blocked. Find the alarm with `rabbitmqctl list_alarms` and reduce memory pressure."

2. **MEMORY_ALARM_ACTIVE** — `node.mem_alarm === true` · cause: memory watermark crossed (`rabbitmq.com/docs/memory-use`) · CRITICAL · "Free memory or raise `vm_memory_high_watermark`. Identify top queues by memory with `rabbitmqctl list_queues memory`."

3. **DISK_ALARM_ACTIVE** — `node.disk_free_alarm === true` · cause: disk space below `disk_free_limit` · CRITICAL · "Disk alarm blocks all publishers. Free disk or raise `disk_free_limit`."

4. **CHANNEL_LEAK** — `channel_count` per connection growing monotonically across snapshots · cause: client app forgetting to close channels · MEDIUM · "Application is leaking channels. Channels should be reused or explicitly closed; never one-channel-per-message."

5. **NO_CONSUMER_PERSISTENT_QUEUE** — durable queue, persistent messages, `consumerCount === 0` for ≥ 30 min · cause: consumer service down or mis-deployed · HIGH · "Persistent queue has no consumers. Verify the consumer service is running and bound to the right vhost / queue name."

6. **QUEUE_NEAR_LENGTH_LIMIT** — `messages` close to `x-max-length` (within 5 %) · cause: producer about to overflow, drops imminent · HIGH · "Queue is near its max length. Messages will be dropped (or DLX'd) once full. Increase consumers or raise the limit."

7. **DLX_FILLING** — queue with `messages > 0` AND target of at least one other queue's `x-dead-letter-exchange` policy growing while source queues are healthy · cause: poison messages or schema mismatch · MEDIUM · "Dead-letter queue is accumulating. Inspect a few messages with Live tap to find the rejection cause." **(Heuristic on queue name removed per backend review — structural signal only.)**

8. **CONSUMER_UTILIZATION_LOW** — `consumerUtilisation < 0.3` sustained on a backlogged queue · cause: prefetch too low, RTT-bound throughput · MEDIUM · "Consumers are waiting on the network, not on work. Raise prefetch from 1 to 50–100."

**Demoted from Tier A → Tier C (per backend review)**:
- `UNACKED_GROWING_NO_REDELIVERY` — `redelivered` is a per-delivery flag, not a queue counter; not all RMQ versions expose `message_stats.redeliver_count`. Needs version-availability research before re-promoting.
- `CONNECTION_CHURN` — sub-second resolution required, but `queueMetricSnapshot` cadence is minute-level. Reformulate using `connection_created_details.rate` over a 1-min window or drop.

Tier A ships **8 rules**, not 10. Reasoning: ship correct rules, not a number.

### Tier B — useful but need broker-version checks

1. **QUORUM_LEADER_CHURN** — leader changes > 3 in 1 h on a quorum queue · cause: network instability, slow disk, Raft timeout (RMQ ≥ 3.8) · HIGH · "Quorum leader is flapping. Check `net_ticktime`, disk latency, and node CPU."

2. **STREAM_NO_OFFSET_TRACKING** — stream consumer with no recorded offset and growing `committed_chunk_id` lag · cause: consumer not committing offsets · MEDIUM · "Stream consumer is not tracking offsets. On reconnect it will replay everything or skip everything depending on policy."

3. **CLASSIC_QUEUE_V1_LARGE** — classic queue with `messages > 100k` and `storage_version === 1` (RMQ ≥ 3.10) · cause: legacy CQv1 has worse memory profile under load · LOW · "Migrate this queue to CQv2 (`x-queue-version: 2`) or to a quorum queue for better memory behaviour."

### Tier C — candidates pending corpus research

1. **SLOW_FSYNC_NODE** — node with consistently elevated `io_sync_avg_time` · need: confirm threshold from docs/issues.
2. **POLICY_MISMATCH** — queues without expected HA / quorum policies applied · need: design how user declares "expected" (new persisted config — postpone until we have a clear UX for declaring expectations).
3. **NETWORK_PARTITION_HEALED** — `partitions` was non-empty in last 24 h (read from `/api/nodes`) · need: clarify reporting since partition healing is itself an event.
4. **EXCHANGE_NO_BINDING** — exchange exists, has publishes, has zero bindings · cause: messages dropped silently (or dead-lettered if `mandatory` set) · medium-low · need: confirm publish-rate detectability per exchange.
5. **TLS_HANDSHAKE_FAILURES_RISING** — derived from `auth_attempts` endpoint · need: check availability across versions.
6. **GLOBAL_QOS_USED** — channels using global QoS (deprecated in modern clients) · need: verify field is exposed in `/api/channels`.
7. **BINDING_EXPLOSION** — exchange with > 1000 bindings, growth pattern · cause: app dynamically binding without cleanup · need: confirm performance threshold from docs.
8. **UNACKED_GROWING_NO_REDELIVERY** *(demoted from Tier A)* — needs research on which RMQ versions expose `message_stats.redeliver_count`.
9. **CONNECTION_CHURN** *(demoted from Tier A)* — reformulate using `connection_created_details.rate` over a 1-minute window.

Tier C is what point 4 of the original conversation is meant to validate — corpus research either promotes them to Tier A/B or kills them.

---

## Workflow

For each rule in Tier C, and for any new rule proposed later:

1. **Research note** — a markdown file under `docs/research/diagnosis-rules/<rule-name>.md`, structured:

   ```md
   ## Symptom
   ## Signals (which Management API fields)
   ## Cause
   ## Sources (must be on the allowlist)
     - <url> — one-line summary of relevance
   ## Recommendation
   ## False positive analysis
   ## Severity & supersedes
   ## Owner / Reviewer (named — research notes require sign-off, not just an author)
   ## Decision: ship | reject | needs-more-research
   ```


2. **Implementation** — only after the research note is approved. Code in `apps/api/src/ee/services/incident/rules/<name>.rule.ts`, self-registered via `registerRule(...)`.

3. **Test** — fixture-based, manifest-driven (per backend review). Single test runner over `__tests__/fixtures/<rule-name>/{positive,control,insufficient}.json`, not 60+ hand-written test files.

4. **Citation** — `sourceUrl` validated against the allowlist at registration time. PR blocked at CI if the domain is not allowlisted, not just by reviewer attention.

---

## Output format for the corpus

We do **not** check raw scraped data into the repo. What we check in:

- `docs/research/diagnosis-rules/*.md` — one note per investigated rule.
- `docs/research/diagnosis-corpus-summary.md` — top patterns extracted, with citation counts. Hand-curated.

Raw dumps live in a developer's local sandbox (or a private gist). Reproducible by re-running the SO Data Explorer queries and `gh` commands documented in the summary.

---

## Acceptance criteria for "Diagnosis sourcing v1 done"

- Engine architecture changes shipped: rule registry, `IncidentSignals` precompute, fingerprint dedup, supersedes collapsing, dryRun mode, `DiagnosisRuleConfig` table, citation domain allowlist.
- **8 Tier A rules** (not 10) implemented, tested, with citations on the rule meta. Split into two PRs to keep reviewable: A1 (memory/disk/flow alarms), A2 (queue/consumer/channel rules).
- 3 Tier B rules behind per-snapshot capability gates from `version-and-capability-gating.md`.
- Tier C rules each have a research note ending in `Decision: ship | reject | needs-more-research` with a named reviewer.
- UI:
  - `<DiagnosisCard>` shows a Radix `Collapsible` "Why this diagnosis?" disclosure (citation hidden by default to avoid pushing CTAs below the fold on mobile).
  - `Learn more →` external link with `target="_blank" rel="noopener noreferrer"` and an external-link icon (screen-reader announced).
  - Recommendation `<code>` snippets have inline copy buttons.
  - Source-domain favicon (12 px) next to citation as trust signal.
  - Rule ID rendered as a muted monospace tag (e.g. `PUBLISHER_FLOW_CONTROL`) — operators grep their runbooks for these.
  - "Was this diagnosis helpful?" thumb up/down → PostHog event `diagnosis_feedback` with `{ ruleId, vote }`. Drives Tier C decisions post-ship.
  - Severity remains the primary sort key; citation presence is a visual hint, never a ranking lever.
- `docs/features/diagnosis.md` lists every rule, its sources, and what an operator should do.
- PostHog: `diagnosis_rule_fired` per evaluation, `diagnosis_feedback` per UI interaction.

---

## Sequencing relative to the version-gating plan

This plan **depends on**:
1. **ADR-002** (feature gate composition) — for `resolveCapabilityAxis`.
2. `version-and-capability-gating.md` — for the capability snapshot Tier B rules consume.

Order of execution:

1. ADR-002 implementation PR.
2. Ship `version-and-capability-gating.md` plan (PR 1: backend; PR 2: UX).
3. **Engine architecture PR** (registry, signals, fingerprint, supersedes, dryRun, allowlist) — separate from rules, lands before any new rule.
4. Tier A1 PR (memory/disk/flow alarm rules).
5. Tier A2 PR (queue/consumer/channel rules).
6. Tier B PR (capability-gated rules).
7. Tier C decisions ongoing.

---

## Out of scope

- Log ingestion / parsing — would unlock another tier of rules but is a separate engine.
- ML-based anomaly detection — explicit, deterministic rules first; statistical layers later.
- Auto-remediation (e.g. "click here to raise watermark") — too risky without a broader confirmation flow.
- Multi-broker correlation (federation, shovels) — single-broker rules first.
