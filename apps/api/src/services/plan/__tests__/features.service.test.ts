import { describe, expect, it } from "vitest";

import { getPlanFeatures, PLAN_FEATURES } from "../features.service";

import { UserPlan } from "@/generated/prisma/client";

describe("getPlanFeatures", () => {
  describe("FREE plan", () => {
    it("returns maxServers of 1", () => {
      expect(getPlanFeatures(UserPlan.FREE).maxServers).toBe(1);
    });

    it("returns maxWorkspaces of 1", () => {
      expect(getPlanFeatures(UserPlan.FREE).maxWorkspaces).toBe(1);
    });

    it("returns maxUsers of 1", () => {
      expect(getPlanFeatures(UserPlan.FREE).maxUsers).toBe(1);
    });

    it("returns maxInvitations of 0", () => {
      expect(getPlanFeatures(UserPlan.FREE).maxInvitations).toBe(0);
    });

    it("returns canInviteUsers as false", () => {
      expect(getPlanFeatures(UserPlan.FREE).canInviteUsers).toBe(false);
    });

    it("returns canAddServer as true", () => {
      expect(getPlanFeatures(UserPlan.FREE).canAddServer).toBe(true);
    });

    it("returns canAddQueue as true", () => {
      expect(getPlanFeatures(UserPlan.FREE).canAddQueue).toBe(true);
    });

    it("returns hasEmailAlerts as false", () => {
      expect(getPlanFeatures(UserPlan.FREE).hasEmailAlerts).toBe(false);
    });

    it("returns hasPrioritySupport as false", () => {
      expect(getPlanFeatures(UserPlan.FREE).hasPrioritySupport).toBe(false);
    });

    it("only supports recent RabbitMQ versions", () => {
      const versions = getPlanFeatures(UserPlan.FREE).supportedRabbitMqVersions;
      expect(versions).toContain("3.12");
      expect(versions).toContain("3.13");
      expect(versions).toContain("4.0");
      expect(versions).toContain("4.1");
      expect(versions).not.toContain("3.0");
      expect(versions).not.toContain("3.11");
      expect(versions).not.toContain("4.2");
    });

    it("returns displayName of 'Free'", () => {
      expect(getPlanFeatures(UserPlan.FREE).displayName).toBe("Free");
    });

    it("returns ltsOnly as true", () => {
      expect(getPlanFeatures(UserPlan.FREE).ltsOnly).toBe(true);
    });

    it("returns monthlyPrice of 0", () => {
      expect(getPlanFeatures(UserPlan.FREE).monthlyPrice).toBe(0);
    });

    it("returns hasAdvancedAnalytics as false", () => {
      expect(getPlanFeatures(UserPlan.FREE).hasAdvancedAnalytics).toBe(false);
    });

    it("returns hasAlerts as false", () => {
      expect(getPlanFeatures(UserPlan.FREE).hasAlerts).toBe(false);
    });

    it("returns hasTopologyVisualization as false", () => {
      expect(getPlanFeatures(UserPlan.FREE).hasTopologyVisualization).toBe(false);
    });

    it("returns hasRoleBasedAccess as false", () => {
      expect(getPlanFeatures(UserPlan.FREE).hasRoleBasedAccess).toBe(false);
    });

    it("returns hasSoc2Compliance as true", () => {
      expect(getPlanFeatures(UserPlan.FREE).hasSoc2Compliance).toBe(true);
    });

    it("returns isPopular as false", () => {
      expect(getPlanFeatures(UserPlan.FREE).isPopular).toBe(false);
    });
  });

  describe("DEVELOPER plan", () => {
    it("returns maxServers of 3", () => {
      expect(getPlanFeatures(UserPlan.DEVELOPER).maxServers).toBe(3);
    });

    it("returns maxWorkspaces of 3", () => {
      expect(getPlanFeatures(UserPlan.DEVELOPER).maxWorkspaces).toBe(3);
    });

    it("returns maxUsers of 3", () => {
      expect(getPlanFeatures(UserPlan.DEVELOPER).maxUsers).toBe(3);
    });

    it("returns maxInvitations of 2", () => {
      expect(getPlanFeatures(UserPlan.DEVELOPER).maxInvitations).toBe(2);
    });

    it("returns canInviteUsers as true", () => {
      expect(getPlanFeatures(UserPlan.DEVELOPER).canInviteUsers).toBe(true);
    });

    it("returns hasEmailAlerts as true", () => {
      expect(getPlanFeatures(UserPlan.DEVELOPER).hasEmailAlerts).toBe(true);
    });

    it("supports older RabbitMQ versions including 3.0", () => {
      const versions = getPlanFeatures(
        UserPlan.DEVELOPER
      ).supportedRabbitMqVersions;
      expect(versions).toContain("3.0");
      expect(versions).toContain("3.12");
      expect(versions).toContain("4.2");
    });

    it("returns displayName of 'Developer'", () => {
      expect(getPlanFeatures(UserPlan.DEVELOPER).displayName).toBe("Developer");
    });

    it("returns monthlyPrice of 3400 ($34)", () => {
      expect(getPlanFeatures(UserPlan.DEVELOPER).monthlyPrice).toBe(3400);
    });

    it("returns yearlyPrice of 34800 ($348/yr = $29/mo)", () => {
      expect(getPlanFeatures(UserPlan.DEVELOPER).yearlyPrice).toBe(34800);
    });

    it("returns ltsOnly as false", () => {
      expect(getPlanFeatures(UserPlan.DEVELOPER).ltsOnly).toBe(false);
    });

    it("returns isPopular as true", () => {
      expect(getPlanFeatures(UserPlan.DEVELOPER).isPopular).toBe(true);
    });

    it("returns hasAdvancedAnalytics as true", () => {
      expect(getPlanFeatures(UserPlan.DEVELOPER).hasAdvancedAnalytics).toBe(true);
    });

    it("returns hasAlerts as true", () => {
      expect(getPlanFeatures(UserPlan.DEVELOPER).hasAlerts).toBe(true);
    });

    it("returns hasTopologyVisualization as coming_soon", () => {
      expect(getPlanFeatures(UserPlan.DEVELOPER).hasTopologyVisualization).toBe("coming_soon");
    });

    it("returns hasRoleBasedAccess as coming_soon", () => {
      expect(getPlanFeatures(UserPlan.DEVELOPER).hasRoleBasedAccess).toBe("coming_soon");
    });

    it("returns hasSoc2Compliance as true", () => {
      expect(getPlanFeatures(UserPlan.DEVELOPER).hasSoc2Compliance).toBe(true);
    });

    it("returns hasSsoSamlOidc as false", () => {
      expect(getPlanFeatures(UserPlan.DEVELOPER).hasSsoSamlOidc).toBe(false);
    });

    it("has featureDescriptions matching numeric limits", () => {
      const descriptions = getPlanFeatures(
        UserPlan.DEVELOPER
      ).featureDescriptions;
      expect(descriptions).toContain("3 RabbitMQ servers");
      expect(descriptions).toContain("3 workspaces");
      expect(descriptions).toContain("3 users");
    });
  });

  describe("ENTERPRISE plan", () => {
    it("returns null maxServers (unlimited)", () => {
      expect(getPlanFeatures(UserPlan.ENTERPRISE).maxServers).toBeNull();
    });

    it("returns null maxWorkspaces (unlimited)", () => {
      expect(getPlanFeatures(UserPlan.ENTERPRISE).maxWorkspaces).toBeNull();
    });

    it("returns null maxUsers (unlimited)", () => {
      expect(getPlanFeatures(UserPlan.ENTERPRISE).maxUsers).toBeNull();
    });

    it("returns null maxInvitations (unlimited)", () => {
      expect(getPlanFeatures(UserPlan.ENTERPRISE).maxInvitations).toBeNull();
    });

    it("returns canInviteUsers as true", () => {
      expect(getPlanFeatures(UserPlan.ENTERPRISE).canInviteUsers).toBe(true);
    });

    it("returns hasEmailAlerts as true", () => {
      expect(getPlanFeatures(UserPlan.ENTERPRISE).hasEmailAlerts).toBe(true);
    });

    it("returns hasPrioritySupport as true", () => {
      expect(getPlanFeatures(UserPlan.ENTERPRISE).hasPrioritySupport).toBe(
        true
      );
    });

    it("supports all RabbitMQ versions including 3.0 and 4.2", () => {
      const versions = getPlanFeatures(
        UserPlan.ENTERPRISE
      ).supportedRabbitMqVersions;
      expect(versions).toContain("3.0");
      expect(versions).toContain("3.12");
      expect(versions).toContain("4.2");
    });

    it("returns displayName of 'Enterprise'", () => {
      expect(getPlanFeatures(UserPlan.ENTERPRISE).displayName).toBe(
        "Enterprise"
      );
    });

    it("returns monthlyPrice of 12400 ($124)", () => {
      expect(getPlanFeatures(UserPlan.ENTERPRISE).monthlyPrice).toBe(12400);
    });

    it("returns yearlyPrice of 118800 ($1188/yr = $99/mo)", () => {
      expect(getPlanFeatures(UserPlan.ENTERPRISE).yearlyPrice).toBe(118800);
    });

    it("returns hasSsoSamlOidc as true", () => {
      expect(getPlanFeatures(UserPlan.ENTERPRISE).hasSsoSamlOidc).toBe(true);
    });

    it("returns hasAdvancedAnalytics as true", () => {
      expect(getPlanFeatures(UserPlan.ENTERPRISE).hasAdvancedAnalytics).toBe(true);
    });

    it("returns hasAlerts as true", () => {
      expect(getPlanFeatures(UserPlan.ENTERPRISE).hasAlerts).toBe(true);
    });

    it("returns hasTopologyVisualization as coming_soon", () => {
      expect(getPlanFeatures(UserPlan.ENTERPRISE).hasTopologyVisualization).toBe("coming_soon");
    });

    it("returns hasRoleBasedAccess as coming_soon", () => {
      expect(getPlanFeatures(UserPlan.ENTERPRISE).hasRoleBasedAccess).toBe("coming_soon");
    });

    it("returns hasSoc2Compliance as true", () => {
      expect(getPlanFeatures(UserPlan.ENTERPRISE).hasSoc2Compliance).toBe(true);
    });

    it("returns isPopular as false", () => {
      expect(getPlanFeatures(UserPlan.ENTERPRISE).isPopular).toBe(false);
    });
  });

  describe("PLAN_FEATURES constant", () => {
    it("contains entries for all three plan tiers", () => {
      expect(PLAN_FEATURES).toHaveProperty(UserPlan.FREE);
      expect(PLAN_FEATURES).toHaveProperty(UserPlan.DEVELOPER);
      expect(PLAN_FEATURES).toHaveProperty(UserPlan.ENTERPRISE);
    });

    it("getPlanFeatures returns the same object as PLAN_FEATURES lookup", () => {
      expect(getPlanFeatures(UserPlan.FREE)).toBe(PLAN_FEATURES[UserPlan.FREE]);
      expect(getPlanFeatures(UserPlan.DEVELOPER)).toBe(
        PLAN_FEATURES[UserPlan.DEVELOPER]
      );
      expect(getPlanFeatures(UserPlan.ENTERPRISE)).toBe(
        PLAN_FEATURES[UserPlan.ENTERPRISE]
      );
    });
  });
});
