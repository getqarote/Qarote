import { usePageTracking } from "@/hooks/usePageTracking";

/**
 * Mounts inside `<BrowserRouter>` to fire `$pageview` on each route change.
 * Sends the normalized route pattern (no IDs / queue names) — see
 * `normalizePathname` in `usePageTracking.ts`.
 */
export const PageTracker = (): null => {
  usePageTracking();
  return null;
};
