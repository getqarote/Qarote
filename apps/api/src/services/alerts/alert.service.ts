import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";

import { createRabbitMQClient } from "@/trpc/routers/rabbitmq/shared";

import { analyzeNodeHealth, analyzeQueueHealth } from "./alert.analyzer";
import { alertHealthService } from "./alert.health";
import {
  AlertSeverity,
  AlertSummary,
  AlertThresholds,
  ClusterHealthSummary,
  HealthCheck,
  RabbitMQAlert,
} from "./alert.interfaces";
import { alertNotificationService } from "./alert.notification";
import { alertThresholdsService } from "./alert.thresholds";

/**
 * Alert Service class
 * Main orchestrator for alert-related operations
 */
export class AlertService {
  /**
   * Get alerts for a server
   * @param vhost - Optional vhost to filter queue-related alerts. Node alerts are not filtered by vhost.
   */
  async getServerAlerts(
    serverId: string,
    serverName: string,
    workspaceId: string,
    vhost?: string
  ): Promise<{ alerts: RabbitMQAlert[]; summary: AlertSummary }> {
    const alerts: RabbitMQAlert[] = [];
    const client = await createRabbitMQClient(serverId, workspaceId);

    // Get workspace-specific thresholds
    const thresholds =
      await alertThresholdsService.getWorkspaceThresholds(workspaceId);

    try {
      // Analyze nodes (not filtered by vhost - nodes are cluster-wide)
      const nodesResponse = await client.getNodes();
      if (nodesResponse && Array.isArray(nodesResponse)) {
        for (const node of nodesResponse) {
          const nodeAlerts = analyzeNodeHealth(
            node,
            serverId,
            serverName,
            thresholds
          );
          alerts.push(...nodeAlerts);
        }
      }
    } catch (error) {
      logger.warn({ error }, `Failed to get nodes for server ${serverId}`);
    }

    try {
      // Analyze queues (filtered by vhost if provided)
      const queuesResponse = await client.getQueues(vhost);
      if (queuesResponse && Array.isArray(queuesResponse)) {
        for (const queue of queuesResponse) {
          const queueAlerts = analyzeQueueHealth(
            queue,
            serverId,
            serverName,
            thresholds
          );
          alerts.push(...queueAlerts);
        }
      }
    } catch (error) {
      logger.warn({ error }, `Failed to get queues for server ${serverId}`);
    }

    // Sort alerts by severity and timestamp
    alerts.sort((a, b) => {
      const severityOrder = { critical: 3, warning: 2, info: 1 };
      const severityDiff =
        severityOrder[b.severity] - severityOrder[a.severity];
      if (severityDiff !== 0) return severityDiff;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    const summary: AlertSummary = {
      total: alerts.length,
      critical: alerts.filter((a) => a.severity === AlertSeverity.CRITICAL)
        .length,
      warning: alerts.filter((a) => a.severity === AlertSeverity.WARNING)
        .length,
      info: alerts.filter((a) => a.severity === AlertSeverity.INFO).length,
    };

    // Track new alerts and send email notifications
    await alertNotificationService.trackAndNotifyNewAlerts(
      alerts,
      workspaceId,
      serverId,
      serverName,
      vhost // Pass vhost context for proper auto-resolution
    );

    return { alerts, summary };
  }

  /**
   * Get cluster health summary
   */
  async getClusterHealthSummary(
    serverId: string,
    workspaceId: string
  ): Promise<ClusterHealthSummary> {
    return alertHealthService.getClusterHealthSummary(serverId, workspaceId);
  }

  /**
   * Get health check for a server
   */
  async getHealthCheck(
    serverId: string,
    workspaceId: string
  ): Promise<HealthCheck> {
    return alertHealthService.getHealthCheck(serverId, workspaceId);
  }

  /**
   * Check if user can modify alert thresholds based on subscription plan
   */
  async canModifyThresholds(workspaceId: string): Promise<boolean> {
    return alertThresholdsService.canModifyThresholds(workspaceId);
  }

  /**
   * Get alert thresholds for a workspace
   */
  async getWorkspaceThresholds(workspaceId: string): Promise<AlertThresholds> {
    return alertThresholdsService.getWorkspaceThresholds(workspaceId);
  }

  /**
   * Update alert thresholds for a workspace
   */
  async updateWorkspaceThresholds(
    workspaceId: string,
    thresholds: Partial<AlertThresholds>
  ): Promise<{ success: boolean; message: string }> {
    return alertThresholdsService.updateWorkspaceThresholds(
      workspaceId,
      thresholds
    );
  }

  /**
   * Get default thresholds
   */
  getDefaultThresholds(): AlertThresholds {
    return alertThresholdsService.getDefaultThresholds();
  }

  /**
   * Get resolved alerts for a server
   * @param vhost - Optional vhost to filter queue-related alerts. Node/cluster alerts are not filtered by vhost.
   */
  async getResolvedAlerts(
    serverId: string,
    workspaceId: string,
    options?: {
      limit?: number;
      offset?: number;
      severity?: string;
      category?: string;
      vhost?: string;
    }
  ): Promise<{
    alerts: Array<{
      id: string;
      serverId: string;
      serverName: string;
      severity: string;
      category: string;
      title: string;
      description: string;
      details: Record<string, unknown>;
      source: { type: string; name: string };
      firstSeenAt: string;
      resolvedAt: string;
      duration: number | null;
    }>;
    total: number;
  }> {
    const where: {
      serverId: string;
      workspaceId: string;
      severity?: string;
      category?: string;
      OR?: Array<{
        sourceType: string;
        fingerprint?: { contains: string };
      }>;
    } = {
      serverId,
      workspaceId,
    };

    if (options?.severity) {
      where.severity = options.severity;
    }

    if (options?.category) {
      where.category = options.category;
    }

    // Filter by vhost: queue alerts include vhost in fingerprint, node/cluster alerts don't
    if (options?.vhost) {
      const vhostPattern = `-queue-${options.vhost}-`;
      where.OR = [
        // Include queue alerts that match the vhost (fingerprint contains vhost pattern)
        {
          sourceType: "queue",
          fingerprint: { contains: vhostPattern },
        },
        // Include all node and cluster alerts (not vhost-specific, so always include)
        {
          sourceType: "node",
        },
        {
          sourceType: "cluster",
        },
      ];
    }

    const [resolvedAlerts, total] = await Promise.all([
      prisma.resolvedAlert.findMany({
        where,
        orderBy: { resolvedAt: "desc" },
        take: options?.limit,
        skip: options?.offset,
        select: {
          id: true,
          serverId: true,
          serverName: true,
          severity: true,
          category: true,
          title: true,
          description: true,
          details: true,
          sourceType: true,
          sourceName: true,
          firstSeenAt: true,
          resolvedAt: true,
          duration: true,
        },
      }),
      prisma.resolvedAlert.count({ where }),
    ]);

    return {
      alerts: resolvedAlerts.map((alert) => ({
        id: alert.id,
        serverId: alert.serverId,
        serverName: alert.serverName,
        severity: alert.severity,
        category: alert.category,
        title: alert.title,
        description: alert.description,
        details: alert.details as Record<string, unknown>,
        source: {
          type: alert.sourceType,
          name: alert.sourceName,
        },
        firstSeenAt: alert.firstSeenAt.toISOString(),
        resolvedAt: alert.resolvedAt.toISOString(),
        duration: alert.duration,
      })),
      total,
    };
  }
}

// Export a singleton instance
export const alertService = new AlertService();
