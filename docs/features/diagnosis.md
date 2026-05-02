# Incident Diagnosis Engine

The diagnosis engine evaluates a registry of rules against pre-computed
broker signals every five minutes and surfaces actionable findings on the
**Diagnosis** page. Each rule is a sync pure function that consumes
`IncidentSignals` (queue snapshots, broker nodes, connections, channels,
queue metadata) and emits zero or more `IncidentDiagnosis` rows.

This page is the operator-facing rule catalogue. For the architecture and
slicing strategy, see `docs/plans/diagnosis-rules-sourcing.md`.

## How rules fire

Every rule has a citation (`meta.sourceUrl`) on a small allowlist of
canonical RabbitMQ sources. The registry rejects rules without a
citation at boot — there is no "legacy" escape hatch. When a rule
fires:

1. The finding is appended to the in-memory result.
2. The cascade-collapse pass marks symptoms whose cause is also firing
   (see `MEMORY_ALARM_ACTIVE` / `DISK_ALARM_ACTIVE` →
   `PUBLISHER_FLOW_CONTROL`).
3. The dedup pass upserts a row in `incident_diagnosis_records` keyed
   by `(serverId, fingerprint)` where `fingerprint = SHA256(scope,
   ruleId, queueName, vhost)` (NUL-separated). Re-firing bumps `lastSeenAt`; first firing
   sets `firstSeenAt`.
4. The cleanup pass marks records resolved when their `lastSeenAt` is
   older than the dedup TTL (5 min).

## Per-workspace kill switch

Operators can silence a misbehaving rule for one workspace without a
release by inserting a row in `diagnosis_rule_configs` with `enabled =
false`. Default-enabled, opt-out semantics — a missing row means the
rule fires.

## Dry-run mode

`diagnoseServer(serverId, workspaceId, windowMinutes, { dryRun: true })`
runs every rule against live signals but bypasses both the cache and the
fingerprint persistence. Use it to tune thresholds before promoting a rule.

## Rule catalogue

### Queue-scoped (snapshot-driven)

| Rule | Severity | Source | What it detects |
|---|---|---|---|
| `CONSUMER_CRASH` | CRITICAL | [`/docs/consumers`](https://www.rabbitmq.com/docs/consumers) | All consumers dropped while messages remain on a queue. |
| `SLOW_CONSUMER` | HIGH | [`/docs/consumer-prefetch`](https://www.rabbitmq.com/docs/consumer-prefetch) | Consume rate persistently below publish rate. |
| `QUEUE_BACKLOG` | HIGH | [`/docs/queues`](https://www.rabbitmq.com/docs/queues) | Queue depth growing more than 20% (or absolute > 1k from zero). |
| `PRODUCER_SPIKE` | MEDIUM | [`/docs/flow-control`](https://www.rabbitmq.com/docs/flow-control) | Publish rate spiked to ≥ 3× the recent average. |
| `QUEUE_DRAIN_STALL` | MEDIUM | [`/docs/consumers`](https://www.rabbitmq.com/docs/consumers) | Queue drained then plateaued at > 0 messages. |
| `NO_ACTIVITY` | LOW | [`/docs/management`](https://www.rabbitmq.com/docs/management) | Queue had publish/consume activity then went silent with messages remaining. |

### Broker-scoped Tier A — alarm and flow-control cascade

| Rule | Severity | Source | What it detects |
|---|---|---|---|
| `MEMORY_ALARM_ACTIVE` | CRITICAL | [`/docs/memory-use`](https://www.rabbitmq.com/docs/memory-use) | Any node has `mem_alarm: true`. Supersedes `PUBLISHER_FLOW_CONTROL`. |
| `DISK_ALARM_ACTIVE` | CRITICAL | [`/docs/disk-alarms`](https://www.rabbitmq.com/docs/disk-alarms) | Any node has `disk_free_alarm: true`. Supersedes `PUBLISHER_FLOW_CONTROL`. |
| `PUBLISHER_FLOW_CONTROL` | HIGH | [`/docs/flow-control`](https://www.rabbitmq.com/docs/flow-control) | Connections in `flow`, `blocked`, or `blocking` state. |
| `CHANNEL_LEAK` | MEDIUM | [`/docs/channels`](https://www.rabbitmq.com/docs/channels) | Single connection holding ≥ 200 channels. |

### Queue-scoped Tier A — structural

| Rule | Severity | Source | What it detects |
|---|---|---|---|
| `NO_CONSUMER_PERSISTENT_QUEUE` | HIGH | [`/docs/queues`](https://www.rabbitmq.com/docs/queues) | Durable queue with persistent messages and zero consumers across a 30-min window. |
| `QUEUE_NEAR_LENGTH_LIMIT` | HIGH | [`/docs/maxlength`](https://www.rabbitmq.com/docs/maxlength) | Queue depth within 5% of `x-max-length`. |
| `DLX_FILLING` | MEDIUM | [`/docs/dlx`](https://www.rabbitmq.com/docs/dlx) | Dead-letter target queue accumulating ≥ 100 messages. |
| `CONSUMER_UTILIZATION_LOW` | MEDIUM | [`/docs/consumer-prefetch`](https://www.rabbitmq.com/docs/consumer-prefetch) | `consumer_utilisation < 30%` with backlog and consumers (RabbitMQ ≥ 3.11). |

### Tier B — capability-gated

These rules check `signals.brokerVersion.majorMinor` at evaluate time and
skip on older brokers. A workspace with mixed broker versions fires the
rule only on the brokers that support the feature.

| Rule | Min RMQ | Severity | Source | What it detects |
|---|---|---|---|---|
| `CLASSIC_QUEUE_V1_LARGE` | 3.10 | LOW | [`/docs/persistence-conf`](https://www.rabbitmq.com/docs/persistence-conf) | Classic CQv1 queue with > 100k messages — recommend CQv2 or quorum migration. |
| `QUORUM_LEADER_CHURN` | 3.8 | HIGH | [`/docs/quorum-queues`](https://www.rabbitmq.com/docs/quorum-queues) | Quorum queue with messages and zero consumers (proxy for wedged Raft cluster). |
| `STREAM_NO_OFFSET_TRACKING` | 3.9 | MEDIUM | [`/docs/streams`](https://www.rabbitmq.com/docs/streams) | Stream with consumers and ≥ 1k messages but accumulating depth. |

### Tier C — research candidates

Nine candidates have research notes under
`docs/research/diagnosis-rules/` (seven `needs-more-research`, two
`reject`). Each ends in a single `Decision: ship | reject |
needs-more-research` line. None are wired today; reasons are in
the per-note `Decision` block.

## Telemetry

PostHog events emitted from the diagnosis surface:

| Event | When | Properties |
|---|---|---|
| `diagnosis_feedback` | Operator clicks 👍 / 👎 on a finding | `ruleId`, `vote`, `severity`, `queueName`, `vhost` |

The `diagnosis_rule_fired` per-evaluation event is emitted from the
backend rule registry — see `apps/api/src/ee/services/incident/`. We
intentionally do not emit per-finding to avoid event-volume spikes
during long-running incidents (the dedup table is the source of truth
for "open since").
