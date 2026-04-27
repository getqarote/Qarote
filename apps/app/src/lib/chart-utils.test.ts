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
