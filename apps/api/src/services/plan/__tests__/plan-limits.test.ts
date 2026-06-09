import { describe, expect, it } from "vitest";

import { PLAN_FEATURES } from "../features.service";

import { UserPlan } from "@/generated/prisma/client";

/**
 * Regression guard for plan retention limits.
 * These tests catch typos in the PLAN_FEATURES constant and enforce the
 * ordering invariant (higher tier = more retention).
 */
describe("PlanFeatures retention limits", () => {
  describe("maxTraceRetentionHours", () => {
    it("FREE is 6h", () => {
      expect(PLAN_FEATURES[UserPlan.FREE].maxTraceRetentionHours).toBe(6);
    });

    it("DEVELOPER is 168h (7 days)", () => {
      expect(PLAN_FEATURES[UserPlan.DEVELOPER].maxTraceRetentionHours).toBe(
        168
      );
    });

    // ENTERPRISE matches DEVELOPER (168h) since trace storage is a uniform
    // 7-day chunk-drop for every paid plan — a larger query window would only
    // silently return the 7 days that actually exist.
    it("ENTERPRISE is 168h (7 days), matching storage", () => {
      expect(PLAN_FEATURES[UserPlan.ENTERPRISE].maxTraceRetentionHours).toBe(
        168
      );
    });

    it("DEVELOPER > FREE", () => {
      expect(
        PLAN_FEATURES[UserPlan.DEVELOPER].maxTraceRetentionHours
      ).toBeGreaterThan(PLAN_FEATURES[UserPlan.FREE].maxTraceRetentionHours);
    });

    it("ENTERPRISE >= DEVELOPER", () => {
      expect(
        PLAN_FEATURES[UserPlan.ENTERPRISE].maxTraceRetentionHours
      ).toBeGreaterThanOrEqual(
        PLAN_FEATURES[UserPlan.DEVELOPER].maxTraceRetentionHours
      );
    });
  });

  // maxMetricsRetentionHours was removed — metrics retention is now a uniform
  // 30-day TimescaleDB chunk-drop (no per-plan gating). The metric query window
  // is covered by resolve-allowed-range.test.ts.
});
