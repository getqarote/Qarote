import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/core/prisma";

import { licenseService } from "../license.service";

import { UserPlan } from "@/generated/prisma/client";

vi.mock("@/core/prisma", () => ({
  prisma: {
    license: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    licenseFileVersion: {
      create: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
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

vi.mock("../license-crypto.service", () => ({
  signLicenseData: vi.fn().mockReturnValue("mocked-signature"),
}));

describe("LicenseService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateLicense", () => {
    it("generates a license key in RABBIT-{TIER}-{HEX}-{CHECKSUM} format", async () => {
      vi.mocked(prisma.license.create).mockResolvedValue({
        id: "lic-1",
        licenseKey: "key",
      } as never);

      const result = await licenseService.generateLicense({
        tier: UserPlan.ENTERPRISE,
        customerEmail: "customer@example.com",
        expiresAt: new Date(Date.now() + 365 * 86_400_000),
      });

      expect(result.licenseKey).toMatch(
        /^RABBIT-[A-Z]{3}-[A-F0-9]{32}-[A-F0-9]{8}$/
      );
    });

    it("uses 'ENT' as tier prefix for ENTERPRISE", async () => {
      vi.mocked(prisma.license.create).mockResolvedValue({
        id: "lic-1",
      } as never);

      const result = await licenseService.generateLicense({
        tier: UserPlan.ENTERPRISE,
        customerEmail: "customer@example.com",
        expiresAt: new Date(Date.now() + 365 * 86_400_000),
      });

      expect(result.licenseKey.startsWith("RABBIT-ENT-")).toBe(true);
    });

    it("uses 'DEV' as tier prefix for DEVELOPER", async () => {
      vi.mocked(prisma.license.create).mockResolvedValue({
        id: "lic-1",
      } as never);

      const result = await licenseService.generateLicense({
        tier: UserPlan.DEVELOPER,
        customerEmail: "customer@example.com",
        expiresAt: new Date(Date.now() + 365 * 86_400_000),
      });

      expect(result.licenseKey.startsWith("RABBIT-DEV-")).toBe(true);
    });

    it("calls prisma.license.create with isActive=true and correct tier", async () => {
      vi.mocked(prisma.license.create).mockResolvedValue({
        id: "lic-1",
      } as never);

      await licenseService.generateLicense({
        tier: UserPlan.ENTERPRISE,
        customerEmail: "customer@example.com",
        expiresAt: new Date(Date.now() + 365 * 86_400_000),
      });

      expect(prisma.license.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isActive: true,
            tier: UserPlan.ENTERPRISE,
            customerEmail: "customer@example.com",
            currentVersion: 1,
          }),
        })
      );
    });

    it("returns { licenseKey, licenseId } from the created record", async () => {
      vi.mocked(prisma.license.create).mockResolvedValue({
        id: "lic-abc-123",
      } as never);

      const result = await licenseService.generateLicense({
        tier: UserPlan.ENTERPRISE,
        customerEmail: "customer@example.com",
        expiresAt: new Date(Date.now() + 365 * 86_400_000),
      });

      expect(result.licenseId).toBe("lic-abc-123");
      expect(result.licenseKey).toBeDefined();
    });

    it("rethrows error on Prisma failure", async () => {
      vi.mocked(prisma.license.create).mockRejectedValue(new Error("DB error"));

      await expect(
        licenseService.generateLicense({
          tier: UserPlan.ENTERPRISE,
          customerEmail: "customer@example.com",
          expiresAt: new Date(Date.now() + 365 * 86_400_000),
        })
      ).rejects.toThrow("DB error");
    });
  });

  describe("validateLicense", () => {
    it("returns valid=false with 'License not found' when license does not exist", async () => {
      vi.mocked(prisma.license.findUnique).mockResolvedValue(null);

      const result = await licenseService.validateLicense({
        licenseKey: "RABBIT-ENT-NOTEXIST-12345678",
      });

      expect(result.valid).toBe(false);
      expect(result.message).toContain("not found");
    });

    it("returns valid=false with 'License is inactive' when isActive is false", async () => {
      vi.mocked(prisma.license.findUnique).mockResolvedValue({
        id: "lic-1",
        isActive: false,
        expiresAt: new Date(Date.now() + 86_400_000),
      } as never);

      const result = await licenseService.validateLicense({
        licenseKey: "RABBIT-ENT-KEY-12345678",
      });

      expect(result.valid).toBe(false);
      expect(result.message).toContain("inactive");
    });

    it("returns valid=false with 'License has expired' when expiresAt is in the past", async () => {
      vi.mocked(prisma.license.findUnique).mockResolvedValue({
        id: "lic-1",
        isActive: true,
        expiresAt: new Date(Date.now() - 86_400_000), // yesterday
      } as never);

      const result = await licenseService.validateLicense({
        licenseKey: "RABBIT-ENT-KEY-12345678",
      });

      expect(result.valid).toBe(false);
      expect(result.message).toContain("expired");
    });

    it("returns valid=true with license details when license is valid", async () => {
      const mockLicense = {
        id: "lic-1",
        isActive: true,
        expiresAt: new Date(Date.now() + 86_400_000),
        tier: UserPlan.ENTERPRISE,
        customerEmail: "customer@example.com",
        workspaceId: "ws-1",
      };
      vi.mocked(prisma.license.findUnique).mockResolvedValue(
        mockLicense as never
      );
      vi.mocked(prisma.license.update).mockResolvedValue(mockLicense as never);

      const result = await licenseService.validateLicense({
        licenseKey: "RABBIT-ENT-KEY-12345678",
      });

      expect(result.valid).toBe(true);
      expect(result.license?.id).toBe("lic-1");
      expect(result.license?.tier).toBe(UserPlan.ENTERPRISE);
    });

    it("updates lastValidatedAt on successful validation", async () => {
      const mockLicense = {
        id: "lic-1",
        isActive: true,
        expiresAt: new Date(Date.now() + 86_400_000),
        tier: UserPlan.ENTERPRISE,
        customerEmail: "customer@example.com",
        workspaceId: null,
      };
      vi.mocked(prisma.license.findUnique).mockResolvedValue(
        mockLicense as never
      );
      vi.mocked(prisma.license.update).mockResolvedValue(mockLicense as never);

      await licenseService.validateLicense({
        licenseKey: "RABBIT-ENT-KEY-12345678",
      });

      expect(prisma.license.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "lic-1" },
          data: expect.objectContaining({ lastValidatedAt: expect.any(Date) }),
        })
      );
    });

    it("returns valid=false and does not throw on Prisma error", async () => {
      vi.mocked(prisma.license.findUnique).mockRejectedValue(
        new Error("DB error")
      );

      const result = await licenseService.validateLicense({
        licenseKey: "RABBIT-ENT-KEY-12345678",
      });

      expect(result.valid).toBe(false);
      expect(result.message).toContain("validation failed");
    });
  });

  describe("renewLicense", () => {
    it("throws when license is not found", async () => {
      vi.mocked(prisma.license.findUnique).mockResolvedValue(null);

      await expect(
        licenseService.renewLicense(
          "lic-nonexistent",
          new Date(Date.now() + 365 * 86_400_000)
        )
      ).rejects.toThrow("not found");
    });

    it("increments currentVersion by 1", async () => {
      const currentLicense = {
        id: "lic-1",
        currentVersion: 3,
        expiresAt: new Date("2024-12-31"),
      };
      vi.mocked(prisma.license.findUnique).mockResolvedValue(
        currentLicense as never
      );
      vi.mocked(prisma.license.update).mockResolvedValue({
        ...currentLicense,
        currentVersion: 4,
        expiresAt: new Date(Date.now() + 365 * 86_400_000),
      } as never);

      const result = await licenseService.renewLicense(
        "lic-1",
        new Date(Date.now() + 365 * 86_400_000)
      );

      expect(result.newVersion).toBe(4);
      expect(prisma.license.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ currentVersion: 4 }),
        })
      );
    });

    it("updates expiresAt to the new date", async () => {
      const currentLicense = {
        id: "lic-1",
        currentVersion: 1,
        expiresAt: new Date("2024-12-31"),
      };
      const newExpiresAt = new Date(Date.now() + 365 * 86_400_000);
      vi.mocked(prisma.license.findUnique).mockResolvedValue(
        currentLicense as never
      );
      vi.mocked(prisma.license.update).mockResolvedValue({
        ...currentLicense,
        currentVersion: 2,
        expiresAt: newExpiresAt,
      } as never);

      await licenseService.renewLicense("lic-1", newExpiresAt);

      expect(prisma.license.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ expiresAt: newExpiresAt }),
        })
      );
    });

    it("rethrows error on Prisma failure", async () => {
      vi.mocked(prisma.license.findUnique).mockRejectedValue(
        new Error("DB error")
      );

      await expect(
        licenseService.renewLicense(
          "lic-1",
          new Date(Date.now() + 365 * 86_400_000)
        )
      ).rejects.toThrow("DB error");
    });
  });

  describe("saveLicenseFileVersion", () => {
    it("creates a licenseFileVersion record with deletesAt ~30 days from now", async () => {
      vi.mocked(prisma.licenseFileVersion.create).mockResolvedValue(
        {} as never
      );

      const expiresAt = new Date(Date.now() + 365 * 86_400_000);
      await licenseService.saveLicenseFileVersion(
        "lic-1",
        2,
        "file-content",
        expiresAt,
        "inv_123"
      );

      expect(prisma.licenseFileVersion.create).toHaveBeenCalledTimes(1);

      const callArgs = vi.mocked(prisma.licenseFileVersion.create).mock
        .calls[0][0];
      const deletesAt = callArgs.data.deletesAt as Date;
      const now = Date.now();
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

      // deletesAt should be approximately 30 days from now (within a 60s buffer)
      expect(deletesAt.getTime()).toBeGreaterThan(now + thirtyDaysMs - 60_000);
      expect(deletesAt.getTime()).toBeLessThan(now + thirtyDaysMs + 60_000);
    });

    it("passes licenseId, version, fileContent, expiresAt, and stripeInvoiceId", async () => {
      vi.mocked(prisma.licenseFileVersion.create).mockResolvedValue(
        {} as never
      );

      const expiresAt = new Date(Date.now() + 365 * 86_400_000);
      await licenseService.saveLicenseFileVersion(
        "lic-1",
        2,
        "file-content",
        expiresAt,
        "inv_123"
      );

      expect(prisma.licenseFileVersion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            licenseId: "lic-1",
            version: 2,
            fileContent: "file-content",
            expiresAt,
            stripeInvoiceId: "inv_123",
          }),
        })
      );
    });

    it("rethrows error on Prisma failure", async () => {
      vi.mocked(prisma.licenseFileVersion.create).mockRejectedValue(
        new Error("DB error")
      );

      await expect(
        licenseService.saveLicenseFileVersion("lic-1", 1, "content", new Date())
      ).rejects.toThrow("DB error");
    });
  });

  describe("cleanupExpiredLicenseVersions", () => {
    it("calls deleteMany with deletesAt < now when expired versions exist", async () => {
      vi.mocked(prisma.licenseFileVersion.findMany).mockResolvedValue([
        { id: "v1", licenseId: "lic-1", version: 1 },
      ] as never);
      vi.mocked(prisma.licenseFileVersion.deleteMany).mockResolvedValue({
        count: 1,
      } as never);

      await licenseService.cleanupExpiredLicenseVersions();

      expect(prisma.licenseFileVersion.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deletesAt: { lt: expect.any(Date) } },
        })
      );
    });

    it("skips deleteMany when no expired versions are found", async () => {
      vi.mocked(prisma.licenseFileVersion.findMany).mockResolvedValue(
        [] as never
      );

      await licenseService.cleanupExpiredLicenseVersions();

      expect(prisma.licenseFileVersion.deleteMany).not.toHaveBeenCalled();
    });

    it("does not throw on Prisma error (cleanup is non-critical)", async () => {
      vi.mocked(prisma.licenseFileVersion.findMany).mockRejectedValue(
        new Error("DB error")
      );

      await expect(
        licenseService.cleanupExpiredLicenseVersions()
      ).resolves.toBeUndefined();
    });
  });

  describe("generateLicenseFile", () => {
    it("returns licenseFile with version '1.0'", async () => {
      const result = await licenseService.generateLicenseFile({
        licenseKey: "RABBIT-ENT-KEY-12345678",
        tier: UserPlan.ENTERPRISE,
        customerEmail: "customer@example.com",
        expiresAt: new Date(Date.now() + 365 * 86_400_000),
        features: ["workspace_management"],
      });

      expect(result.licenseFile.version).toBe("1.0");
    });

    it("includes all license data fields in the returned file", async () => {
      const expiresAt = new Date(Date.now() + 365 * 86_400_000);
      const result = await licenseService.generateLicenseFile({
        licenseKey: "RABBIT-ENT-KEY-12345678",
        tier: UserPlan.ENTERPRISE,
        customerEmail: "customer@example.com",
        expiresAt,
        features: ["workspace_management"],
        maxInstances: 3,
      });

      expect(result.licenseFile.licenseKey).toBe("RABBIT-ENT-KEY-12345678");
      expect(result.licenseFile.tier).toBe(UserPlan.ENTERPRISE);
      expect(result.licenseFile.customerEmail).toBe("customer@example.com");
      expect(result.licenseFile.features).toEqual(["workspace_management"]);
      expect(result.licenseFile.maxInstances).toBe(3);
    });

    it("includes the signature from signLicenseData", async () => {
      const result = await licenseService.generateLicenseFile({
        licenseKey: "RABBIT-ENT-KEY-12345678",
        tier: UserPlan.ENTERPRISE,
        customerEmail: "customer@example.com",
        expiresAt: new Date(Date.now() + 365 * 86_400_000),
        features: [],
      });

      expect(result.licenseFile.signature).toBe("mocked-signature");
    });
  });
});
