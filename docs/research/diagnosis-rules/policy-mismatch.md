# POLICY_MISMATCH

## Symptom

A queue is missing the HA / quorum / TTL policy the operator
declared as expected — e.g. an `orders.*` queue in the prod vhost
has no `ha-mode` while the `prod-ha` policy claims to cover it.

## Signals (which Management API fields)

- `/api/queues` → `effective_policy_definition`, `policy`, `arguments`.
- `/api/policies` → operator-declared policies (pattern, definition).

## Cause

Policy regex pattern is wrong, queue declared with `auto-delete:
true` (ineligible for some policies), or the queue name doesn't
match the pattern after a rename. Sometimes a vhost-level vs
cluster-level policy precedence collision.

## Sources

- `https://www.rabbitmq.com/docs/parameters#policies` — defines the
  policy resolution algorithm and the `effective_policy_definition`
  semantics.
- `https://www.rabbitmq.com/docs/ha` — classic-mirroring policy
  expectations (deprecated in 4.0 but still relevant for ≤ 3.x).

## Recommendation

"Queue `<name>` has no effective policy applied, but vhost
`<vhost>` declares pattern policies that should match it. Check
operator policy precedence and the queue's `auto-delete` flag."

## False positive analysis

The rule needs a notion of "expected policy" before it can fire. The
plan-design called for the user declaring the expectation
(persisted config). Without that signal we'd fire on every queue
that lawfully has no policy — the false-positive rate makes the
rule unusable.

## Severity & supersedes

MEDIUM. No supersedes.

## Owner / Reviewer

Owner: <to-be-assigned>. Reviewer: <to-be-assigned>.

## Decision: needs-more-research

Rule is gated on a UX decision: how does the user declare
"expected"? Options: (a) label-based — queues tagged
`tier:critical` MUST have a policy; (b) policy-hint — every policy
declares a `should_cover` pattern that lights up unmatched queues;
(c) workspace-wide rule — "every durable queue must have a policy".
Decide the UX before implementing — premature implementation will
re-design the data model when the UX lands.
