# NETWORK_PARTITION_HEALED

## Symptom

A node reports a non-empty `partitions` array in `/api/nodes`,
indicating the cluster has experienced (or is experiencing) a
network partition. RabbitMQ's `pause_minority` mode resolves
partitions automatically but a forensic record of the event matters
for post-incident triage.

## Signals (which Management API fields)

- `/api/nodes` → `partitions: string[]` per node. Empty when the
  node is partition-free.

## Cause

Network jitter, cloud-provider VPC route flap, switch reboot,
asymmetric NAT changes. With `pause_minority` enabled, a partition
self-heals once the majority is restored — but the operator wants
to know *that it happened*.

## Sources

- `https://www.rabbitmq.com/docs/partitions` — documents
  `pause_minority`, `autoheal`, and the `partitions` field.
- `https://www.rabbitmq.com/docs/clustering` — covers cluster
  membership and the partition lifecycle.

## Recommendation

"Network partition observed on `<node>` — peers `<peer-list>`.
Check VPC routes and switch logs for the timestamp range. If
recurring, raise `net_ticktime` from the default 60s on slow
networks."

## False positive analysis

The signal is binary and broker-reported — no false positives on
the detection side. The fire-once-per-event semantics need
fingerprint-based dedup (already shipped) so a partition that lasts
multiple poll cycles produces ONE record, not N.

## Severity & supersedes

HIGH. No supersedes.

## Owner / Reviewer

Owner: <to-be-assigned>. Reviewer: <to-be-assigned>.

## Decision: needs-more-research

The fire condition is straightforward, but the "healed" semantic in
the rule name suggests we want to fire AFTER the partition resolved
(retrospective notification) rather than during. That requires
detecting the transition from "partitioned" → "healed" across two
snapshots — implementable on top of the dedup table by checking
`resolvedAt` on the previous record. Defer until we have one
production partition event to validate against.
