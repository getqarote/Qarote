# Plan — kind-driven finding remediation (GAP checklist item 2)

> Status: **proposal, awaiting decision**. No code until the open question
> (§6) is settled. Verified against the live config-rules engine.

## 1. Goal

Each config-scan finding should offer a remediation affordance **that matches
what fixing it actually entails** — a one-click "Fix this" for a safe additive
change, but only guidance for a destructive, multi-option, cluster-wide, or
migration-class fix. Today findings have no remediation surface at all (the
explain drawer streams an LLM explanation; there is no structured fix action).

## 2. Where remediation metadata lives

Findings are produced by rules in `apps/api/src/ee/services/alerts/config.rules/*`,
each a `ConfigRuleDef` (`config.evaluator.ts`) with `key` / `defaultSeverity` /
`requires` / `evaluate()`. Findings carry a `ruleKey` (the `ConfigFinding`
row + the `getFindings` payload).

**Proposal:** remediation is a *static* property on the rule, plus *dynamic*
parameters the rule already computes per finding:

```ts
// config.evaluator.ts — extend the interface
export interface ConfigRuleDef {
  key: string;
  defaultSeverity: AlertSeverity;
  requires: (keyof Omit<ClusterSnapshot, …>)[];
  evaluate(snapshot, rule): ConfigFindingDraft[];
  remediation: RemediationSpec; // NEW — declared once per rule
}

export interface RemediationSpec {
  kind: RemediationKind;          // drives the affordance (see §3)
  /** i18n key for the human steps / explanation shown regardless of kind. */
  guidanceKey: string;
  /**
   * Only for the auto / auto_destructive kinds: how the one-click fix is
   * applied. `params` are filled from the finding's `details` at fix time.
   */
  apply?: {
    action: "create_policy" | "delete_user_permission" | "delete_exchange" | …;
    paramsFromDetails: string[];  // e.g. ["vhost", "queueName"]
  };
}
```

- Static `kind` + `guidanceKey` live on the rule (one place, no per-finding
  storage, no DB migration).
- Per-instance params (which queue/vhost/exchange) come from the finding's
  existing `details` JSON — no new finding column.
- `getFindings` joins `ruleKey → ALL_CONFIG_RULES[ruleKey].remediation` and
  returns `{ kind, hasApply }` per finding (the frontend never needs the rule
  internals). The full `apply` descriptor stays server-side.

## 3. The six kinds → affordance mapping

| kind | meaning | affordance | "Fix this"? |
|---|---|---|---|
| `auto` | safe, **additive** change (add a policy/limit) | one-click **Fix this** → applies, re-scans | ✅ yes |
| `auto_destructive` | reversible-but-removing change (disable guest, delete orphan exchange) | **Fix this** behind a typed/danger confirm | ⚠️ confirm-gated |
| `choice` | several valid fixes (conflicting policies) | show options, user picks → **guidance tailored to the pick (no live apply in v1)** | ❌ guidance only (v1) |
| `cluster` | cluster-topology change (even node count) | guidance + link, **no** in-app apply | ❌ guidance only |
| `migration` | staged data migration (classic→quorum, version skew) | migration guide, **no** one-click | ❌ guidance only |
| `manual` | app/OS-level, outside RabbitMQ admin (prefetch, fd limits, idle consumers) | docs/steps only | ❌ guidance only |

Per the checklist: **"Fix this" appears only on safe-additive (`auto`)**;
`auto_destructive` is the same button gated by a confirm; everything else is
guidance. The affordance is chosen by `kind`, never hand-authored per finding.

`choice` is **guidance-only in v1** (the table above) — the user picks an
option and gets tailored steps, no live broker mutation. If choice-apply lands
in v2, each option's params come from `finding.details` (or are recomputed from
rule + snapshot), and the chosen option's stable id is what
`scan.applyRemediation` receives.

## 4. Indicative classification of the existing rules

(Representative, to be finalised rule-by-rule.)

- `auto` — `missing-dlx`, `queue-no-length-bound`, `quorum-queue-ha-policy`
  (add policy)
- `auto_destructive` — `guest-user-enabled` (revoke guest), `orphan-exchange`
  (delete exchange)
- `choice` — `conflicting-policies`, `default-vhost-isolation`
- `cluster` — `cluster-even-node-count`
- `migration` — `classic-mirrored-deprecated`, `cluster-version-skew`,
  `quorum-queue-minority-replicas`
- `manual` — `exclusive-in-production`, `channel-prefetch`, `node-fd-limit-low`,
  `watermark-misconfig`, `no-consumer-backlog`

## 5. Frontend

`FindingRemediation.tsx` under the existing explain drawer (`scan/`), driven by
`finding.remediation.kind`:
- renders the guidance (always),
- renders the kind-appropriate action (Fix this / confirm / options / none).

The "Fix this" action calls a new `scan.applyRemediation` mutation
(`scan:run`, server-scoped — see #222/#221 `byServerId` convention), which
dispatches on `remediation.apply.action`, performs the RabbitMQ change via the
management client, and re-runs the scan so the finding clears (or stays, with a
reason).

## 6. ⚠️ Open decision — how far does the *apply* go in v1?

The taxonomy + guidance + chips are cheap. The expensive, risky part is
**actually mutating the broker** (create policy, delete exchange, revoke a user)
from a "Fix this" button. Options:

- **A — Guidance-only v1.** Ship `kind` + per-kind guidance + the affordance
  *shape* for every finding, but **no** in-app apply yet (every kind shows
  steps; `auto` shows a "copy the management command" helper instead of a live
  apply). Lowest risk, no new broker-mutating surface. The "Fix this" live apply
  lands in v2 once we've picked the few rules safe to automate.
- **B — Apply for `auto` only, now.** Build `scan.applyRemediation` for the 2-3
  safe-additive rules (`missing-dlx`, `queue-no-length-bound`, HA policy), each
  a `PUT /policies/...` against the management API, **permission-gated +
  audited** (no confirm — `auto` is one-click per §3; the confirm is reserved
  for `auto_destructive`). `auto_destructive`/`choice`/`cluster`/`migration`/
  `manual` stay guidance-only.
- **C — Full apply across `auto` + `auto_destructive` + `choice`.** Most
  product value, most surface area (delete exchange, revoke user, pick policy) —
  each is a destructive broker mutation needing careful guards. Largest build.

**Recommendation: B.** It delivers the headline "Fix this" on genuinely safe
changes, keeps the destructive/ambiguous ones as guidance (where a wrong
auto-fix could break production), and is a bounded, testable surface. A and C
are the conservative / maximal ends if you'd rather.

## 7. Implementation guardrails (for whichever option ships an apply)

**Permissions.** Reuse the existing `scan:run` permission (the apply IS a
server-scoped scan action) rather than inventing per-action keys — one gate,
consistent with `triggerScan`. `RemediationSpec` therefore needs **no**
permission field. `FindingRemediation.tsx` reads the caller's effective
permissions and **hides** the apply control when `scan:run` is absent (not just
disables — a disabled fix button on a read-only role is noise); the server
re-enforces `scan:run` + `byServerId` regardless, so the UI gate is UX-only.

**Param validation.** `apply.paramsFromDetails` is the contract between a rule
and its fix. Enforce it at both ends: a rule's `evaluate()` unit test asserts it
emits every key its own `paramsFromDetails` lists (well-typed); and
`scan.applyRemediation` re-checks each listed key is present + the right type in
`finding.details` before dispatching — on a miss it returns a precise
`BAD_REQUEST` (`missing remediation param 'vhost'` / `invalid type for
'queueName'`), never a half-applied broker call.

**Errors, idempotency, UX.** `scan.applyRemediation` surfaces the management
client's failure as a typed error: `FORBIDDEN` (broker creds lack the right),
`CONFLICT` (resource changed underneath), `SERVICE_UNAVAILABLE` (broker
unreachable). Applies are **idempotent** — re-applying an already-correct policy
is a success no-op (PUT policy is idempotent by nature; for delete-class actions
"already gone" → success). The re-scan after a successful apply runs
**synchronously** within the mutation, but **bounded**: a hard wall-clock
timeout (~10s) and a **targeted** re-scan — only the rule/section the
remediation touched, not a full cluster snapshot (`runConfigScan` gains a
`rules?: string[]` scope arg; `RabbitMQBaseClient.request` already needs to
honor an `AbortSignal` so the probe can be cut off). The UI shows a per-row
pending spinner during apply+re-scan (double-submit guarded), then the
cleared/remaining state. A re-scan that times out or fails is **not** an apply
failure — **partial success** returns `{ applied: true, rescan: "pending" }`
(slow/timed-out) or `{ rescan: "failed" }`, and the row shows "fixed —
verification pending" with a manual re-scan affordance, never a false "still
broken".

**Audit.** Every `scan.applyRemediation` call emits to the existing centralized
audit log (`recordFromContext` → `AuditLog`) — **both** the attempt and its
outcome (one `remediation.apply.attempted` on entry, then
`remediation.apply.succeeded` / `.failed`). Fields: actor (`ctx.user.id` +
email — **v1 constraint:** remediation apply is user-initiated only (the
Fix-this button), so actor is always `ctx.user`; a v2 that adds scheduled or
webhook-driven applies would introduce an `actorType` enum
(`user | service_account | system`) and set it here), action (`applyRemediation`
+ `remediation.apply.action`), and a **structured** target object — a
discriminated union typed in the audit module, **validated before write** so the
shape can't drift (not a freeform string) — so consumers can query by
type/name/vhost/policy — e.g.
`{ "type": "policy", "vhost": "/", "name": "ha-orders", "pattern": "^orders\\.",
"versionHash": "…" }`, `{ "type": "queue", "vhost": "/", "name": "orders" }`,
`{ "type": "vhost", "name": "/" }`. Plus the validated input params, a
`correlationId` linking the attempt↔outcome rows, timestamp, and — on failure —
the typed error code + management-client message. No new table: it rides the
same append-only `AuditLog`, so remediation history is searchable alongside
every other org action (the AuditLog's own read/query ACL model is unchanged —
remediation just writes to it like every other action).

## 8. Phasing once a decision is made

1. `RemediationSpec` on `ConfigRuleDef` + classify all rules + unit-assert every
   rule declares one. `getFindings` returns `{ kind, hasApply }`.
2. `FindingRemediation.tsx` (guidance + affordance shape) — no live apply.
3. (If B/C) `scan.applyRemediation` mutation per allowed action + **param
   validation** + confirms + audit + re-scan; E2E covering the happy path **and
   the invalid-param / forbidden / conflict failure cases**.
4. i18n guidance per rule (×4 locales).
