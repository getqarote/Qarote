/**
 * Format a date ISO string for display in the user's locale.
 * Returns "" for null/undefined input (quota reset dates can be null
 * when the server hasn't computed them yet).
 * Falls back to the raw ISO string if locale formatting fails.
 */
export function formatDate(
  iso: string | null | undefined,
  locale: string,
  options: Intl.DateTimeFormatOptions
): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(locale, options);
  } catch {
    return iso;
  }
}
