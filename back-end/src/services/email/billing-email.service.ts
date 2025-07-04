import { WorkspacePlan } from "@prisma/client";
import { UpgradeConfirmationEmail } from "./templates/upgrade-confirmation-email";
import { CoreEmailService } from "./core-email.service";

export interface UpgradeConfirmationEmailParams {
  to: string;
  userName: string;
  workspaceName: string;
  plan: WorkspacePlan;
  billingInterval: "monthly" | "yearly";
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
  ): Promise<any> {
    const { to, userName, workspaceName, plan, billingInterval } = params;

    const template = UpgradeConfirmationEmail({
      userName,
      workspaceName,
      plan,
      billingInterval,
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
    return {
      data: { id: result.messageId },
      error: result.success ? null : { message: result.error },
    };
  }
}
