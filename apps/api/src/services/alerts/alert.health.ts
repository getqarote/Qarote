import { logger } from "@/core/logger";

import { createRabbitMQClient } from "@/trpc/routers/rabbitmq/shared";

import { ClusterHealthSummary, HealthCheck } from "./alert.interfaces";
import { alertThresholdsService } from "./alert.thresholds";

/**
 * Alert Health Service
 * Handles health checks and cluster health summaries
 */
export class AlertHealthService {
  /**
   * Get cluster health summary
   */
  async getClusterHealthSummary(
    serverId: string,
    workspaceId: string
  ): Promise<ClusterHealthSummary> {
    const client = await createRabbitMQClient(serverId, workspaceId);

    // Get workspace-specific thresholds
    const thresholds =
      await alertThresholdsService.getWorkspaceThresholds(workspaceId);

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
      logger.warn({ error }, `Failed to get nodes for cluster health summary:`);
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
      logger.warn({ error }, `Failed to get queues for cluster health summary`);
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
    const thresholds =
      await alertThresholdsService.getWorkspaceThresholds(workspaceId);

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
}

// Export a singleton instance
export const alertHealthService = new AlertHealthService();
