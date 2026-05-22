/**
 * Runtime configuration accessors for the Vite SPA.
 *
 * Two-tier resolution: build-time `import.meta.env.VITE_*` wins, then runtime
 * `window.__QAROTE_CONFIG__` is the fallback. This lets us ship a single image
 * (e.g. on GHCR for EE self-hosters) without re-baking the bundle per tenant —
 * the nginx entrypoint generates `/config.js` from the container's env vars
 * before nginx starts (see `docker/nginx/docker-entrypoint.d/10-runtime-config.sh`).
 *
 * Resolution order, top to bottom:
 *   1. `import.meta.env.VITE_*` — set at Vite build time. Wins because it's
 *      compiled into the bundle. Used in cloud / dev / locally-built Docker.
 *   2. `window.__QAROTE_CONFIG__` — populated by the SPA-served `/config.js`.
 *      Static defaults live in `apps/app/public/config.js`; the production
 *      binary backend serves a dynamic version, and the EE Docker image
 *      rewrites it at container start.
 *   3. Hardcoded default per-accessor (see each function's docstring).
 *
 * Scope: these accessors cover the 4 vars that need multi-tenant runtime
 * override — `VITE_API_URL`, `VITE_PORTAL_URL`, `VITE_DEMO_MODE`,
 * `VITE_DEPLOYMENT_MODE`. Other `VITE_*` (Sentry DSN, PostHog token,
 * environment label, etc.) stay as direct `import.meta.env.*` reads —
 * they're build-time-only by design and don't need a runtime knob.
 *
 * Always call these accessors instead of reading `import.meta.env.VITE_*`
 * or `window.__QAROTE_CONFIG__` directly for the 4 vars above so the
 * resolution chain stays uniform.
 */

function readRuntimeConfig(): Window["__QAROTE_CONFIG__"] {
  if (typeof window === "undefined") return undefined;
  return window.__QAROTE_CONFIG__;
}

/**
 * Backend API base URL.
 * Returns `undefined` when neither build-time nor runtime config is set —
 * callers decide whether to throw (e.g. trpc provider) or fall back to "".
 */
export function getApiUrl(): string | undefined {
  return import.meta.env.VITE_API_URL ?? readRuntimeConfig()?.apiUrl;
}

/**
 * Customer portal base URL — used for upgrade / purchase / license CTAs.
 * Returns `undefined` if neither layer is set, which means upgrade CTAs
 * should be hidden rather than render a broken link.
 */
export function getPortalUrl(): string | undefined {
  return import.meta.env.VITE_PORTAL_URL ?? readRuntimeConfig()?.portalUrl;
}

/**
 * Open `${portalUrl}${path}` in a new tab, or no-op if no portal URL is
 * configured. Centralizes the four purchase/upgrade CTAs so a self-hoster
 * without a configured portal doesn't navigate to a broken same-origin path
 * (`window.open("/purchase")` resolves against the SPA's own origin).
 *
 * Caller stays responsible for whether to render the button at all — this
 * helper just guarantees that clicking it cannot misroute the user.
 */
export function openPortalPath(path: string): void {
  const portal = getPortalUrl();
  if (!portal) return;
  window.open(`${portal}${path}`, "_blank", "noopener,noreferrer");
}

/**
 * Demo-mode flag (read-only public sandbox). Stored as a stringly-typed
 * `"true"` when active, anything else (incl. the static `""` default in
 * `public/config.js`) means off. This helper normalizes to a boolean so
 * callers can `if (isDemoMode())` without re-implementing the comparison.
 */
export function isDemoMode(): boolean {
  const raw =
    import.meta.env.VITE_DEMO_MODE ?? readRuntimeConfig()?.demoMode ?? "";
  return raw === "true";
}

/**
 * Deployment mode. Build-time / runtime / "selfhosted" default.
 *
 * Default flipped from "cloud" (legacy `featureFlags.ts#getDeploymentMode`)
 * to "selfhosted" deliberately: the GHCR EE image ships without baking
 * `VITE_DEPLOYMENT_MODE`, and "selfhosted" is the safer default for any
 * unconfigured deploy — it gates off cloud-only telemetry (PostHog, GA,
 * Sentry-by-default) and paid-plan upsells.
 *
 * Mirrors the backend's `normalizeDeploymentMode` in `apps/api/src/config`:
 * deprecated aliases ("community", "enterprise") and any other non-"cloud"
 * string collapse to "selfhosted". Cloud builds MUST set the var explicitly
 * (which they do — see `.github/workflows/deploy-frontend-*.yml`).
 */
export function getDeploymentMode(): "cloud" | "selfhosted" {
  const raw =
    import.meta.env.VITE_DEPLOYMENT_MODE ??
    readRuntimeConfig()?.deploymentMode ??
    "selfhosted";
  return raw === "cloud" ? "cloud" : "selfhosted";
}
