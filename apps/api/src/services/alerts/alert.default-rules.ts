import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";

import {
  AlertSeverity,
  AlertType,
  ComparisonOperator,
} from "@/generated/prisma/client";

interface DefaultRuleDefinition {
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
    name: "High Memory Usage",
    description: "Alert when node memory usage exceeds 80%",
    type: AlertType.MEMORY_USAGE,
    threshold: 80,
    operator: ComparisonOperator.GREATER_THAN,
    severity: AlertSeverity.MEDIUM,
  },
  {
    name: "Critical Memory Usage",
    description: "Alert when node memory usage exceeds 95%",
    type: AlertType.MEMORY_USAGE,
    threshold: 95,
    operator: ComparisonOperator.GREATER_THAN,
    severity: AlertSeverity.CRITICAL,
  },
  // Disk
  {
    name: "Low Disk Space",
    description: "Alert when node disk free space falls below 15%",
    type: AlertType.DISK_USAGE,
    threshold: 15,
    operator: ComparisonOperator.LESS_THAN,
    severity: AlertSeverity.MEDIUM,
  },
  {
    name: "Critical Disk Space",
    description: "Alert when node disk free space falls below 10%",
    type: AlertType.DISK_USAGE,
    threshold: 10,
    operator: ComparisonOperator.LESS_THAN,
    severity: AlertSeverity.CRITICAL,
  },
  // Queue depth
  {
    name: "High Queue Backlog",
    description: "Alert when queue message count exceeds 10,000",
    type: AlertType.QUEUE_DEPTH,
    threshold: 10000,
    operator: ComparisonOperator.GREATER_THAN,
    severity: AlertSeverity.MEDIUM,
  },
  {
    name: "Critical Queue Backlog",
    description: "Alert when queue message count exceeds 50,000",
    type: AlertType.QUEUE_DEPTH,
    threshold: 50000,
    operator: ComparisonOperator.GREATER_THAN,
    severity: AlertSeverity.CRITICAL,
  },
  // Unacked messages
  {
    name: "High Unacknowledged Messages",
    description: "Alert when unacknowledged messages exceed 1,000",
    type: AlertType.MESSAGE_RATE,
    threshold: 1000,
    operator: ComparisonOperator.GREATER_THAN,
    severity: AlertSeverity.MEDIUM,
  },
  {
    name: "Critical Unacknowledged Messages",
    description: "Alert when unacknowledged messages exceed 5,000",
    type: AlertType.MESSAGE_RATE,
    threshold: 5000,
    operator: ComparisonOperator.GREATER_THAN,
    severity: AlertSeverity.CRITICAL,
  },
  // Consumer utilization
  {
    name: "Low Consumer Utilization",
    description: "Alert when consumer utilization falls below 10%",
    type: AlertType.CONSUMER_COUNT,
    threshold: 10,
    operator: ComparisonOperator.LESS_THAN,
    severity: AlertSeverity.MEDIUM,
  },
  // Node down
  {
    name: "Node Down",
    description: "Alert when a RabbitMQ node stops running",
    type: AlertType.NODE_DOWN,
    threshold: 0,
    operator: ComparisonOperator.EQUALS,
    severity: AlertSeverity.CRITICAL,
  },
  // File descriptors / connections
  {
    name: "High File Descriptor Usage",
    description: "Alert when file descriptor usage exceeds 80%",
    type: AlertType.CONNECTION_COUNT,
    threshold: 80,
    operator: ComparisonOperator.GREATER_THAN,
    severity: AlertSeverity.MEDIUM,
  },
  {
    name: "Critical File Descriptor Usage",
    description: "Alert when file descriptor usage exceeds 90%",
    type: AlertType.CONNECTION_COUNT,
    threshold: 90,
    operator: ComparisonOperator.GREATER_THAN,
    severity: AlertSeverity.CRITICAL,
  },
];

/**
 * Seed default alert rules for a newly created server.
 * Safe to call multiple times — will not throw on failure so server creation is never blocked.
 */
export async function seedDefaultAlertRules(
  serverId: string,
  workspaceId: string
): Promise<void> {
  try {
    await prisma.alertRule.createMany({
      data: DEFAULT_RULE_DEFINITIONS.map((def) => ({
        ...def,
        isDefault: true,
        serverId,
        workspaceId,
        createdById: null,
      })),
    });
    logger.info(
      { serverId, count: DEFAULT_RULE_DEFINITIONS.length },
      "Seeded default alert rules for server"
    );
  } catch (error) {
    logger.error(
      { error, serverId, workspaceId },
      "Failed to seed default alert rules — server creation will continue"
    );
  }
}
