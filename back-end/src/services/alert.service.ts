import prisma from "../core/prisma";
import { AlertType, ComparisonOperator, AlertSeverity } from "@prisma/client";

interface MetricValue {
  value: number;
  timestamp: Date;
}

export class AlertService {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private readonly checkInterval = 60000; // Check every minute

  /**
   * Start the alert monitoring service
   */
  start(): void {
    if (this.isRunning) {
      console.log("Alert service is already running");
      return;
    }

    this.isRunning = true;
    console.log("Starting alert monitoring service...");

    // Run immediately, then at intervals
    this.evaluateAllAlerts();
    this.intervalId = setInterval(() => {
      this.evaluateAllAlerts();
    }, this.checkInterval);
  }

  /**
   * Stop the alert monitoring service
   */
  stop(): void {
    if (!this.isRunning) {
      console.log("Alert service is not running");
      return;
    }

    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log("Alert monitoring service stopped");
  }

  /**
   * Evaluate all active alert rules
   */
  private async evaluateAllAlerts(): Promise<void> {
    try {
      console.log("Evaluating alert rules...");

      const alertRules = await prisma.alertRule.findMany({
        where: {
          enabled: true,
        },
        include: {
          server: true,
          company: true,
        },
      });

      console.log(`Found ${alertRules.length} active alert rules`);

      for (const rule of alertRules) {
        try {
          await this.evaluateAlertRule(rule);
        } catch (error) {
          console.error(`Error evaluating alert rule ${rule.id}:`, error);
        }
      }
    } catch (error) {
      console.error("Error in evaluateAllAlerts:", error);
    }
  }

  /**
   * Evaluate a specific alert rule
   */
  private async evaluateAlertRule(rule: any): Promise<void> {
    const currentValue = await this.getMetricValue(rule);

    if (currentValue === null) {
      console.log(
        `No metric value available for rule ${rule.name} (${rule.id})`
      );
      return;
    }

    const isTriggered = this.checkThreshold(
      currentValue.value,
      rule.threshold,
      rule.operator
    );

    if (isTriggered) {
      // Check if there's already an active alert for this rule
      const existingActiveAlert = await prisma.alert.findFirst({
        where: {
          alertRuleId: rule.id,
          status: {
            in: ["ACTIVE", "ACKNOWLEDGED"],
          },
        },
      });

      if (!existingActiveAlert) {
        // Create new alert
        await this.createAlert(rule, currentValue);
        console.log(
          `Alert triggered for rule: ${rule.name} (value: ${currentValue.value}, threshold: ${rule.threshold})`
        );
      }
    } else {
      // Check if we should auto-resolve any active alerts
      await this.autoResolveAlerts(rule);
    }
  }

  /**
   * Get the current metric value for an alert rule
   */
  private async getMetricValue(rule: any): Promise<MetricValue | null> {
    const server = rule.server;

    try {
      switch (rule.type) {
        case AlertType.QUEUE_DEPTH:
          return await this.getQueueDepthMetric(server.id);

        case AlertType.MESSAGE_RATE:
          return await this.getMessageRateMetric(server.id);

        case AlertType.CONSUMER_COUNT:
          return await this.getConsumerCountMetric(server.id);

        case AlertType.CONNECTION_COUNT:
          return await this.getConnectionCountMetric(server);

        case AlertType.CHANNEL_COUNT:
          return await this.getChannelCountMetric(server);

        case AlertType.MEMORY_USAGE:
          return await this.getMemoryUsageMetric(server);

        case AlertType.DISK_USAGE:
          return await this.getDiskUsageMetric(server);

        case AlertType.NODE_DOWN:
          return await this.getNodeStatusMetric(server);

        default:
          console.warn(`Unsupported alert type: ${rule.type}`);
          return null;
      }
    } catch (error) {
      console.error(`Error getting metric for rule ${rule.id}:`, error);
      return null;
    }
  }

  /**
   * Check if a value meets the threshold condition
   */
  private checkThreshold(
    value: number,
    threshold: number,
    operator: ComparisonOperator
  ): boolean {
    switch (operator) {
      case ComparisonOperator.GREATER_THAN:
        return value > threshold;
      case ComparisonOperator.LESS_THAN:
        return value < threshold;
      case ComparisonOperator.EQUALS:
        return Math.abs(value - threshold) < 0.001; // Account for floating point precision
      case ComparisonOperator.NOT_EQUALS:
        return Math.abs(value - threshold) >= 0.001;
      default:
        return false;
    }
  }

  /**
   * Create a new alert
   */
  private async createAlert(
    rule: any,
    metricValue: MetricValue
  ): Promise<void> {
    await prisma.alert.create({
      data: {
        title: `${rule.name} Alert`,
        description: `Alert rule "${rule.name}" has been triggered. Current value: ${metricValue.value}, Threshold: ${rule.threshold}`,
        severity: rule.severity,
        status: "ACTIVE",
        value: metricValue.value,
        threshold: rule.threshold,
        alertRuleId: rule.id,
        companyId: rule.companyId,
        createdById: rule.createdById,
      },
    });
  }

  /**
   * Auto-resolve alerts when conditions are no longer met
   */
  private async autoResolveAlerts(rule: any): Promise<void> {
    const activeAlerts = await prisma.alert.findMany({
      where: {
        alertRuleId: rule.id,
        status: "ACTIVE",
      },
    });

    for (const alert of activeAlerts) {
      await prisma.alert.update({
        where: { id: alert.id },
        data: {
          status: "RESOLVED",
          resolvedAt: new Date(),
        },
      });
      console.log(`Auto-resolved alert: ${alert.title}`);
    }
  }

  // Metric collection methods
  private async getQueueDepthMetric(
    serverId: string
  ): Promise<MetricValue | null> {
    const totalMessages = await prisma.queue.aggregate({
      where: { serverId },
      _sum: { messages: true },
    });

    return {
      value: totalMessages._sum.messages || 0,
      timestamp: new Date(),
    };
  }

  private async getMessageRateMetric(
    serverId: string
  ): Promise<MetricValue | null> {
    // Get average message rate from the last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const metrics = await prisma.queueMetric.findMany({
      where: {
        queue: { serverId },
        timestamp: { gte: fiveMinutesAgo },
      },
      select: {
        publishRate: true,
        consumeRate: true,
      },
    });

    if (metrics.length === 0) return null;

    const totalRate = metrics.reduce(
      (sum, metric) => sum + metric.publishRate + metric.consumeRate,
      0
    );

    return {
      value: totalRate / metrics.length,
      timestamp: new Date(),
    };
  }

  private async getConsumerCountMetric(
    serverId: string
  ): Promise<MetricValue | null> {
    // This would typically come from RabbitMQ Management API
    // For now, return a placeholder value
    return {
      value: 0,
      timestamp: new Date(),
    };
  }

  private async getConnectionCountMetric(
    serverId: string
  ): Promise<MetricValue | null> {
    // This would require calling RabbitMQ Management API
    // Placeholder implementation
    try {
      // In a real implementation, you would call:
      // const response = await fetch(`http://${server.host}:15672/api/connections`, {
      //   headers: {
      //     'Authorization': `Basic ${Buffer.from(`${server.username}:${server.password}`).toString('base64')}`
      //   }
      // });
      // const connections = await response.json();
      // return { value: connections.length, timestamp: new Date() };

      return {
        value: Math.floor(Math.random() * 50), // Mock value for testing
        timestamp: new Date(),
      };
    } catch (error) {
      console.error("Error getting connection count:", error);
      return null;
    }
  }

  private async getChannelCountMetric(
    serverId: string
  ): Promise<MetricValue | null> {
    // Similar to connection count, this would use RabbitMQ Management API
    return {
      value: Math.floor(Math.random() * 100), // Mock value for testing
      timestamp: new Date(),
    };
  }

  private async getMemoryUsageMetric(
    serverId: string
  ): Promise<MetricValue | null> {
    // This would require calling RabbitMQ Management API to get node stats
    return {
      value: Math.random() * 100, // Mock percentage for testing
      timestamp: new Date(),
    };
  }

  private async getDiskUsageMetric(
    serverId: string
  ): Promise<MetricValue | null> {
    // This would require calling RabbitMQ Management API to get node stats
    return {
      value: Math.random() * 100, // Mock percentage for testing
      timestamp: new Date(),
    };
  }

  private async getNodeStatusMetric(
    serverId: string
  ): Promise<MetricValue | null> {
    // This would check if the RabbitMQ node is responding
    // Return 1 for up, 0 for down
    try {
      // In a real implementation, you would ping the server or call the API
      return {
        value: 1, // Mock value - assume server is up
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        value: 0, // Server is down
        timestamp: new Date(),
      };
    }
  }
}

// Export a singleton instance
export const alertService = new AlertService();
