import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";

import { createRabbitMQClient } from "@/trpc/routers/rabbitmq/shared";

import { analyzeNodeHealth, analyzeQueueHealth } from "./alert.analyzer";
import { alertHealthService } from "./alert.health";
import {
  AlertCategory,
  AlertSummary,
  ClusterHealthSummary,
  HealthCheck,
  RabbitMQAlert,
} from "./alert.interfaces";
import { alertNotificationService } from "./alert.notification";
import {
  buildThresholdsFromAlertRules,
  loadThresholdsForServer,
} from "./alert.rule-adapter";

import type { AlertRule } from "@/generated/prisma/client";
import { AlertSeverity } from "@/generated/prisma/client";

/**
 * Alert Service class
 * Main orchestrator for alert-related operations
 */
class AlertService {
  /**
   * Get alerts for a server
   * @param vhost - Optional vhost to filter queue-related alerts. Node alerts are not filtered by vhost.
   * @param preloadedRules - Optional pre-loaded alert rules (avoids extra DB query when batch-processing)
   */
  async getServerAlerts(
    serverId: string,
    serverName: string,
    workspaceId: string,
    vhost?: string,
    preloadedRules?: AlertRule[]
  ): Promise<{ alerts: RabbitMQAlert[]; summary: AlertSummary }> {
    const alerts: RabbitMQAlert[] = [];
    const client = await createRabbitMQClient(serverId, workspaceId);

    // Get per-server thresholds from AlertRule table
    const thresholds = preloadedRules
      ? buildThresholdsFromAlertRules(preloadedRules)
      : await loadThresholdsForServer(serverId);

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
      const severityOrder: Record<string, number> = {
        CRITICAL: 5,
        HIGH: 4,
        MEDIUM: 3,
        LOW: 2,
        INFO: 1,
      };
      const severityDiff =
        severityOrder[b.severity] - severityOrder[a.severity];
      if (severityDiff !== 0) return severityDiff;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    const summary: AlertSummary = {
      total: alerts.length,
      critical: alerts.filter((a) => a.severity === AlertSeverity.CRITICAL)
        .length,
      high: alerts.filter((a) => a.severity === AlertSeverity.HIGH).length,
      medium: alerts.filter((a) => a.severity === AlertSeverity.MEDIUM).length,
      low: alerts.filter((a) => a.severity === AlertSeverity.LOW).length,
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
        createdAt: true,
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
          if (suffix.length <= 1) return false;
          if (!row.fingerprint.endsWith(suffix)) return false;
          const withoutSource = row.fingerprint.slice(0, -suffix.length);
          return withoutSource.endsWith(`-queue-${vhost}`);
        })
      : rows;

    const alerts: RabbitMQAlert[] = filteredRows.map((row) => ({
      id: row.id,
      serverId: row.serverId ?? "",
      serverName: row.serverName ?? "",
      severity: row.severity,
      category: (row.category ?? "node") as AlertCategory,
      title: row.title,
      description: row.description,
      details: (row.details ?? {}) as RabbitMQAlert["details"],
      timestamp: (
        row.lastSeenAt ??
        row.firstSeenAt ??
        row.createdAt
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
      high: alerts.filter((a) => a.severity === AlertSeverity.HIGH).length,
      medium: alerts.filter((a) => a.severity === AlertSeverity.MEDIUM).length,
      low: alerts.filter((a) => a.severity === AlertSeverity.LOW).length,
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
      severity?: AlertSeverity;
      category?: string;
    };

    const where: WhereClause = {
      serverId,
      workspaceId,
      status: "RESOLVED",
      resolvedAt: { not: null },
    };

    if (options?.severity) {
      // Severity values are now uppercase Prisma enum values directly
      const upper = options.severity.toUpperCase();
      if (Object.values(AlertSeverity).includes(upper as AlertSeverity)) {
        where.severity = upper as AlertSeverity;
      }
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
        severity: alert.severity,
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
          alert.createdAt ??
          alert.resolvedAt
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
