import { describe, expect, it } from "vitest";

import { classifyCoverageBand } from "./MetricsStatusStrip";

/**
 * Unit coverage for the pure band classifier — the only branch in the
 * stat cell that benefits from isolated testing. Per the plan §6 and
 * FE-N5 (Frontend Developer review), Qarote's frontend has near-zero
 * RTL coverage today; we deliberately do NOT introduce RTL DOM tests
 * for one feature. Visible-state coverage is deferred to the Playwright
 * E2E suite in apps/e2e.
 *
 * The classifier's contract is exercised exhaustively here (empty,
 * boundary at the 70% gate, both sides of the gate) so the visual
 * tone selection in the cell never silently changes meaning.
 */
describe("classifyCoverageBand", () => {
  it("returns 'empty' when no publishes have been observed", () => {
    expect(classifyCoverageBand(0, 0)).toBe("empty");
  });

  it("returns 'empty' when totalPublishes is negative (defensive)", () => {
    // Should never happen given the SQL invariant, but the helper
    // should still degrade gracefully rather than divide a negative.
    expect(classifyCoverageBand(0, -1)).toBe("empty");
  });

  it("returns 'muted' for a zero-tagged broker with traffic (0% coverage)", () => {
    expect(classifyCoverageBand(0, 100)).toBe("muted");
  });

  it("returns 'muted' just below the 70% boundary (69%)", () => {
    expect(classifyCoverageBand(69, 100)).toBe("muted");
  });

  it("returns 'emerald' exactly at the 70% boundary (inclusive)", () => {
    // Gate is `>= 0.7` — 70% itself is the smallest coverage that
    // unlocks the firehose-evidence patterns. Regression guard so a
    // future refactor doesn't silently flip the boundary to strict-gt.
    expect(classifyCoverageBand(70, 100)).toBe("emerald");
  });

  it("returns 'emerald' for full coverage (100%)", () => {
    expect(classifyCoverageBand(100, 100)).toBe("emerald");
  });

  it("returns 'muted' at the 30% mid-tier (not painted differently per UX-B2)", () => {
    // The UX review explicitly collapsed 3 visual bands to 2 — the
    // 30-70% range MUST render the same tone as 0-30% (no scolding
    // amber on the low end). This test pins that decision.
    expect(classifyCoverageBand(30, 100)).toBe("muted");
    expect(classifyCoverageBand(50, 100)).toBe("muted");
  });
});
