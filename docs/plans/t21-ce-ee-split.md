# T21: CE/EE Split for Incident Diagnosis — Implementation Plan

> Status: **awaiting approval** (no code written yet). Branch `feat/v2-ce-ee-split`.
> Goal: rules engine (detection + findings + cards + `/diagnosis`) becomes CE; only
> the AI Explain layer (`ai_explain_inline` / `ai_explain_digest`) stays EE.
> Narrative: **"CE detects, EE explains with AI."**

## 0. Architecture reality check (corrections to the original assumptions)

1. **There is no CE-vs-EE binary build.** `apps/api/src/server.ts:52` always imports
   `appRouter` from `@/ee/trpc/router`; `apps/api/src/trpc/types.ts:10` derives the
   frontend `AppRouter` from the **EE** router. The CE `src/trpc/router.ts` is a
   public-mirror _reference type_ only. So `rabbitmq.incident.getIncidentDiagnosis` is
   already reachable at runtime in every deployment. Edition gating is purely
   **license-axis (self-hosted JWT) + plan-axis**, not router placement.

2. **The diagnosis backend procedure has NO license/feature gate today.**
   `apps/api/src/ee/routers/rabbitmq/incident.ts` gates only on
   `workspacePermissionProcedure("incident:read")` (a READONLY, CE-friendly permission)
   plus a manual `userPlan === FREE` 2-item preview slice. It does NOT call
   `resolveFeatureGate` / `isFeatureEnabled`. The real CE blockers are on the
   **frontend** (`<FeatureGate>` wrapper + `hasFeature("incident_diagnosis")` guards).

3. **The completeness invariant lives in `gate.config.test.ts`** (L22-26: keys of
   `FEATURE_GATE_CONFIG` deep-equal `getAllPremiumFeatures()`), not `capability-axis.test.ts`.

4. **AI Explain is license-gated on the backend** (`llm.router.ts:187`
   `isFeatureEnabled(AI_EXPLAIN_INLINE)`) **but only plan-gated on the frontend**
   (`DiagnosisCard.tsx:154` `canExplain` = plan only).

## 1. Recommended approach — (A) decouple `FeatureKey` from `PremiumFeature`

`PremiumFeature` becomes the licensed/EE set (drop `incident_diagnosis`); introduce
`CapabilityOnlyFeature = "incident_diagnosis"` and widen
`FeatureKey = PremiumFeature | CapabilityOnlyFeature`. License axis +
`getAllPremiumFeatures()` consult `PremiumFeature`; gate config, capability axis,
resolver, and frontend `<FeatureGate>` consult `FeatureKey`.

**Why (SoC):** the locked decisions require `incident_diagnosis` to be simultaneously
_un-licensed_ (CE/free get it) **and** _capability-gated_ (warm-up stays). Approach B
(keep it Premium, flip `licenseRequired:false`) leaves it in `getAllPremiumFeatures()`
→ it still ships in the EE feature wire surface, contradicting "CE detects". Approach C
(remove + drop capability gating) violates "warm-up stays". A is the only one honoring
all three locked decisions; it cleanly separates "is this EE-licensed?" from "can this
be gated?" into different types. Cost: a one-time type-model change + re-expressing the
completeness test against `FeatureKey`.

## 2. Per-file changes

### Backend

- **`config/features.ts`** — add `CapabilityOnlyFeature` + `CAPABILITY_FEATURES`; remove
  `incident_diagnosis` from `PremiumFeature` and `FEATURES`; add `getAllFeatureKeys()`
  (premium + capability-only). This stops `getAllPremiumFeatures()` (→ `public.getFeatureFlags`)
  returning it. Root edit; everything else cascades.
- **`services/feature-gate/types.ts:23`** — `FeatureKey = PremiumFeature | CapabilityOnlyFeature`.
- **`services/feature-gate/gate.config.ts`** (entry ~L165) — `licenseRequired:false`,
  `freeBehaviour:{mode:"none"}`, keep `capabilityRequired:true`; key via
  `CAPABILITY_FEATURES.INCIDENT_DIAGNOSIS`. Record completeness preserved (FeatureKey still includes it).
- **`services/feature-gate/capability-axis.ts`** — import/`case` symbol update only; warm-up logic unchanged.
- **`trpc/routers/feature-gate.ts:23`** — widen `FEATURE_KEYS` Zod enum to include capability-only
  keys, else the FE `evaluate({feature:"incident_diagnosis"})` 400s at runtime. **Runtime-critical, no compile error.**
- **`ee/routers/rabbitmq/incident.ts`** — remove the `userPlan===FREE` 2-item preview branch;
  always return full results. Keep `incident:read` + IDOR `verifyServerAccess` + snapshot guard.
  _(See Decision 1.)_ Physical move to a CE path = deferred follow-up, not blocking.
- **`services/plan/plan-gate.ts`** — comment-only; no functional change.

### Frontend

- **`lib/feature-gate/types.ts:18`** — widen FE `FeatureKey` in lockstep (`| "incident_diagnosis"`),
  else `FeatureGateCard.FEATURE_PATHS` + `<FeatureGate>` stop type-checking (transitive via `@api/config/features`). **Not in original list.**
- **`lib/featureFlags.ts`** — remove `incident_diagnosis` from the FE `PremiumFeature` mirror (L17) + `FEATURE_DESCRIPTIONS` (L54).
- **`RecentAlerts.tsx:33`, `Index.tsx:72`, `QueueDetail.tsx:177`, `AppSidebar.tsx:333`** — drop
  `hasFeature("incident_diagnosis")`; fire diagnosis queries unconditionally (gate on `serverId`).
  These are the real CE blockers.
- **`pages/Diagnosis.tsx`** — KEEP the `<FeatureGate>` wrapper (it now resolves ok/degraded, and
  delivers the warm-up banner); remove the dead `isForbidden` branch (L119, L218-224). Do NOT follow
  the stale `premium-preview-and-retention.md:139` "remove the wrapper" note — that loses the warm-up banner.
- **`DiagnosisCard.tsx`** — REQUIRED: harden `canExplain` with `&& hasFeature("ai_explain_inline")`
  so the premium AI button stays EE-only now that the card itself is free, matching the backend
  license gate (`llm.router.ts`). Also add `ai_explain_inline` to the FE feature mirror
  (`lib/featureFlags.ts`). (Consistent with Decision 2 in §5 — both sections mandate this.)

### i18n / docs / web

- **`gate.json` (4 locales)** — KEEP `incident_diagnosis` (still feeds warm-up/capability surface).
- **`billing.json` (4 locales) + `PlanCard.tsx` + `web/PricingSection.tsx`** — `incidentDiagnosisLimitedHint`
  ("2-finding preview") becomes false if the FREE slice is removed; re-frame to "full detection all tiers; AI explanations Developer+/EE".
- **`COMMUNITY_EDITION.md`, `FEATURE_COMPARISON.md`, `features/diagnosis.md`** — re-tier diagnosis (detection=CE, AI Explain=EE).

### Tests

- **`gate.config.test.ts`** — re-express the completeness invariant against `getAllFeatureKeys()`;
  add an assertion that `incident_diagnosis` is NOT in `getAllPremiumFeatures()`.
- **`capability-axis.test.ts`** — 3 INCIDENT_DIAGNOSIS cases stay green (import update only).
- **`diagnosis-free-preview.test.ts`** — update/delete the FREE-slice cases if the preview is removed; keep `buildSeveritySummary` cases.
- **`permissions.test.ts`** — `incident:read` already READONLY; verify only (no-op).
- **`license-features.service.test.ts`** — verify it doesn't hardcode the premium count/list.

## 3. Sequencing (let `tsc` drive the cascade)

1. `config/features.ts` → 2. `feature-gate/types.ts` → 3. `gate.config.ts` → 4. `capability-axis.ts`
   → 5. `feature-gate.ts` (Zod enum) → 6. `incident.ts` → 7. backend tests
   → 8. FE `lib/feature-gate/types.ts` → 9. `featureFlags.ts` → 10. the four `hasFeature` call sites
   → 11. `Diagnosis.tsx` → 12. i18n/docs/web. Run `tsc` (api) after 4 and 9 to enumerate remaining sites.

## 4. Risks & verification

- **Zod enum miss (step 5):** forgetting to widen `FEATURE_KEYS` → FE gate call 400s at runtime, page stuck on skeleton. Compiles fine.
- **AI leak/block:** backend `llm.router.ts:187` untouched (EE boundary holds); FE `canExplain` stays plan-only.
- **Warm-up banner:** keep the `<FeatureGate>` wrapper; verify the `<3h` advisory still shows.
- **E2E matrix:** CE warm → full findings + cards + counts, NO Explain button; CE cold → findings + warm-up banner; EE → findings + working Explain (200 not 403); Cloud FREE → full findings (no teaser, if preview removed). Regression: `pnpm --filter api test` + `tsc` both apps green.

## 5. Decisions — LOCKED (Brice, 2026-05-25)

1. **FREE cloud preview → REMOVED.** Diagnosis detection + findings are fully free everywhere
   (CE self-hosted AND cloud free). The paid boundary is the **LLM (AI Explain)**, because that's
   what costs money — not the rules engine. Remove the `userPlan===FREE` 2-item slice from `incident.ts`.
   **LLM cost containment (already enforced, verify intact):** no free user can trigger the managed LLM —
   self-hosted CE has no `ai_explain_inline` license (backend `llm.router.ts:187` blocks); cloud FREE
   fails `canExplain` (plan gate) and the _managed_ provider is paid-plans-only (`managed_disabled`),
   so Qarote never absorbs LLM cost for free users. BYOK = user's own key.
2. **AI hardening → YES.** Add `hasFeature("ai_explain_inline")` to the FE `canExplain` (defense-in-depth,
   matches the backend license gate). Requires adding the key to the FE `featureFlags.ts` mirror.
3. **Physical router move → DEFER.** Functionally unnecessary on the single binary; OSS-distribution-honesty
   follow-up, not part of T21.
