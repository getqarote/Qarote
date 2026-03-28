import { beforeEach, describe, expect, it, vi } from "vitest";

import type { LicenseJwtPayload } from "@/services/license/license.interfaces";

import { UserPlan } from "@/generated/prisma/client";

// --- Mocks ---

const mockUserFindUnique = vi.fn();
const mockWorkspaceCount = vi.fn();
const mockOrgMemberFindFirst = vi.fn();
const mockWorkspaceMemberCount = vi.fn();

vi.mock("@/core/prisma", () => ({
  prisma: {
    user: { findUnique: (...args: unknown[]) => mockUserFindUnique(...args) },
    workspace: {
      count: (...args: unknown[]) => mockWorkspaceCount(...args),
    },
    organizationMember: {
      findFirst: (...args: unknown[]) => mockOrgMemberFindFirst(...args),
    },
    workspaceMember: {
      count: (...args: unknown[]) => mockWorkspaceMemberCount(...args),
    },
  },
}));

const mockGetWorkspacePlan = vi.fn();
vi.mock("@/services/plan/plan.service", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    getWorkspacePlan: (...args: unknown[]) => mockGetWorkspacePlan(...args),
  };
});

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
const { orgPlanRouter } = await import("../plan");

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
      workspace: { count: mockWorkspaceCount },
      organizationMember: { findFirst: mockOrgMemberFindFirst },
      workspaceMember: { count: mockWorkspaceMemberCount },
    },
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    user: {
      id: "user-1",
      role: "ADMIN",
      isActive: true,
      email: "admin@test.com",
    },
    workspaceId: "ws-1",
    organizationId: "org-1",
    orgRole: "OWNER",
    resolveOrg: vi.fn().mockResolvedValue({
      organizationId: "org-1",
      role: "OWNER",
    }),
    locale: "en",
    req: {},
  };
}

function mockUserWithWorkspace(overrides?: {
  memberCount?: number;
  serverCount?: number;
}) {
  const { memberCount = 1, serverCount = 0 } = overrides || {};

  mockUserFindUnique.mockResolvedValue({
    id: "user-1",
    email: "admin@test.com",
    workspace: {
      id: "ws-1",
      name: "Test Workspace",
      _count: { members: memberCount, servers: serverCount },
    },
  });
}

// --- Tests ---

describe("orgPlanRouter.getCurrentOrgPlan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelfHostedMode = false;
    mockGetWorkspacePlan.mockResolvedValue(UserPlan.FREE);
    mockOrgMemberFindFirst.mockResolvedValue({
      organizationId: "org-1",
    });
    mockWorkspaceCount.mockResolvedValue(1);
  });

  it("returns FREE plan when no subscription and not self-hosted", async () => {
    mockUserWithWorkspace();
    mockGetWorkspacePlan.mockResolvedValue(UserPlan.FREE);

    const caller = orgPlanRouter.createCaller(makeCtx() as never);
    const result = await caller.getCurrentOrgPlan();

    expect(result.user.plan).toBe(UserPlan.FREE);
    expect(result.planFeatures.displayName).toBe("Free");
  });

  it("returns subscription plan when Stripe subscription exists", async () => {
    mockUserWithWorkspace();
    mockGetWorkspacePlan.mockResolvedValue(UserPlan.ENTERPRISE);

    const caller = orgPlanRouter.createCaller(makeCtx() as never);
    const result = await caller.getCurrentOrgPlan();

    expect(result.user.plan).toBe(UserPlan.ENTERPRISE);
    expect(result.planFeatures.displayName).toBe("Enterprise");
  });

  describe("self-hosted license fallback", () => {
    beforeEach(() => {
      mockSelfHostedMode = true;
    });

    it("uses license JWT tier when no Stripe subscription exists", async () => {
      mockUserWithWorkspace();
      mockGetWorkspacePlan.mockResolvedValue(UserPlan.FREE);
      mockGetLicensePayload.mockResolvedValue(validPayload);

      const caller = orgPlanRouter.createCaller(makeCtx() as never);
      const result = await caller.getCurrentOrgPlan();

      expect(result.user.plan).toBe(UserPlan.DEVELOPER);
      expect(result.planFeatures.displayName).toBe("Developer");
      expect(result.planFeatures.maxServers).toBe(3);
      expect(result.planFeatures.canInviteUsers).toBe(true);
    });

    it("uses ENTERPRISE tier from license JWT", async () => {
      mockUserWithWorkspace();
      mockGetWorkspacePlan.mockResolvedValue(UserPlan.FREE);
      mockGetLicensePayload.mockResolvedValue({
        ...validPayload,
        tier: UserPlan.ENTERPRISE,
      });

      const caller = orgPlanRouter.createCaller(makeCtx() as never);
      const result = await caller.getCurrentOrgPlan();

      expect(result.user.plan).toBe(UserPlan.ENTERPRISE);
      expect(result.planFeatures.displayName).toBe("Enterprise");
      expect(result.planFeatures.maxServers).toBeNull(); // unlimited
      expect(result.planFeatures.hasPrioritySupport).toBe(true);
    });

    it("stays FREE when no license JWT exists", async () => {
      mockUserWithWorkspace();
      mockGetWorkspacePlan.mockResolvedValue(UserPlan.FREE);
      mockGetLicensePayload.mockResolvedValue(null);

      const caller = orgPlanRouter.createCaller(makeCtx() as never);
      const result = await caller.getCurrentOrgPlan();

      expect(result.user.plan).toBe(UserPlan.FREE);
      expect(result.planFeatures.displayName).toBe("Free");
    });

    it("prefers Stripe subscription over license JWT", async () => {
      mockUserWithWorkspace();
      mockGetWorkspacePlan.mockResolvedValue(UserPlan.ENTERPRISE);
      // License says DEVELOPER, but workspace plan says ENTERPRISE
      mockGetLicensePayload.mockResolvedValue(validPayload);

      const caller = orgPlanRouter.createCaller(makeCtx() as never);
      const result = await caller.getCurrentOrgPlan();

      // Should use workspace plan (ENTERPRISE), not license (DEVELOPER)
      expect(result.user.plan).toBe(UserPlan.ENTERPRISE);
      // getLicensePayload should not even be called since plan is not FREE
      expect(mockGetLicensePayload).not.toHaveBeenCalled();
    });

    it("returns correct usage limits for DEVELOPER license", async () => {
      mockUserWithWorkspace({ serverCount: 1 });
      mockGetWorkspacePlan.mockResolvedValue(UserPlan.FREE);
      mockGetLicensePayload.mockResolvedValue(validPayload);

      const caller = orgPlanRouter.createCaller(makeCtx() as never);
      const result = await caller.getCurrentOrgPlan();

      expect(result.usage.servers.current).toBe(1);
      expect(result.usage.servers.limit).toBe(3);
      expect(result.usage.servers.canAdd).toBe(true);
      expect(result.usage.users.limit).toBe(3);
    });

    it("does not use license fallback in cloud mode", async () => {
      mockSelfHostedMode = false;
      mockUserWithWorkspace();
      mockGetWorkspacePlan.mockResolvedValue(UserPlan.FREE);
      mockGetLicensePayload.mockResolvedValue(validPayload);

      const caller = orgPlanRouter.createCaller(makeCtx() as never);
      const result = await caller.getCurrentOrgPlan();

      expect(result.user.plan).toBe(UserPlan.FREE);
      expect(mockGetLicensePayload).not.toHaveBeenCalled();
    });
  });
});
