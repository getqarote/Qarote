# EXCHANGE_NO_BINDING

## Symptom

An exchange exists, has a non-zero publish rate, has zero bindings.
Messages are silently dropped (or DLX-routed if `mandatory: true`
was set on publish — almost never the case in practice).

## Signals (which Management API fields)

- `/api/exchanges` → list with `name`, `vhost`,
  `message_stats.publish_in_details.rate`.
- `/api/bindings/<vhost>` → bindings; filter by `source` to count
  per exchange.

## Cause

A producer was deployed before the consumer's binding declaration,
the consumer service was rolled back, or a topology-as-code
migration partially applied.

## Sources

- `https://www.rabbitmq.com/docs/publishers#unroutable` — covers
  `mandatory` flag and silent message drop on no-match exchanges.
- `https://www.rabbitmq.com/docs/exchanges` — explains binding
  resolution per exchange type.

## Recommendation

"Exchange `<name>` is receiving `<rate>` msg/s but has zero
bindings — every message is dropped silently (or DLX'd if
`mandatory` was set). Declare the missing binding or stop publishing."

## False positive analysis

The default exchange (`""`) and built-in exchanges (`amq.*`) often
have zero bindings by design — they MUST be filtered out. After
that, the rule is high-confidence: a publish-with-no-binding pattern
is either a bug or a config drift.

## Severity & supersedes

HIGH. No supersedes.

## Owner / Reviewer

Owner: <to-be-assigned>. Reviewer: <to-be-assigned>.

## Decision: needs-more-research

The signals are exposed, but `IncidentSignals` doesn't yet carry
exchanges or bindings — extending it adds two more Management API
calls per evaluation (`/api/exchanges`, `/api/bindings`). Cost is
acceptable but the addition deserves its own slice with the
node-metrics extension. Promote when the next signals expansion
lands.
