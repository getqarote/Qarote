import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";

import {
  AlertSeverity,
  AlertType,
  ComparisonOperator,
} from "@/generated/prisma/client";

interface DefaultRuleDefinition {
  slug: string;
  name: string;
  description: string;
  type: AlertType;
  threshold: number;
  operator: ComparisonOperator;
  severity: AlertSeverity;
}

const DEFAULT_RULE_DEFINITIONS: DefaultRuleDefinition[] = [
  // Memory
  {
    slug: "high-memory-usage",
    name: "High Memory Usage",
    description: "Alert when node memory usage exceeds 80%",
    type: AlertType.MEMORY_USAGE,
    threshold: 80,
    operator: ComparisonOperator.GREATER_THAN,
    severity: AlertSeverity.MEDIUM,
  },
  {
    slug: "critical-memory-usage",
    name: "Critical Memory Usage",
    description: "Alert when node memory usage exceeds 95%",
    type: AlertType.MEMORY_USAGE,
    threshold: 95,
    operator: ComparisonOperator.GREATER_THAN,
    severity: AlertSeverity.CRITICAL,
  },
  // Disk
  {
    slug: "low-disk-space",
    name: "Low Disk Space",
    description: "Alert when node disk free space falls below 15%",
    type: AlertType.DISK_USAGE,
    threshold: 15,
    operator: ComparisonOperator.LESS_THAN,
    severity: AlertSeverity.MEDIUM,
  },
  {
    slug: "critical-disk-space",
    name: "Critical Disk Space",
    description: "Alert when node disk free space falls below 10%",
    type: AlertType.DISK_USAGE,
    threshold: 10,
    operator: ComparisonOperator.LESS_THAN,
    severity: AlertSeverity.CRITICAL,
  },
  // Queue depth
  {
    slug: "high-queue-backlog",
    name: "High Queue Backlog",
    description: "Alert when queue message count exceeds 10,000",
    type: AlertType.QUEUE_DEPTH,
    threshold: 10000,
    operator: ComparisonOperator.GREATER_THAN,
    severity: AlertSeverity.MEDIUM,
  },
  {
    slug: "critical-queue-backlog",
    name: "Critical Queue Backlog",
    description: "Alert when queue message count exceeds 50,000",
    type: AlertType.QUEUE_DEPTH,
    threshold: 50000,
    operator: ComparisonOperator.GREATER_THAN,
    severity: AlertSeverity.CRITICAL,
  },
  // Unacked messages
  {
    slug: "high-unacknowledged-messages",
    name: "High Unacknowledged Messages",
    description: "Alert when unacknowledged messages exceed 1,000",
    type: AlertType.UNACKED_MESSAGES,
    threshold: 1000,
    operator: ComparisonOperator.GREATER_THAN,
    severity: AlertSeverity.MEDIUM,
  },
  {
    slug: "critical-unacknowledged-messages",
    name: "Critical Unacknowledged Messages",
    description: "Alert when unacknowledged messages exceed 5,000",
    type: AlertType.UNACKED_MESSAGES,
    threshold: 5000,
    operator: ComparisonOperator.GREATER_THAN,
    severity: AlertSeverity.CRITICAL,
  },
  // Consumer utilization
  {
    slug: "low-consumer-utilization",
    name: "Low Consumer Utilization",
    description: "Alert when consumer utilization falls below 10%",
    type: AlertType.CONSUMER_UTILIZATION,
    threshold: 10,
    operator: ComparisonOperator.LESS_THAN,
    severity: AlertSeverity.MEDIUM,
  },
  // Node down
  {
    slug: "node-down",
    name: "Node Down",
    description: "Alert when a RabbitMQ node stops running",
    type: AlertType.NODE_DOWN,
    threshold: 0,
    operator: ComparisonOperator.EQUALS,
    severity: AlertSeverity.CRITICAL,
  },
  // File descriptors / connections
  {
    slug: "high-file-descriptor-usage",
    name: "High File Descriptor Usage",
    description: "Alert when file descriptor usage exceeds 80%",
    type: AlertType.FILE_DESCRIPTOR_USAGE,
    threshold: 80,
    operator: ComparisonOperator.GREATER_THAN,
    severity: AlertSeverity.MEDIUM,
  },
  {
    slug: "critical-file-descriptor-usage",
    name: "Critical File Descriptor Usage",
    description: "Alert when file descriptor usage exceeds 90%",
    type: AlertType.FILE_DESCRIPTOR_USAGE,
    threshold: 90,
    operator: ComparisonOperator.GREATER_THAN,
    severity: AlertSeverity.CRITICAL,
  },
];

/**
 * Seed default alert rules for a newly created server.
 * Idempotent — the (serverId, slug) unique index lets skipDuplicates
 * silently skip rules that already exist for this server.
 * Safe to call multiple times — will not throw on failure so server creation is never blocked.
 */
export async function seedDefaultAlertRules(
  serverId: string,
  workspaceId: string
): Promise<void> {
  logger.info({ serverId, workspaceId }, "Seeding default alert rules");
  try {
    const result = await prisma.alertRule.createMany({
      data: DEFAULT_RULE_DEFINITIONS.map((def) => ({
        ...def,
        isDefault: true,
        serverId,
        workspaceId,
        createdById: null,
      })),
      skipDuplicates: true,
    });
    logger.info(
      { serverId, created: result.count },
      "Seeded default alert rules for server"
    );
  } catch (error) {
    logger.error(
      { error, serverId, workspaceId },
      "Failed to seed default alert rules — server creation will continue"
    );
  }
}

/**
 * Backfill default alert rules for all servers that are missing them.
 * Called on worker startup to recover from seeding failures (e.g. enum
 * values not yet in the DB when the server was created).
 */
export async function backfillDefaultAlertRules(): Promise<void> {
  try {
    const servers = await prisma.rabbitMQServer.findMany({
      select: { id: true, workspaceId: true },
    });

    let backfilled = 0;
    for (const server of servers) {
      if (!server.workspaceId) continue;
      const ruleCount = await prisma.alertRule.count({
        where: { serverId: server.id, isDefault: true },
      });
      if (ruleCount < DEFAULT_RULE_DEFINITIONS.length) {
        await seedDefaultAlertRules(server.id, server.workspaceId);
        backfilled++;
      }
    }

    if (backfilled > 0) {
      logger.info(
        { backfilled, total: servers.length },
        "Backfilled default alert rules for servers with missing rules"
      );
    }
  } catch (error) {
    logger.error(
      { error },
      "Failed to backfill default alert rules — worker will continue"
    );
  }
}
