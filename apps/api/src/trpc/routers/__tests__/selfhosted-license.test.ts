import { beforeEach, describe, expect, it, vi } from "vitest";

import type { LicenseJwtPayload } from "@/services/license/license.interfaces";

// --- Mocks ---

const mockFindUnique = vi.fn();
const mockUpsert = vi.fn();
const mockDelete = vi.fn();

vi.mock("@/core/prisma", () => ({
  prisma: {
    systemSetting: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      upsert: (...args: unknown[]) => mockUpsert(...args),
      delete: (...args: unknown[]) => mockDelete(...args),
    },
  },
}));

const mockVerifyLicenseJwt = vi.fn();
vi.mock("@/services/license/license-crypto.service", () => ({
  verifyLicenseJwt: (...args: unknown[]) => mockVerifyLicenseJwt(...args),
}));

const mockInvalidateLicenseCache = vi.fn();
vi.mock("@/services/feature-gate/license", () => ({
  invalidateLicenseCache: () => mockInvalidateLicenseCache(),
}));

let mockSelfHostedMode = true;
vi.mock("@/config/deployment", () => ({
  isSelfHostedMode: () => mockSelfHostedMode,
}));

vi.mock("@/core/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// Mock rate limiter to be a passthrough
vi.mock("../../middlewares/rateLimiter", () => ({
  standardRateLimiter: (opts: { next: () => unknown }) => opts.next(),
  strictRateLimiter: (opts: { next: () => unknown }) => opts.next(),
  billingRateLimiter: (opts: { next: () => unknown }) => opts.next(),
}));

// Mock plan service (imported by trpc.ts)
vi.mock("@/services/plan/plan.service", () => ({
  PlanLimitExceededError: class extends Error {},
  PlanValidationError: class extends Error {},
}));

// Mock workspace middleware
vi.mock("@/middlewares/workspace", () => ({
  hasWorkspaceAccess: vi.fn().mockResolvedValue(true),
}));

// Import after mocks
const { selfhostedLicenseRouter } = await import("../selfhosted-license");

// --- Helpers ---

const validPayload: LicenseJwtPayload = {
  sub: "lic-test-123",
  tier: "DEVELOPER",
  features: ["alerting", "slack_integration"],
  iss: "qarote",
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600,
};

/** Minimal tRPC caller context with admin user */
function makeCtx() {
  return {
    prisma: {
      systemSetting: {
        findUnique: mockFindUnique,
        upsert: mockUpsert,
        delete: mockDelete,
      },
    },
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    user: {
      id: "admin-1",
      role: "ADMIN",
      isActive: true,
      email: "admin@test.com",
    },
    workspaceId: null,
    req: {},
  };
}

// --- Tests ---

describe("selfhostedLicenseRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelfHostedMode = true;
  });

  describe("activate", () => {
    it("stores valid JWT and returns tier/features/expiresAt", async () => {
      mockVerifyLicenseJwt.mockResolvedValue(validPayload);
      mockUpsert.mockResolvedValue({});

      const caller = selfhostedLicenseRouter.createCaller(makeCtx() as never);
      const result = await caller.activate({ licenseKey: "valid-jwt" });

      expect(mockVerifyLicenseJwt).toHaveBeenCalledWith("valid-jwt");
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { key: "license_jwt" },
          update: { value: "valid-jwt" },
          create: { key: "license_jwt", value: "valid-jwt" },
        })
      );
      expect(mockInvalidateLicenseCache).toHaveBeenCalled();
      expect(result.tier).toBe("DEVELOPER");
      expect(result.features).toEqual(["alerting", "slack_integration"]);
    });

    it("throws BAD_REQUEST for invalid JWT", async () => {
      mockVerifyLicenseJwt.mockResolvedValue(null);

      const caller = selfhostedLicenseRouter.createCaller(makeCtx() as never);
      await expect(
        caller.activate({ licenseKey: "invalid-jwt" })
      ).rejects.toThrow(/invalid or expired/i);
    });

    it("throws FORBIDDEN when not in selfhosted mode", async () => {
      mockSelfHostedMode = false;

      const caller = selfhostedLicenseRouter.createCaller(makeCtx() as never);
      await expect(caller.activate({ licenseKey: "any" })).rejects.toThrow(
        /self-hosted/i
      );
    });
  });

  describe("status", () => {
    it("returns active=false when no license exists", async () => {
      mockFindUnique.mockResolvedValue(null);

      const caller = selfhostedLicenseRouter.createCaller(makeCtx() as never);
      const result = await caller.status();

      expect(result).toEqual({ active: false, license: null });
    });

    it("returns active=true with license details when valid JWT exists", async () => {
      mockFindUnique.mockResolvedValue({
        key: "license_jwt",
        value: "stored-jwt",
      });
      mockVerifyLicenseJwt.mockResolvedValue(validPayload);

      const caller = selfhostedLicenseRouter.createCaller(makeCtx() as never);
      const result = await caller.status();

      expect(result.active).toBe(true);
      expect(result.license).toEqual(
        expect.objectContaining({
          tier: "DEVELOPER",
          features: ["alerting", "slack_integration"],
        })
      );
    });

    it("returns active=false when stored JWT is expired/invalid", async () => {
      mockFindUnique.mockResolvedValue({
        key: "license_jwt",
        value: "expired-jwt",
      });
      mockVerifyLicenseJwt.mockResolvedValue(null);

      const caller = selfhostedLicenseRouter.createCaller(makeCtx() as never);
      const result = await caller.status();

      expect(result).toEqual({ active: false, license: null });
    });

    it("throws FORBIDDEN when not in selfhosted mode", async () => {
      mockSelfHostedMode = false;

      const caller = selfhostedLicenseRouter.createCaller(makeCtx() as never);
      await expect(caller.status()).rejects.toThrow(/self-hosted/i);
    });
  });

  describe("deactivate", () => {
    it("deletes license_jwt from SystemSetting and invalidates cache", async () => {
      mockDelete.mockResolvedValue({});

      const caller = selfhostedLicenseRouter.createCaller(makeCtx() as never);
      const result = await caller.deactivate();

      expect(mockDelete).toHaveBeenCalledWith({
        where: { key: "license_jwt" },
      });
      expect(mockInvalidateLicenseCache).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    it("handles gracefully when no license exists (Prisma P2025)", async () => {
      const prismaError = Object.assign(new Error("Record not found"), {
        code: "P2025",
      });
      mockDelete.mockRejectedValue(prismaError);

      const caller = selfhostedLicenseRouter.createCaller(makeCtx() as never);
      const result = await caller.deactivate();

      expect(result).toEqual({ success: true });
    });

    it("rethrows unexpected database errors", async () => {
      mockDelete.mockRejectedValue(new Error("Connection refused"));

      const caller = selfhostedLicenseRouter.createCaller(makeCtx() as never);
      await expect(caller.deactivate()).rejects.toThrow("Connection refused");
    });

    it("throws FORBIDDEN when not in selfhosted mode", async () => {
      mockSelfHostedMode = false;

      const caller = selfhostedLicenseRouter.createCaller(makeCtx() as never);
      await expect(caller.deactivate()).rejects.toThrow(/self-hosted/i);
    });
  });
});
