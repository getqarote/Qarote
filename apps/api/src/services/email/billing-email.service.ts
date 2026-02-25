import React from "react";

import { CoreEmailService, EmailResult } from "./core-email.service";
import { UpgradeConfirmationEmail } from "./templates/upgrade-confirmation-email";
import { WelcomeBackEmail } from "./templates/welcome-back-email";

import { UserPlan } from "@/generated/prisma/client";
import { tEmail } from "@/i18n";

interface UpgradeConfirmationEmailParams {
  to: string;
  userName: string;
  workspaceName: string;
  plan: UserPlan;
  billingInterval: "monthly" | "yearly";
  locale?: string;
}

interface WelcomeBackEmailParams {
  to: string;
  userName: string;
  workspaceName: string;
  plan: UserPlan;
  billingInterval: "monthly" | "yearly";
  previousCancelDate?: string;
  locale?: string;
}

/**
 * Billing email service for handling subscription and payment-related emails
 */
export class BillingEmailService {
  /**
   * Send upgrade confirmation email
   */
  static async sendUpgradeConfirmationEmail(
    params: UpgradeConfirmationEmailParams
  ): Promise<EmailResult> {
    const {
      to,
      userName,
      workspaceName,
      plan,
      billingInterval,
      locale = "en",
    } = params;

    const { frontendUrl } = CoreEmailService.getConfig();

    const template = React.createElement(UpgradeConfirmationEmail, {
      userName,
      workspaceName,
      plan,
      billingInterval,
      frontendUrl,
    });

    const result = await CoreEmailService.sendEmail({
      to,
      subject: tEmail(locale, "subjects.upgradePlanConfirmed", { plan }),
      template,
      emailType: "upgrade_confirmation",
      context: {
        userName,
        workspaceName,
        plan,
        billingInterval,
      },
    });

    // Return the result in the expected format for backward compatibility
    return result;
  }

  /**
   * Send welcome back email for renewed subscriptions
   */
  static async sendWelcomeBackEmail(
    params: WelcomeBackEmailParams
  ): Promise<EmailResult> {
    const {
      to,
      userName,
      workspaceName,
      plan,
      billingInterval,
      previousCancelDate,
      locale = "en",
    } = params;

    const { frontendUrl } = CoreEmailService.getConfig();

    const template = React.createElement(WelcomeBackEmail, {
      userName,
      workspaceName,
      plan,
      billingInterval,
      previousCancelDate,
      frontendUrl,
    });

    const result = await CoreEmailService.sendEmail({
      to,
      subject: tEmail(locale, "subjects.planRenewed", { plan }),
      template,
      emailType: "welcome_back",
      context: {
        userName,
        workspaceName,
        plan,
        billingInterval,
        previousCancelDate,
      },
    });

    // Return the result in the expected format for backward compatibility
    return result;
  }
}
