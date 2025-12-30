import { WorkspaceAlertThresholds } from "@prisma/client";

import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";

import { AlertThresholds } from "./alert.interfaces";

const DEFAULT_THRESHOLDS: AlertThresholds = {
  memory: { warning: 80, critical: 95 },
  disk: { warning: 15, critical: 10 }, // percentage free
  fileDescriptors: { warning: 80, critical: 90 },
  sockets: { warning: 80, critical: 90 },
  processes: { warning: 80, critical: 90 },
  queueMessages: { warning: 10000, critical: 50000 },
  unackedMessages: { warning: 1000, critical: 5000 },
  consumerUtilization: { warning: 10 }, // minimum utilization percentage
  connections: { warning: 80, critical: 95 },
  runQueue: { warning: 10, critical: 20 },
};

/**
 * Alert Thresholds Service
 * Handles all threshold-related operations
 */
class AlertThresholdsService {
  /**
   * Check if user can modify alert thresholds based on subscription plan
   */
  async canModifyThresholds(workspaceId: string): Promise<boolean> {
    try {
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: {
          ownerId: true,
        },
      });

      if (!workspace || !workspace.ownerId) {
        return false;
      }

      // Get workspace owner's subscription to determine plan
      const ownerSubscription = await prisma.subscription.findUnique({
        where: { userId: workspace.ownerId },
        select: { plan: true },
      });

      const plan = ownerSubscription?.plan || "FREE";

      // Allow modifications for startup and business plans
      const allowedPlans = ["STARTUP", "BUSINESS"];
      return allowedPlans.includes(plan);
    } catch (error) {
      logger.error(
        { error },
        "Failed to check threshold modification permissions"
      );
      return false;
    }
  }

  /**
   * Get alert thresholds for a workspace
   */
  async getWorkspaceThresholds(workspaceId: string): Promise<AlertThresholds> {
    try {
      const thresholds = await prisma.workspaceAlertThresholds.findUnique({
        where: { workspaceId },
      });

      if (!thresholds) {
        return { ...DEFAULT_THRESHOLDS };
      }

      // Convert database model to AlertThresholds interface
      return {
        memory: {
          warning: thresholds.memoryWarning,
          critical: thresholds.memoryCritical,
        },
        disk: {
          warning: thresholds.diskWarning,
          critical: thresholds.diskCritical,
        },
        fileDescriptors: {
          warning: thresholds.fileDescriptorsWarning,
          critical: thresholds.fileDescriptorsCritical,
        },
        sockets: {
          warning: thresholds.socketsWarning,
          critical: thresholds.socketsCritical,
        },
        processes: {
          warning: thresholds.processesWarning,
          critical: thresholds.processesCritical,
        },
        queueMessages: {
          warning: DEFAULT_THRESHOLDS.queueMessages.warning, // Not in DB yet
          critical: DEFAULT_THRESHOLDS.queueMessages.critical,
        },
        unackedMessages: {
          warning: thresholds.unackedMessagesWarning,
          critical: thresholds.unackedMessagesCritical,
        },
        consumerUtilization: {
          warning: thresholds.consumerUtilizationWarning,
        },
        connections: {
          warning: DEFAULT_THRESHOLDS.connections.warning, // Not in DB yet
          critical: DEFAULT_THRESHOLDS.connections.critical,
        },
        runQueue: {
          warning: thresholds.runQueueWarning,
          critical: thresholds.runQueueCritical,
        },
      };
    } catch (error) {
      logger.error({ error }, "Failed to get workspace thresholds");
      return { ...DEFAULT_THRESHOLDS };
    }
  }

  /**
   * Update alert thresholds for a workspace
   */
  async updateWorkspaceThresholds(
    workspaceId: string,
    thresholds: Partial<AlertThresholds>
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Check permissions
      const canModify = await this.canModifyThresholds(workspaceId);
      if (!canModify) {
        return {
          success: false,
          message:
            "Your current plan does not allow threshold modifications. Upgrade to Startup or Business plan to customize alert thresholds.",
        };
      }

      // Prepare data for database
      const data: Partial<
        Omit<
          WorkspaceAlertThresholds,
          "id" | "workspaceId" | "workspace" | "createdAt" | "updatedAt"
        >
      > = {};

      if (thresholds.memory) {
        data.memoryWarning = thresholds.memory.warning;
        data.memoryCritical = thresholds.memory.critical;
      }

      if (thresholds.disk) {
        data.diskWarning = thresholds.disk.warning;
        data.diskCritical = thresholds.disk.critical;
      }

      if (thresholds.fileDescriptors) {
        data.fileDescriptorsWarning = thresholds.fileDescriptors.warning;
        data.fileDescriptorsCritical = thresholds.fileDescriptors.critical;
      }

      if (thresholds.sockets) {
        data.socketsWarning = thresholds.sockets.warning;
        data.socketsCritical = thresholds.sockets.critical;
      }

      if (thresholds.processes) {
        data.processesWarning = thresholds.processes.warning;
        data.processesCritical = thresholds.processes.critical;
      }

      if (thresholds.unackedMessages) {
        data.unackedMessagesWarning = thresholds.unackedMessages.warning;
        data.unackedMessagesCritical = thresholds.unackedMessages.critical;
      }

      if (thresholds.consumerUtilization) {
        data.consumerUtilizationWarning =
          thresholds.consumerUtilization.warning;
      }

      if (thresholds.runQueue) {
        data.runQueueWarning = thresholds.runQueue.warning;
        data.runQueueCritical = thresholds.runQueue.critical;
      }

      // Update or create thresholds
      await prisma.workspaceAlertThresholds.upsert({
        where: { workspaceId },
        update: data,
        create: {
          workspaceId,
          ...data,
        },
      });

      return {
        success: true,
        message: "Alert thresholds updated successfully",
      };
    } catch (error) {
      logger.error({ error }, "Failed to update workspace thresholds");
      return {
        success: false,
        message: "Failed to update alert thresholds",
      };
    }
  }

  /**
   * Get default thresholds
   */
  getDefaultThresholds(): AlertThresholds {
    return { ...DEFAULT_THRESHOLDS };
  }
}

// Export a singleton instance
export const alertThresholdsService = new AlertThresholdsService();
