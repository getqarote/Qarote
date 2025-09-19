import React from "react";
import { WorkspacePlan } from "@prisma/client";
import { CoreEmailService, EmailResult } from "./core-email.service";
import { UpgradeConfirmationEmail } from "./templates/upgrade-confirmation-email";
import { WelcomeBackEmail } from "./templates/welcome-back-email";

export interface UpgradeConfirmationEmailParams {
  to: string;
  userName: string;
  workspaceName: string;
  plan: WorkspacePlan;
  billingInterval: "monthly" | "yearly";
}

export interface WelcomeBackEmailParams {
  to: string;
  userName: string;
  workspaceName: string;
  plan: WorkspacePlan;
  billingInterval: "monthly" | "yearly";
  previousCancelDate?: string;
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
    const { to, userName, workspaceName, plan, billingInterval } = params;

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
      subject: `Welcome to ${plan} Plan - Upgrade Confirmed!`,
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
      subject: `🎉 Welcome Back to RabbitHQ - ${plan} Plan Renewed!`,
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
