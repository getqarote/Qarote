import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";

import { createRabbitMQClient } from "@/trpc/routers/rabbitmq/shared";

import { analyzeNodeHealth, analyzeQueueHealth } from "./alert.analyzer";
import { alertHealthService } from "./alert.health";
import {
  AlertCategory,
  AlertSeverity,
  AlertSummary,
  AlertThresholds,
  ClusterHealthSummary,
  HealthCheck,
  RabbitMQAlert,
} from "./alert.interfaces";
import { alertNotificationService } from "./alert.notification";
import { alertThresholdsService } from "./alert.thresholds";

import { AlertSeverity as PrismaAlertSeverity } from "@/generated/prisma/client";

/** Maps Prisma AlertSeverity enum → internal lowercase severity for the frontend. */
const PRISMA_TO_INTERNAL_SEVERITY: Record<string, AlertSeverity> = {
  CRITICAL: AlertSeverity.CRITICAL,
  MEDIUM: AlertSeverity.WARNING,
  INFO: AlertSeverity.INFO,
  LOW: AlertSeverity.INFO,
};

/** Maps Prisma AlertSeverity enum → legacy lowercase string (resolved-alert responses). */
const PRISMA_TO_LEGACY_SEVERITY: Record<string, string> = {
  CRITICAL: "critical",
  MEDIUM: "warning",
  INFO: "info",
  LOW: "info",
};

/**
 * Alert Service class
 * Main orchestrator for alert-related operations
 */
class AlertService {
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
   * Read active alerts for a server directly from the unified Alert table.
   * Used by the watchAlerts subscription — reads DB instead of polling RabbitMQ
   * per connected client, eliminating the N+1 polling problem.
   *
   * Returns the same { alerts, summary } shape as getServerAlerts so the
   * existing processAlerts helper and tRPC response shape are unchanged.
   *
   * @param vhost - When provided, filters queue alerts to that vhost only.
   *                Node and cluster alerts are always included.
   */
  async getActiveAlertsFromDb(
    serverId: string,
    workspaceId: string,
    vhost?: string
  ): Promise<{ alerts: RabbitMQAlert[]; summary: AlertSummary }> {
    const rows = await prisma.alert.findMany({
      where: { serverId, workspaceId, status: "ACTIVE" },
      orderBy: { lastSeenAt: "desc" },
      select: {
        id: true,
        fingerprint: true, // needed for exact vhost boundary check below
        serverId: true,
        serverName: true,
        severity: true,
        category: true,
        title: true,
        description: true,
        details: true,
        sourceType: true,
        sourceName: true,
        lastSeenAt: true,
        firstSeenAt: true,
      },
    });

    // Apply exact vhost boundary check in-memory. The fingerprint format for
    // queue alerts is "{serverId}-{category}-queue-{vhost}-{sourceName}", so
    // we must verify the vhost appears as a complete path segment — not as a
    // prefix of a longer vhost name. A DB `contains` query for "-queue-prod-"
    // would incorrectly match fingerprints for vhost "prod-v2" because
    // "-queue-prod-v2-" starts with "-queue-prod-".
    const filteredRows = vhost
      ? rows.filter((row) => {
          if (row.sourceType !== "queue") return true;
          if (!row.fingerprint) return false;
          const suffix = `-${row.sourceName ?? ""}`;
          if (!row.fingerprint.endsWith(suffix)) return false;
          const withoutSource = row.fingerprint.slice(0, -suffix.length);
          return withoutSource.endsWith(`-queue-${vhost}`);
        })
      : rows;

    const alerts: RabbitMQAlert[] = filteredRows.map((row) => ({
      id: row.id,
      serverId: row.serverId ?? "",
      serverName: row.serverName ?? "",
      severity: PRISMA_TO_INTERNAL_SEVERITY[row.severity] ?? AlertSeverity.INFO,
      category: (row.category ?? "node") as AlertCategory,
      title: row.title,
      description: row.description,
      details: (row.details ?? {}) as RabbitMQAlert["details"],
      timestamp: (
        row.lastSeenAt ??
        row.firstSeenAt ??
        new Date()
      ).toISOString(),
      resolved: false,
      source: {
        type: (row.sourceType ?? "node") as "node" | "queue" | "cluster",
        name: row.sourceName ?? "",
      },
    }));

    const summary: AlertSummary = {
      total: alerts.length,
      critical: alerts.filter((a) => a.severity === AlertSeverity.CRITICAL)
        .length,
      warning: alerts.filter((a) => a.severity === AlertSeverity.WARNING)
        .length,
      info: alerts.filter((a) => a.severity === AlertSeverity.INFO).length,
    };

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
   * Get resolved alerts for a server from the unified Alert table.
   * Reads Alert rows with status=RESOLVED ordered by resolvedAt desc.
   */
  async getResolvedAlerts(
    serverId: string,
    workspaceId: string,
    options?: {
      limit?: number;
      offset?: number;
      severity?: string;
      category?: string;
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
    type WhereClause = {
      serverId: string;
      workspaceId: string;
      status: "RESOLVED";
      resolvedAt: { not: null };
      severity?: PrismaAlertSeverity;
      category?: string;
    };

    const where: WhereClause = {
      serverId,
      workspaceId,
      status: "RESOLVED",
      resolvedAt: { not: null },
    };

    if (options?.severity) {
      // Map incoming lowercase severity ("critical"/"warning"/"info") to Prisma enum
      const legacyToPrisma: Record<string, PrismaAlertSeverity> = {
        critical: PrismaAlertSeverity.CRITICAL,
        warning: PrismaAlertSeverity.MEDIUM,
        info: PrismaAlertSeverity.INFO,
      };
      const mapped = legacyToPrisma[options.severity];
      if (mapped) where.severity = mapped;
    }

    if (options?.category) {
      where.category = options.category;
    }

    const [rows, total] = await Promise.all([
      prisma.alert.findMany({
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
          createdAt: true,
        },
      }),
      prisma.alert.count({ where }),
    ]);

    return {
      alerts: rows.map((alert) => ({
        id: alert.id,
        serverId: alert.serverId ?? "",
        serverName: alert.serverName ?? "",
        severity: PRISMA_TO_LEGACY_SEVERITY[alert.severity] ?? "info",
        category: alert.category ?? "",
        title: alert.title,
        description: alert.description,
        details: (alert.details ?? {}) as Record<string, unknown>,
        source: {
          type: alert.sourceType ?? "",
          name: alert.sourceName ?? "",
        },
        firstSeenAt: (
          alert.firstSeenAt ??
          alert.resolvedAt ??
          alert.createdAt
        ).toISOString(),
        resolvedAt: alert.resolvedAt!.toISOString(),
        duration: alert.duration,
      })),
      total,
    };
  }
}

// Export a singleton instance
export const alertService = new AlertService();
