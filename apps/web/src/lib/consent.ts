const CONSENT_KEY = "qarote_consent";
const CONSENT_VERSION = 1;
const POLICY_VERSION = "2026-04-30";
const CONSENT_TTL_MS = 13 * 30 * 24 * 60 * 60 * 1000;
export const CONSENT_EVENT = "qarote:consent-changed";

type ConsentRecord = {
  v: number;
  granted: boolean;
  ts: number;
  policy: string;
};

/**
 * Detail payload of `qarote:consent-changed`. `cleared` is set when the user
 * revokes via the footer "Cookie preferences" link (consent record removed).
 */
export type ConsentEventDetail = {
  granted: boolean;
  cleared?: boolean;
};

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function readConsent(): ConsentRecord | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentRecord;
    if (parsed.v !== CONSENT_VERSION) return null;
    if (parsed.policy !== POLICY_VERSION) return null;
    if (Date.now() - parsed.ts > CONSENT_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function hasConsent(): boolean {
  return readConsent()?.granted === true;
}

export function shouldShowBanner(): boolean {
  return readConsent() === null;
}

export function writeConsent(granted: boolean): void {
  if (!isBrowser()) return;
  const record: ConsentRecord = {
    v: CONSENT_VERSION,
    granted,
    ts: Date.now(),
    policy: POLICY_VERSION,
  };
  localStorage.setItem(CONSENT_KEY, JSON.stringify(record));
  window.dispatchEvent(
    new CustomEvent<ConsentEventDetail>(CONSENT_EVENT, { detail: { granted } })
  );
}

export function clearConsent(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(CONSENT_KEY);
  window.dispatchEvent(
    new CustomEvent<ConsentEventDetail>(CONSENT_EVENT, {
      detail: { granted: false, cleared: true },
    })
  );
}
