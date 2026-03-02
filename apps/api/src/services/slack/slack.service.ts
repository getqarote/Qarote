import { logger } from "@/core/logger";
import { retryWithBackoffAndTimeout } from "@/core/retry";

import { RabbitMQAlert } from "@/services/alerts/alert.interfaces";

import { SlackMessage, SlackResult } from "./slack.interfaces";

/**
 * Slack service for sending alert notifications to Slack channels via incoming webhooks
 */
export class SlackService {
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
    serverId?: string,
    frontendUrl?: string
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
        ...(alert.vhost
          ? [
              {
                title: "Virtual Host",
                value: alert.vhost,
                short: true,
              },
            ]
          : []),
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

    // Determine vhost for URL - use the most common vhost from alerts, or first one if available
    const vhosts = alerts.map((a) => a.vhost).filter((v): v is string => !!v);
    const vhostCounts = vhosts.reduce(
      (acc, vhost) => {
        acc[vhost] = (acc[vhost] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
    const mostCommonVhost =
      Object.entries(vhostCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ||
      vhosts[0];

    // Build alerts URL with serverId and vhost query parameters
    let alertsUrl: string | undefined;
    if (frontendUrl && serverId) {
      const url = new URL(`${frontendUrl}/alerts`);
      url.searchParams.set("serverId", serverId);
      if (mostCommonVhost) {
        url.searchParams.set("vhost", mostCommonVhost);
      }
      alertsUrl = url.toString();
    }

    // Build blocks array with button if URL is available
    const blocks: SlackMessage["blocks"] = [];
    if (alertsUrl) {
      blocks.push({
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "View Alerts in Dashboard",
            },
            url: alertsUrl,
            style: "primary",
          },
        ],
      });
    }

    const message: SlackMessage = {
      text: summaryText,
      username: "Qarote Alerts",
      icon_emoji: ":rabbit:",
      blocks,
      attachments: [
        {
          color,
          title: summaryText,
          text: summaryDetails,
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
    message: SlackMessage
  ): Promise<SlackResult> {
    try {
      const response = await retryWithBackoffAndTimeout(
        async (signal: AbortSignal) => {
          const fetchResponse = await fetch(webhookUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(message),
            signal,
          });

          // Check if response indicates a retryable error
          if (!fetchResponse.ok) {
            const statusCode = fetchResponse.status;
            // Retry on 5xx errors or 429 (rate limiting)
            if (statusCode >= 500 || statusCode === 429) {
              const errorText = await fetchResponse
                .text()
                .catch(() => "Unknown error");
              logger.warn(
                {
                  webhookUrl: webhookUrl.substring(0, 50) + "...",
                  statusCode,
                  error: errorText,
                },
                "Slack webhook request failed, will retry"
              );
              const error = new Error(
                `HTTP ${statusCode}: ${fetchResponse.statusText}`
              ) as Error & { statusCode: number; status: number };
              error.statusCode = statusCode;
              error.status = statusCode;
              throw error;
            }
            // For non-retryable errors (4xx except 429), throw but don't retry
            const errorText = await fetchResponse
              .text()
              .catch(() => "Unknown error");

            logger.warn(
              {
                webhookUrl: webhookUrl.substring(0, 50) + "...",
                statusCode,
                error: errorText,
              },
              "Slack webhook request failed, non-retryable error"
            );
            const error = new Error(
              `HTTP ${statusCode}: ${fetchResponse.statusText}`
            ) as Error & { statusCode: number; status: number };
            error.statusCode = statusCode;
            error.status = statusCode;
            throw error;
          }

          return fetchResponse;
        },
        {
          maxRetries: 3,
          retryDelayMs: 1_000,
          timeoutMs: 10_000,
        },
        "generic"
      );

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
        },
        "Slack message sent successfully"
      );

      return {
        success: true,
        statusCode: response.status,
      };
    } catch (error) {
      logger.error({ error, webhookUrl }, "Error sending Slack message");

      // Extract status code if available
      const statusCode =
        (error as { statusCode?: number; status?: number })?.statusCode ??
        (error as { statusCode?: number; status?: number })?.status;

      return {
        success: false,
        statusCode,
        error: Error.isError(error) ? error.message : "Unknown error occurred",
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
    serverId?: string,
    frontendUrl?: string
  ): Promise<SlackResult> {
    const message = this.createAlertMessage(
      alerts,
      workspaceName,
      serverName,
      serverId,
      frontendUrl
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
    }>,
    alerts: RabbitMQAlert[],
    workspaceName: string,
    serverName: string,
    serverId?: string,
    frontendUrl?: string
  ): Promise<Array<{ slackConfigId: string; result: SlackResult }>> {
    const results: Array<{ slackConfigId: string; result: SlackResult }> = [];

    // Send to all Slack configs in parallel
    const promises = slackConfigs.map(async (config) => {
      const result = await this.sendAlertNotification(
        config.webhookUrl,
        alerts,
        workspaceName,
        serverName,
        serverId,
        frontendUrl
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
