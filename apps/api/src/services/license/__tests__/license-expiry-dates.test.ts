import { addDays, differenceInDays } from "date-fns";
import { describe, expect, it } from "vitest";

describe("license expiry date calculations", () => {
  describe("license file deletion date (30 days)", () => {
    it("deletesAt is exactly 30 calendar days from now", () => {
      const now = new Date();
      const deletesAt = addDays(now, 30);

      expect(differenceInDays(deletesAt, now)).toBe(30);
    });

    it("does not mutate the base date", () => {
      const now = new Date("2026-01-15T12:00:00.000Z");
      const original = now.getTime();
      addDays(now, 30);

      expect(now.getTime()).toBe(original);
    });

    it("deletesAt is in the future", () => {
      const deletesAt = addDays(new Date(), 30);

      expect(deletesAt.getTime()).toBeGreaterThan(Date.now());
    });
  });
});
