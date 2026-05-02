# ADR-002: Feature Gate Composition

**Status:** Proposed
**Date:** 2026-04-29
**Author:** Brice

## Context

Qarote currently has two independent feature-gating mechanisms, and a third is about to be introduced:

| Axis | Source | Today's shape | Question it answers |
|---|---|---|---|
| **License** | `isFeatureEnabled(feature)` reads JWT license | `boolean` | "Has this self-hosted instance paid for the EE bundle?" |
| **Plan** | `getOrgPlan(orgId)` reads Stripe subscription tier | `boolean` + soft preview returning `{ isPreview, hiddenCount }` (per `premium-preview-and-retention.md`) | "What does this organisation's subscription tier permit?" |
| **Capability** *(new — `version-and-capability-gating.md`)* | `resolveFeatureAvailability(feature, capabilitySnapshot)` | `{ status: "available" \| "degraded" \| "unavailable", reason, remediation, docsUrl }` | "Does the user's RabbitMQ broker physically support this feature?" |

Three plans are about to land that all touch the same procedures (Tracing/Spy unification, Diagnosis sourcing, Capability gating). Without a unified composition strategy, every page and procedure will reinvent its own `if license else if plan else if capability` ladder, with three different error shapes leaking to the frontend, three different localisation paths for the "no" message, and three different upgrade CTAs.

The reviewers (Backend, Frontend, Architecture) all flagged this as the central architectural risk before any of those plans ship.

## Decision

Introduce a single composition layer — `resolveFeatureGate(ctx, feature, context?)` — returning **one** discriminated union consumed by every premium tRPC procedure and every gated UI surface.

```ts
type FeatureGateResult =
  | { kind: "ok" }
  | {
      kind: "preview";
      previewCount: number;
      hiddenCount: number;
      blockedBy: "plan";
      upgrade: { cta: string; ctaUrl: string };
    }
  | {
      kind: "blocked";
      blockedBy: "license" | "plan" | "capability";
      // i18n key + params, NEVER a raw localised string —
      // backend doesn't know the user's locale at error time.
      reasonKey: string;
      reasonParams?: Record<string, string | number>;
      remediation?: {
        docsUrl: string;
        ctaKey: string;        // i18n key, e.g. "compatibility.tracing.enablePlugin.cta"
        commands?: string[];   // shell commands, English-only, displayed verbatim
      };
      // When this gate blocks but a degraded alternative exists.
      // Example: Tracing capability blocked → suggest Live tap (Spy).
      fallback?: { feature: FeatureKey; reasonKey: string };
    };
```

### Resolution order

The resolver walks the axes in this fixed order. The **first axis that returns a non-OK answer wins**, and its `blockedBy` value is what the UI surfaces. This order is load-bearing — changing it changes the user-facing CTA.

1. **Capability** — technical impossibility. If the broker physically cannot run the feature, no plan upgrade and no license unlock will help. Surface this first so we never tell a user to "upgrade your plan" when the actual problem is "enable a plugin on your broker."
2. **License** — a self-hosted instance without an EE license cannot use EE features regardless of plan. Cloud is implicitly licensed.
3. **Plan** — soft preview semantics from `premium-preview-and-retention.md`. May return `kind: "preview"` instead of `kind: "blocked"`.

### Composition rules

- **Capability `degraded`** does not block the gate. It returns `kind: "ok"` but emits a hint (separate channel — telemetry / inline banner — not part of `FeatureGateResult`).
- **Capability `unavailable` + Plan `preview`** → `kind: "blocked", blockedBy: "capability"`. Don't show a paywall for something that physically wouldn't work even after upgrade.
- **Capability `unavailable` + an alternative feature is `available`** → populate `fallback`. The UI then offers the alternative (e.g. "Recording is unavailable on this broker — try Live mode instead").
- **License `blocked` + Plan `ok`** → `kind: "blocked", blockedBy: "license"`. Surface a license-purchase CTA, not a plan upgrade. Self-hosted scenario only.

### Error transport

tRPC procedures translate `kind: "blocked"` into a typed error using `data` (not `cause`, which is stripped by the default formatter):

```ts
throw new TRPCError({
  code: "FORBIDDEN", // for license/capability
  message: "feature_gate_blocked",
  // attached via custom errorFormatter to ctx.shape.data
});
// errorFormatter copies a structured payload onto data:
// { gate: { blockedBy, reasonKey, reasonParams, remediation, fallback } }
```

`code: "PRECONDITION_FAILED"` is reserved for capability-only blocks where the user can self-remediate (enable plugin). `FORBIDDEN` is used for license/plan blocks. This split lets the frontend distinguish "the user can fix this themselves" from "the user must upgrade/contact billing".

`kind: "preview"` does **not** throw. The procedure returns its normal success shape, with the preview metadata attached to the response (existing `premium-preview-and-retention.md` pattern).

### Shared error formatter

A single tRPC `errorFormatter` at the router root (`apps/api/src/trpc/index.ts`) reads any thrown `TRPCError` whose `message === "feature_gate_blocked"` and copies the structured `gate` payload onto `shape.data`. Every procedure uses the same throw helper:

```ts
function throwGateError(gate: BlockedGate): never { ... }
```

Frontend has one matching reader:

```ts
// apps/app/src/lib/feature-gate/readGateError.ts
export function readGateError(err: TRPCClientErrorLike<…>): BlockedGate | null;
export function useFeatureGate(feature: FeatureKey, context?): FeatureGateResult;
```

### Frontend consumption

One hook, one component:

- `useFeatureGate(feature, options?)` — composes the same three sources client-side (capability snapshot from server, plan from session, license from server config). Returns the same `FeatureGateResult`. Options include `serverId`, `serverExists`, `subject`, and `enabled`.
- `<FeatureGateCard payload={result} serverContext={...} />` — renders the appropriate UI for any `kind: "blocked"` shape. `payload` is the `GateErrorPayload` from the gate result; `serverContext` is optional and carries the capability snapshot for contextual messaging. Subsumes today's `FeatureUnavailableCard` (capability-specific) into a single component.

This is the **only** place the three axes are composed. Pages do not write `if (license) ... else if (plan) ...`.

## Alternatives Considered

### 1. Keep three independent gates

Let each axis stay separate; let pages compose them ad hoc.

- **Pros:** No upfront refactor. Each plan ships independently.
- **Cons:** Three error shapes on the wire. Three i18n key namespaces. CTAs that contradict each other (e.g., capability says "enable plugin", plan banner above it says "upgrade plan"). Three plans currently in flight all reinvent the composition.

**Rejected because** the cost of fixing this later — once Capability errors, Plan previews, and License errors are scattered across 20+ procedures — is much higher than enforcing it now.

### 2. Compose on the frontend only

Backend throws three distinct error codes; frontend stitches them together.

- **Pros:** Backend stays simpler.
- **Cons:** Each consumer (web app, future public API, internal CLI) reinvents the composition. Order of resolution becomes implicit ("which error wins?") and inconsistent. Backend can't tell which gate fired — telemetry suffers.

**Rejected because** the resolution order is product policy and belongs server-side.

### 3. Compose on the backend, return rich objects on success too

Always return `FeatureGateResult` even when `kind: "ok"`, never throw.

- **Pros:** No error/success shape duality.
- **Cons:** Every caller has to unwrap the `kind: "ok"` envelope. tRPC error semantics (typed errors, `useMutation.error`) become unusable. Forces a parallel typing convention.

**Rejected because** the existing tRPC error pipeline already serves the "blocked" case well — we just need to standardise the payload.

## Consequences

### Positive

- One mental model across pages and procedures. Engineers add a new gated procedure by calling `resolveFeatureGate` + `throwGateError`. Frontends render any blocked feature with `<FeatureGateCard>`.
- i18n strings live in one namespace (`gate.*`). One translator pass covers all three gates.
- Telemetry has a single event (`feature_gate_evaluated` with `{feature, kind, blockedBy}`) — answers "what % of free users hit the preview?", "what % of brokers fail capability?" with one query.
- The three pending plans (capability, messages, diagnosis) all converge on this contract instead of inventing their own.

### Negative

- Upfront work before any of the pending plans can land. Estimated 1 PR (~300 LOC across `apps/api/src/trpc/`, `apps/api/src/services/feature-gate/`, `apps/app/src/lib/feature-gate/`, `apps/app/src/components/feature-gate/FeatureGateCard.tsx`).
- A small migration: existing call sites that throw `FORBIDDEN` for license blocks need to migrate to `throwGateError`. Old shape kept as alias for one release with a deprecation log line.
- Resolution order is now product policy — changing it is a breaking change for the CTA the user sees. Document the order in this ADR (above) and require an ADR amendment to change it.

### Migration path

1. Land this ADR.
2. PR-A: implement `resolveFeatureGate` + `errorFormatter` + `useFeatureGate` + `<FeatureGateCard>`. Migrate the existing license-only call sites (`isFeatureEnabled` consumers) to use the helpers. No user-visible change.
3. The three pending plans (capability, messages-unified, diagnosis-sourcing) build on top of this contract instead of inventing their own.

### Out of scope

- Composing more than three gates (e.g. workspace-role gating, regional licensing). The discriminated union is extensible (`blockedBy` becomes a wider literal), but adding a fourth axis is an ADR amendment.
- Cross-organisation gates (parent org rules overriding workspace plan). Not a current product concern.
