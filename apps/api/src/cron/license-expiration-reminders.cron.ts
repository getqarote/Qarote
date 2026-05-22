import { addDays, endOfDay, startOfDay, subDays } from "date-fns";

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
  private currentCyclePromise: Promise<void> | null = null;
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

    // Run immediately, then at intervals. Track the in-flight promise so
    // stopAndWait can drain it before Prisma disconnects on shutdown.
    // Skip re-assigning when a cycle is already running — otherwise the
    // skipped (immediately-resolved) callback would clobber the real
    // in-flight promise and stopAndWait would await a no-op instead of
    // the actual cycle.
    this.currentCyclePromise = this.checkExpiringLicenses();
    this.intervalId = setInterval(() => {
      if (this.isChecking) return;
      this.currentCyclePromise = this.checkExpiringLicenses();
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
   * Stop and wait for the in-flight cycle to drain before returning.
   */
  async stopAndWait(): Promise<void> {
    this.stop();
    if (this.currentCyclePromise) {
      try {
        await this.currentCyclePromise;
      } catch (error) {
        logger.error(
          { error },
          "License expiration reminders in-flight cycle errored during shutdown"
        );
      }
      this.currentCyclePromise = null;
    }
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
        const targetDate = addDays(now, days);

        // Find licenses expiring in this range (current day to +1 day buffer)
        const dayStart = startOfDay(targetDate);
        const dayEnd = endOfDay(targetDate);

        const licenses = await prisma.license.findMany({
          where: {
            isActive: true,
            expiresAt: {
              gte: dayStart,
              lte: dayEnd,
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
          const reminderType = `${days}_DAY`;
          // Idempotency: insert the reminder row FIRST, then send the email.
          // The unique constraint on (licenseId, reminderType) makes the
          // insert the gate — concurrent cycles or restarts that race past
          // a check-then-send pattern can't both succeed here. If the row
          // already exists we skip the send entirely.
          //
          // Trade-off: if the email send subsequently fails, we do NOT roll
          // back the row. The reminder is treated as best-effort delivery —
          // a duplicate-prevention guarantee is more valuable than a retry
          // for an expiration reminder. Stripe-driven emails (welcome,
          // renewal) get full Outbox retry semantics in C2.
          let claimed = false;
          try {
            await prisma.licenseRenewalEmail.create({
              data: {
                licenseId: license.id,
                reminderType,
              },
            });
            claimed = true;
          } catch (error) {
            if ((error as { code?: string }).code === "P2002") {
              // Row already exists — reminder was sent (or claimed) by an
              // earlier cycle. Skip silently.
              continue;
            }
            logger.error(
              { error, licenseId: license.id, days },
              `Failed to claim ${days}-day reminder slot for license`
            );
            continue;
          }

          if (!claimed) continue;

          // Wrap the send so a thrown exception for one license doesn't
          // abort the whole cron and leave subsequent licenses unprocessed.
          // The slot is already claimed; on throw we log and move on
          // (best-effort delivery — same semantics as a result.success=false).
          try {
            const result =
              await EmailService.sendLicenseExpirationReminderEmail({
                to: license.customerEmail,
                licenseKey: license.licenseKey,
                tier: license.tier,
                daysUntilExpiration: days,
                expiresAt: license.expiresAt!,
                renewalUrl: `${portalUrl}/licenses`,
              });

            if (result.success) {
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
                `Failed to send ${days}-day reminder — slot already claimed, will not retry`
              );
            }
          } catch (error) {
            logger.warn(
              {
                error,
                licenseId: license.id,
                customerEmail: license.customerEmail,
                days,
              },
              `Failed to send ${days}-day reminder — slot already claimed, will not retry`
            );
            continue;
          }
        }
      }

      // 2. Check for licenses that expired in the last 24 hours (EXPIRED NOTIFICATION)
      const yesterday = subDays(now, 1);

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
        if (!license.expiresAt) continue;

        // Same create-first idempotency as the reminder loop above.
        let claimed = false;
        try {
          await prisma.licenseRenewalEmail.create({
            data: {
              licenseId: license.id,
              reminderType: "EXPIRED",
            },
          });
          claimed = true;
        } catch (error) {
          if ((error as { code?: string }).code === "P2002") {
            continue;
          }
          logger.error(
            { error, licenseId: license.id },
            "Failed to claim EXPIRED notification slot for license"
          );
          continue;
        }

        if (!claimed) continue;

        // Same per-license isolation as the reminder loop above.
        try {
          const result = await EmailService.sendLicenseExpiredEmail({
            to: license.customerEmail,
            licenseKey: license.licenseKey,
            tier: license.tier,
            expiredAt: license.expiresAt,
            renewalUrl: `${portalUrl}/purchase`,
          });

          if (result.success) {
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
              "Failed to send expired notification — slot already claimed, will not retry"
            );
          }
        } catch (error) {
          logger.warn(
            {
              error,
              licenseId: license.id,
              customerEmail: license.customerEmail,
              expiredAt: license.expiresAt.toISOString(),
            },
            "Failed to send expired notification — slot already claimed, will not retry"
          );
          continue;
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
