import { addDays, endOfDay, startOfDay, subDays } from "date-fns";
import { describe, expect, it } from "vitest";

describe("date window calculations", () => {
  describe("addDays", () => {
    it("target date is exactly N days from now", () => {
      const now = new Date("2026-01-15T12:00:00.000Z");
      const target = addDays(now, 30);

      expect(target.getUTCFullYear()).toBe(2026);
      expect(target.getUTCMonth()).toBe(1); // February (0-indexed)
      expect(target.getUTCDate()).toBe(14);
    });

    it("correctly calculates 7 days", () => {
      const now = new Date("2026-01-15T12:00:00.000Z");
      const target = addDays(now, 7);
      const diffMs = target.getTime() - now.getTime();

      expect(diffMs).toBe(7 * 24 * 60 * 60 * 1000);
    });

    it("does not mutate the original date", () => {
      const now = new Date("2026-01-15T12:00:00.000Z");
      const original = now.getTime();
      addDays(now, 7);

      expect(now.getTime()).toBe(original);
    });
  });

  describe("subDays", () => {
    it("yesterday is exactly 1 day before now", () => {
      const now = new Date("2026-01-15T12:00:00.000Z");
      const yesterday = subDays(now, 1);
      const diffMs = now.getTime() - yesterday.getTime();

      expect(diffMs).toBe(24 * 60 * 60 * 1000);
    });

    it("does not mutate the original date", () => {
      const now = new Date("2026-01-15T12:00:00.000Z");
      const original = now.getTime();
      subDays(now, 1);

      expect(now.getTime()).toBe(original);
    });
  });

  describe("startOfDay / endOfDay window", () => {
    it("startOfDay sets time to UTC midnight (00:00:00.000)", () => {
      const date = new Date("2026-01-15T14:35:22.123Z");
      const start = startOfDay(date);

      expect(start.getUTCHours()).toBe(0);
      expect(start.getUTCMinutes()).toBe(0);
      expect(start.getUTCSeconds()).toBe(0);
      expect(start.getUTCMilliseconds()).toBe(0);
    });

    it("endOfDay sets time to UTC 23:59:59.999", () => {
      const date = new Date("2026-01-15T14:35:22.123Z");
      const end = endOfDay(date);

      expect(end.getUTCHours()).toBe(23);
      expect(end.getUTCMinutes()).toBe(59);
      expect(end.getUTCSeconds()).toBe(59);
      expect(end.getUTCMilliseconds()).toBe(999);
    });

    it("endOfDay is after startOfDay", () => {
      const date = new Date("2026-01-15T14:35:22.123Z");
      const start = startOfDay(date);
      const end = endOfDay(date);

      expect(end.getTime()).toBeGreaterThan(start.getTime());
    });

    it("window covers exactly 86399999ms (one day minus 1ms)", () => {
      const date = new Date("2026-01-15T14:35:22.123Z");
      const start = startOfDay(date);
      const end = endOfDay(date);
      const windowMs = end.getTime() - start.getTime();

      expect(windowMs).toBe(
        23 * 60 * 60 * 1000 + 59 * 60 * 1000 + 59 * 1000 + 999
      );
    });
  });
});
