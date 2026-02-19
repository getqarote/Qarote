import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/core/prisma";

import { alertThresholdsService } from "../alert.thresholds";

vi.mock("@/core/prisma", () => ({
  prisma: {
    workspace: {
      findUnique: vi.fn(),
    },
    subscription: {
      findUnique: vi.fn(),
    },
    workspaceAlertThresholds: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
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

describe("AlertThresholdsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getDefaultThresholds", () => {
    it("returns correct memory thresholds (warning=80, critical=95)", () => {
      const thresholds = alertThresholdsService.getDefaultThresholds();
      expect(thresholds.memory.warning).toBe(80);
      expect(thresholds.memory.critical).toBe(95);
    });

    it("returns correct disk thresholds (warning=15, critical=10)", () => {
      const thresholds = alertThresholdsService.getDefaultThresholds();
      expect(thresholds.disk.warning).toBe(15);
      expect(thresholds.disk.critical).toBe(10);
    });

    it("returns correct queueMessages thresholds (warning=10000, critical=50000)", () => {
      const thresholds = alertThresholdsService.getDefaultThresholds();
      expect(thresholds.queueMessages.warning).toBe(10_000);
      expect(thresholds.queueMessages.critical).toBe(50_000);
    });

    it("returns correct runQueue thresholds (warning=10, critical=20)", () => {
      const thresholds = alertThresholdsService.getDefaultThresholds();
      expect(thresholds.runQueue.warning).toBe(10);
      expect(thresholds.runQueue.critical).toBe(20);
    });

    it("returns a new copy each time (immutable defaults)", () => {
      const t1 = alertThresholdsService.getDefaultThresholds();
      const t2 = alertThresholdsService.getDefaultThresholds();
      expect(t1).toEqual(t2);
      expect(t1).not.toBe(t2); // different object references
    });
  });

  describe("canModifyThresholds", () => {
    it("returns false when workspace is not found", async () => {
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue(null);
      const result = await alertThresholdsService.canModifyThresholds("ws-1");
      expect(result).toBe(false);
    });

    it("returns false when workspace has no ownerId", async () => {
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue({
        ownerId: null,
      } as never);
      const result = await alertThresholdsService.canModifyThresholds("ws-1");
      expect(result).toBe(false);
    });

    it("returns false for FREE plan", async () => {
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue({
        ownerId: "owner-1",
      } as never);
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        plan: "FREE",
      } as never);
      const result = await alertThresholdsService.canModifyThresholds("ws-1");
      expect(result).toBe(false);
    });

    it("returns false for FREE plan", async () => {
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue({
        ownerId: "owner-1",
      } as never);
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        plan: "FREE",
      } as never);
      const result = await alertThresholdsService.canModifyThresholds("ws-1");
      expect(result).toBe(false);
    });

    it("returns true for DEVELOPER plan", async () => {
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue({
        ownerId: "owner-1",
      } as never);
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        plan: "DEVELOPER",
      } as never);
      const result = await alertThresholdsService.canModifyThresholds("ws-1");
      expect(result).toBe(true);
    });

    it("returns true for ENTERPRISE plan", async () => {
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue({
        ownerId: "owner-1",
      } as never);
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        plan: "ENTERPRISE",
      } as never);
      const result = await alertThresholdsService.canModifyThresholds("ws-1");
      expect(result).toBe(true);
    });

    it("returns false when owner has no subscription (defaults to FREE)", async () => {
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue({
        ownerId: "owner-1",
      } as never);
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(null);
      const result = await alertThresholdsService.canModifyThresholds("ws-1");
      expect(result).toBe(false);
    });

    it("returns false and does not throw on Prisma error", async () => {
      vi.mocked(prisma.workspace.findUnique).mockRejectedValue(
        new Error("DB error")
      );
      const result = await alertThresholdsService.canModifyThresholds("ws-1");
      expect(result).toBe(false);
    });
  });

  describe("getWorkspaceThresholds", () => {
    it("returns DEFAULT_THRESHOLDS when no custom thresholds exist in DB", async () => {
      vi.mocked(prisma.workspaceAlertThresholds.findUnique).mockResolvedValue(
        null
      );
      const thresholds =
        await alertThresholdsService.getWorkspaceThresholds("ws-1");
      expect(thresholds).toEqual(alertThresholdsService.getDefaultThresholds());
    });

    it("maps DB fields correctly to AlertThresholds interface", async () => {
      vi.mocked(prisma.workspaceAlertThresholds.findUnique).mockResolvedValue({
        memoryWarning: 70,
        memoryCritical: 90,
        diskWarning: 20,
        diskCritical: 5,
        fileDescriptorsWarning: 75,
        fileDescriptorsCritical: 85,
        socketsWarning: 75,
        socketsCritical: 85,
        processesWarning: 75,
        processesCritical: 85,
        unackedMessagesWarning: 500,
        unackedMessagesCritical: 2500,
        consumerUtilizationWarning: 5,
        runQueueWarning: 5,
        runQueueCritical: 15,
      } as never);

      const thresholds =
        await alertThresholdsService.getWorkspaceThresholds("ws-1");
      expect(thresholds.memory.warning).toBe(70);
      expect(thresholds.memory.critical).toBe(90);
      expect(thresholds.disk.warning).toBe(20);
      expect(thresholds.disk.critical).toBe(5);
      expect(thresholds.unackedMessages.warning).toBe(500);
      expect(thresholds.runQueue.warning).toBe(5);
      expect(thresholds.runQueue.critical).toBe(15);
    });

    it("uses hardcoded defaults for queueMessages (not stored in DB)", async () => {
      vi.mocked(prisma.workspaceAlertThresholds.findUnique).mockResolvedValue({
        memoryWarning: 70,
        memoryCritical: 90,
        diskWarning: 20,
        diskCritical: 5,
        fileDescriptorsWarning: 75,
        fileDescriptorsCritical: 85,
        socketsWarning: 75,
        socketsCritical: 85,
        processesWarning: 75,
        processesCritical: 85,
        unackedMessagesWarning: 500,
        unackedMessagesCritical: 2500,
        consumerUtilizationWarning: 5,
        runQueueWarning: 5,
        runQueueCritical: 15,
      } as never);

      const thresholds =
        await alertThresholdsService.getWorkspaceThresholds("ws-1");
      // queueMessages uses defaults regardless of DB record
      expect(thresholds.queueMessages.warning).toBe(10_000);
      expect(thresholds.queueMessages.critical).toBe(50_000);
    });

    it("uses hardcoded defaults for connections (not stored in DB)", async () => {
      vi.mocked(prisma.workspaceAlertThresholds.findUnique).mockResolvedValue({
        memoryWarning: 70,
        memoryCritical: 90,
        diskWarning: 20,
        diskCritical: 5,
        fileDescriptorsWarning: 75,
        fileDescriptorsCritical: 85,
        socketsWarning: 75,
        socketsCritical: 85,
        processesWarning: 75,
        processesCritical: 85,
        unackedMessagesWarning: 500,
        unackedMessagesCritical: 2500,
        consumerUtilizationWarning: 5,
        runQueueWarning: 5,
        runQueueCritical: 15,
      } as never);

      const thresholds =
        await alertThresholdsService.getWorkspaceThresholds("ws-1");
      expect(thresholds.connections.warning).toBe(80);
      expect(thresholds.connections.critical).toBe(95);
    });

    it("returns DEFAULT_THRESHOLDS and does not throw on Prisma error", async () => {
      vi.mocked(prisma.workspaceAlertThresholds.findUnique).mockRejectedValue(
        new Error("DB error")
      );
      const thresholds =
        await alertThresholdsService.getWorkspaceThresholds("ws-1");
      expect(thresholds).toEqual(alertThresholdsService.getDefaultThresholds());
    });
  });

  describe("updateWorkspaceThresholds", () => {
    it("returns failure message when canModifyThresholds returns false", async () => {
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue(null);
      const result = await alertThresholdsService.updateWorkspaceThresholds(
        "ws-1",
        { memory: { warning: 70, critical: 85 } }
      );
      expect(result.success).toBe(false);
      expect(result.message).toContain(
        "does not allow threshold modifications"
      );
    });

    it("calls prisma upsert with correctly mapped fields for memory thresholds", async () => {
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue({
        ownerId: "owner-1",
      } as never);
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        plan: "ENTERPRISE",
      } as never);
      vi.mocked(prisma.workspaceAlertThresholds.upsert).mockResolvedValue(
        {} as never
      );

      await alertThresholdsService.updateWorkspaceThresholds("ws-1", {
        memory: { warning: 70, critical: 85 },
      });

      expect(prisma.workspaceAlertThresholds.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { workspaceId: "ws-1" },
          update: expect.objectContaining({
            memoryWarning: 70,
            memoryCritical: 85,
          }),
        })
      );
    });

    it("returns success message on successful update", async () => {
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue({
        ownerId: "owner-1",
      } as never);
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        plan: "ENTERPRISE",
      } as never);
      vi.mocked(prisma.workspaceAlertThresholds.upsert).mockResolvedValue(
        {} as never
      );

      const result = await alertThresholdsService.updateWorkspaceThresholds(
        "ws-1",
        { memory: { warning: 70, critical: 85 } }
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain("updated successfully");
    });

    it("returns failure message on Prisma error during upsert", async () => {
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue({
        ownerId: "owner-1",
      } as never);
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        plan: "ENTERPRISE",
      } as never);
      vi.mocked(prisma.workspaceAlertThresholds.upsert).mockRejectedValue(
        new Error("DB error")
      );

      const result = await alertThresholdsService.updateWorkspaceThresholds(
        "ws-1",
        { memory: { warning: 70, critical: 85 } }
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain("Failed");
    });
  });
});
