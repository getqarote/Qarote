import { logger } from "@/core/logger";
import { createRabbitMQClient } from "@/controllers/rabbitmq/shared";
import { prisma } from "@/core/prisma";
import { WorkspaceAlertThresholds } from "@prisma/client";
import {
  AlertCategory,
  AlertSeverity,
  AlertSummary,
  AlertThresholds,
  ClusterHealthSummary,
  HealthCheck,
  RabbitMQAlert,
} from "@/types/alert";
import { RabbitMQNode, RabbitMQQueue } from "@/types/rabbitmq";

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
 * Generate alert ID
 */
function generateAlertId(
  serverId: string,
  category: AlertCategory,
  source: string
): string {
  return `${serverId}-${category}-${source}-${Date.now()}`;
}

/**
 * Analyze node health and generate alerts
 */
function analyzeNodeHealth(
  node: RabbitMQNode,
  serverId: string,
  serverName: string,
  thresholds: AlertThresholds
): RabbitMQAlert[] {
  const alerts: RabbitMQAlert[] = [];
  const timestamp = new Date().toISOString();

  // CRITICAL ALERTS

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

  // WARNING ALERTS

  // Check memory usage percentage
  if (node.mem_limit > 0) {
    const memoryUsagePercent = (node.mem_used / node.mem_limit) * 100;
    if (memoryUsagePercent >= thresholds.memory.critical) {
      alerts.push({
        id: generateAlertId(serverId, AlertCategory.MEMORY, node.name),
        serverId,
        serverName,
        severity: AlertSeverity.CRITICAL,
        category: AlertCategory.MEMORY,
        title: "Critical Memory Usage",
        description: `Node ${node.name} memory usage is critically high`,
        details: {
          current: Math.round(memoryUsagePercent),
          threshold: thresholds.memory.critical,
          recommended: "Consider scaling or optimizing memory usage",
          affected: [node.name],
        },
        timestamp,
        resolved: false,
        source: { type: "node", name: node.name },
      });
    } else if (memoryUsagePercent >= thresholds.memory.warning) {
      alerts.push({
        id: generateAlertId(serverId, AlertCategory.MEMORY, node.name),
        serverId,
        serverName,
        severity: AlertSeverity.WARNING,
        category: AlertCategory.MEMORY,
        title: "High Memory Usage",
        description: `Node ${node.name} memory usage is high`,
        details: {
          current: Math.round(memoryUsagePercent),
          threshold: thresholds.memory.warning,
          recommended: "Monitor memory usage and consider optimization",
          affected: [node.name],
        },
        timestamp,
        resolved: false,
        source: { type: "node", name: node.name },
      });
    }
  }

  // Check disk space percentage (free space)
  if (node.disk_free_limit > 0 && node.disk_free > 0) {
    const diskFreePercent =
      (node.disk_free /
        (node.disk_free + (node.disk_free_limit - node.disk_free))) *
      100;
    if (diskFreePercent <= thresholds.disk.critical) {
      alerts.push({
        id: generateAlertId(serverId, AlertCategory.DISK, node.name),
        serverId,
        serverName,
        severity: AlertSeverity.CRITICAL,
        category: AlertCategory.DISK,
        title: "Critical Disk Space",
        description: `Node ${node.name} has critically low disk space`,
        details: {
          current: Math.round(diskFreePercent),
          threshold: thresholds.disk.critical,
          recommended: "Free disk space immediately",
          affected: [node.name],
        },
        timestamp,
        resolved: false,
        source: { type: "node", name: node.name },
      });
    } else if (diskFreePercent <= thresholds.disk.warning) {
      alerts.push({
        id: generateAlertId(serverId, AlertCategory.DISK, node.name),
        serverId,
        serverName,
        severity: AlertSeverity.WARNING,
        category: AlertCategory.DISK,
        title: "Low Disk Space",
        description: `Node ${node.name} has low disk space`,
        details: {
          current: Math.round(diskFreePercent),
          threshold: thresholds.disk.warning,
          recommended: "Monitor disk usage and consider cleanup",
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
    if (fdUsagePercent >= thresholds.fileDescriptors.critical) {
      alerts.push({
        id: generateAlertId(serverId, AlertCategory.CONNECTION, node.name),
        serverId,
        serverName,
        severity: AlertSeverity.CRITICAL,
        category: AlertCategory.CONNECTION,
        title: "Critical File Descriptor Usage",
        description: `Node ${node.name} file descriptor usage is critically high`,
        details: {
          current: Math.round(fdUsagePercent),
          threshold: thresholds.fileDescriptors.critical,
          recommended: "Increase file descriptor limit or reduce connections",
          affected: [node.name],
        },
        timestamp,
        resolved: false,
        source: { type: "node", name: node.name },
      });
    } else if (fdUsagePercent >= thresholds.fileDescriptors.warning) {
      alerts.push({
        id: generateAlertId(serverId, AlertCategory.CONNECTION, node.name),
        serverId,
        serverName,
        severity: AlertSeverity.WARNING,
        category: AlertCategory.CONNECTION,
        title: "High File Descriptor Usage",
        description: `Node ${node.name} file descriptor usage is high`,
        details: {
          current: Math.round(fdUsagePercent),
          threshold: thresholds.fileDescriptors.warning,
          recommended: "Monitor file descriptor usage",
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
    if (socketUsagePercent >= thresholds.sockets.critical) {
      alerts.push({
        id: generateAlertId(serverId, AlertCategory.CONNECTION, node.name),
        serverId,
        serverName,
        severity: AlertSeverity.CRITICAL,
        category: AlertCategory.CONNECTION,
        title: "Critical Socket Usage",
        description: `Node ${node.name} socket usage is critically high`,
        details: {
          current: Math.round(socketUsagePercent),
          threshold: thresholds.sockets.critical,
          recommended: "Increase socket limit or reduce connections",
          affected: [node.name],
        },
        timestamp,
        resolved: false,
        source: { type: "node", name: node.name },
      });
    } else if (socketUsagePercent >= thresholds.sockets.warning) {
      alerts.push({
        id: generateAlertId(serverId, AlertCategory.CONNECTION, node.name),
        serverId,
        serverName,
        severity: AlertSeverity.WARNING,
        category: AlertCategory.CONNECTION,
        title: "High Socket Usage",
        description: `Node ${node.name} socket usage is high`,
        details: {
          current: Math.round(socketUsagePercent),
          threshold: thresholds.sockets.warning,
          recommended: "Monitor socket usage",
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
    if (processUsagePercent >= thresholds.processes.critical) {
      alerts.push({
        id: generateAlertId(serverId, AlertCategory.PERFORMANCE, node.name),
        serverId,
        serverName,
        severity: AlertSeverity.CRITICAL,
        category: AlertCategory.PERFORMANCE,
        title: "Critical Process Usage",
        description: `Node ${node.name} Erlang process usage is critically high`,
        details: {
          current: Math.round(processUsagePercent),
          threshold: thresholds.processes.critical,
          recommended: "Investigate process leaks and restart if necessary",
          affected: [node.name],
        },
        timestamp,
        resolved: false,
        source: { type: "node", name: node.name },
      });
    } else if (processUsagePercent >= thresholds.processes.warning) {
      alerts.push({
        id: generateAlertId(serverId, AlertCategory.PERFORMANCE, node.name),
        serverId,
        serverName,
        severity: AlertSeverity.WARNING,
        category: AlertCategory.PERFORMANCE,
        title: "High Process Usage",
        description: `Node ${node.name} Erlang process usage is high`,
        details: {
          current: Math.round(processUsagePercent),
          threshold: thresholds.processes.warning,
          recommended: "Monitor process usage patterns",
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
    if (node.run_queue >= thresholds.runQueue.critical) {
      alerts.push({
        id: generateAlertId(serverId, AlertCategory.PERFORMANCE, node.name),
        serverId,
        serverName,
        severity: AlertSeverity.CRITICAL,
        category: AlertCategory.PERFORMANCE,
        title: "Critical Run Queue Length",
        description: `Node ${node.name} has critically high run queue length`,
        details: {
          current: node.run_queue,
          threshold: thresholds.runQueue.critical,
          recommended:
            "System is overloaded, consider scaling or load balancing",
          affected: [node.name],
        },
        timestamp,
        resolved: false,
        source: { type: "node", name: node.name },
      });
    } else if (node.run_queue >= thresholds.runQueue.warning) {
      alerts.push({
        id: generateAlertId(serverId, AlertCategory.PERFORMANCE, node.name),
        serverId,
        serverName,
        severity: AlertSeverity.WARNING,
        category: AlertCategory.PERFORMANCE,
        title: "High Run Queue Length",
        description: `Node ${node.name} has high run queue length`,
        details: {
          current: node.run_queue,
          threshold: thresholds.runQueue.warning,
          recommended: "Monitor system load and performance",
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
function analyzeQueueHealth(
  queue: RabbitMQQueue,
  serverId: string,
  serverName: string,
  thresholds: AlertThresholds
): RabbitMQAlert[] {
  const alerts: RabbitMQAlert[] = [];
  const timestamp = new Date().toISOString();

  // QUEUE ALERTS

  // Check high message count
  const messageCount = queue.messages || 0;
  if (messageCount >= thresholds.queueMessages.critical) {
    alerts.push({
      id: generateAlertId(serverId, AlertCategory.QUEUE, queue.name),
      serverId,
      serverName,
      severity: AlertSeverity.CRITICAL,
      category: AlertCategory.QUEUE,
      title: "Critical Queue Backlog",
      description: `Queue ${queue.name} has critically high message count`,
      details: {
        current: messageCount,
        threshold: thresholds.queueMessages.critical,
        recommended: "Scale consumers or investigate processing issues",
        affected: [queue.name],
      },
      timestamp,
      resolved: false,
      source: { type: "queue", name: queue.name },
    });
  } else if (messageCount >= thresholds.queueMessages.warning) {
    alerts.push({
      id: generateAlertId(serverId, AlertCategory.QUEUE, queue.name),
      serverId,
      serverName,
      severity: AlertSeverity.WARNING,
      category: AlertCategory.QUEUE,
      title: "High Queue Backlog",
      description: `Queue ${queue.name} has high message count`,
      details: {
        current: messageCount,
        threshold: thresholds.queueMessages.warning,
        recommended: "Monitor consumer performance",
        affected: [queue.name],
      },
      timestamp,
      resolved: false,
      source: { type: "queue", name: queue.name },
    });
  }

  // Check for queues with no consumers but messages
  if (messageCount > 0 && (queue.consumers === 0 || !queue.consumers)) {
    alerts.push({
      id: generateAlertId(serverId, AlertCategory.QUEUE, queue.name),
      serverId,
      serverName,
      severity: AlertSeverity.WARNING,
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
      source: { type: "queue", name: queue.name },
    });
  }

  // Check high unacknowledged messages
  const unackedMessages = queue.messages_unacknowledged || 0;
  if (unackedMessages >= thresholds.unackedMessages.critical) {
    alerts.push({
      id: generateAlertId(serverId, AlertCategory.QUEUE, queue.name),
      serverId,
      serverName,
      severity: AlertSeverity.CRITICAL,
      category: AlertCategory.QUEUE,
      title: "Critical Unacknowledged Messages",
      description: `Queue ${queue.name} has critically high number of unacknowledged messages`,
      details: {
        current: unackedMessages,
        threshold: thresholds.unackedMessages.critical,
        recommended:
          "Check consumer acknowledgment patterns and restart consumers if necessary",
        affected: [queue.name],
      },
      timestamp,
      resolved: false,
      source: { type: "queue", name: queue.name },
    });
  } else if (unackedMessages >= thresholds.unackedMessages.warning) {
    alerts.push({
      id: generateAlertId(serverId, AlertCategory.QUEUE, queue.name),
      serverId,
      serverName,
      severity: AlertSeverity.WARNING,
      category: AlertCategory.QUEUE,
      title: "High Unacknowledged Messages",
      description: `Queue ${queue.name} has high number of unacknowledged messages`,
      details: {
        current: unackedMessages,
        threshold: thresholds.unackedMessages.warning,
        recommended: "Check consumer acknowledgment patterns",
        affected: [queue.name],
      },
      timestamp,
      resolved: false,
      source: { type: "queue", name: queue.name },
    });
  }

  // Check consumer utilization
  const consumerCount = queue.consumers || 0;
  if (consumerCount > 0) {
    // Calculate consumer utilization based on message rates
    const publishRate = queue.message_stats?.publish_details?.rate || 0;
    const deliverRate = queue.message_stats?.deliver_get_details?.rate || 0;

    // Consumer utilization as percentage of processing capacity
    const consumerUtilization =
      publishRate > 0 ? (deliverRate / publishRate) * 100 : 100;

    if (consumerUtilization < thresholds.consumerUtilization.warning) {
      alerts.push({
        id: generateAlertId(serverId, AlertCategory.PERFORMANCE, queue.name),
        serverId,
        serverName,
        severity: AlertSeverity.WARNING,
        category: AlertCategory.PERFORMANCE,
        title: "Low Consumer Utilization",
        description: `Queue ${queue.name} has low consumer utilization`,
        details: {
          current: Math.round(consumerUtilization),
          threshold: thresholds.consumerUtilization.warning,
          recommended: "Check consumer performance or reduce consumer count",
          affected: [queue.name],
        },
        timestamp,
        resolved: false,
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
        severity: AlertSeverity.WARNING,
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
        severity: AlertSeverity.WARNING,
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

/**
 * Parse thresholds from query parameters
 */
/**
 * Alert Service class
 */
export class AlertService {
  /**
   * Get alerts for a server
   */
  async getServerAlerts(
    serverId: string,
    serverName: string,
    workspaceId: string
  ): Promise<{ alerts: RabbitMQAlert[]; summary: AlertSummary }> {
    const alerts: RabbitMQAlert[] = [];
    const client = await createRabbitMQClient(serverId, workspaceId);

    // Get workspace-specific thresholds
    const thresholds = await this.getWorkspaceThresholds(workspaceId);

    try {
      // Analyze nodes
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
      logger.warn(`Failed to get nodes for server ${serverId}:`, error);
    }

    try {
      // Analyze queues
      const queuesResponse = await client.getQueues();
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
      logger.warn(`Failed to get queues for server ${serverId}:`, error);
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

    return { alerts, summary };
  }

  /**
   * Get cluster health summary
   */
  async getClusterHealthSummary(
    serverId: string,
    workspaceId: string
  ): Promise<ClusterHealthSummary> {
    const client = await createRabbitMQClient(serverId, workspaceId);

    // Get workspace-specific thresholds
    const thresholds = await this.getWorkspaceThresholds(workspaceId);

    let clusterHealth: "healthy" | "degraded" | "critical" = "healthy";
    let criticalIssues = 0;
    let warningIssues = 0;
    const issues: string[] = [];

    try {
      // Check nodes
      const nodesResponse = await client.getNodes();
      if (nodesResponse && Array.isArray(nodesResponse)) {
        for (const node of nodesResponse) {
          if (!node.running) {
            criticalIssues++;
            issues.push(`Node ${node.name} is down`);
            clusterHealth = "critical";
          }
          if (node.mem_alarm) {
            criticalIssues++;
            issues.push(`Memory alarm on ${node.name}`);
            clusterHealth = "critical";
          }
          if (node.disk_free_alarm) {
            criticalIssues++;
            issues.push(`Disk alarm on ${node.name}`);
            clusterHealth = "critical";
          }
          if (node.partitions && node.partitions.length > 0) {
            criticalIssues++;
            issues.push(`Network partition detected on ${node.name}`);
            clusterHealth = "critical";
          }

          // Check memory usage
          if (node.mem_limit > 0) {
            const memoryUsagePercent = (node.mem_used / node.mem_limit) * 100;
            if (memoryUsagePercent >= thresholds.memory.critical) {
              criticalIssues++;
              issues.push(
                `Critical memory usage on ${node.name} (${Math.round(memoryUsagePercent)}%)`
              );
              clusterHealth = "critical";
            } else if (memoryUsagePercent >= thresholds.memory.warning) {
              warningIssues++;
              issues.push(
                `High memory usage on ${node.name} (${Math.round(memoryUsagePercent)}%)`
              );
              if (clusterHealth === "healthy") clusterHealth = "degraded";
            }
          }
        }
      }
    } catch (error) {
      logger.warn(`Failed to get nodes for cluster health summary:`, error);
      criticalIssues++;
      issues.push("Failed to connect to cluster nodes");
      clusterHealth = "critical";
    }

    try {
      // Check queues
      const queuesResponse = await client.getQueues();
      if (queuesResponse && Array.isArray(queuesResponse)) {
        for (const queue of queuesResponse) {
          const messageCount = queue.messages || 0;
          if (messageCount >= thresholds.queueMessages.critical) {
            criticalIssues++;
            issues.push(
              `Critical queue backlog: ${queue.name} (${messageCount} messages)`
            );
            clusterHealth = "critical";
          } else if (messageCount >= thresholds.queueMessages.warning) {
            warningIssues++;
            issues.push(
              `High queue backlog: ${queue.name} (${messageCount} messages)`
            );
            if (clusterHealth === "healthy") clusterHealth = "degraded";
          }
        }
      }
    } catch (error) {
      logger.warn(`Failed to get queues for cluster health summary:`, error);
    }

    return {
      clusterHealth,
      summary: {
        critical: criticalIssues,
        warning: warningIssues,
        total: criticalIssues + warningIssues,
        info: 0,
      },
      issues: issues.slice(0, 5), // Limit to first 5 issues
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get health check for a server
   */
  async getHealthCheck(
    serverId: string,
    workspaceId: string
  ): Promise<HealthCheck> {
    const client = await createRabbitMQClient(serverId, workspaceId);

    // Get workspace-specific thresholds
    const thresholds = await this.getWorkspaceThresholds(workspaceId);

    const healthCheck: HealthCheck = {
      overall: "healthy",
      checks: {
        connectivity: {
          status: "healthy",
          message: "",
        },
        nodes: {
          status: "healthy",
          message: "",
          details: {},
        },
        memory: {
          status: "healthy",
          message: "",
        },
        disk: {
          status: "healthy",
          message: "",
        },
        queues: {
          status: "healthy",
          message: "",
        },
      },
      timestamp: new Date().toISOString(),
    };

    // Test connectivity
    try {
      await client.getOverview();
      healthCheck.checks.connectivity.status = "healthy";
      healthCheck.checks.connectivity.message =
        "Successfully connected to RabbitMQ";
    } catch (error) {
      healthCheck.checks.connectivity.status = "critical";
      healthCheck.checks.connectivity.message = `Failed to connect: ${error}`;
      healthCheck.overall = "critical";
    }

    // Check nodes
    try {
      const nodes = await client.getNodes();
      if (nodes && Array.isArray(nodes)) {
        const runningNodes = nodes.filter((n) => n.running).length;
        const totalNodes = nodes.length;

        if (runningNodes === totalNodes) {
          healthCheck.checks.nodes.status = "healthy";
          healthCheck.checks.nodes.message = `All ${totalNodes} nodes are running`;
        } else if (runningNodes > 0) {
          healthCheck.checks.nodes.status = "warning";
          healthCheck.checks.nodes.message = `${runningNodes}/${totalNodes} nodes are running`;
          if (healthCheck.overall === "healthy")
            healthCheck.overall = "degraded";
        } else {
          healthCheck.checks.nodes.status = "critical";
          healthCheck.checks.nodes.message = "No nodes are running";
          healthCheck.overall = "critical";
        }

        healthCheck.checks.nodes.details = {
          running: runningNodes,
          total: totalNodes,
          nodes: nodes.map((n) => ({
            name: n.name,
            running: n.running,
            mem_alarm: n.mem_alarm,
            disk_free_alarm: n.disk_free_alarm,
          })),
        };

        // Check memory across nodes
        const memoryIssues = nodes.filter((n) => n.mem_alarm).length;
        if (memoryIssues > 0) {
          healthCheck.checks.memory.status = "critical";
          healthCheck.checks.memory.message = `${memoryIssues} nodes have memory alarms`;
          healthCheck.overall = "critical";
        } else {
          const highMemoryNodes = nodes.filter((n) => {
            if (n.mem_limit > 0) {
              const usage = (n.mem_used / n.mem_limit) * 100;
              return usage >= thresholds.memory.warning;
            }
            return false;
          }).length;

          if (highMemoryNodes > 0) {
            healthCheck.checks.memory.status = "warning";
            healthCheck.checks.memory.message = `${highMemoryNodes} nodes have high memory usage`;
            if (healthCheck.overall === "healthy")
              healthCheck.overall = "degraded";
          } else {
            healthCheck.checks.memory.status = "healthy";
            healthCheck.checks.memory.message =
              "Memory usage is normal across all nodes";
          }
        }

        // Check disk across nodes
        const diskIssues = nodes.filter((n) => n.disk_free_alarm).length;
        if (diskIssues > 0) {
          healthCheck.checks.disk.status = "critical";
          healthCheck.checks.disk.message = `${diskIssues} nodes have disk space alarms`;
          healthCheck.overall = "critical";
        } else {
          healthCheck.checks.disk.status = "healthy";
          healthCheck.checks.disk.message =
            "Disk space is sufficient across all nodes";
        }
      }
    } catch (error) {
      healthCheck.checks.nodes.status = "critical";
      healthCheck.checks.nodes.message = `Failed to check nodes: ${error}`;
      healthCheck.overall = "critical";
    }

    // Check queues
    try {
      const queues = await client.getQueues();
      if (queues && Array.isArray(queues)) {
        const totalQueues = queues.length;
        let criticalQueues = 0;
        let warningQueues = 0;
        let queuesWithoutConsumers = 0;

        for (const queue of queues) {
          const messageCount = queue.messages || 0;
          const consumerCount = queue.consumers || 0;
          const unackedMessages = queue.messages_unacknowledged || 0;

          // Check for critical queue conditions
          if (messageCount >= thresholds.queueMessages.critical) {
            criticalQueues++;
          } else if (messageCount >= thresholds.queueMessages.warning) {
            warningQueues++;
          }

          if (unackedMessages >= thresholds.unackedMessages.critical) {
            criticalQueues++;
          } else if (unackedMessages >= thresholds.unackedMessages.warning) {
            warningQueues++;
          }

          // Check for queues with messages but no consumers
          if (messageCount > 0 && consumerCount === 0) {
            queuesWithoutConsumers++;
          }
        }

        if (criticalQueues > 0) {
          healthCheck.checks.queues.status = "critical";
          healthCheck.checks.queues.message = `${criticalQueues} queues have critical issues`;
          healthCheck.overall = "critical";
        } else if (warningQueues > 0 || queuesWithoutConsumers > 0) {
          healthCheck.checks.queues.status = "warning";
          const issues = [];
          if (warningQueues > 0) {
            issues.push(`${warningQueues} queues with high message count`);
          }
          if (queuesWithoutConsumers > 0) {
            issues.push(`${queuesWithoutConsumers} queues without consumers`);
          }
          healthCheck.checks.queues.message = issues.join(", ");
          if (healthCheck.overall === "healthy") {
            healthCheck.overall = "degraded";
          }
        } else {
          healthCheck.checks.queues.status = "healthy";
          healthCheck.checks.queues.message = `All ${totalQueues} queues are healthy`;
        }
      }
    } catch (error) {
      healthCheck.checks.queues.status = "critical";
      healthCheck.checks.queues.message = `Failed to check queues: ${error}`;
      healthCheck.overall = "critical";
    }

    return healthCheck;
  }

  /**
   * Check if user can modify alert thresholds based on subscription plan
   */
  async canModifyThresholds(workspaceId: string): Promise<boolean> {
    try {
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: {
          plan: true,
        },
      });

      if (!workspace) {
        return false;
      }

      // Allow modifications for startup and business plans
      const allowedPlans = ["STARTUP", "BUSINESS"];
      return allowedPlans.includes(workspace.plan);
    } catch (error) {
      logger.error(
        "Failed to check threshold modification permissions:",
        error
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
export const alertService = new AlertService();
