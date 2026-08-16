# LOADERS.md — Qarote loader animations (alternatives to the rabbit)

Preview: `Loader Animations.html`. Three on-brand loaders, themable (light/dark),
all with `prefers-reduced-motion` fallbacks. Use these for **indeterminate /
action-triggered waits**; keep the existing **skeletons** for shaped content
loading, and keep the **rabbit** for playful empty/404 states.

## The three loaders & where each goes

### 1 · Message flow  → broker traffic (the signature)
Packets travel publisher → exchange → queues (which pulse green on arrival).
Use whenever Qarote is moving/observing broker traffic:
- Test connection (add/edit server)
- Re-scan a config finding (light)
- Cockpit first load (before metric skeletons take over)
- App/PWA boot splash

### 2 · Scan reticle ("diagnosing…")  → inspection (scan + explain)
Spinning carrot reticle + breathing core. Qarote's two *inspection* gestures —
no longer explain-only:
- **Connect & scan (add server)** — during the point-in-time scan
- while `explain_incident` streams (before text starts)
- "Explain this finding" in the config drawer

### 3 · Queue depth bars ("reading metrics…")  → inline metric refresh
Small, in-corner, never full-screen:
- chart refresh on time-range change (2h → 30d)
- metric / overview recompute

## Do NOT replace
- Page transitions, alert/finding lists → keep skeletons
- Button submit state → small inline 16px spinner, not these
- Empty/404 → keep the rabbit

## Repo packaging
Add `apps/app/src/components/ui/loaders/` with:
- `FlowLoader.tsx`   (size?, className?) — loader #1
- `DiagnosingLoader.tsx` — loader #2
- `MetricsLoader.tsx` — loader #3
Use `currentColor` + text-* tokens (theme-aware, no hardcoded hex). Mirror the
SVG/keyframes from `Loader Animations.html`. Gate all motion behind
`@media (prefers-reduced-motion: no-preference)` with a static fallback.
Replace ad-hoc spinners at the call-sites listed above.
