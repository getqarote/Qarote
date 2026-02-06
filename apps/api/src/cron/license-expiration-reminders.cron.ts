import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";

import { EmailService } from "@/services/email/email.service";

import { emailConfig } from "@/config";

/**
 * License Expiration Reminders Cron Service
 * Sends reminder emails before license expiration and notifications after expiration
 * Runs daily at 9 AM UTC
 */
class LicenseExpirationRemindersCronService {
  private isRunning = false;
  private isChecking = false;
  private intervalId: NodeJS.Timeout | null = null;
  private readonly checkInterval: number;

  constructor() {
    // Run once per day at 9 AM UTC (24 hours interval)
    this.checkInterval = 24 * 60 * 60 * 1000;
  }

  /**
   * Start the license expiration reminder service
   */
  start(): void {
    if (this.isRunning) {
      logger.info("License expiration reminders service is already running");
      return;
    }

    this.isRunning = true;
    logger.info(
      {
        checkInterval: this.checkInterval,
      },
      "Starting license expiration reminders service..."
    );

    // Run immediately, then at intervals
    this.checkExpiringLicenses();
    this.intervalId = setInterval(() => {
      this.checkExpiringLicenses();
    }, this.checkInterval);
  }

  /**
   * Stop the service
   */
  stop(): void {
    if (!this.isRunning) {
      logger.info("License expiration reminders service is not running");
      return;
    }

    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    logger.info("License expiration reminders service stopped");
  }

  /**
   * Check for licenses that need expiration reminders or notifications
   */
  private async checkExpiringLicenses(): Promise<void> {
    // Prevent overlapping cycles
    if (this.isChecking) {
      logger.debug(
        "Skipping license check cycle - previous cycle still in progress"
      );
      return;
    }

    this.isChecking = true;
    const startTime = Date.now();

    try {
      logger.info("Starting license expiration check cycle");

      const now = new Date();
      const portalUrl = emailConfig.portalFrontendUrl;

      let totalReminders = 0;
      let totalExpiredNotifications = 0;

      // 1. Check for licenses expiring in 30/15/7 days (REMINDERS)
      const reminderIntervals = [30, 15, 7];

      for (const days of reminderIntervals) {
        const targetDate = new Date(now);
        targetDate.setDate(targetDate.getDate() + days);

        // Find licenses expiring in this range (current day to +1 day buffer)
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);

        const licenses = await prisma.license.findMany({
          where: {
            isActive: true,
            expiresAt: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
        });

        logger.info(
          {
            days,
            licenseCount: licenses.length,
            targetDate: targetDate.toISOString(),
          },
          `Found ${licenses.length} licenses expiring in ${days} days`
        );

        for (const license of licenses) {
          try {
            // Check if reminder already sent
            const existingReminder =
              await prisma.licenseRenewalEmail.findUnique({
                where: {
                  licenseId_reminderType: {
                    licenseId: license.id,
                    reminderType: `${days}_DAY`,
                  },
                },
              });

            if (!existingReminder) {
              const result =
                await EmailService.sendLicenseExpirationReminderEmail({
                  to: license.customerEmail,
                  licenseKey: license.licenseKey,
                  tier: license.tier,
                  daysUntilExpiration: days,
                  expiresAt: license.expiresAt!,
                  renewalUrl: `${portalUrl}/licenses`,
                });

              // Only track reminder if email was successfully sent
              if (result.success) {
                await prisma.licenseRenewalEmail.create({
                  data: {
                    licenseId: license.id,
                    reminderType: `${days}_DAY`,
                  },
                });

                totalReminders++;

                logger.info(
                  {
                    licenseId: license.id,
                    customerEmail: license.customerEmail,
                    days,
                  },
                  `Sent ${days}-day expiration reminder`
                );
              } else {
                logger.warn(
                  {
                    licenseId: license.id,
                    customerEmail: license.customerEmail,
                    days,
                    error: result.error,
                  },
                  `Failed to send ${days}-day reminder - will retry on next run`
                );
              }
            }
          } catch (error) {
            logger.error(
              {
                error,
                licenseId: license.id,
                days,
              },
              `Failed to send ${days}-day reminder for license`
            );
          }
        }
      }

      // 2. Check for licenses that expired in the last 24 hours (EXPIRED NOTIFICATION)
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);

      const expiredLicenses = await prisma.license.findMany({
        where: {
          isActive: true, // Still marked active but past expiration
          expiresAt: {
            gte: yesterday,
            lt: now,
          },
        },
      });

      logger.info(
        {
          expiredCount: expiredLicenses.length,
        },
        `Found ${expiredLicenses.length} licenses expired in last 24 hours`
      );

      for (const license of expiredLicenses) {
        try {
          // Check if expiration email already sent
          const existingNotification =
            await prisma.licenseRenewalEmail.findUnique({
              where: {
                licenseId_reminderType: {
                  licenseId: license.id,
                  reminderType: "EXPIRED",
                },
              },
            });

          if (!existingNotification && license.expiresAt) {
            const result = await EmailService.sendLicenseExpiredEmail({
              to: license.customerEmail,
              licenseKey: license.licenseKey,
              tier: license.tier,
              expiredAt: license.expiresAt,
              renewalUrl: `${portalUrl}/purchase`,
            });

            // Only track notification if email was successfully sent
            if (result.success) {
              await prisma.licenseRenewalEmail.create({
                data: {
                  licenseId: license.id,
                  reminderType: "EXPIRED",
                },
              });

              totalExpiredNotifications++;

              logger.info(
                {
                  licenseId: license.id,
                  customerEmail: license.customerEmail,
                  expiredAt: license.expiresAt.toISOString(),
                },
                "Sent license expired notification"
              );
            } else {
              logger.warn(
                {
                  licenseId: license.id,
                  customerEmail: license.customerEmail,
                  expiredAt: license.expiresAt.toISOString(),
                  error: result.error,
                },
                "Failed to send expired notification - will retry on next run"
              );
            }
          }
        } catch (error) {
          logger.error(
            {
              error,
              licenseId: license.id,
            },
            "Failed to send expired notification for license"
          );
        }
      }

      const duration = Date.now() - startTime;
      logger.info(
        {
          totalReminders,
          totalExpiredNotifications,
          duration,
        },
        `Completed license expiration check cycle: ${totalReminders} reminders, ${totalExpiredNotifications} expired notifications in ${duration}ms`
      );
    } catch (error) {
      logger.error({ error }, "Error in checkExpiringLicenses");
    } finally {
      this.isChecking = false;
    }
  }
}

// Export a singleton instance
export const licenseExpirationRemindersCronService =
  new LicenseExpirationRemindersCronService();
