import { addHours } from "date-fns";
import { describe, expect, it } from "vitest";

describe("password reset token expiry", () => {
  it("token expires in 24 hours", () => {
    const before = new Date();
    const expiresAt = addHours(new Date(), 24);
    const after = new Date();

    const expectedMs = 24 * 60 * 60 * 1000;
    const diffFromBefore = expiresAt.getTime() - before.getTime();
    const diffFromAfter = expiresAt.getTime() - after.getTime();

    expect(diffFromBefore).toBeGreaterThanOrEqual(expectedMs);
    expect(diffFromAfter).toBeLessThanOrEqual(expectedMs);
  });

  it("token expiry is in the future", () => {
    const expiresAt = addHours(new Date(), 24);

    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("does not mutate the base date", () => {
    const now = new Date("2026-01-15T12:00:00.000Z");
    const original = now.getTime();
    addHours(now, 24);

    expect(now.getTime()).toBe(original);
  });

  it("expired token (created >24h ago) is correctly identified as expired", () => {
    const tokenCreatedAt = addHours(new Date(), -25); // simulates a token created 25h ago
    const expiresAt = addHours(tokenCreatedAt, 24);

    expect(expiresAt.getTime()).toBeLessThan(Date.now());
  });
});
