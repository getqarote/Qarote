# GLOBAL_QOS_USED

## Symptom

A channel uses global QoS (the `global: true` argument on
`basic.qos`). Deprecated in modern clients in favour of per-consumer
or per-channel QoS — in RabbitMQ, `global: true` shares a prefetch
limit across consumers on the same channel, with awkward fairness
semantics.

## Signals (which Management API fields)

- `/api/channels` → `prefetch_count`, `global_prefetch_count` (the
  per-channel shared window). `global_prefetch_count > 0`
  indicates a channel using global QoS.

## Cause

Old client library (pre-1.5 java amqp-client, pre-3 amqplib for
Node.js) defaulted to global. Modern clients default per-channel.
A codebase migrated forward but kept an old `prefetch(N, true)` call.

## Sources

- `https://www.rabbitmq.com/docs/consumer-prefetch#qos-global` —
  explicit deprecation note and fairness pitfalls.

## Recommendation

"Channel `<name>` (connection `<conn>`) uses global QoS — fairness
semantics are surprising and the mode is deprecated in modern
client libraries. Migrate to per-channel prefetch with `global:
false`."

## False positive analysis

Some legitimate use cases remain for legacy consumer setups with
multiple consumers on one channel, but they are rare in modern
deployments. Severity LOW makes the false-positive cost low.

## Severity & supersedes

LOW. No supersedes.

## Owner / Reviewer

Owner: <to-be-assigned>. Reviewer: <to-be-assigned>.

## Decision: needs-more-research

The field is in `/api/channels` already and `signals.channels` is
populated. We didn't include `prefetch_count` /
`global_prefetch_count` in the `ChannelSignal` slice — extending
the slice is one-line plus the rule. Trivial to ship, but classified
as `needs-more-research` because we don't have a clear LOW-severity
operator-feedback story yet (Tier A is HIGH/CRITICAL; LOW
diagnoses risk filling the dashboard with noise). Promote once the
DiagnosisCard "dismiss" flow lands.
