# CONNECTION_CHURN

## Symptom

Originally: "many short-lived connections opening and closing per
unit time" — typically a broken client connection-pool reusing
connections incorrectly, or a deploy causing rolling reconnects.

## Signals (which Management API fields)

- `/api/overview` →
  `connection_created_details.rate` /
  `connection_closed_details.rate` (per-second rate of new and
  closed connections).

## Cause

- Application not pooling AMQP connections (creating one per
  request).
- Health check probing the AMQP port without a clean disconnect.
- Faulty load balancer shuffling clients between brokers.

## Sources

- `https://www.rabbitmq.com/docs/connections` — covers connection
  lifecycle and the cost of churn on broker resources.

## Recommendation

"Connection churn rate of `<X>/s` over the last minute. AMQP
connections are designed for long-lived use — one per process or
thread, not per request. Audit the client connection-pool config."

## False positive analysis

Was demoted from Tier A in the original plan because the rule
needed sub-second resolution, but `QueueMetricSnapshot` cadence is
minute-level. Even after the IncidentSignals expansion to live
broker fetches, `/api/overview` returns rate data over a single
sample window — we can't prove "churn over the last minute" without
a node-metrics time series.

The original plan suggested reformulating as
`connection_created_details.rate over a 1-min window`, but the
rate field is a point-in-time value, not a window — using it
directly under-counts during the broker's own averaging window.

## Severity & supersedes

Was MEDIUM. Now N/A.

## Owner / Reviewer

Owner: rules-sourcing plan author. Reviewer: architecture review.

## Decision: reject

Rejected because the underlying signal cannot be sampled at the
resolution the rule requires using only the existing Management API
surface. A future "node metrics time series" subsystem could revive
the rule, but at that point a more general "broker resource churn"
rule family makes more sense than a single connection-specific
rule. Do not revisit standalone.
