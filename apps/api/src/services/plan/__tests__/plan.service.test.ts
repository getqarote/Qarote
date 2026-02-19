import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/core/prisma";

import {
  extractMajorMinorVersion,
  getUpgradeRecommendationForOverLimit,
  getUserPlan,
  PlanLimitExceededError,
  PlanValidationError,
  validateQueueCreationOnServer,
  validateRabbitMqVersion,
  validateServerCreation,
  validateUserInvitation,
  validateWorkspaceCreation,
} from "../plan.service";

import { UserPlan } from "@/generated/prisma/client";

vi.mock("@/core/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/core/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("PlanValidationError", () => {
  it("has name 'PlanValidationError'", () => {
    const err = new PlanValidationError(
      "Server creation",
      UserPlan.FREE,
      "Developer or Enterprise"
    );
    expect(err.name).toBe("PlanValidationError");
  });

  it("generates a message mentioning the feature and plan", () => {
    const err = new PlanValidationError(
      "Server creation",
      UserPlan.FREE,
      "Developer or Enterprise"
    );
    expect(err.message).toContain("Server creation");
    expect(err.message).toContain("FREE");
  });

  it("includes details when provided", () => {
    const err = new PlanValidationError(
      "Queue creation",
      UserPlan.FREE,
      UserPlan.DEVELOPER,
      0,
      undefined,
      "Upgrade to Developer plan to create queues."
    );
    expect(err.message).toContain(
      "Upgrade to Developer plan to create queues."
    );
  });

  it("is an instance of Error", () => {
    const err = new PlanValidationError("Feature", UserPlan.FREE, "Enterprise");
    expect(err).toBeInstanceOf(Error);
  });
});

describe("PlanLimitExceededError", () => {
  it("has name 'PlanLimitExceededError'", () => {
    const err = new PlanLimitExceededError(
      "Server creation",
      1,
      1,
      UserPlan.FREE
    );
    expect(err.name).toBe("PlanLimitExceededError");
  });

  it("generates a message with current count, limit, and plan", () => {
    const err = new PlanLimitExceededError(
      "Server creation",
      1,
      1,
      UserPlan.FREE
    );
    expect(err.message).toContain("Server creation");
    expect(err.message).toContain("1");
    expect(err.message).toContain("FREE");
  });

  it("is an instance of Error", () => {
    const err = new PlanLimitExceededError("Feature", 5, 3, UserPlan.DEVELOPER);
    expect(err).toBeInstanceOf(Error);
  });
});

describe("getUpgradeRecommendationForOverLimit", () => {
  it("recommends DEVELOPER for FREE plan", () => {
    const result = getUpgradeRecommendationForOverLimit(UserPlan.FREE);
    expect(result.recommendedPlan).toBe(UserPlan.DEVELOPER);
    expect(result.message).toContain("Developer");
  });

  it("recommends ENTERPRISE for DEVELOPER plan", () => {
    const result = getUpgradeRecommendationForOverLimit(UserPlan.DEVELOPER);
    expect(result.recommendedPlan).toBe(UserPlan.ENTERPRISE);
    expect(result.message).toContain("Enterprise");
  });

  it("returns null recommendedPlan for ENTERPRISE plan", () => {
    const result = getUpgradeRecommendationForOverLimit(UserPlan.ENTERPRISE);
    expect(result.recommendedPlan).toBeNull();
    expect(result.message).toContain("highest plan");
  });
});

describe("extractMajorMinorVersion", () => {
  it("extracts major.minor from a full version string", () => {
    expect(extractMajorMinorVersion("3.12.10")).toBe("3.12");
  });

  it("extracts major.minor from a version with patch", () => {
    expect(extractMajorMinorVersion("4.0.1")).toBe("4.0");
  });

  it("extracts major.minor from a pre-release version", () => {
    expect(extractMajorMinorVersion("4.1.0-rc.1")).toBe("4.1");
  });

  it("returns the original string when no match is found", () => {
    expect(extractMajorMinorVersion("invalid")).toBe("invalid");
  });

  it("extracts correctly for single-digit minor version", () => {
    expect(extractMajorMinorVersion("3.9.15")).toBe("3.9");
  });
});

describe("validateRabbitMqVersion", () => {
  describe("FREE plan", () => {
    it("does not throw for a supported version (3.12)", () => {
      expect(() =>
        validateRabbitMqVersion(UserPlan.FREE, "3.12.10")
      ).not.toThrow();
    });

    it("does not throw for version 4.0", () => {
      expect(() =>
        validateRabbitMqVersion(UserPlan.FREE, "4.0.5")
      ).not.toThrow();
    });

    it("throws PlanValidationError for unsupported version (3.0)", () => {
      expect(() => validateRabbitMqVersion(UserPlan.FREE, "3.0.5")).toThrow(
        PlanValidationError
      );
    });

    it("throws PlanValidationError for version 4.2 (not in FREE)", () => {
      expect(() => validateRabbitMqVersion(UserPlan.FREE, "4.2.0")).toThrow(
        PlanValidationError
      );
    });

    it("includes supported versions in the error message", () => {
      let caught: PlanValidationError | undefined;
      try {
        validateRabbitMqVersion(UserPlan.FREE, "3.0.0");
      } catch (e) {
        caught = e as PlanValidationError;
      }
      expect(caught).toBeDefined();
      expect(caught!.message).toContain("3.12");
    });
  });

  describe("DEVELOPER plan", () => {
    it("does not throw for version 3.0", () => {
      expect(() =>
        validateRabbitMqVersion(UserPlan.DEVELOPER, "3.0.0")
      ).not.toThrow();
    });

    it("does not throw for version 4.2", () => {
      expect(() =>
        validateRabbitMqVersion(UserPlan.DEVELOPER, "4.2.0")
      ).not.toThrow();
    });
  });

  describe("ENTERPRISE plan", () => {
    it("does not throw for version 3.0", () => {
      expect(() =>
        validateRabbitMqVersion(UserPlan.ENTERPRISE, "3.0.0")
      ).not.toThrow();
    });

    it("does not throw for version 4.2", () => {
      expect(() =>
        validateRabbitMqVersion(UserPlan.ENTERPRISE, "4.2.0")
      ).not.toThrow();
    });
  });
});

describe("validateServerCreation", () => {
  it("does not throw when count is below maxServers for FREE (count 0)", () => {
    expect(() => validateServerCreation(UserPlan.FREE, 0)).not.toThrow();
  });

  it("throws PlanLimitExceededError when count equals maxServers for FREE (count 1)", () => {
    expect(() => validateServerCreation(UserPlan.FREE, 1)).toThrow(
      PlanLimitExceededError
    );
  });

  it("throws PlanLimitExceededError when count exceeds maxServers for FREE (count 2)", () => {
    expect(() => validateServerCreation(UserPlan.FREE, 2)).toThrow(
      PlanLimitExceededError
    );
  });

  it("does not throw when count is 1 for DEVELOPER (below limit of 2)", () => {
    expect(() => validateServerCreation(UserPlan.DEVELOPER, 1)).not.toThrow();
  });

  it("throws PlanLimitExceededError when count equals maxServers for DEVELOPER (count 2)", () => {
    expect(() => validateServerCreation(UserPlan.DEVELOPER, 2)).toThrow(
      PlanLimitExceededError
    );
  });

  it("does not throw for ENTERPRISE with a high count (unlimited)", () => {
    expect(() =>
      validateServerCreation(UserPlan.ENTERPRISE, 100)
    ).not.toThrow();
  });
});

describe("validateWorkspaceCreation", () => {
  it("does not throw when count is below maxWorkspaces for FREE (count 0)", () => {
    expect(() => validateWorkspaceCreation(UserPlan.FREE, 0)).not.toThrow();
  });

  it("throws PlanLimitExceededError when count equals maxWorkspaces for FREE (count 1)", () => {
    expect(() => validateWorkspaceCreation(UserPlan.FREE, 1)).toThrow(
      PlanLimitExceededError
    );
  });

  it("throws PlanLimitExceededError when count equals maxWorkspaces for DEVELOPER (count 2)", () => {
    expect(() => validateWorkspaceCreation(UserPlan.DEVELOPER, 2)).toThrow(
      PlanLimitExceededError
    );
  });

  it("does not throw for ENTERPRISE with a high count", () => {
    expect(() =>
      validateWorkspaceCreation(UserPlan.ENTERPRISE, 100)
    ).not.toThrow();
  });
});

describe("validateUserInvitation", () => {
  it("throws PlanValidationError for FREE plan (canInviteUsers=false)", () => {
    expect(() => validateUserInvitation(UserPlan.FREE, 0, 0)).toThrow(
      PlanValidationError
    );
  });

  it("does not throw for DEVELOPER with 1 user and 0 invitations (below limits)", () => {
    expect(() =>
      validateUserInvitation(UserPlan.DEVELOPER, 1, 0)
    ).not.toThrow();
  });

  it("throws PlanLimitExceededError for DEVELOPER when totalUsers equals maxUsers (2)", () => {
    // totalUsers = currentUserCount + pendingInvitations = 2 + 0 = 2 >= maxUsers (2)
    expect(() => validateUserInvitation(UserPlan.DEVELOPER, 2, 0)).toThrow(
      PlanLimitExceededError
    );
  });

  it("throws PlanLimitExceededError for DEVELOPER when pending invitations equals maxInvitations (1)", () => {
    expect(() => validateUserInvitation(UserPlan.DEVELOPER, 0, 1)).toThrow(
      PlanLimitExceededError
    );
  });

  it("does not throw for ENTERPRISE with high counts (unlimited)", () => {
    expect(() =>
      validateUserInvitation(UserPlan.ENTERPRISE, 50, 20)
    ).not.toThrow();
  });
});

describe("validateQueueCreationOnServer", () => {
  it("does not throw for FREE plan (canAddQueue=true)", () => {
    expect(() => validateQueueCreationOnServer(UserPlan.FREE, 0)).not.toThrow();
  });

  it("does not throw for DEVELOPER plan", () => {
    expect(() =>
      validateQueueCreationOnServer(UserPlan.DEVELOPER, 10)
    ).not.toThrow();
  });

  it("does not throw for ENTERPRISE plan with many queues", () => {
    expect(() =>
      validateQueueCreationOnServer(UserPlan.ENTERPRISE, 1000)
    ).not.toThrow();
  });
});

describe("getUserPlan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the subscription plan when user has an active subscription", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      subscription: { plan: UserPlan.ENTERPRISE },
    } as never);

    const plan = await getUserPlan("user-1");
    expect(plan).toBe(UserPlan.ENTERPRISE);
  });

  it("returns FREE when user exists but has no subscription", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      subscription: null,
    } as never);

    const plan = await getUserPlan("user-1");
    expect(plan).toBe(UserPlan.FREE);
  });

  it("throws 'User not found' when user does not exist", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    await expect(getUserPlan("non-existent")).rejects.toThrow("User not found");
  });
});
