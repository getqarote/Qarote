import { logger } from "@/core/logger";

import { RabbitMQAlert } from "@/types/alert";

import { SlackMessage, SlackResult } from "./slack.interfaces";

/**
 * Slack service for sending alert notifications to Slack channels via incoming webhooks
 */
export class SlackService {
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY_MS = 1_000; // 1 second
  private static readonly REQUEST_TIMEOUT_MS = 10_000; // 10 seconds

  /**
   * Sleep for specified milliseconds
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get color for alert severity
   */
  private static getSeverityColor(severity: string): string {
    switch (severity) {
      case "critical":
        return "danger"; // Red
      case "warning":
        return "warning"; // Yellow
      case "info":
        return "good"; // Green
      default:
        return "#36a64f"; // Default green
    }
  }

  /**
   * Format alert message for Slack
   */
  private static formatAlertMessage(alert: RabbitMQAlert): string {
    const emoji =
      alert.severity === "critical"
        ? "🔴"
        : alert.severity === "warning"
          ? "🟡"
          : "🔵";
    return `${emoji} *${alert.severity.toUpperCase()}*: ${alert.title}\n${alert.description}`;
  }

  /**
   * Create Slack message payload for alerts
   */
  static createAlertMessage(
    alerts: RabbitMQAlert[],
    workspaceName: string,
    serverName: string,
    customValue?: string | null
  ): SlackMessage {
    const criticalCount = alerts.filter(
      (a) => a.severity === "critical"
    ).length;
    const warningCount = alerts.filter((a) => a.severity === "warning").length;
    const infoCount = alerts.filter((a) => a.severity === "info").length;

    // Determine overall severity for color
    const overallSeverity =
      criticalCount > 0 ? "critical" : warningCount > 0 ? "warning" : "info";
    const color = this.getSeverityColor(overallSeverity);

    // Create summary text
    const summaryText = `*${alerts.length} alert${alerts.length !== 1 ? "s" : ""}* detected on *${serverName}* in workspace *${workspaceName}*`;
    const summaryDetails = [
      criticalCount > 0 ? `${criticalCount} critical` : null,
      warningCount > 0 ? `${warningCount} warning` : null,
      infoCount > 0 ? `${infoCount} info` : null,
    ]
      .filter(Boolean)
      .join(", ");

    // Build attachments with alert details
    const attachments = alerts.slice(0, 10).map((alert) => ({
      color: this.getSeverityColor(alert.severity),
      title: `${alert.severity.toUpperCase()}: ${alert.title}`,
      text: alert.description,
      fields: [
        {
          title: "Category",
          value: alert.category,
          short: true,
        },
        {
          title: "Source",
          value: `${alert.source.type}: ${alert.source.name}`,
          short: true,
        },
        ...(alert.details.current !== undefined
          ? [
              {
                title: "Current Value",
                value: String(alert.details.current),
                short: true,
              },
            ]
          : []),
        ...(alert.details.threshold !== undefined
          ? [
              {
                title: "Threshold",
                value: String(alert.details.threshold),
                short: true,
              },
            ]
          : []),
      ],
    }));

    // If more than 10 alerts, add a note
    if (alerts.length > 10) {
      attachments.push({
        color: "#cccccc",
        title: `... and ${alerts.length - 10} more alert${alerts.length - 10 !== 1 ? "s" : ""}`,
        text: "",
        fields: [],
      });
    }

    // Add custom value to the text if provided
    let messageText = summaryText;
    if (customValue && customValue.trim()) {
      messageText = `${summaryText}\n\n${customValue.trim()}`;
    }

    const message: SlackMessage = {
      text: messageText,
      username: "RabbitHQ Alerts",
      icon_emoji: ":rabbit:",
      attachments: [
        {
          color,
          title: summaryText,
          text:
            customValue && customValue.trim()
              ? `${summaryDetails}\n\n${customValue.trim()}`
              : summaryDetails,
          fields: [],
        },
        ...attachments,
      ],
    };

    return message;
  }

  /**
   * Send Slack message with retry logic
   */
  static async sendMessage(
    webhookUrl: string,
    message: SlackMessage,
    retries: number = 0
  ): Promise<SlackResult> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.REQUEST_TIMEOUT_MS
      );

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        logger.warn(
          {
            webhookUrl: webhookUrl.substring(0, 50) + "...", // Log partial URL for security
            statusCode: response.status,
            statusText: response.statusText,
            error: errorText,
            retries,
          },
          "Slack webhook request failed"
        );

        // Retry on 5xx errors or rate limiting
        if (
          (response.status >= 500 || response.status === 429) &&
          retries < this.MAX_RETRIES
        ) {
          await this.sleep(
            this.RETRY_DELAY_MS * Math.pow(2, retries) // Exponential backoff
          );
          return this.sendMessage(webhookUrl, message, retries + 1);
        }

        return {
          success: false,
          statusCode: response.status,
          error: `HTTP ${response.status}: ${response.statusText}`,
          retries,
        };
      }

      // Slack returns "ok" as text for successful requests
      const responseText = await response.text();
      if (responseText !== "ok") {
        logger.warn(
          {
            statusCode: response.status,
            responseText,
          },
          "Unexpected Slack response"
        );
      }

      logger.info(
        {
          statusCode: response.status,
          retries,
        },
        "Slack message sent successfully"
      );

      return {
        success: true,
        statusCode: response.status,
        retries,
      };
    } catch (error) {
      logger.error(
        { error, webhookUrl, retries },
        "Error sending Slack message"
      );

      // Retry on network errors
      if (retries < this.MAX_RETRIES) {
        await this.sleep(
          this.RETRY_DELAY_MS * Math.pow(2, retries) // Exponential backoff
        );
        return this.sendMessage(webhookUrl, message, retries + 1);
      }

      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        retries,
      };
    }
  }

  /**
   * Send alert notification to Slack
   */
  static async sendAlertNotification(
    webhookUrl: string,
    alerts: RabbitMQAlert[],
    workspaceName: string,
    serverName: string,
    customValue?: string | null
  ): Promise<SlackResult> {
    const message = this.createAlertMessage(
      alerts,
      workspaceName,
      serverName,
      customValue
    );
    return this.sendMessage(webhookUrl, message);
  }

  /**
   * Send alert notifications to multiple Slack configurations
   */
  static async sendAlertNotifications(
    slackConfigs: Array<{
      id: string;
      webhookUrl: string;
      customValue?: string | null;
    }>,
    alerts: RabbitMQAlert[],
    workspaceName: string,
    serverName: string
  ): Promise<Array<{ slackConfigId: string; result: SlackResult }>> {
    const results: Array<{ slackConfigId: string; result: SlackResult }> = [];

    // Send to all Slack configs in parallel
    const promises = slackConfigs.map(async (config) => {
      const result = await this.sendAlertNotification(
        config.webhookUrl,
        alerts,
        workspaceName,
        serverName,
        config.customValue
      );
      return {
        slackConfigId: config.id,
        result,
      };
    });

    const slackResults = await Promise.allSettled(promises);

    for (const slackResult of slackResults) {
      if (slackResult.status === "fulfilled") {
        results.push(slackResult.value);
      } else {
        logger.error(
          { error: slackResult.reason },
          "Failed to send Slack notification"
        );
        results.push({
          slackConfigId: "unknown",
          result: {
            success: false,
            error: slackResult.reason?.message || "Unknown error",
          },
        });
      }
    }

    return results;
  }
}
