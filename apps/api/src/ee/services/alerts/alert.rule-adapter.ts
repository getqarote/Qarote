import { prisma } from "@/core/prisma";

import type { AlertThresholds, MetricThresholds } from "./alert.interfaces";

import type {
  AlertRule,
  AlertSeverity,
  AlertType,
} from "@/generated/prisma/client";

/**
 * Maps AlertType enum values to the corresponding key in AlertThresholds.
 * NODE_DOWN is omitted because it's a boolean check, not threshold-based.
 */
const ALERT_TYPE_TO_THRESHOLD_KEY: Partial<
  Record<AlertType, keyof AlertThresholds>
> = {
  MEMORY_USAGE: "memory",
  DISK_USAGE: "disk",
  FILE_DESCRIPTOR_USAGE: "fileDescriptors",
  SOCKET_USAGE: "sockets",
  PROCESS_USAGE: "processes",
  QUEUE_DEPTH: "queueMessages",
  UNACKED_MESSAGES: "unackedMessages",
  CONSUMER_UTILIZATION: "consumerUtilization",
  RUN_QUEUE_LENGTH: "runQueue",
  CONNECTION_CHURN_RATE: "connectionChurnRate",
  CHANNEL_CHURN_RATE: "channelChurnRate",
  QUEUE_CHURN_RATE: "queueChurnRate",
};

/**
 * Maps AlertSeverity enum (UPPERCASE) to MetricThresholds key (lowercase).
 */
const SEVERITY_TO_SLOT: Record<AlertSeverity, keyof MetricThresholds> = {
  INFO: "info",
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
};

/**
 * Creates an empty AlertThresholds object with all metrics initialized
 * to empty MetricThresholds (no severity levels set).
 */
function createEmptyThresholds(): AlertThresholds {
  return {
    memory: {},
    disk: {},
    fileDescriptors: {},
    sockets: {},
    processes: {},
    queueMessages: {},
    unackedMessages: {},
    consumerUtilization: {},
    runQueue: {},
    connectionChurnRate: {},
    channelChurnRate: {},
    queueChurnRate: {},
  };
}

/**
 * Pure function: converts an array of AlertRule rows into the AlertThresholds
 * shape that the analyzer expects.
 *
 * - Groups rules by type
 * - Maps each rule's severity 1:1 to the matching MetricThresholds slot
 * - Skips NODE_DOWN (boolean check, not threshold-based)
 * - Undefined slots mean the analyzer skips that severity level
 */
export function buildThresholdsFromAlertRules(
  rules: AlertRule[]
): AlertThresholds {
  const thresholds = createEmptyThresholds();

  for (const rule of rules) {
    const thresholdKey = ALERT_TYPE_TO_THRESHOLD_KEY[rule.type];
    if (!thresholdKey) {
      // Skip unmapped types (e.g. NODE_DOWN, MESSAGE_RATE, etc.)
      continue;
    }

    const severitySlot = SEVERITY_TO_SLOT[rule.severity];
    if (!severitySlot) {
      continue;
    }

    const metric = thresholds[thresholdKey];
    const existingValue = metric[severitySlot];

    // If multiple rules exist for the same type+severity, keep the most
    // restrictive value. For GREATER_THAN metrics, lower threshold is more
    // restrictive. For LESS_THAN metrics (disk, consumerUtilization), higher
    // threshold is more restrictive.
    if (existingValue === undefined) {
      metric[severitySlot] = rule.threshold;
    } else if (rule.operator === "LESS_THAN") {
      metric[severitySlot] = Math.max(existingValue, rule.threshold);
    } else {
      metric[severitySlot] = Math.min(existingValue, rule.threshold);
    }
  }

  return thresholds;
}

/**
 * Async wrapper: loads enabled AlertRules for a single server from the
 * database and converts them to AlertThresholds.
 */
export async function loadThresholdsForServer(
  serverId: string
): Promise<AlertThresholds> {
  const rules = await prisma.alertRule.findMany({
    where: { serverId, enabled: true },
  });

  return buildThresholdsFromAlertRules(rules);
}
