/**
 * Centralised user label + avatar-initials derivation.
 *
 * Since the lightweight sign-up no longer collects first/last name, those
 * columns are frequently empty: OAuth fills them when the IdP supplies the
 * claims, otherwise they default to `""` server-side and only get set later
 * (onboarding row or Settings → Profile). Every display surface must therefore
 * degrade gracefully instead of rendering an empty string.
 *
 * Resolution order, per the agreed strategy:
 *   displayName: firstName+lastName → composed `name` → email local-part
 *                (capitalised) → email → ""
 *   initials:    first/last initials → name initials → email-derived (1–2
 *                letters) → "?"
 *
 * Accepts any object carrying the relevant fields (current user, workspace
 * member, RCA creator, …) and tolerates null/undefined so call sites stay
 * guard-free.
 */

interface NameLike {
  firstName?: string | null;
  lastName?: string | null;
  /** Some surfaces (better-auth session, RCA creator) carry a composed name. */
  name?: string | null;
  email?: string | null;
}

const trimmed = (v: string | null | undefined): string => (v ?? "").trim();

const emailLocalPart = (email: string): string => {
  const at = email.indexOf("@");
  return at > 0 ? email.slice(0, at) : email;
};

const capitalize = (s: string): string =>
  s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

/**
 * Best-effort human label for a user. Never returns an empty string when an
 * email is present.
 */
export function displayName(user: NameLike | null | undefined): string {
  if (!user) return "";

  const full = `${trimmed(user.firstName)} ${trimmed(user.lastName)}`.trim();
  if (full) return full;

  const name = trimmed(user.name);
  if (name) return name;

  const email = trimmed(user.email);
  if (email) {
    const local = emailLocalPart(email);
    return local ? capitalize(local) : email;
  }

  return "";
}

/**
 * 1–2 letter uppercase avatar fallback. Never empty — defaults to "?".
 */
export function initials(user: NameLike | null | undefined): string {
  if (!user) return "?";

  const fromName =
    (trimmed(user.firstName)[0] ?? "") + (trimmed(user.lastName)[0] ?? "");
  if (fromName) return fromName.toUpperCase();

  const name = trimmed(user.name);
  if (name) {
    const parts = name.split(/\s+/);
    const ini = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
    if (ini) return ini.toUpperCase();
  }

  const email = trimmed(user.email);
  if (email) {
    const local = emailLocalPart(email);
    const segs = local.split(/[._+-]+/).filter(Boolean);
    const ini =
      segs.length >= 2
        ? (segs[0][0] ?? "") + (segs[1][0] ?? "")
        : local.slice(0, 2);
    if (ini) return ini.toUpperCase();
  }

  return "?";
}
