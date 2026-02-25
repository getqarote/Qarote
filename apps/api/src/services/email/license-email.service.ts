/**
 * License Email Service
 * Handles email communications for license lifecycle events
 */

import { CoreEmailService, type EmailResult } from "./core-email.service";
import LicenseCancellationEmail from "./templates/license-cancellation-email";
import LicenseDeliveryEmail from "./templates/license-delivery-email";
import LicenseExpirationReminderEmail from "./templates/license-expiration-reminder-email";
import LicenseExpiredEmail from "./templates/license-expired-email";
import LicensePaymentFailedEmail from "./templates/license-payment-failed-email";
import LicenseRenewalEmail from "./templates/license-renewal-email";

import { UserPlan } from "@/generated/prisma/client";
import { tEmail } from "@/i18n";

interface SendLicenseDeliveryEmailParams {
  to: string;
  userName?: string;
  licenseKey: string;
  tier: UserPlan;
  expiresAt: Date;
  downloadUrl: string;
  locale?: string;
}

interface SendLicenseRenewalEmailParams {
  to: string;
  userName?: string;
  licenseKey: string;
  tier: UserPlan;
  previousExpiresAt: Date;
  newExpiresAt: Date;
  downloadUrl: string;
  locale?: string;
}

interface SendLicenseExpirationReminderEmailParams {
  to: string;
  userName?: string;
  licenseKey: string;
  tier: UserPlan;
  daysUntilExpiration: number;
  expiresAt: Date;
  renewalUrl: string;
  locale?: string;
}

interface SendLicenseExpiredEmailParams {
  to: string;
  userName?: string;
  licenseKey: string;
  tier: UserPlan;
  expiredAt: Date;
  renewalUrl: string;
  locale?: string;
}

interface SendLicensePaymentFailedEmailParams {
  to: string;
  userName?: string;
  licenseKey: string;
  tier: UserPlan;
  gracePeriodDays: number;
  isInGracePeriod: boolean;
  willDeactivate: boolean;
  locale?: string;
}

interface SendLicenseCancellationEmailParams {
  to: string;
  userName?: string;
  licenseKey: string;
  tier: UserPlan;
  expiresAt: Date;
  gracePeriodDays: number;
  locale?: string;
}

/**
 * License Email Service
 */
export class LicenseEmailService {
  /**
   * Send initial license delivery email (after purchase)
   */
  static async sendLicenseDeliveryEmail(
    params: SendLicenseDeliveryEmailParams
  ): Promise<EmailResult> {
    const {
      to,
      userName,
      licenseKey,
      tier,
      expiresAt,
      downloadUrl,
      locale = "en",
    } = params;

    const { portalFrontendUrl } = CoreEmailService.getConfig();
    const portalUrl = portalFrontendUrl;
    if (!portalUrl) {
      throw new Error("PORTAL_FRONTEND_URL is not configured");
    }

    const template = LicenseDeliveryEmail({
      userName,
      licenseKey,
      tier,
      expiresAt,
      downloadUrl,
      portalUrl,
    });

    return CoreEmailService.sendEmail({
      to,
      subject: tEmail(locale, "subjects.licenseReady"),
      template,
      emailType: "license-delivery",
      context: {
        licenseKey,
        tier,
        expiresAt: expiresAt.toISOString(),
      },
    });
  }

  /**
   * Send license renewal email with new license file
   */
  static async sendLicenseRenewalEmail(
    params: SendLicenseRenewalEmailParams
  ): Promise<EmailResult> {
    const {
      to,
      userName,
      licenseKey,
      tier,
      previousExpiresAt,
      newExpiresAt,
      downloadUrl,
      locale = "en",
    } = params;

    const { portalFrontendUrl } = CoreEmailService.getConfig();
    const portalUrl = portalFrontendUrl;
    if (!portalUrl) {
      throw new Error("PORTAL_FRONTEND_URL is not configured");
    }

    const template = LicenseRenewalEmail({
      userName,
      licenseKey,
      tier,
      previousExpiresAt,
      newExpiresAt,
      downloadUrl,
      portalUrl,
    });

    return CoreEmailService.sendEmail({
      to,
      subject: tEmail(locale, "subjects.licenseRenewed"),
      template,
      emailType: "license-renewal",
      context: {
        licenseKey,
        tier,
        previousExpiresAt: previousExpiresAt.toISOString(),
        newExpiresAt: newExpiresAt.toISOString(),
      },
    });
  }

  /**
   * Send license expiration reminder (30/15/7 days before expiration)
   */
  static async sendLicenseExpirationReminderEmail(
    params: SendLicenseExpirationReminderEmailParams
  ): Promise<EmailResult> {
    const {
      to,
      userName,
      licenseKey,
      tier,
      daysUntilExpiration,
      expiresAt,
      renewalUrl,
      locale = "en",
    } = params;

    const { portalFrontendUrl } = CoreEmailService.getConfig();
    const portalUrl = portalFrontendUrl;
    if (!portalUrl) {
      throw new Error("PORTAL_FRONTEND_URL is not configured");
    }

    const template = LicenseExpirationReminderEmail({
      userName,
      licenseKey,
      tier,
      daysUntilExpiration,
      expiresAt,
      renewalUrl,
      portalUrl,
    });

    return CoreEmailService.sendEmail({
      to,
      subject: tEmail(locale, "subjects.licenseExpiresSoon", {
        daysUntilExpiration,
      }),
      template,
      emailType: "license-expiration-reminder",
      context: {
        licenseKey,
        tier,
        daysUntilExpiration,
        expiresAt: expiresAt.toISOString(),
      },
    });
  }

  /**
   * Send license expired notification (day after expiration)
   */
  static async sendLicenseExpiredEmail(
    params: SendLicenseExpiredEmailParams
  ): Promise<EmailResult> {
    const {
      to,
      userName,
      licenseKey,
      tier,
      expiredAt,
      renewalUrl,
      locale = "en",
    } = params;

    const { portalFrontendUrl } = CoreEmailService.getConfig();
    const portalUrl = portalFrontendUrl;
    if (!portalUrl) {
      throw new Error("PORTAL_FRONTEND_URL is not configured");
    }

    const template = LicenseExpiredEmail({
      userName,
      licenseKey,
      tier,
      expiredAt,
      renewalUrl,
      portalUrl,
    });

    return CoreEmailService.sendEmail({
      to,
      subject: tEmail(locale, "subjects.licenseExpired"),
      template,
      emailType: "license-expired",
      context: {
        licenseKey,
        tier,
        expiredAt: expiredAt.toISOString(),
      },
    });
  }

  /**
   * Send license payment failure email (during grace period)
   */
  static async sendLicensePaymentFailedEmail(
    params: SendLicensePaymentFailedEmailParams
  ): Promise<EmailResult> {
    const {
      to,
      userName,
      licenseKey,
      tier,
      gracePeriodDays,
      isInGracePeriod,
      willDeactivate,
      locale = "en",
    } = params;

    const { portalFrontendUrl } = CoreEmailService.getConfig();
    const portalUrl = portalFrontendUrl;
    if (!portalUrl) {
      throw new Error("PORTAL_FRONTEND_URL is not configured");
    }

    const template = LicensePaymentFailedEmail({
      userName,
      licenseKey,
      tier,
      gracePeriodDays,
      isInGracePeriod,
      willDeactivate,
      portalUrl,
    });

    return CoreEmailService.sendEmail({
      to,
      subject: tEmail(locale, "subjects.licensePaymentFailed"),
      template,
      emailType: "license-payment-failed",
      context: {
        licenseKey,
        tier,
        gracePeriodDays,
        isInGracePeriod,
        willDeactivate,
      },
    });
  }

  /**
   * Send license cancellation email
   */
  static async sendLicenseCancellationEmail(
    params: SendLicenseCancellationEmailParams
  ): Promise<EmailResult> {
    const {
      to,
      userName,
      licenseKey,
      tier,
      expiresAt,
      gracePeriodDays,
      locale = "en",
    } = params;

    const { portalFrontendUrl } = CoreEmailService.getConfig();
    const portalUrl = portalFrontendUrl;
    if (!portalUrl) {
      throw new Error("PORTAL_FRONTEND_URL is not configured");
    }

    const template = LicenseCancellationEmail({
      userName,
      licenseKey,
      tier,
      expiresAt,
      gracePeriodDays,
      portalUrl,
    });

    return CoreEmailService.sendEmail({
      to,
      subject: tEmail(locale, "subjects.licenseCancelled"),
      template,
      emailType: "license-cancellation",
      context: {
        licenseKey,
        tier,
        expiresAt: expiresAt.toISOString(),
        gracePeriodDays,
      },
    });
  }
}
