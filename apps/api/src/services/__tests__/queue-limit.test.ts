/**
 * The ceiling is a boundary rule, so the boundary is what needs pinning: 100 is
 * accepted, 101 is not. Every collection-plane sizing figure assumes ingestion is
 * bounded per server, so an off-by-one here quietly unbounds the write volume.
 */
import { describe, expect, it } from "vitest";

import { exceedsQueueLimit, MAX_QUEUES_PER_SERVER } from "../queue-limit";

describe("queue ceiling", () => {
  it("is 100 — the agreed domain rule, not a plan tier", () => {
    expect(MAX_QUEUES_PER_SERVER).toBe(100);
  });

  it("accepts up to and including the limit", () => {
    expect(exceedsQueueLimit(0)).toBe(false);
    expect(exceedsQueueLimit(1)).toBe(false);
    expect(exceedsQueueLimit(99)).toBe(false);
    // Exactly at the ceiling is allowed — "max 100 queues", not "under 100".
    expect(exceedsQueueLimit(MAX_QUEUES_PER_SERVER)).toBe(false);
  });

  it("refuses above the limit", () => {
    expect(exceedsQueueLimit(MAX_QUEUES_PER_SERVER + 1)).toBe(true);
    expect(exceedsQueueLimit(5_000)).toBe(true);
  });
});
