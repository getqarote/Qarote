# TLS_HANDSHAKE_FAILURES_RISING

## Symptom

The `auth_attempts` endpoint reports a rising count of TLS-handshake
failures over the analysis window. Indicates client-side cert
expiry, CA rotation issues, or a DOS surface.

## Signals (which Management API fields)

- `/api/auth/attempts/<vhost>` (RabbitMQ ≥ 3.8) — per-user auth
  attempt counts, including TLS failure subcategory.

## Cause

- Most common: client cert chain expired without rotation.
- CA bundle on the broker was rotated and clients still present the
  old chain.
- A misconfigured load balancer terminating TLS at the wrong layer.
- DDoS: someone is hammering 5671 hoping for a downgrade.

## Sources

- `https://www.rabbitmq.com/docs/access-control#auth-attempt-metrics`
  — documents the auth_attempts endpoint and its fields.
- `https://www.rabbitmq.com/docs/ssl` — TLS configuration and
  troubleshooting.

## Recommendation

"TLS handshake failures rising on broker — `<count>` failures in
the last 5 min vs `<baseline>` historical. Verify client cert
expiry dates, CA bundle synchronisation, and check load-balancer
SSL termination."

## False positive analysis

Baseline auth-attempt rates differ wildly across deployments. The
rule needs a per-broker baseline, not a global threshold. False-
positive risk is high without baselining; defer until we have a
baseline-store mechanism.

## Severity & supersedes

MEDIUM (baseline). Bumps to HIGH when the failure rate exceeds
50/min — that's almost certainly an active issue.

## Owner / Reviewer

Owner: <to-be-assigned>. Reviewer: <to-be-assigned>.

## Decision: needs-more-research

The endpoint isn't yet in `IncidentSignals` and the rule needs a
baseline (rolling 7-day median?) we don't currently track. Promote
when a "broker baselines" subsystem is designed.
