import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Inlined to avoid Vitest SSR transform issues (see utils.test.ts comment)
function formatChartTimestamp(ts: Date, rangeHours: number): string {
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

describe("formatChartTimestamp", () => {
  const ts = new Date("2024-06-15T14:30:00");

  // Mock locale formatters so assertions are deterministic across CI locales.
  beforeEach(() => {
    vi.spyOn(Date.prototype, "toLocaleTimeString").mockReturnValue("14:30");
    vi.spyOn(Date.prototype, "toLocaleString").mockReturnValue(
      "Jun 15, 2:30 PM"
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("short ranges (<=24h) - time only", () => {
    it("returns time-only for rangeHours = 1", () => {
      const result = formatChartTimestamp(ts, 1);
      expect(result).toBe("14:30");
    });

    it("returns time-only for rangeHours = 6", () => {
      const result = formatChartTimestamp(ts, 6);
      expect(result).toBe("14:30");
    });

    it("returns time-only at the boundary: rangeHours = 24", () => {
      const result = formatChartTimestamp(ts, 24);
      expect(result).toBe("14:30");
    });
  });

  describe("long ranges (>24h) - date + time", () => {
    it("includes date for rangeHours = 48", () => {
      const result = formatChartTimestamp(ts, 48);
      expect(result).toBe("Jun 15, 2:30 PM");
    });

    it("includes date for rangeHours = 168 (7 days)", () => {
      const result = formatChartTimestamp(ts, 168);
      expect(result).toBe("Jun 15, 2:30 PM");
    });
  });
});

// Inlined (same SSR-transform reason as above).
interface TimedChartPoint {
  timestamp: number;
  time: string;
}
function matchIncidentTime(
  chartData: readonly TimedChartPoint[] | undefined,
  incidentTs: number
): string | null {
  if (!chartData || chartData.length === 0) return null;
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

describe("matchIncidentTime", () => {
  const data: TimedChartPoint[] = [
    { timestamp: 1000, time: "15:00" },
    { timestamp: 2000, time: "15:01" },
    { timestamp: 3000, time: "15:02" },
  ];

  it("returns null for undefined data", () => {
    expect(matchIncidentTime(undefined, 1500)).toBeNull();
  });

  it("returns null for empty data", () => {
    expect(matchIncidentTime([], 1500)).toBeNull();
  });

  it("returns null when incident is before the window", () => {
    expect(matchIncidentTime(data, 500)).toBeNull();
  });

  it("returns null when incident is after the window", () => {
    expect(matchIncidentTime(data, 3500)).toBeNull();
  });

  it("matches the nearest point inside the window", () => {
    expect(matchIncidentTime(data, 1900)).toBe("15:01");
  });

  it("matches an exact point timestamp", () => {
    expect(matchIncidentTime(data, 3000)).toBe("15:02");
  });

  it("matches the window edge (first point)", () => {
    expect(matchIncidentTime(data, 1000)).toBe("15:00");
  });

  it("matches the window edge (last point)", () => {
    expect(matchIncidentTime(data, 3000)).toBe("15:02");
  });
});
