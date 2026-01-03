import {
  RabbitMQNode,
  RabbitMQQueue,
} from "@/core/rabbitmq/rabbitmq.interfaces";

import { generateAlertId } from "./alert.fingerprint";
import {
  AlertCategory,
  AlertSeverity,
  AlertThresholds,
  RabbitMQAlert,
} from "./alert.interfaces";

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
      vhost: queueVhost,
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
      vhost: queueVhost,
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
      vhost: queueVhost,
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
        recommended: "Monitor consumer acknowledgment patterns",
        affected: [queue.name],
      },
      timestamp,
      resolved: false,
      vhost: queueVhost,
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
