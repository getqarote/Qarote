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
    it("FREE is 24h", () => {
      expect(PLAN_FEATURES[UserPlan.FREE].maxTraceRetentionHours).toBe(24);
    });

    it("DEVELOPER is 168h (7 days)", () => {
      expect(PLAN_FEATURES[UserPlan.DEVELOPER].maxTraceRetentionHours).toBe(
        168
      );
    });

    it("ENTERPRISE is 720h (30 days)", () => {
      expect(PLAN_FEATURES[UserPlan.ENTERPRISE].maxTraceRetentionHours).toBe(
        720
      );
    });

    it("DEVELOPER > FREE", () => {
      expect(
        PLAN_FEATURES[UserPlan.DEVELOPER].maxTraceRetentionHours
      ).toBeGreaterThan(PLAN_FEATURES[UserPlan.FREE].maxTraceRetentionHours);
    });

    it("ENTERPRISE > DEVELOPER", () => {
      expect(
        PLAN_FEATURES[UserPlan.ENTERPRISE].maxTraceRetentionHours
      ).toBeGreaterThan(
        PLAN_FEATURES[UserPlan.DEVELOPER].maxTraceRetentionHours
      );
    });
  });

  describe("maxMetricsRetentionHours", () => {
    it("FREE is 24h", () => {
      expect(PLAN_FEATURES[UserPlan.FREE].maxMetricsRetentionHours).toBe(24);
    });

    it("DEVELOPER is 168h (7 days)", () => {
      expect(PLAN_FEATURES[UserPlan.DEVELOPER].maxMetricsRetentionHours).toBe(
        168
      );
    });

    it("ENTERPRISE is 720h (30 days)", () => {
      expect(PLAN_FEATURES[UserPlan.ENTERPRISE].maxMetricsRetentionHours).toBe(
        720
      );
    });

    it("DEVELOPER > FREE", () => {
      expect(
        PLAN_FEATURES[UserPlan.DEVELOPER].maxMetricsRetentionHours
      ).toBeGreaterThan(PLAN_FEATURES[UserPlan.FREE].maxMetricsRetentionHours);
    });

    it("ENTERPRISE > DEVELOPER", () => {
      expect(
        PLAN_FEATURES[UserPlan.ENTERPRISE].maxMetricsRetentionHours
      ).toBeGreaterThan(
        PLAN_FEATURES[UserPlan.DEVELOPER].maxMetricsRetentionHours
      );
    });
  });
});
