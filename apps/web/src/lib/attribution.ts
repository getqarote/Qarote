/**
 * First-touch marketing attribution capture.
 *
 * Reads UTM params, referrer, and landing page from the very first
 * visit, persists them in localStorage (consent-gated upstream — the
 * caller must check consent before invoking `captureFirstTouch`).
 *
 * Read with `getFirstTouch()` and forward to the signup form so the
 * backend can `$set_once` them on the new user (see
 * `apps/api/src/trpc/routers/auth/registration.ts`).
 */

const STORAGE_KEY = "qarote_first_touch_v1";

interface FirstTouch {
  initialUtmSource?: string;
  initialUtmMedium?: string;
  initialUtmCampaign?: string;
  initialUtmTerm?: string;
  initialUtmContent?: string;
  initialReferrer?: string;
  initialLandingPage?: string;
  capturedAt: string;
}

const UTM_KEYS: Array<
  [
    (
      | "initialUtmSource"
      | "initialUtmMedium"
      | "initialUtmCampaign"
      | "initialUtmTerm"
      | "initialUtmContent"
    ),
    string,
  ]
> = [
  ["initialUtmSource", "utm_source"],
  ["initialUtmMedium", "utm_medium"],
  ["initialUtmCampaign", "utm_campaign"],
  ["initialUtmTerm", "utm_term"],
  ["initialUtmContent", "utm_content"],
];

/**
 * Capture once. Returns the stored payload (existing or newly-written).
 * Safe to call from layout-level scripts on every page — only the first
 * call per browser writes.
 */
export function captureFirstTouch(): FirstTouch | null {
  if (typeof window === "undefined") return null;

  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing) {
      return JSON.parse(existing) as FirstTouch;
    }
  } catch {
    // localStorage may be disabled (private mode)
    return null;
  }

  const url = new URL(window.location.href);
  const data: FirstTouch = { capturedAt: new Date().toISOString() };

  for (const [field, qs] of UTM_KEYS) {
    const v = url.searchParams.get(qs);
    if (v) data[field] = v;
  }

  // Strip query strings from referrer + landing — analytics only needs the
  // origin / path, and queries can carry tokens or PII (session ids, oauth
  // codes, etc.) that we don't want replayed in logs / Slack / Sentry.
  // Origin comparison must be strict — `startsWith` on the URL string lets
  // an attacker craft `https://qarote.io.evil.tld` and slip through.
  const rawReferrer = document.referrer || "";
  if (rawReferrer) {
    try {
      const r = new URL(rawReferrer);
      if (r.origin !== window.location.origin) {
        data.initialReferrer = `${r.origin}${r.pathname}`;
      }
    } catch {
      // ignore malformed referrer
    }
  }

  data.initialLandingPage = url.pathname;

  // Only persist when there's something worth attributing — pure direct
  // visits with no referrer don't need a row.
  const hasSignal =
    data.initialUtmSource ||
    data.initialUtmMedium ||
    data.initialUtmCampaign ||
    data.initialUtmTerm ||
    data.initialUtmContent ||
    data.initialReferrer;

  if (!hasSignal) return null;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore quota / disabled storage
  }
  return data;
}

export function getFirstTouch(): FirstTouch | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as FirstTouch) : null;
  } catch {
    return null;
  }
}
