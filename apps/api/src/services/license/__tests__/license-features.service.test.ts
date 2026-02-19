import { describe, expect, it } from "vitest";

import { getAllPremiumFeatures } from "@/config/features";

import { getLicenseFeaturesForTier } from "../license-features.service";

import { UserPlan } from "@/generated/prisma/client";

describe("getLicenseFeaturesForTier", () => {
  describe("FREE tier", () => {
    it("returns an empty array", () => {
      expect(getLicenseFeaturesForTier(UserPlan.FREE)).toEqual([]);
    });
  });

  describe("DEVELOPER tier", () => {
    it("includes workspace_management", () => {
      expect(getLicenseFeaturesForTier(UserPlan.DEVELOPER)).toContain(
        "workspace_management"
      );
    });

    it("includes alerting", () => {
      expect(getLicenseFeaturesForTier(UserPlan.DEVELOPER)).toContain(
        "alerting"
      );
    });

    it("includes data_export", () => {
      expect(getLicenseFeaturesForTier(UserPlan.DEVELOPER)).toContain(
        "data_export"
      );
    });

    it("does not include slack_integration", () => {
      expect(getLicenseFeaturesForTier(UserPlan.DEVELOPER)).not.toContain(
        "slack_integration"
      );
    });

    it("does not include webhook_integration", () => {
      expect(getLicenseFeaturesForTier(UserPlan.DEVELOPER)).not.toContain(
        "webhook_integration"
      );
    });

    it("does not include advanced_alert_rules", () => {
      expect(getLicenseFeaturesForTier(UserPlan.DEVELOPER)).not.toContain(
        "advanced_alert_rules"
      );
    });

    it("returns exactly 3 features", () => {
      expect(getLicenseFeaturesForTier(UserPlan.DEVELOPER)).toHaveLength(3);
    });
  });

  describe("ENTERPRISE tier", () => {
    it("returns all premium features", () => {
      const enterpriseFeatures = getLicenseFeaturesForTier(UserPlan.ENTERPRISE);
      const allFeatures = getAllPremiumFeatures();
      expect(enterpriseFeatures).toEqual(allFeatures);
    });

    it("includes slack_integration", () => {
      expect(getLicenseFeaturesForTier(UserPlan.ENTERPRISE)).toContain(
        "slack_integration"
      );
    });

    it("includes webhook_integration", () => {
      expect(getLicenseFeaturesForTier(UserPlan.ENTERPRISE)).toContain(
        "webhook_integration"
      );
    });

    it("includes advanced_alert_rules", () => {
      expect(getLicenseFeaturesForTier(UserPlan.ENTERPRISE)).toContain(
        "advanced_alert_rules"
      );
    });

    it("includes workspace_management", () => {
      expect(getLicenseFeaturesForTier(UserPlan.ENTERPRISE)).toContain(
        "workspace_management"
      );
    });
  });
});
