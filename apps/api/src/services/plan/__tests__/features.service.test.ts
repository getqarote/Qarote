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
  });

  describe("DEVELOPER plan", () => {
    it("returns maxServers of 2", () => {
      expect(getPlanFeatures(UserPlan.DEVELOPER).maxServers).toBe(2);
    });

    it("returns maxWorkspaces of 2", () => {
      expect(getPlanFeatures(UserPlan.DEVELOPER).maxWorkspaces).toBe(2);
    });

    it("returns maxUsers of 2", () => {
      expect(getPlanFeatures(UserPlan.DEVELOPER).maxUsers).toBe(2);
    });

    it("returns maxInvitations of 1", () => {
      expect(getPlanFeatures(UserPlan.DEVELOPER).maxInvitations).toBe(1);
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
