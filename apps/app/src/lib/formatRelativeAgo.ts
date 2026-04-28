/**
 * Format a date or ISO string as a locale-aware relative time string.
 *
 * Examples: "just now", "3 minutes ago", "2 hours ago"
 *
 * Uses Intl.RelativeTimeFormat so the output respects the browser/OS locale
 * automatically. Pass `justNowLabel` to supply a translated string for
 * sub-minute differences (the Intl API lacks a canonical "just now" unit).
 *
 * @param date         - Date object or ISO-8601 string
 * @param justNowLabel - Text used when the diff is under 1 minute (default: "just now")
 */
export function formatRelativeAgo(
  date: Date | string,
  justNowLabel = "just now"
): string {
  const diffMs = Date.now() - new Date(date).getTime();
  // Clamp to 0 so a slightly-future timestamp (clock skew) stays in the "just now" branch.
  const diffMin = Math.floor(Math.max(0, diffMs / 60000));
  if (diffMin < 1) return justNowLabel;
  if (diffMin < 60) {
    return new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(
      -diffMin,
      "minute"
    );
  }
  const diffH = Math.floor(diffMin / 60);
  return new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(
    -diffH,
    "hour"
  );
}
