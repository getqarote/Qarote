import {
  RabbitMQNode,
  RabbitMQQueue,
} from "@/core/rabbitmq/rabbitmq.interfaces";

import { generateAlertId } from "./alert.fingerprint";
import {
  AlertCategory,
  AlertThresholds,
  MetricThresholds,
  RabbitMQAlert,
} from "./alert.interfaces";

import { AlertSeverity } from "@/generated/prisma/client";

/**
 * Check a value against all 5 severity thresholds, returning the highest
 * matching severity (top-down: CRITICAL first, then HIGH, MEDIUM, LOW, INFO).
 *
 * @param comparison - "gte" for GREATER_THAN metrics (memory, fd, sockets, etc.)
 *                     "lte" for LESS_THAN metrics (disk free %, consumer utilization)
 */
function checkThreshold(
  value: number,
  thresholds: MetricThresholds,
  comparison: "gte" | "lte"
): AlertSeverity | null {
  const levels: { key: keyof MetricThresholds; severity: AlertSeverity }[] = [
    { key: "critical", severity: AlertSeverity.CRITICAL },
    { key: "high", severity: AlertSeverity.HIGH },
    { key: "medium", severity: AlertSeverity.MEDIUM },
    { key: "low", severity: AlertSeverity.LOW },
    { key: "info", severity: AlertSeverity.INFO },
  ];

  for (const { key, severity } of levels) {
    const threshold = thresholds[key];
    if (threshold === undefined) continue;

    if (comparison === "gte" && value >= threshold) return severity;
    if (comparison === "lte" && value <= threshold) return severity;
  }

  return null;
}

/**
 * Returns the threshold value that matched for a given severity result.
 * Used to populate the `threshold` field in alert details.
 */
function getMatchedThreshold(
  thresholds: MetricThresholds,
  severity: AlertSeverity
): number | undefined {
  const key = severity.toLowerCase() as keyof MetricThresholds;
  return thresholds[key];
}

/**
 * Severity-to-title mapping helpers for threshold-based alerts
 */
const SEVERITY_TITLE_PREFIX: Record<AlertSeverity, string> = {
  CRITICAL: "Critical",
  HIGH: "High",
  MEDIUM: "Moderate",
  LOW: "Elevated",
  INFO: "Notable",
};

/**
 * Analyze node health and generate alerts
 */
export function analyzeNodeHealth(
  node: RabbitMQNode,
  serverId: string,
  serverName: string,
  thresholds: AlertThresholds
): RabbitMQAlert[] {
  const alerts: RabbitMQAlert[] = [];
  const timestamp = new Date().toISOString();

  // CRITICAL ALERTS (boolean checks - not threshold-based)

  // Check if node is running
  if (!node.running) {
    alerts.push({
      id: generateAlertId(serverId, AlertCategory.NODE, node.name),
      serverId,
      serverName,
      severity: AlertSeverity.CRITICAL,
      category: AlertCategory.NODE,
      title: "Node Down",
      description: `RabbitMQ node ${node.name} is not running`,
      details: {
        current: "offline",
        recommended: "Check node logs and restart if necessary",
        affected: [node.name],
      },
      timestamp,
      resolved: false,
      source: { type: "node", name: node.name },
    });
  }

  // Check memory alarms
  if (node.mem_alarm) {
    alerts.push({
      id: generateAlertId(serverId, AlertCategory.MEMORY, node.name),
      serverId,
      serverName,
      severity: AlertSeverity.CRITICAL,
      category: AlertCategory.MEMORY,
      title: "Memory Alarm Active",
      description: `Memory alarm is active on node ${node.name}`,
      details: {
        current: "alarm_active",
        recommended: "Free memory or increase memory limit",
        affected: [node.name],
      },
      timestamp,
      resolved: false,
      source: { type: "node", name: node.name },
    });
  }

  // Check disk alarms
  if (node.disk_free_alarm) {
    alerts.push({
      id: generateAlertId(serverId, AlertCategory.DISK, node.name),
      serverId,
      serverName,
      severity: AlertSeverity.CRITICAL,
      category: AlertCategory.DISK,
      title: "Disk Space Alarm",
      description: `Disk space alarm is active on node ${node.name}`,
      details: {
        current: "alarm_active",
        recommended: "Free disk space or increase disk limit",
        affected: [node.name],
      },
      timestamp,
      resolved: false,
      source: { type: "node", name: node.name },
    });
  }

  // Check for network partitions
  if (node.partitions && node.partitions.length > 0) {
    alerts.push({
      id: generateAlertId(serverId, AlertCategory.NODE, node.name),
      serverId,
      serverName,
      severity: AlertSeverity.CRITICAL,
      category: AlertCategory.NODE,
      title: "Network Partition Detected",
      description: `Node ${node.name} has network partitions`,
      details: {
        current: node.partitions.join(", "),
        recommended: "Resolve network connectivity issues immediately",
        affected: [node.name, ...node.partitions],
      },
      timestamp,
      resolved: false,
      source: { type: "node", name: node.name },
    });
  }

  // THRESHOLD-BASED ALERTS (5 severity levels)

  // Check memory usage percentage
  if (node.mem_limit > 0) {
    const memoryUsagePercent = (node.mem_used / node.mem_limit) * 100;
    const severity = checkThreshold(
      memoryUsagePercent,
      thresholds.memory,
      "gte"
    );
    if (severity) {
      const prefix = SEVERITY_TITLE_PREFIX[severity];
      alerts.push({
        id: generateAlertId(serverId, AlertCategory.MEMORY, node.name),
        serverId,
        serverName,
        severity,
        category: AlertCategory.MEMORY,
        title: `${prefix} Memory Usage`,
        description: `Node ${node.name} memory usage is ${severity === AlertSeverity.CRITICAL ? "critically high" : "high"}`,
        details: {
          current: Math.round(memoryUsagePercent),
          threshold: getMatchedThreshold(thresholds.memory, severity),
          recommended:
            severity === AlertSeverity.CRITICAL ||
            severity === AlertSeverity.HIGH
              ? "Consider scaling or optimizing memory usage"
              : "Monitor memory usage and consider optimization",
          affected: [node.name],
        },
        timestamp,
        resolved: false,
        source: { type: "node", name: node.name },
      });
    }
  }

  // Check disk space percentage (free space - LESS_THAN comparison)
  if (node.disk_free_limit > 0 && node.disk_free > 0) {
    const diskFreePercent =
      (node.disk_free /
        (node.disk_free + (node.disk_free_limit - node.disk_free))) *
      100;
    const severity = checkThreshold(diskFreePercent, thresholds.disk, "lte");
    if (severity) {
      const prefix = SEVERITY_TITLE_PREFIX[severity];
      alerts.push({
        id: generateAlertId(serverId, AlertCategory.DISK, node.name),
        serverId,
        serverName,
        severity,
        category: AlertCategory.DISK,
        title:
          severity === AlertSeverity.CRITICAL || severity === AlertSeverity.HIGH
            ? `${prefix} Disk Space`
            : "Low Disk Space",
        description: `Node ${node.name} has ${severity === AlertSeverity.CRITICAL ? "critically " : ""}low disk space`,
        details: {
          current: Math.round(diskFreePercent),
          threshold: getMatchedThreshold(thresholds.disk, severity),
          recommended:
            severity === AlertSeverity.CRITICAL ||
            severity === AlertSeverity.HIGH
              ? "Free disk space immediately"
              : "Monitor disk usage and consider cleanup",
          affected: [node.name],
        },
        timestamp,
        resolved: false,
        source: { type: "node", name: node.name },
      });
    }
  }

  // Check file descriptor usage
  if (node.fd_total > 0) {
    const fdUsagePercent = (node.fd_used / node.fd_total) * 100;
    const severity = checkThreshold(
      fdUsagePercent,
      thresholds.fileDescriptors,
      "gte"
    );
    if (severity) {
      const prefix = SEVERITY_TITLE_PREFIX[severity];
      alerts.push({
        id: generateAlertId(serverId, AlertCategory.CONNECTION, node.name),
        serverId,
        serverName,
        severity,
        category: AlertCategory.CONNECTION,
        title: `${prefix} File Descriptor Usage`,
        description: `Node ${node.name} file descriptor usage is ${severity === AlertSeverity.CRITICAL ? "critically high" : "high"}`,
        details: {
          current: Math.round(fdUsagePercent),
          threshold: getMatchedThreshold(thresholds.fileDescriptors, severity),
          recommended:
            severity === AlertSeverity.CRITICAL ||
            severity === AlertSeverity.HIGH
              ? "Increase file descriptor limit or reduce connections"
              : "Monitor file descriptor usage",
          affected: [node.name],
        },
        timestamp,
        resolved: false,
        source: { type: "node", name: node.name },
      });
    }
  }

  // Check socket usage
  if (node.sockets_total > 0) {
    const socketUsagePercent = (node.sockets_used / node.sockets_total) * 100;
    const severity = checkThreshold(
      socketUsagePercent,
      thresholds.sockets,
      "gte"
    );
    if (severity) {
      const prefix = SEVERITY_TITLE_PREFIX[severity];
      alerts.push({
        id: generateAlertId(serverId, AlertCategory.CONNECTION, node.name),
        serverId,
        serverName,
        severity,
        category: AlertCategory.CONNECTION,
        title: `${prefix} Socket Usage`,
        description: `Node ${node.name} socket usage is ${severity === AlertSeverity.CRITICAL ? "critically high" : "high"}`,
        details: {
          current: Math.round(socketUsagePercent),
          threshold: getMatchedThreshold(thresholds.sockets, severity),
          recommended:
            severity === AlertSeverity.CRITICAL ||
            severity === AlertSeverity.HIGH
              ? "Increase socket limit or reduce connections"
              : "Monitor socket usage",
          affected: [node.name],
        },
        timestamp,
        resolved: false,
        source: { type: "node", name: node.name },
      });
    }
  }

  // Check Erlang process usage
  if (node.proc_total > 0) {
    const processUsagePercent = (node.proc_used / node.proc_total) * 100;
    const severity = checkThreshold(
      processUsagePercent,
      thresholds.processes,
      "gte"
    );
    if (severity) {
      const prefix = SEVERITY_TITLE_PREFIX[severity];
      alerts.push({
        id: generateAlertId(serverId, AlertCategory.PERFORMANCE, node.name),
        serverId,
        serverName,
        severity,
        category: AlertCategory.PERFORMANCE,
        title: `${prefix} Process Usage`,
        description: `Node ${node.name} Erlang process usage is ${severity === AlertSeverity.CRITICAL ? "critically high" : "high"}`,
        details: {
          current: Math.round(processUsagePercent),
          threshold: getMatchedThreshold(thresholds.processes, severity),
          recommended:
            severity === AlertSeverity.CRITICAL ||
            severity === AlertSeverity.HIGH
              ? "Investigate process leaks and restart if necessary"
              : "Monitor process usage patterns",
          affected: [node.name],
        },
        timestamp,
        resolved: false,
        source: { type: "node", name: node.name },
      });
    }
  }

  // Check run queue length (scheduler performance)
  if (node.run_queue !== undefined && node.run_queue !== null) {
    const severity = checkThreshold(node.run_queue, thresholds.runQueue, "gte");
    if (severity) {
      const prefix = SEVERITY_TITLE_PREFIX[severity];
      alerts.push({
        id: generateAlertId(serverId, AlertCategory.PERFORMANCE, node.name),
        serverId,
        serverName,
        severity,
        category: AlertCategory.PERFORMANCE,
        title: `${prefix} Run Queue Length`,
        description: `Node ${node.name} has ${severity === AlertSeverity.CRITICAL ? "critically " : ""}high run queue length`,
        details: {
          current: node.run_queue,
          threshold: getMatchedThreshold(thresholds.runQueue, severity),
          recommended:
            severity === AlertSeverity.CRITICAL ||
            severity === AlertSeverity.HIGH
              ? "System is overloaded, consider scaling or load balancing"
              : "Monitor system load and performance",
          affected: [node.name],
        },
        timestamp,
        resolved: false,
        source: { type: "node", name: node.name },
      });
    }
  }

  return alerts;
}

/**
 * Analyze queue health and generate alerts
 */
export function analyzeQueueHealth(
  queue: RabbitMQQueue,
  serverId: string,
  serverName: string,
  thresholds: AlertThresholds
): RabbitMQAlert[] {
  const alerts: RabbitMQAlert[] = [];
  const timestamp = new Date().toISOString();

  // QUEUE ALERTS

  // Extract vhost from queue for queue-related alerts
  const queueVhost = queue.vhost || "/";

  // Check high message count
  const messageCount = queue.messages || 0;
  const msgSeverity = checkThreshold(
    messageCount,
    thresholds.queueMessages,
    "gte"
  );
  if (msgSeverity) {
    const prefix = SEVERITY_TITLE_PREFIX[msgSeverity];
    alerts.push({
      id: generateAlertId(serverId, AlertCategory.QUEUE, queue.name),
      serverId,
      serverName,
      severity: msgSeverity,
      category: AlertCategory.QUEUE,
      title: `${prefix} Queue Backlog`,
      description: `Queue ${queue.name} has ${msgSeverity === AlertSeverity.CRITICAL ? "critically " : ""}high message count`,
      details: {
        current: messageCount,
        threshold: getMatchedThreshold(thresholds.queueMessages, msgSeverity),
        recommended:
          msgSeverity === AlertSeverity.CRITICAL ||
          msgSeverity === AlertSeverity.HIGH
            ? "Scale consumers or investigate processing issues"
            : "Monitor consumer performance",
        affected: [queue.name],
      },
      timestamp,
      resolved: false,
      vhost: queueVhost,
      source: { type: "queue", name: queue.name },
    });
  }

  // Check for queues with no consumers but messages
  if (messageCount > 0 && (queue.consumers === 0 || !queue.consumers)) {
    alerts.push({
      id: generateAlertId(serverId, AlertCategory.QUEUE, queue.name),
      serverId,
      serverName,
      severity: AlertSeverity.MEDIUM,
      category: AlertCategory.QUEUE,
      title: "Queue Without Consumers",
      description: `Queue ${queue.name} has messages but no consumers`,
      details: {
        current: `${messageCount} messages, 0 consumers`,
        recommended: "Start consumers or check consumer connectivity",
        affected: [queue.name],
      },
      timestamp,
      resolved: false,
      vhost: queueVhost,
      source: { type: "queue", name: queue.name },
    });
  }

  // Check high unacknowledged messages
  const unackedMessages = queue.messages_unacknowledged || 0;
  const unackedSeverity = checkThreshold(
    unackedMessages,
    thresholds.unackedMessages,
    "gte"
  );
  if (unackedSeverity) {
    const prefix = SEVERITY_TITLE_PREFIX[unackedSeverity];
    alerts.push({
      id: generateAlertId(serverId, AlertCategory.QUEUE, queue.name),
      serverId,
      serverName,
      severity: unackedSeverity,
      category: AlertCategory.QUEUE,
      title: `${prefix} Unacknowledged Messages`,
      description: `Queue ${queue.name} has ${unackedSeverity === AlertSeverity.CRITICAL ? "critically " : ""}high number of unacknowledged messages`,
      details: {
        current: unackedMessages,
        threshold: getMatchedThreshold(
          thresholds.unackedMessages,
          unackedSeverity
        ),
        recommended:
          unackedSeverity === AlertSeverity.CRITICAL ||
          unackedSeverity === AlertSeverity.HIGH
            ? "Check consumer acknowledgment patterns and restart consumers if necessary"
            : "Monitor consumer acknowledgment patterns",
        affected: [queue.name],
      },
      timestamp,
      resolved: false,
      vhost: queueVhost,
      source: { type: "queue", name: queue.name },
    });
  }

  // Check consumer utilization (LESS_THAN comparison - low utilization is bad)
  const consumerCount = queue.consumers || 0;
  if (consumerCount > 0) {
    // Calculate consumer utilization based on message rates
    const publishRate = queue.message_stats?.publish_details?.rate || 0;
    const deliverRate = queue.message_stats?.deliver_get_details?.rate || 0;

    // Consumer utilization as percentage of processing capacity
    const consumerUtilization =
      publishRate > 0 ? (deliverRate / publishRate) * 100 : 100;

    const cuSeverity = checkThreshold(
      consumerUtilization,
      thresholds.consumerUtilization,
      "lte"
    );
    if (cuSeverity) {
      alerts.push({
        id: generateAlertId(serverId, AlertCategory.PERFORMANCE, queue.name),
        serverId,
        serverName,
        severity: cuSeverity,
        category: AlertCategory.PERFORMANCE,
        title: "Low Consumer Utilization",
        description: `Queue ${queue.name} has low consumer utilization`,
        details: {
          current: Math.round(consumerUtilization),
          threshold: getMatchedThreshold(
            thresholds.consumerUtilization,
            cuSeverity
          ),
          recommended: "Check consumer performance or reduce consumer count",
          affected: [queue.name],
        },
        timestamp,
        resolved: false,
        vhost: queueVhost,
        source: { type: "queue", name: queue.name },
      });
    }
  }

  // Check for stale messages (messages not being processed)
  const readyMessages = queue.messages_ready || 0;
  if (readyMessages > 0 && consumerCount > 0) {
    // If there are ready messages but consumers, and no delivery rate
    const deliverRate = queue.message_stats?.deliver_get_details?.rate || 0;
    if (deliverRate === 0 && readyMessages > 100) {
      alerts.push({
        id: generateAlertId(serverId, AlertCategory.QUEUE, queue.name),
        serverId,
        serverName,
        severity: AlertSeverity.MEDIUM,
        category: AlertCategory.QUEUE,
        title: "Stale Messages Detected",
        description: `Queue ${queue.name} has ready messages but no delivery activity`,
        details: {
          current: `${readyMessages} ready messages, 0 delivery rate`,
          recommended: "Check consumer health and queue bindings",
          affected: [queue.name],
        },
        timestamp,
        resolved: false,
        vhost: queueVhost,
        source: { type: "queue", name: queue.name },
      });
    }
  }

  // Check message accumulation rate
  const publishRate = queue.message_stats?.publish_details?.rate || 0;
  const deliverRate = queue.message_stats?.deliver_get_details?.rate || 0;

  if (publishRate > 0 && deliverRate > 0) {
    const accumulationRate = publishRate - deliverRate;
    const accumulationRatio = accumulationRate / publishRate;

    // If messages are accumulating faster than 50% of publish rate
    if (accumulationRatio > 0.5 && messageCount > 1000) {
      alerts.push({
        id: generateAlertId(serverId, AlertCategory.PERFORMANCE, queue.name),
        serverId,
        serverName,
        severity: AlertSeverity.MEDIUM,
        category: AlertCategory.PERFORMANCE,
        title: "Message Accumulation",
        description: `Queue ${queue.name} is accumulating messages faster than processing`,
        details: {
          current: `Publish: ${publishRate.toFixed(2)}/s, Deliver: ${deliverRate.toFixed(2)}/s`,
          recommended: "Scale consumers or optimize message processing",
          affected: [queue.name],
        },
        timestamp,
        resolved: false,
        source: { type: "queue", name: queue.name },
      });
    }
  }

  // Check for queue without recent activity (potential dead queue)
  if (messageCount === 0 && consumerCount === 0) {
    // Use idle_since timestamp to detect inactive queues
    if (queue.idle_since) {
      const lastActivityTime = new Date(queue.idle_since);
      const hoursSinceActivity =
        (Date.now() - lastActivityTime.getTime()) / (1000 * 60 * 60);

      // If no activity for more than 24 hours
      if (hoursSinceActivity > 24) {
        alerts.push({
          id: generateAlertId(serverId, AlertCategory.QUEUE, queue.name),
          serverId,
          serverName,
          severity: AlertSeverity.INFO,
          category: AlertCategory.QUEUE,
          title: "Inactive Queue",
          description: `Queue ${queue.name} has been inactive for over 24 hours`,
          details: {
            current: `${Math.round(hoursSinceActivity)} hours since last activity`,
            recommended: "Consider removing queue if no longer needed",
            affected: [queue.name],
          },
          timestamp,
          resolved: false,
          source: { type: "queue", name: queue.name },
        });
      }
    }
  }

  return alerts;
}
