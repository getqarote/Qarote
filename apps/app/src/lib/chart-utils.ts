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

/** An incident annotation rendered as a ReferenceLine + annotation row. */
export interface ChartIncidentMarker {
  /** Epoch ms of the incident. */
  timestamp: number;
  /** Short human label, e.g. "15:06 — consumers dropped". */
  label: string;
  /** Scrolls to / reveals the underlying finding. */
  onSeeFinding?: () => void;
}

/** A chart point carrying its source epoch + the XAxis category string. */
interface TimedChartPoint {
  timestamp: number;
  time: string;
}

/**
 * Maps an incident timestamp onto the chart's XAxis category (`time`) by
 * finding the rendered point NEAREST the incident. Returns `null` when the
 * incident falls outside the rendered window (before the first or after the
 * last point) so the caller skips the ReferenceLine rather than clamping it
 * to an edge it doesn't belong on.
 */
export function matchIncidentTime(
  chartData: readonly TimedChartPoint[] | undefined,
  incidentTs: number
): string | null {
  if (!chartData || chartData.length === 0) return null;

  // Window bounds — the data is chronological, but read both ends defensively
  // rather than assuming sort order across module boundaries.
  let min = chartData[0].timestamp;
  let max = chartData[0].timestamp;
  for (const point of chartData) {
    if (point.timestamp < min) min = point.timestamp;
    if (point.timestamp > max) max = point.timestamp;
  }
  if (incidentTs < min || incidentTs > max) return null;

  let nearest = chartData[0];
  let bestDelta = Math.abs(chartData[0].timestamp - incidentTs);
  for (const point of chartData) {
    const delta = Math.abs(point.timestamp - incidentTs);
    if (delta < bestDelta) {
      bestDelta = delta;
      nearest = point;
    }
  }
  return nearest.time;
}
