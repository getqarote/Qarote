import { isFeatureEnabled } from "@/core/feature-flags";
import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";

import { NotificationEmailService } from "@/services/email/notification-email.service";
import { SlackService } from "@/services/slack/slack.service";
import { WebhookService } from "@/services/webhook/webhook.service";

import { emailConfig } from "@/config";
import { FEATURES } from "@/config/features";

import { generateAlertFingerprint } from "./alert.fingerprint";
import { RabbitMQAlert } from "./alert.interfaces";
import { toPrismaAlertSeverity } from "./alert.severity-map";

/**
 * Alert Tracking and Notification System
 * =======================================
 *
 * Tracks RabbitMQ alerts in the unified Alert table and sends notifications
 * (email, webhook, Slack) to prevent duplicate sends while ensuring users are
 * notified of new and recurring alerts.
 *
 * ## Alert Table lifecycle (status=ACTIVE / status=RESOLVED)
 *
 * - Alert fires → Alert row created with status=ACTIVE, fingerprint set
 * - Alert still firing → Alert row updated (lastSeenAt, severity)
 * - Alert clears → Alert row set to status=RESOLVED, fingerprint=NULL
 * - Alert re-fires → new Alert row created; isNew=true triggers a new notification
 *
 * A partial unique index on (fingerprint) WHERE status='ACTIVE' ensures only
 * one active row exists per fingerprint at a time. Setting fingerprint=NULL on
 * resolution frees the slot for re-firing.
 *
 * ## Notification Logic
 *
 * Notifications are sent when:
 * - isNew=true (brand-new alert OR alert that came back after resolution)
 * - Ongoing alert AND 7-day cooldown since last email has expired
 *
 * Notifications are suppressed when:
 * - Alert is ongoing within 7-day cooldown
 * - emailNotificationsEnabled=false or contactEmail not set
 *
 * ## Tracking Scope
 *
 * Only WARNING and CRITICAL alerts trigger email notifications by default.
 * INFO alerts are tracked but do not notify unless the workspace has opted in.
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
   * Track alerts in the unified Alert table and send notifications for new/recurring alerts.
   *
   * Phase 4: SeenAlert and ResolvedAlert tables have been dropped. The unified Alert table
   * is now the sole store for both active and resolved alerts.
   *
   * Active alert lifecycle:
   *   - Alert fires → Alert row created with status=ACTIVE, fingerprint set
   *   - Alert still firing → Alert row updated (lastSeenAt, severity)
   *   - Alert clears → Alert row set to status=RESOLVED, fingerprint set to NULL
   *   - Alert re-fires → new Alert row created (previous resolved row has fingerprint=NULL
   *     so it does not collide with the partial unique index; isNew=true triggers notification)
   */
  async trackAndNotifyNewAlerts(
    alerts: RabbitMQAlert[],
    workspaceId: string,
    serverId: string,
    serverName: string,
    vhost?: string
  ): Promise<void> {
    const alertingEnabled = await isFeatureEnabled(FEATURES.ALERTING);

    try {
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

      const notificationSeverities = workspace.notificationSeverities
        ? (workspace.notificationSeverities as string[])
        : ["critical", "warning"];

      // Bulk-fetch currently active Alert rows for this server so we can check
      // notification cooldown without N+1 per-alert queries.
      const activeAlertRows = await prisma.alert.findMany({
        where: { workspaceId, serverId, status: "ACTIVE" },
        select: {
          id: true,
          fingerprint: true,
          emailSentAt: true,
          firstSeenAt: true,
        },
      });
      const activeAlertByFingerprint = new Map(
        activeAlertRows
          .filter((a) => a.fingerprint != null)
          .map((a) => [a.fingerprint!, a])
      );

      const activeFingerprints = new Set<string>();
      const newAlerts: RabbitMQAlert[] = [];
      const now = new Date();
      // Maps fingerprint → DB alert ID so emailSentAt can be stamped by ID after
      // email send. Using ID avoids a race where the alert resolves between the
      // email send and the stamp, making the fingerprint+status match miss.
      const fingerprintToAlertId = new Map<string, string>();

      // Deduplicate alerts by fingerprint before processing.
      const dedupedAlerts: RabbitMQAlert[] = [];
      const seenInBatch = new Set<string>();
      for (const alert of alerts) {
        const fp = generateAlertFingerprint(
          serverId,
          alert.category,
          alert.source.type,
          alert.source.name,
          alert.vhost
        );
        if (!seenInBatch.has(fp)) {
          seenInBatch.add(fp);
          dedupedAlerts.push(alert);
        }
      }

      for (const alert of dedupedAlerts) {
        const fingerprint = generateAlertFingerprint(
          serverId,
          alert.category,
          alert.source.type,
          alert.source.name,
          alert.vhost
        );

        activeFingerprints.add(fingerprint);

        const existingActiveAlert = activeAlertByFingerprint.get(fingerprint);
        const isNew = !existingActiveAlert;

        const prismaSeverity = toPrismaAlertSeverity(alert.severity);
        const title = this.getAlertTitle(
          alert.category,
          alert.source.type,
          alert.source.name
        );
        const description = this.getAlertDescription(
          alert.category,
          alert.source.type,
          alert.source.name
        );

        if (existingActiveAlert) {
          await prisma.alert.update({
            where: { id: existingActiveAlert.id },
            data: {
              lastSeenAt: now,
              resolvedAt: null,
              severity: prismaSeverity,
              title,
              description,
            },
          });
          fingerprintToAlertId.set(fingerprint, existingActiveAlert.id);
        } else {
          try {
            const created = await prisma.alert.create({
              data: {
                title,
                description,
                fingerprint,
                severity: prismaSeverity,
                status: "ACTIVE",
                category: alert.category,
                sourceType: alert.source.type,
                sourceName: alert.source.name,
                serverId,
                serverName,
                workspaceId,
                firstSeenAt: now,
                lastSeenAt: now,
                details: alert.details as object,
              },
            });
            fingerprintToAlertId.set(fingerprint, created.id);
          } catch (error) {
            if ((error as { code?: string }).code === "P2002") {
              // Race: a concurrent invocation already created this alert.
              // Skip — the winning call is responsible for sending the notification.
              logger.debug(
                { fingerprint },
                "Skipping alert create: lost concurrent race (P2002)"
              );
              continue;
            }
            throw error;
          }
        }

        const shouldNotifyForSeverity = notificationSeverities.includes(
          alert.severity
        );
        let shouldNotify = false;

        if (isNew && shouldNotifyForSeverity) {
          // Brand new alert OR alert that came back after resolution (isNew covers both).
          shouldNotify = true;
        } else if (!isNew && shouldNotifyForSeverity) {
          // Ongoing alert — notify only if cooldown has expired
          const referenceTime =
            existingActiveAlert.emailSentAt || existingActiveAlert.firstSeenAt;
          const timeSince = referenceTime
            ? now.getTime() - referenceTime.getTime()
            : 0;
          if (timeSince > this.COOLDOWN_PERIOD) {
            shouldNotify = true;
          }
        }

        if (shouldNotify) {
          newAlerts.push(alert);
        }
      }

      // Auto-resolve alerts that are no longer active.
      // Fetch all active Alert rows for this server; vhost scoping applied in-memory
      // to avoid false positives from a substring contains match
      // (e.g. vhost "foo" incorrectly matching fingerprints for vhost "foo-bar").
      const unresolvedAlerts = await prisma.alert.findMany({
        where: {
          workspaceId,
          serverId,
          status: "ACTIVE",
          fingerprint: { not: null },
        },
        select: {
          fingerprint: true,
          sourceType: true,
          sourceName: true,
          firstSeenAt: true,
        },
      });

      // Exact vhost boundary match: strip sourceName suffix, then verify the
      // remainder ends with `-queue-${vhost}` exactly.
      const alertsToResolve = vhost
        ? unresolvedAlerts.filter((a) => {
            if (a.sourceType !== "queue") return true;
            const suffix = `-${a.sourceName}`;
            if (!a.fingerprint!.endsWith(suffix)) return false;
            const withoutSource = a.fingerprint!.slice(0, -suffix.length);
            return withoutSource.endsWith(`-queue-${vhost}`);
          })
        : unresolvedAlerts;

      await Promise.all(
        alertsToResolve
          .filter((alert) => !activeFingerprints.has(alert.fingerprint!))
          .map(async (alert) => {
            const duration =
              now.getTime() - (alert.firstSeenAt ?? now).getTime();
            await prisma.alert.updateMany({
              where: { fingerprint: alert.fingerprint, status: "ACTIVE" },
              data: {
                status: "RESOLVED",
                resolvedAt: now,
                duration,
                fingerprint: null, // Release partial unique index slot for re-firing
              },
            });
            logger.debug(
              `Resolved alert: ${alert.fingerprint} (${Math.round(duration / 1000 / 60)} min)`
            );
          })
      );

      // Skip notifications if alerting feature is disabled (community mode)
      if (!alertingEnabled) {
        logger.debug(
          "Alerting feature not enabled - alerts tracked but notifications skipped"
        );
        return;
      }

      const shouldSendEmail =
        workspace.emailNotificationsEnabled && !!workspace.contactEmail;

      const notificationServerIds = workspace.notificationServerIds
        ? (workspace.notificationServerIds as string[])
        : null;
      const serverNotificationsEnabled =
        !notificationServerIds ||
        notificationServerIds.length === 0 ||
        notificationServerIds.includes(serverId);

      if (newAlerts.length > 0 && serverNotificationsEnabled) {
        const alertsToNotify = newAlerts;

        if (shouldSendEmail) {
          try {
            await NotificationEmailService.sendAlertNotificationEmail({
              to: workspace.contactEmail!,
              workspaceName: workspace.name,
              workspaceId,
              alerts: alertsToNotify,
              serverName,
              serverId,
            });

            await Promise.all(
              alertsToNotify.map(async (alert) => {
                const fingerprint = generateAlertFingerprint(
                  serverId,
                  alert.category,
                  alert.source.type,
                  alert.source.name,
                  alert.vhost
                );
                const alertId = fingerprintToAlertId.get(fingerprint);
                if (alertId) {
                  // Stamp by ID — immune to the race where the alert resolves between
                  // email send and stamp (fingerprint+status would miss a resolved row).
                  await prisma.alert.update({
                    where: { id: alertId },
                    data: { emailSentAt: now },
                  });
                }
              })
            );

            logger.info(
              `Sent alert notification email for ${alertsToNotify.length} new/recurring alerts to ${workspace.contactEmail}`
            );
          } catch (error) {
            logger.error(
              { error, workspaceId, serverId },
              "Failed to send alert notification email"
            );
          }
        }

        const webhookEnabled = await isFeatureEnabled(
          FEATURES.WEBHOOK_INTEGRATION
        );
        if (webhookEnabled) {
          try {
            const webhook = await prisma.webhook.findFirst({
              where: { workspaceId, enabled: true },
              select: { id: true, url: true, secret: true, version: true },
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
            logger.error(
              { error, workspaceId, serverId },
              "Failed to send webhook notifications"
            );
          }
        }

        const slackEnabled = await isFeatureEnabled(FEATURES.SLACK_INTEGRATION);
        if (slackEnabled) {
          try {
            const slackConfig = await prisma.slackConfig.findFirst({
              where: { workspaceId, enabled: true },
              select: { id: true, webhookUrl: true },
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
            logger.error(
              { error, workspaceId, serverId },
              "Failed to send Slack notifications"
            );
          }
        }
      } else if (newAlerts.length > 0) {
        logger.debug(
          `Skipping notifications for ${newAlerts.length} alerts: server ${serverId} not in notification server list`
        );
      }
    } catch (error) {
      logger.error({ error }, "Error tracking and notifying new alerts");
    }
  }
}

// Export a singleton instance
export const alertNotificationService = new AlertNotificationService();
