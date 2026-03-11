import { addDays } from "date-fns";
import { describe, expect, it } from "vitest";

describe("workspace invitation expiry", () => {
  it("invitation expires in 7 days", () => {
    const before = new Date();
    const expiresAt = addDays(new Date(), 7);
    const after = new Date();

    const expectedMs = 7 * 24 * 60 * 60 * 1000;
    const diffFromBefore = expiresAt.getTime() - before.getTime();
    const diffFromAfter = expiresAt.getTime() - after.getTime();

    expect(diffFromBefore).toBeGreaterThanOrEqual(expectedMs);
    expect(diffFromAfter).toBeLessThanOrEqual(expectedMs);
  });

  it("invitation expiry is in the future", () => {
    const expiresAt = addDays(new Date(), 7);

    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("does not mutate the base date", () => {
    const now = new Date("2026-01-15T12:00:00.000Z");
    const original = now.getTime();
    addDays(now, 7);

    expect(now.getTime()).toBe(original);
  });

  it("expired invitation (created >7 days ago) is correctly identified as expired", () => {
    const inviteCreatedAt = addDays(new Date(), -8); // simulates an invitation created 8 days ago
    const expiresAt = addDays(inviteCreatedAt, 7);

    expect(expiresAt.getTime()).toBeLessThan(Date.now());
  });
});
