# BINDING_EXPLOSION

## Symptom

An exchange has > 1000 bindings AND the binding count is growing
across snapshots. Most often a bug where the application binds
dynamically but never cleans up — memory pressure on the broker
follows.

## Signals (which Management API fields)

- `/api/exchanges` → list with name, vhost.
- `/api/bindings/<vhost>` → list of bindings; group-by `source` to
  count per exchange.

## Cause

Dynamic-binding pattern (every consumer subscribes to a unique
routing key, never unsubscribes) gone wrong. Common in ephemeral
microservice topologies where binding cleanup wasn't wired.

## Sources

- `https://www.rabbitmq.com/docs/bindings` — covers binding
  semantics and the cost of `binding_count` on the routing path.
- GitHub: `rabbitmq/rabbitmq-server` issue archive has multiple
  reports of binding tables in the high 6-figures causing routing
  hot loops.

## Recommendation

"Exchange `<name>` has `<count>` bindings, growing — almost
always a client app that binds without unbinding. Audit the
producer/consumer code for dynamic-binding patterns and add cleanup
on consumer cancellation."

## False positive analysis

Some legitimate fan-out exchanges (e.g. wildcards in topic
exchanges with ~tens of bindings) sit comfortably below the
threshold; > 1000 is anomalous in nearly all cases. The
"growing across snapshots" check eliminates static high-cardinality
exchanges.

## Severity & supersedes

MEDIUM. No supersedes.

## Owner / Reviewer

Owner: <to-be-assigned>. Reviewer: <to-be-assigned>.

## Decision: needs-more-research

Same dependency as `EXCHANGE_NO_BINDING`: needs `/api/bindings`
fetch in `IncidentSignals`. Defer until that signal expansion
lands; the two rules ship together.
