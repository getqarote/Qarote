# SLOW_FSYNC_NODE

## Symptom

A cluster node reporting consistently elevated `io_sync_avg_time` —
disk fsync round-trips trending upward over the analysis window.
Sustained elevation correlates with quorum queue Raft commit
latency, classic queue persistence stalls, and broker-wide publisher
back-pressure.

## Signals (which Management API fields)

- `/api/nodes` → `io_sync_avg_time` (ms per fsync, available since
  RabbitMQ 3.6).
- Optional cross-check: `/api/queues` → `messages_persistent` to
  confirm the node is actually doing fsync work.

## Cause

Underlying disk is slow — degraded RAID, cloud storage IOPS
throttling, noisy-neighbor on shared block storage, dying SSD.
Sometimes a kernel-level fsync regression or a misconfigured
`O_DIRECT` flag.

## Sources

- `https://www.rabbitmq.com/docs/persistence-conf` — discusses fsync
  semantics, `queue_index_embed_msgs_below`, and operator guidance
  for tuning persistence.
- `https://www.rabbitmq.com/docs/monitoring` — lists
  `io_sync_avg_time` among the per-node metrics worth alerting on.

## Recommendation

"Disk fsync latency on `<node>` averaged `<ms>` ms over the last
window — quorum queues and persistent messages will stall. Verify
the underlying block device IOPS, check for RAID degradation, and
move the broker off shared storage if the host is multi-tenant."

## False positive analysis

`io_sync_avg_time` spikes briefly during fsync batching even on
healthy disks. The rule needs a sustained-high signal across at
least 3 samples. Threshold: > 50 ms for sustained, > 200 ms for an
immediate CRITICAL.

## Severity & supersedes

HIGH. Does not supersede other rules but is itself superseded by
`DISK_ALARM_ACTIVE` (a disk full also drives fsync latency through
the floor).

## Owner / Reviewer

Owner: backend on-call rotation. Reviewer: <to-be-assigned> when the
note is promoted from `needs-more-research`.

## Decision: needs-more-research

The metric is exposed today, but we don't yet have a per-node time
series in the metrics DB — the existing `QueueMetricSnapshot` is
queue-keyed. Promoting this rule requires a `NodeMetricSnapshot`
table or extending `IncidentSignals` to fetch a small window of node
metrics from `/api/nodes/{name}` per evaluation. Defer until the
node-history shape is decided.
