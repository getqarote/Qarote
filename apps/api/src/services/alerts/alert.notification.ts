import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";

import { NotificationEmailService } from "@/services/email/notification-email.service";
import { SlackService } from "@/services/slack/slack.service";
import { WebhookService } from "@/services/webhook/webhook.service";

import { emailConfig } from "@/config";

import { generateAlertFingerprint } from "./alert.fingerprint";
import { RabbitMQAlert } from "./alert.interfaces";

/**
 * Alert Tracking and Notification System Summary
 * ===============================================
 *
 * This system tracks RabbitMQ alerts and sends email notifications to prevent
 * duplicate emails while ensuring users are notified of new and recurring alerts.
 *
 * ## Core Components:
 *
 * 1. **SeenAlert Table**: Tracks all alerts that have been seen before
 *    - `fingerprint`: Unique identifier (serverId-category-sourceType-sourceName)
 *    - `firstSeenAt`: When alert was first detected
 *    - `lastSeenAt`: Most recent time alert was seen
 *    - `resolvedAt`: When alert was auto-resolved (no longer active)
 *    - `emailSentAt`: When email notification was sent
 *
 * 2. **Alert Fingerprinting**: Creates stable identifiers for alerts
 *    Format: `${serverId}-${category}-${sourceType}-${sourceName}`
 *    Example: "server-123-memory-node-rabbit@node1"
 *
 * ## Notification Logic:
 *
 * Email notifications are sent when:
 * - Alert is brand new (never seen before)
 * - Alert was previously resolved and comes back (recurring alert)
 * - Alert hasn't been seen for > 7 days (cooldown period expired)
 *
 * Email notifications are NOT sent when:
 * - Alert is ongoing (same alert still active, within 7-day cooldown)
 * - Email notifications are disabled in workspace settings
 * - Workspace has no contact email configured
 *
 * ## Auto-Resolution:
 *
 * Alerts are automatically marked as resolved when:
 * - They disappear from the current alerts list (no longer active)
 * - This happens automatically on each alert check
 *
 * When an alert becomes active again after being resolved:
 * - `resolvedAt` is cleared (set to null)
 * - Alert is treated as "new" and triggers email notification
 *
 * ## Cooldown Period:
 *
 * - **Duration**: 7 days
 * - **Purpose**: Prevents spam for ongoing alerts
 * - **Behavior**: If an alert hasn't been seen for 7+ days, it's treated as new
 *
 * ## Example Scenarios:
 *
 * 1. **New Alert**:
 *    - Alert occurs → Creates SeenAlert record → Email sent
 *
 * 2. **Ongoing Alert** (within 7 days):
 *    - Alert still active → Updates lastSeenAt → No email (cooldown)
 *
 * 3. **Resolved Alert Returns**:
 *    - Alert disappears → Auto-resolved (resolvedAt set)
 *    - Alert returns → Clears resolvedAt → Email sent (treated as new)
 *
 * 4. **Long-term Recurring Alert** (after 7+ days):
 *    - Alert active for 2 weeks → No duplicate emails
 *    - Alert disappears → Auto-resolved
 *    - Alert returns after 10 days → Email sent (past cooldown)
 *
 * ## Workspace Settings:
 *
 * Email notifications respect workspace configuration:
 * - `emailNotificationsEnabled`: Must be true
 * - `contactEmail`: Must be set
 *
 * If either condition is false, no emails are sent (but alerts are still tracked).
 *
 * ## Tracking Scope:
 *
 * Only WARNING and CRITICAL alerts are tracked and can trigger emails.
 * INFO alerts are ignored for notification purposes.
 */
class AlertNotificationService {
  private readonly COOLDOWN_PERIOD = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

  /**
   * Get alert title based on category and source
   */
  private getAlertTitle(
    category: string,
    sourceType: string,
    sourceName: string
  ): string {
    const sourceLabel =
      sourceType === "node"
        ? "Node"
        : sourceType === "queue"
          ? "Queue"
          : "Cluster";

    switch (category) {
      case "memory":
        return "High Memory Usage";
      case "disk":
        return "Low Disk Space";
      case "connection":
        return "Connection Issue";
      case "queue":
        return sourceType === "queue" ? "Queue Issue" : "Queue Problem";
      case "node":
        return sourceType === "node" ? "Node Issue" : "Node Problem";
      case "performance":
        return "Performance Issue";
      default:
        return `${sourceLabel} Alert: ${sourceName}`;
    }
  }

  /**
   * Get alert description based on category and source
   */
  private getAlertDescription(
    category: string,
    sourceType: string,
    sourceName: string
  ): string {
    const sourceLabel =
      sourceType === "node"
        ? "node"
        : sourceType === "queue"
          ? "queue"
          : "cluster";

    switch (category) {
      case "memory":
        return `Memory issue detected on ${sourceLabel} ${sourceName}`;
      case "disk":
        return `Disk space issue detected on ${sourceLabel} ${sourceName}`;
      case "connection":
        return `Connection issue detected on ${sourceLabel} ${sourceName}`;
      case "queue":
        return `Queue issue detected: ${sourceName}`;
      case "node":
        return `Node issue detected: ${sourceName}`;
      case "performance":
        return `Performance issue detected on ${sourceLabel} ${sourceName}`;
      default:
        return `Alert detected on ${sourceLabel} ${sourceName}`;
    }
  }

  /**
   * Track seen alerts and send email notifications for new warnings/critical alerts
   */
  async trackAndNotifyNewAlerts(
    alerts: RabbitMQAlert[],
    workspaceId: string,
    serverId: string,
    serverName: string, // Required - always available from caller
    vhost?: string // Optional - undefined means "check all vhosts"
  ): Promise<void> {
    try {
      // Get workspace to check for contact email and notification settings
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: {
          contactEmail: true,
          name: true,
          emailNotificationsEnabled: true,
          notificationSeverities: true,
          notificationServerIds: true,
        },
      });

      if (!workspace) {
        logger.warn(
          `Workspace ${workspaceId} not found, skipping alert tracking`
        );
        return;
      }

      // Get notification severity preferences (default to all if not set)
      const notificationSeverities = workspace.notificationSeverities
        ? (workspace.notificationSeverities as string[])
        : ["critical", "warning", "info"];

      // Get all existing seen alerts for this workspace and server
      const seenAlerts = await prisma.seenAlert.findMany({
        where: { workspaceId, serverId },
        select: {
          fingerprint: true,
          emailSentAt: true,
          resolvedAt: true,
          lastSeenAt: true,
          firstSeenAt: true, // Added to fix notification cooldown bug
        },
      });

      // Create set of currently active alert fingerprints
      const activeFingerprints = new Set<string>();
      const newAlerts: RabbitMQAlert[] = [];
      const now = new Date();

      // Process each alert - ALWAYS track alerts regardless of notification settings
      // Severity preferences only affect notifications, not tracking
      for (const alert of alerts) {
        const fingerprint = generateAlertFingerprint(
          serverId,
          alert.category,
          alert.source.type,
          alert.source.name,
          alert.vhost
        );

        activeFingerprints.add(fingerprint);

        const existingAlert = seenAlerts.find(
          (a) => a.fingerprint === fingerprint
        );
        const isNew = !existingAlert;

        // Always track alerts in database, regardless of severity preferences
        if (isNew) {
          // Brand new alert - create SeenAlert record
          await prisma.seenAlert.create({
            data: {
              fingerprint,
              serverId,
              workspaceId,
              severity: alert.severity,
              category: alert.category,
              sourceType: alert.source.type,
              sourceName: alert.source.name,
              firstSeenAt: now,
              lastSeenAt: now,
              resolvedAt: null, // Not resolved
            },
          });
        } else {
          // Existing alert - update last seen time and clear resolution if alert is active again
          await prisma.seenAlert.updateMany({
            where: { fingerprint },
            data: {
              lastSeenAt: now,
              resolvedAt: null, // Clear resolution since alert is active again
              severity: alert.severity, // Update severity in case it changed
            },
          });
        }

        // Check if alert should trigger notification
        // Only send notifications for alerts that match severity preferences
        const shouldNotifyForSeverity = notificationSeverities.includes(
          alert.severity
        );
        let shouldNotify = false;

        if (isNew && shouldNotifyForSeverity) {
          // Brand new alert that matches severity preferences - always notify
          shouldNotify = true;
        } else if (!isNew && shouldNotifyForSeverity) {
          // Existing alert that matches severity preferences - check if should notify
          const wasResolved = !!existingAlert.resolvedAt;

          // Check time since last notification (emailSentAt) or first seen (if no email sent)
          // This ensures we respect the cooldown period even if emailSentAt is null
          const referenceTime =
            existingAlert.emailSentAt || existingAlert.firstSeenAt;
          const timeSinceLastNotification = referenceTime
            ? now.getTime() - referenceTime.getTime()
            : 0;
          const isPastNotificationCooldown =
            timeSinceLastNotification > this.COOLDOWN_PERIOD;

          // Should notify if:
          // 1. Alert was previously resolved (came back after being fixed)
          // 2. Enough time has passed since last notification (or first seen if never notified)
          if (wasResolved || isPastNotificationCooldown) {
            shouldNotify = true;
          }
        }

        if (shouldNotify) {
          newAlerts.push(alert);
        }
      }

      // Auto-resolve alerts that are no longer active
      // Find all seen alerts for this server that are not in current alerts
      // IMPORTANT: If vhost is specified, only check alerts for that vhost (or node/cluster alerts)
      // This prevents incorrectly resolving alerts from other vhosts when viewing a specific vhost
      const unresolvedSeenAlertsWhere: {
        workspaceId: string;
        serverId: string;
        resolvedAt: null;
        OR?: Array<{
          sourceType: string;
          fingerprint?: { contains: string };
        }>;
      } = {
        workspaceId,
        serverId,
        resolvedAt: null, // Only unresolved ones
      };

      // If vhost is specified, only auto-resolve alerts for that vhost (or node/cluster alerts)
      // This prevents resolving alerts from other vhosts when viewing a specific vhost
      if (vhost) {
        const vhostPattern = `-queue-${vhost}-`;
        unresolvedSeenAlertsWhere.OR = [
          // Include queue alerts that match the vhost
          {
            sourceType: "queue",
            fingerprint: { contains: vhostPattern },
          },
          // Include all node and cluster alerts (not vhost-specific)
          {
            sourceType: "node",
          },
          {
            sourceType: "cluster",
          },
        ];
      }

      const unresolvedSeenAlerts = await prisma.seenAlert.findMany({
        where: unresolvedSeenAlertsWhere,
        select: {
          fingerprint: true,
          severity: true,
          category: true,
          sourceType: true,
          sourceName: true,
          firstSeenAt: true,
        },
      });

      // Use provided server name (always available from caller)
      const resolvedServerName = serverName;

      for (const seenAlert of unresolvedSeenAlerts) {
        if (!activeFingerprints.has(seenAlert.fingerprint)) {
          // Alert is no longer active, mark as resolved
          await prisma.seenAlert.updateMany({
            where: { fingerprint: seenAlert.fingerprint },
            data: { resolvedAt: now },
          });

          // Calculate duration
          const duration = now.getTime() - seenAlert.firstSeenAt.getTime();

          // Reconstruct alert title and description from category and source
          const title = this.getAlertTitle(
            seenAlert.category,
            seenAlert.sourceType,
            seenAlert.sourceName
          );
          const description = this.getAlertDescription(
            seenAlert.category,
            seenAlert.sourceType,
            seenAlert.sourceName
          );

          // Store resolved alert in database
          try {
            await prisma.resolvedAlert.create({
              data: {
                serverId,
                serverName: resolvedServerName,
                severity: seenAlert.severity,
                category: seenAlert.category,
                title,
                description,
                details: {
                  sourceType: seenAlert.sourceType,
                  sourceName: seenAlert.sourceName,
                  category: seenAlert.category,
                },
                sourceType: seenAlert.sourceType,
                sourceName: seenAlert.sourceName,
                fingerprint: seenAlert.fingerprint,
                firstSeenAt: seenAlert.firstSeenAt,
                resolvedAt: now,
                duration,
                workspaceId,
              },
            });
            logger.debug(
              `Saved resolved alert: ${seenAlert.fingerprint} (resolved after ${Math.round(duration / 1000 / 60)} minutes)`
            );
          } catch (error) {
            logger.error(
              { error, fingerprint: seenAlert.fingerprint },
              "Failed to save resolved alert"
            );
          }
        }
      }

      // Send notifications (email and webhooks) for alerts that should trigger notification
      // Only send if email notifications are enabled and contact email is set
      const shouldSendNotifications =
        workspace.emailNotificationsEnabled && !!workspace.contactEmail;

      // Check if notifications are enabled for this server
      const notificationServerIds = workspace.notificationServerIds
        ? (workspace.notificationServerIds as string[])
        : null;
      const serverNotificationsEnabled =
        !notificationServerIds ||
        notificationServerIds.length === 0 ||
        notificationServerIds.includes(serverId);

      if (
        newAlerts.length > 0 &&
        shouldSendNotifications &&
        serverNotificationsEnabled
      ) {
        // Filter to only alerts that should actually get notifications
        const alertsToNotify = newAlerts.filter((alert) => {
          const fingerprint = generateAlertFingerprint(
            serverId,
            alert.category,
            alert.source.type,
            alert.source.name,
            alert.vhost
          );
          const existing = seenAlerts.find(
            (a) => a.fingerprint === fingerprint
          );

          // Send notification if:
          // 1. Never sent email before, OR
          // 2. Alert was resolved (came back), OR
          // 3. Past cooldown period
          if (!existing || !existing.emailSentAt) {
            return true;
          }

          const wasResolved = !!existing.resolvedAt;
          const referenceTime = existing.emailSentAt || existing.firstSeenAt;
          const timeSinceLastNotification = referenceTime
            ? now.getTime() - referenceTime.getTime()
            : 0;
          const isPastCooldown =
            timeSinceLastNotification > this.COOLDOWN_PERIOD;

          return wasResolved || isPastCooldown;
        });

        if (alertsToNotify.length > 0) {
          const serverName = alertsToNotify[0]?.serverName || "Unknown Server";

          // Send email notification (if enabled)
          if (workspace.emailNotificationsEnabled && workspace.contactEmail) {
            try {
              await NotificationEmailService.sendAlertNotificationEmail({
                to: workspace.contactEmail,
                workspaceName: workspace.name,
                workspaceId,
                alerts: alertsToNotify,
                serverName,
                serverId,
              });

              // Mark alerts as email sent
              for (const alert of alertsToNotify) {
                const fingerprint = generateAlertFingerprint(
                  serverId,
                  alert.category,
                  alert.source.type,
                  alert.source.name,
                  alert.vhost
                );
                await prisma.seenAlert.updateMany({
                  where: { fingerprint },
                  data: { emailSentAt: now },
                });
              }

              logger.info(
                `Sent alert notification email for ${alertsToNotify.length} new/recurring alerts to ${workspace.contactEmail}`
              );
            } catch (error) {
              logger.error(
                { error },
                "Failed to send alert notification email"
              );
            }
          }

          // Send webhook notifications (only first webhook)
          try {
            const webhook = await prisma.webhook.findFirst({
              where: {
                workspaceId,
                enabled: true,
              },
              select: {
                id: true,
                url: true,
                secret: true,
                version: true,
              },
            });

            if (webhook) {
              const webhookResults = await WebhookService.sendAlertNotification(
                [webhook],
                workspaceId,
                workspace.name,
                serverId,
                serverName,
                alertsToNotify
              );

              // Log webhook results
              const successful = webhookResults.filter(
                (r) => r.result.success
              ).length;
              const failed = webhookResults.filter(
                (r) => !r.result.success
              ).length;

              if (successful > 0) {
                logger.info(
                  {
                    successful,
                    failed,
                    alertsToNotifyLength: alertsToNotify.length,
                  },
                  "Sent alert notification to webhook(s)"
                );
              }

              if (failed > 0) {
                logger.warn(
                  {
                    failures: webhookResults
                      .filter((r) => !r.result.success)
                      .map((r) => ({
                        webhookId: r.webhookId,
                        error: r.result.error,
                      })),
                  },
                  "Failed to send alert notification to webhook(s)"
                );
              }
            }
          } catch (error) {
            logger.error({ error }, "Failed to send webhook notifications");
          }

          // Send Slack notifications (only first Slack config)
          try {
            const slackConfig = await prisma.slackConfig.findFirst({
              where: {
                workspaceId,
                enabled: true,
              },
              select: {
                id: true,
                webhookUrl: true,
              },
            });

            if (slackConfig) {
              const slackResults = await SlackService.sendAlertNotifications(
                [slackConfig],
                alertsToNotify,
                workspace.name,
                serverName,
                serverId,
                emailConfig.frontendUrl
              );

              // Log Slack results
              const successful = slackResults.filter(
                (r) => r.result.success
              ).length;
              const failed = slackResults.filter(
                (r) => !r.result.success
              ).length;

              if (successful > 0) {
                logger.info(
                  `Sent alert notification to ${successful} Slack channel(s) for ${alertsToNotify.length} alerts`
                );
              }

              if (failed > 0) {
                logger.warn(
                  {
                    failures: slackResults
                      .filter((r) => !r.result.success)
                      .map((r) => ({
                        slackConfigId: r.slackConfigId,
                        error: r.result.error,
                      })),
                  },
                  `Failed to send alert notification to ${failed} Slack channel(s)`
                );
              }
            }
          } catch (error) {
            logger.error({ error }, "Failed to send Slack notifications");
          }
        }
      } else if (newAlerts.length > 0) {
        // Log why notifications weren't sent (for debugging)
        if (!shouldSendNotifications) {
          logger.debug(
            `Skipping notifications for ${newAlerts.length} alerts: email notifications disabled or no contact email`
          );
        } else if (!serverNotificationsEnabled) {
          logger.debug(
            `Skipping notifications for ${newAlerts.length} alerts: server ${serverId} not in notification server list`
          );
        }
      }
    } catch (error) {
      logger.error({ error }, "Error tracking and notifying new alerts");
      // Don't throw - we don't want to break the alert retrieval if email fails
    }
  }
}

// Export a singleton instance
export const alertNotificationService = new AlertNotificationService();
