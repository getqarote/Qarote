import type { EventName, EventProperties } from "@qarote/analytics";

/**
 * Typed wrapper around `window.posthog?.capture`. The actual PostHog client
 * is loaded by `apps/web/src/components/posthog.astro` only after the user
 * grants consent (see `consent.ts`). Until then `window.posthog` is a no-op
 * shim, so calls here drop silently.
 *
 * `track<E>(name, props)` validates event names + properties against the
 * shared `@qarote/analytics` registry at compile time.
 */
export function track<E extends EventName>(
  event: E,
  properties?: EventProperties<E> & Record<string, unknown>
): void {
  if (typeof window === "undefined") return;
  const merged: Record<string, unknown> = {
    app: "web",
    ...(properties as Record<string, unknown> | undefined),
  };
  window.posthog?.capture(event, merged);
}
