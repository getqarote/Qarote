# UNACKED_GROWING_NO_REDELIVERY

## Symptom

Per the original rules-sourcing plan: "messages_unacknowledged is
growing AND no redelivery is happening" — a consumer is receiving
deliveries but never ack-ing or rejecting. Eventually crashes the
consumer or wedges the queue.

## Signals (which Management API fields)

- `/api/queues` → `messages_unacknowledged` (current count).
- `/api/queues` → `message_stats.redeliver_count` (NOT exposed by
  every RabbitMQ version — `message_stats.redeliver` has been seen
  intermittent in 3.7-3.9).

## Cause

Consumer code path forgot to ack/nack on a particular message type,
or a try/catch swallowed an exception that should have triggered a
nack-with-requeue.

## Sources

- `https://www.rabbitmq.com/docs/confirms` — covers acknowledgement
  semantics and the redeliver bit.

## Recommendation

"Queue `<name>` has `<n>` unacked messages and zero redelivery
activity — consumers are receiving but never acknowledging. Audit
the consumer code path; check for unhandled exceptions inside the
`basic.consume` callback."

## False positive analysis

The rule was originally on Tier A but demoted in the architectural
review (`docs/plans/diagnosis-rules-sourcing.md` Tier A list note)
because `redelivered` is a **per-delivery** flag, not a queue
counter — and `message_stats.redeliver_count` is missing on common
broker versions. Without the counter, the rule has no way to
distinguish "growing unacked because consumer is slow" (covered by
`SLOW_CONSUMER`) from "growing unacked because consumer never
acks". Pure unacked-growth cannot uniquely point at a missing-ack
bug.

## Severity & supersedes

Was MEDIUM. Now N/A.

## Owner / Reviewer

Owner: rules-sourcing plan author. Reviewer: architecture review
(see plan).

## Decision: reject

Rejected because the discriminating signal isn't reliably exposed
across broker versions. `SLOW_CONSUMER` already catches the
growing-unacked case without claiming a specific cause. Do not
revisit unless `redeliver_count` becomes a stable per-queue field
in a future RabbitMQ release.
