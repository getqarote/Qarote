import { createHmac } from "node:crypto";

import { logger } from "@/core/logger";

import { RabbitMQAlert } from "@/types/alert";

import { WebhookPayload, WebhookResult } from "./webhook.interfaces";

/**
 * Webhook service for sending alert notifications to user-defined webhook endpoints
 */
export class WebhookService {
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY_MS = 1_000; // 1 second
  private static readonly REQUEST_TIMEOUT_MS = 10_000; // 10 seconds

  /**
   * Generate HMAC signature for webhook payload
   */
  private static generateSignature(payload: string, secret: string): string {
    return createHmac("sha256", secret).update(payload).digest("hex");
  }

  /**
   * Sleep for specified milliseconds
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Send webhook with retry logic
   */
  static async sendWebhook(
    url: string,
    payload: WebhookPayload,
    secret?: string | null,
    retries: number = 0
  ): Promise<WebhookResult> {
    const payloadString = JSON.stringify(payload);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "RabbitHQ-Webhook/1.0",
      "X-RabbitHQ-Event": payload.event,
      "X-RabbitHQ-Version": payload.version,
      "X-RabbitHQ-Timestamp": payload.timestamp,
    };

    // Add signature if secret is provided
    if (secret) {
      const signature = this.generateSignature(payloadString, secret);
      headers["X-RabbitHQ-Signature"] = `sha256=${signature}`;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.REQUEST_TIMEOUT_MS
      );

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: payloadString,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        logger.warn(
          {
            url,
            statusCode: response.status,
            statusText: response.statusText,
            error: errorText,
            retries,
          },
          "Webhook request failed"
        );

        // Retry on 5xx errors or rate limiting
        if (
          (response.status >= 500 || response.status === 429) &&
          retries < this.MAX_RETRIES
        ) {
          await this.sleep(
            this.RETRY_DELAY_MS * Math.pow(2, retries) // Exponential backoff
          );
          return this.sendWebhook(url, payload, secret, retries + 1);
        }

        return {
          success: false,
          statusCode: response.status,
          error: `HTTP ${response.status}: ${response.statusText}`,
          retries,
        };
      }

      logger.info(
        {
          url,
          statusCode: response.status,
          retries,
        },
        "Webhook sent successfully"
      );

      return {
        success: true,
        statusCode: response.status,
        retries,
      };
    } catch (error) {
      logger.error({ error, url, retries }, "Error sending webhook");

      // Retry on network errors
      if (retries < this.MAX_RETRIES) {
        await this.sleep(
          this.RETRY_DELAY_MS * Math.pow(2, retries) // Exponential backoff
        );
        return this.sendWebhook(url, payload, secret, retries + 1);
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
   * Send alert notification to multiple webhooks
   */
  static async sendAlertNotification(
    webhooks: Array<{
      id: string;
      url: string;
      secret?: string | null;
      version: string;
    }>,
    workspaceId: string,
    workspaceName: string,
    serverId: string,
    serverName: string,
    alerts: RabbitMQAlert[]
  ): Promise<Array<{ webhookId: string; result: WebhookResult }>> {
    const results: Array<{ webhookId: string; result: WebhookResult }> = [];

    // Calculate summary
    const summary = {
      total: alerts.length,
      critical: alerts.filter((a) => a.severity === "critical").length,
      warning: alerts.filter((a) => a.severity === "warning").length,
      info: alerts.filter((a) => a.severity === "info").length,
    };

    // Create payload
    const payload: WebhookPayload = {
      version: "v1",
      event: "alert.notification",
      timestamp: new Date().toISOString(),
      workspace: {
        id: workspaceId,
        name: workspaceName,
      },
      server: {
        id: serverId,
        name: serverName,
      },
      alerts,
      summary,
    };

    // Send to all webhooks in parallel
    const promises = webhooks.map(async (webhook) => {
      const result = await this.sendWebhook(
        webhook.url,
        payload,
        webhook.secret,
        0
      );
      return {
        webhookId: webhook.id,
        result,
      };
    });

    const webhookResults = await Promise.allSettled(promises);

    for (const webhookResult of webhookResults) {
      if (webhookResult.status === "fulfilled") {
        results.push(webhookResult.value);
      } else {
        logger.error({ error: webhookResult.reason }, "Failed to send webhook");
        results.push({
          webhookId: "unknown",
          result: {
            success: false,
            error: webhookResult.reason?.message || "Unknown error",
          },
        });
      }
    }

    return results;
  }
}
