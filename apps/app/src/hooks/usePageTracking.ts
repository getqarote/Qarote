import { useEffect, useRef } from "react";
import { useLocation } from "react-router";

import { track } from "@/lib/analytics";

/**
 * Normalize a resolved pathname into a low-cardinality `route_name` for
 * analytics. We can't use react-router's `useMatches()` because the app
 * mounts via `<BrowserRouter>` (the declarative API), which doesn't expose
 * the matched route patterns — `useMatches` is data-router only.
 *
 * Strategy: walk segments and replace anything that looks like an opaque
 * id (UUID, CUID, ULID, hex, numeric) with `:id`. We also mask anything
 * containing characters that don't appear in our static route segments
 * (`.`, `@`, `:`, encoded chars, very long strings) so user-supplied queue
 * names, vhost names, exchange names, etc. never reach PostHog.
 */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CUID_RE = /^c[a-z0-9]{20,}$/i;
// CUID2 always mixes letters AND digits — require at least one digit so
// English words like "organizations" don't match the lowercase-alphanum
// shape and get masked as :id.
const CUID2_RE = /^(?=.*\d)(?=.*[a-z])[a-z0-9]{12,}$/;
const ULID_RE = /^[0-9A-HJKMNP-TV-Z]{26}$/;
const NUMERIC_RE = /^\d+$/;
const HEX_RE = /^[0-9a-f]{12,}$/i;
// Static route segments are kebab-case slugs: lowercase letters, digits,
// dashes (and may start with a digit-free letter). Anything outside that
// alphabet — queue names with dots, encoded slashes for vhosts, mixed
// case, etc. — is treated as a dynamic param.
const STATIC_SEGMENT_RE = /^[a-z][a-z0-9-]*$/;

export function normalizePathname(pathname: string): string {
  const segments = pathname.split("/");
  return segments
    .map((seg) => {
      if (!seg) return seg;
      if (UUID_RE.test(seg)) return ":id";
      if (ULID_RE.test(seg)) return ":id";
      if (CUID_RE.test(seg)) return ":id";
      if (CUID2_RE.test(seg)) return ":id";
      if (NUMERIC_RE.test(seg)) return ":id";
      if (HEX_RE.test(seg)) return ":id";
      if (seg.length > 32) return ":id";
      if (!STATIC_SEGMENT_RE.test(seg)) return ":param";
      return seg;
    })
    .join("/");
}

export function usePageTracking(): void {
  const { pathname } = useLocation();
  const lastTracked = useRef<string | null>(null);

  useEffect(() => {
    // Dedupe on the raw pathname so distinct navigations like
    // `/messages/orders` → `/messages/payments` both fire a pageview, but
    // the value sent to PostHog stays the normalised low-cardinality
    // route pattern (queue / vhost / user names never leak into
    // `route_name`).
    if (lastTracked.current === pathname) return;
    lastTracked.current = pathname;
    track("$pageview", {
      route_name: normalizePathname(pathname),
      app: "app",
    });
  }, [pathname]);
}
