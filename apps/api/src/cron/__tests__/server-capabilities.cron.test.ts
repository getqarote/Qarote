/**
 * Determinism + spread of the capability cron's per-server jitter.
 *
 * The cron schedules each server at `cycleStart + jitterDelay(serverId)`
 * — `jitterDelay` must be:
 *   - **Stable**: same input → same output (otherwise a flapping server
 *     gets re-scheduled every cycle and we lose deterministic spread).
 *   - **Spread**: different inputs distribute evenly across the window
 *     (otherwise we re-create the thundering-herd we set out to avoid).
 *
 * The bands below are loose — they catch only catastrophic regressions
 * (e.g. a hash returning 0 for everything). True statistical uniformity
 * is not the goal; collision avoidance is.
 */

import { describe, expect, it } from "vitest";

import { __test__ } from "@/cron/server-capabilities.cron";

const { jitterDelay } = __test__;

describe("server-capabilities cron — jitterDelay", () => {
  const WINDOW = 30 * 60 * 1000; // 30 minutes

  it("returns the same delay for the same serverId every call (deterministic)", () => {
    const id = "srv_aaaa-bbbb-cccc";
    const a = jitterDelay(id, WINDOW);
    const b = jitterDelay(id, WINDOW);
    const c = jitterDelay(id, WINDOW);
    expect(b).toBe(a);
    expect(c).toBe(a);
  });

  it("returns a non-negative value strictly less than the window", () => {
    for (const id of ["a", "srv_1", "srv_2", "uuid-aaaa-bbbb-cccc-dddd"]) {
      const delay = jitterDelay(id, WINDOW);
      expect(delay).toBeGreaterThanOrEqual(0);
      expect(delay).toBeLessThan(WINDOW);
    }
  });

  it("spreads 100 distinct serverIds across more than 50 distinct buckets", () => {
    const buckets = new Set<number>();
    for (let i = 0; i < 100; i++) {
      const id = `srv-${i.toString(36)}-${(i * 7919).toString(16)}`;
      buckets.add(jitterDelay(id, WINDOW));
    }
    // With 100 inputs and a 30-minute window (1.8M ms), uniform spread
    // would give ~100 distinct buckets. We require > 50 to allow for any
    // clustering while still failing if the hash collapses to a constant.
    expect(buckets.size).toBeGreaterThan(50);
  });
});
