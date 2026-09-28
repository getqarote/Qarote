/**
 * The ceiling is a boundary rule, so the boundary is what needs pinning: 100 is
 * accepted, 101 is not. Every collection-plane sizing figure assumes ingestion is
 * bounded per server, so an off-by-one here quietly unbounds the write volume.
 */
import { describe, expect, it } from "vitest";

import {
  exceedsQueueLimit,
  MAX_QUEUES_PER_SERVER,
  queueLimitFor,
} from "../queue-limit";

describe("queue ceiling", () => {
  it("is 100 — the agreed domain rule, not a plan tier", () => {
    expect(MAX_QUEUES_PER_SERVER).toBe(100);
  });

  it("accepts up to and including the limit", () => {
    expect(exceedsQueueLimit(0, null)).toBe(false);
    expect(exceedsQueueLimit(1, null)).toBe(false);
    expect(exceedsQueueLimit(99, null)).toBe(false);
    // Exactly at the ceiling is allowed — "max 100 queues", not "under 100".
    expect(exceedsQueueLimit(MAX_QUEUES_PER_SERVER, null)).toBe(false);
  });

  it("refuses above the limit", () => {
    expect(exceedsQueueLimit(MAX_QUEUES_PER_SERVER + 1, null)).toBe(true);
    expect(exceedsQueueLimit(5_000, null)).toBe(true);
  });
});

describe("per-server override", () => {
  it("falls back to the default when no exception was granted", () => {
    expect(queueLimitFor(null)).toBe(MAX_QUEUES_PER_SERVER);
    expect(queueLimitFor(undefined)).toBe(MAX_QUEUES_PER_SERVER);
    expect(exceedsQueueLimit(101, null)).toBe(true);
  });

  it("moves the boundary to the granted value, inclusive", () => {
    expect(queueLimitFor(500)).toBe(500);
    expect(exceedsQueueLimit(348, 500)).toBe(false);
    expect(exceedsQueueLimit(500, 500)).toBe(false);
    expect(exceedsQueueLimit(501, 500)).toBe(true);
  });

  it("can also tighten below the default", () => {
    expect(exceedsQueueLimit(51, 50)).toBe(true);
    expect(exceedsQueueLimit(50, 50)).toBe(false);
  });
});
