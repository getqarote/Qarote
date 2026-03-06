import { beforeEach, describe, expect, it, vi } from "vitest";

import type { LicenseJwtPayload } from "@/services/license/license.interfaces";

import { UserPlan } from "@/generated/prisma/client";

// --- Mocks ---

const mockUserFindUnique = vi.fn();
const mockSubscriptionFindUnique = vi.fn();
const mockWorkspaceCount = vi.fn();

vi.mock("@/core/prisma", () => ({
  prisma: {
    user: { findUnique: (...args: unknown[]) => mockUserFindUnique(...args) },
    subscription: {
      findUnique: (...args: unknown[]) => mockSubscriptionFindUnique(...args),
    },
    workspace: {
      count: (...args: unknown[]) => mockWorkspaceCount(...args),
    },
  },
}));

const mockGetLicensePayload = vi.fn();
vi.mock("@/core/feature-flags", () => ({
  getLicensePayload: (...args: unknown[]) => mockGetLicensePayload(...args),
  invalidateLicenseCache: vi.fn(),
}));

let mockSelfHostedMode = false;
vi.mock("@/config/deployment", () => ({
  isSelfHostedMode: () => mockSelfHostedMode,
}));

vi.mock("@/core/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// Mock rate limiter to be a passthrough
vi.mock("../../../middlewares/rateLimiter", () => ({
  standardRateLimiter: (opts: { next: () => unknown }) => opts.next(),
  strictRateLimiter: (opts: { next: () => unknown }) => opts.next(),
  billingRateLimiter: (opts: { next: () => unknown }) => opts.next(),
}));

// Mock workspace middleware
vi.mock("@/middlewares/workspace", () => ({
  hasWorkspaceAccess: vi.fn().mockResolvedValue(true),
}));

// Import after mocks
const { planRouter } = await import("../plan");

// --- Helpers ---

const validPayload: LicenseJwtPayload = {
  sub: "lic-test-123",
  tier: UserPlan.DEVELOPER,
  features: ["alerting", "workspace_management", "data_export"],
  iss: "qarote",
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600,
};

function makeCtx() {
  return {
    prisma: {
      user: { findUnique: mockUserFindUnique },
      subscription: { findUnique: mockSubscriptionFindUnique },
      workspace: { count: mockWorkspaceCount },
    },
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    user: {
      id: "user-1",
      role: "ADMIN",
      isActive: true,
      email: "admin@test.com",
    },
    workspaceId: "ws-1",
    locale: "en",
    req: {},
  };
}

function mockUserWithWorkspace(overrides?: {
  subscriptionPlan?: UserPlan;
  ownerId?: string;
  memberCount?: number;
  serverCount?: number;
}) {
  const {
    subscriptionPlan,
    ownerId = "user-1",
    memberCount = 1,
    serverCount = 0,
  } = overrides || {};

  mockUserFindUnique.mockResolvedValue({
    id: "user-1",
    email: "admin@test.com",
    subscription: subscriptionPlan
      ? { plan: subscriptionPlan, status: "ACTIVE" }
      : null,
    workspace: {
      id: "ws-1",
      name: "Test Workspace",
      ownerId,
      _count: { members: memberCount, servers: serverCount },
    },
  });
}

// --- Tests ---

describe("planRouter.getCurrentPlan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelfHostedMode = false;
    mockWorkspaceCount.mockResolvedValue(1);
    mockSubscriptionFindUnique.mockResolvedValue(null);
  });

  it("returns FREE plan when no subscription and not self-hosted", async () => {
    mockUserWithWorkspace();

    const caller = planRouter.createCaller(makeCtx() as never);
    const result = await caller.getCurrentPlan();

    expect(result.user.plan).toBe(UserPlan.FREE);
    expect(result.planFeatures.displayName).toBe("Free");
  });

  it("returns subscription plan when Stripe subscription exists", async () => {
    mockUserWithWorkspace({ subscriptionPlan: UserPlan.ENTERPRISE });
    mockSubscriptionFindUnique.mockResolvedValue({
      plan: UserPlan.ENTERPRISE,
      status: "ACTIVE",
    });

    const caller = planRouter.createCaller(makeCtx() as never);
    const result = await caller.getCurrentPlan();

    expect(result.user.plan).toBe(UserPlan.ENTERPRISE);
    expect(result.planFeatures.displayName).toBe("Enterprise");
  });

  describe("self-hosted license fallback", () => {
    beforeEach(() => {
      mockSelfHostedMode = true;
    });

    it("uses license JWT tier when no Stripe subscription exists", async () => {
      mockUserWithWorkspace();
      mockGetLicensePayload.mockResolvedValue(validPayload);

      const caller = planRouter.createCaller(makeCtx() as never);
      const result = await caller.getCurrentPlan();

      expect(result.user.plan).toBe(UserPlan.DEVELOPER);
      expect(result.planFeatures.displayName).toBe("Developer");
      expect(result.planFeatures.maxServers).toBe(3);
      expect(result.planFeatures.canInviteUsers).toBe(true);
    });

    it("uses ENTERPRISE tier from license JWT", async () => {
      mockUserWithWorkspace();
      mockGetLicensePayload.mockResolvedValue({
        ...validPayload,
        tier: UserPlan.ENTERPRISE,
      });

      const caller = planRouter.createCaller(makeCtx() as never);
      const result = await caller.getCurrentPlan();

      expect(result.user.plan).toBe(UserPlan.ENTERPRISE);
      expect(result.planFeatures.displayName).toBe("Enterprise");
      expect(result.planFeatures.maxServers).toBeNull(); // unlimited
      expect(result.planFeatures.hasPrioritySupport).toBe(true);
    });

    it("stays FREE when no license JWT exists", async () => {
      mockUserWithWorkspace();
      mockGetLicensePayload.mockResolvedValue(null);

      const caller = planRouter.createCaller(makeCtx() as never);
      const result = await caller.getCurrentPlan();

      expect(result.user.plan).toBe(UserPlan.FREE);
      expect(result.planFeatures.displayName).toBe("Free");
    });

    it("prefers Stripe subscription over license JWT", async () => {
      mockUserWithWorkspace({ subscriptionPlan: UserPlan.ENTERPRISE });
      mockSubscriptionFindUnique.mockResolvedValue({
        plan: UserPlan.ENTERPRISE,
        status: "ACTIVE",
      });
      // License says DEVELOPER, but Stripe says ENTERPRISE
      mockGetLicensePayload.mockResolvedValue(validPayload);

      const caller = planRouter.createCaller(makeCtx() as never);
      const result = await caller.getCurrentPlan();

      // Should use Stripe subscription (ENTERPRISE), not license (DEVELOPER)
      expect(result.user.plan).toBe(UserPlan.ENTERPRISE);
      // getLicensePayload should not even be called since subscription exists
      expect(mockGetLicensePayload).not.toHaveBeenCalled();
    });

    it("returns correct usage limits for DEVELOPER license", async () => {
      mockUserWithWorkspace({ serverCount: 1 });
      mockGetLicensePayload.mockResolvedValue(validPayload);

      const caller = planRouter.createCaller(makeCtx() as never);
      const result = await caller.getCurrentPlan();

      expect(result.usage.servers.current).toBe(1);
      expect(result.usage.servers.limit).toBe(3);
      expect(result.usage.servers.canAdd).toBe(true);
      expect(result.usage.users.limit).toBe(3);
    });

    it("does not use license fallback in cloud mode", async () => {
      mockSelfHostedMode = false;
      mockUserWithWorkspace();
      mockGetLicensePayload.mockResolvedValue(validPayload);

      const caller = planRouter.createCaller(makeCtx() as never);
      const result = await caller.getCurrentPlan();

      expect(result.user.plan).toBe(UserPlan.FREE);
      expect(mockGetLicensePayload).not.toHaveBeenCalled();
    });
  });
});
