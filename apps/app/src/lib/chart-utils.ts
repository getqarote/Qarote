/**
 * Formats a snapshot timestamp for chart axis labels.
 * Short ranges (<= 24h) show time only; longer ranges include the date.
 */
export function formatChartTimestamp(ts: Date, rangeHours: number): string {
  if (rangeHours <= 24) {
    return ts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return ts.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
