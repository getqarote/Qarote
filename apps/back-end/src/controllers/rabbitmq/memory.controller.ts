import { Hono } from "hono";

import { logger } from "@/core/logger";

import { NodeMemoryDetailsResponse } from "@/types/api-responses";
import { RabbitMQNode } from "@/types/rabbitmq";

import { createErrorResponse, getWorkspaceId } from "../shared";
import { createRabbitMQClient, verifyServerAccess } from "./shared";

const memoryController = new Hono();

/**
 * Get detailed memory metrics for a specific node for a specific server (ALL USERS)
 * GET /workspaces/:workspaceId/servers/:id/nodes/:nodeName/memory
 */
memoryController.get("/servers/:id/nodes/:nodeName/memory", async (c) => {
  const id = c.req.param("id");
  const nodeName = c.req.param("nodeName");
  const workspaceId = getWorkspaceId(c);
  try {
    logger.info(
      { nodeName, serverId: id },
      "Fetching memory details for node on server"
    );

    // Verify the server belongs to the user's workspace
    const server = await verifyServerAccess(id, workspaceId, true);
    if (!server) {
      return c.json({ error: "Server not found or access denied" }, 404);
    }

    if (!server.workspace) {
      return c.json({ error: "Server workspace not found" }, 404);
    }

    const client = await createRabbitMQClient(id, workspaceId);
    const nodes = await client.getNodes();
    const node = nodes.find((n: RabbitMQNode) => n.name === nodeName);

    if (!node) {
      return c.json({ error: "Node not found" }, 404);
    }

    // Basic memory metrics (available to all plans)
    const basicMemoryMetrics = {
      immediate: {
        totalMemory: node.mem_limit,
        usedMemory: node.mem_used,
        freeMemory: node.mem_limit - node.mem_used,
        memoryUsagePercentage: (node.mem_used / node.mem_limit) * 100,
        memoryAlarm: node.mem_alarm,
        memoryCalculationStrategy: node.mem_calculation_strategy,
      },
    };

    // Advanced memory metrics (Startup and Business plans)
    let advancedMemoryMetrics = {};
    try {
      advancedMemoryMetrics = {
        advanced: {
          fileDescriptors: {
            used: node.fd_used,
            total: node.fd_total,
            usagePercentage: (node.fd_used / node.fd_total) * 100,
          },
          sockets: {
            used: node.sockets_used,
            total: node.sockets_total,
            usagePercentage: (node.sockets_used / node.sockets_total) * 100,
          },
          processes: {
            used: node.proc_used,
            total: node.proc_total,
            usagePercentage: (node.proc_used / node.proc_total) * 100,
          },
          garbageCollection: {
            gcCount: node.gc_num,
            gcBytesReclaimed: node.gc_bytes_reclaimed,
            gcRate: node.gc_num_details.rate,
          },
        },
      };
    } catch {
      // Access not allowed for this plan level
    }

    // Expert memory metrics (Business plan only)
    let expertMemoryMetrics = {};
    try {
      expertMemoryMetrics = {
        expert: {
          ioMetrics: {
            readCount: node.io_read_count,
            readBytes: node.io_read_bytes,
            readAvgTime: node.io_read_avg_time,
            writeCount: node.io_write_count,
            writeBytes: node.io_write_bytes,
            writeAvgTime: node.io_write_avg_time,
            syncCount: node.io_sync_count,
            syncAvgTime: node.io_sync_avg_time,
          },
          mnesia: {
            ramTransactions: node.mnesia_ram_tx_count,
            diskTransactions: node.mnesia_disk_tx_count,
          },
          messageStore: {
            readCount: node.msg_store_read_count,
            writeCount: node.msg_store_write_count,
          },
          queueIndex: {
            readCount: node.queue_index_read_count,
            writeCount: node.queue_index_write_count,
          },
          systemMetrics: {
            runQueue: node.run_queue,
            processors: node.processors,
            contextSwitches: node.context_switches,
          },
        },
      };
    } catch {
      // Access not allowed for this plan level
    }

    // Memory trends (Startup and Business plans)
    let memoryTrends = {};
    try {
      // Note: This would typically require historical data storage
      // For now, we'll provide rate details from the current snapshot
      memoryTrends = {
        trends: {
          memoryUsageRate: node.mem_used_details.rate,
          diskFreeRate: node.disk_free_details.rate,
          fdUsageRate: node.fd_used_details.rate,
          socketUsageRate: node.sockets_used_details.rate,
          processUsageRate: node.proc_used_details.rate,
        },
      };
    } catch {
      // Access not allowed for this plan level
    }

    // Memory optimization suggestions (Startup and Business plans)
    let memoryOptimization = {};
    try {
      const suggestions = [];
      const warnings = [];

      // Analyze memory usage and provide suggestions
      const memoryUsagePercent = (node.mem_used / node.mem_limit) * 100;
      const fdUsagePercent = (node.fd_used / node.fd_total) * 100;
      const socketUsagePercent = (node.sockets_used / node.sockets_total) * 100;
      const processUsagePercent = (node.proc_used / node.proc_total) * 100;

      if (memoryUsagePercent > 90) {
        warnings.push("Memory usage is critically high (>90%)");
        suggestions.push(
          "Consider increasing the memory limit or optimizing message consumption"
        );
      } else if (memoryUsagePercent > 75) {
        warnings.push("Memory usage is high (>75%)");
        suggestions.push("Monitor memory usage closely and consider scaling");
      }

      if (fdUsagePercent > 80) {
        warnings.push("File descriptor usage is high (>80%)");
        suggestions.push("Consider increasing file descriptor limits");
      }

      if (socketUsagePercent > 80) {
        warnings.push("Socket usage is high (>80%)");
        suggestions.push(
          "Monitor connection count and consider connection pooling"
        );
      }

      if (processUsagePercent > 80) {
        warnings.push("Process usage is high (>80%)");
        suggestions.push("Consider increasing process limits");
      }

      if (node.mem_alarm) {
        warnings.push("Memory alarm is active");
        suggestions.push(
          "Immediate action required: reduce memory usage or increase limits"
        );
      }

      if (node.disk_free_alarm) {
        warnings.push("Disk space alarm is active");
        suggestions.push("Free up disk space or increase disk capacity");
      }

      // Performance suggestions
      if (node.gc_num_details.rate > 100) {
        suggestions.push(
          "High garbage collection rate detected - consider tuning memory settings"
        );
      }

      if (suggestions.length === 0) {
        suggestions.push("Memory usage is within normal parameters");
      }

      memoryOptimization = {
        optimization: {
          overallHealth:
            warnings.length === 0
              ? "Good"
              : warnings.length <= 2
                ? "Warning"
                : "Critical",
          warnings,
          suggestions,
          recommendations: {
            memoryTuning: memoryUsagePercent > 75,
            connectionOptimization: socketUsagePercent > 60,
            fileDescriptorTuning: fdUsagePercent > 60,
            processLimitIncrease: processUsagePercent > 60,
          },
        },
      };
    } catch {
      // Access not allowed for this plan level
    }

    const response: NodeMemoryDetailsResponse = {
      node: {
        name: node.name,
        running: node.running,
        uptime: node.uptime,
        ...basicMemoryMetrics,
        ...advancedMemoryMetrics,
        ...expertMemoryMetrics,
        ...memoryTrends,
        ...memoryOptimization,
      },
      planAccess: {
        hasBasic: true,
        hasAdvanced: Object.keys(advancedMemoryMetrics).length > 0,
        hasExpert: Object.keys(expertMemoryMetrics).length > 0,
        hasTrends: Object.keys(memoryTrends).length > 0,
        hasOptimization: Object.keys(memoryOptimization).length > 0,
      },
    };
    return c.json(response);
  } catch (error) {
    logger.error(
      { error, nodeName, serverId: id },
      "Error fetching memory details for node on server"
    );
    return createErrorResponse(
      c,
      error,
      500,
      "Failed to fetch node memory details"
    );
  }
});

export default memoryController;
