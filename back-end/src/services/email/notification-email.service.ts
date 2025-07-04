import { TrialEndingEmail } from "./templates/trial-ending-email";
import { PaymentActionRequiredEmail } from "./templates/payment-action-required-email";
import { UpcomingInvoiceEmail } from "./templates/upcoming-invoice-email";
import { CoreEmailService, EmailResult } from "./core-email.service";

export interface TrialEndingEmailParams {
  to: string;
  name: string;
  workspaceName: string;
  plan: "DEVELOPER" | "STARTUP" | "BUSINESS";
  trialEndDate: string;
  currentUsage?: {
    servers: number;
    queues: number;
    monthlyMessages: number;
  };
}

export interface PaymentActionRequiredEmailParams {
  to: string;
  name: string;
  workspaceName: string;
  plan: "DEVELOPER" | "STARTUP" | "BUSINESS";
  invoiceUrl: string;
  amount: string;
  currency: string;
}

export interface UpcomingInvoiceEmailParams {
  to: string;
  name: string;
  workspaceName: string;
  plan: "DEVELOPER" | "STARTUP" | "BUSINESS";
  amount: string;
  currency: string;
  invoiceDate: string;
  nextBillingDate: string;
  usageReport?: {
    servers: number;
    queues: number;
    monthlyMessages: number;
    totalMessages: number;
  };
}

/**
 * Notification email service for handling system notifications and alerts
 */
export class NotificationEmailService {
  /**
   * Send trial ending notification email with usage insights
   */
  static async sendTrialEndingEmail(
    params: TrialEndingEmailParams
  ): Promise<EmailResult> {
    const { to, name, workspaceName, plan, trialEndDate, currentUsage } =
      params;

    const { frontendUrl } = CoreEmailService.getConfig();

    // Render the React email template
    const template = TrialEndingEmail({
      name,
      workspaceName,
      plan,
      trialEndDate,
      frontendUrl,
    });

    // Create compelling subject line with usage data
    const usageText = currentUsage
      ? `Don't lose your ${currentUsage.servers} servers & ${currentUsage.queues} queues`
      : "Action required";

    return CoreEmailService.sendEmail({
      to,
      subject: `Your ${plan.toLowerCase()} trial ends soon - ${usageText}`,
      template,
      emailType: "trial_ending",
      context: {
        name,
        workspaceName,
        plan,
        usage: currentUsage,
      },
    });
  }

  /**
   * Send payment action required email
   */
  static async sendPaymentActionRequiredEmail(
    params: PaymentActionRequiredEmailParams
  ): Promise<EmailResult> {
    const { to, name, workspaceName, plan, invoiceUrl, amount, currency } =
      params;

    const { frontendUrl } = CoreEmailService.getConfig();

    // Render the React email template
    const template = PaymentActionRequiredEmail({
      name,
      workspaceName,
      plan,
      invoiceUrl,
      amount,
      currency,
      frontendUrl,
    });

    return CoreEmailService.sendEmail({
      to,
      subject: `Action required: Complete your payment for ${workspaceName}`,
      template,
      emailType: "payment_action_required",
      context: {
        name,
        workspaceName,
        plan,
      },
    });
  }

  /**
   * Send upcoming invoice notification with usage insights and optimization tips
   */
  static async sendUpcomingInvoiceEmail(
    params: UpcomingInvoiceEmailParams
  ): Promise<EmailResult> {
    const {
      to,
      name,
      workspaceName,
      plan,
      amount,
      currency,
      invoiceDate,
      nextBillingDate,
      usageReport,
    } = params;

    const { frontendUrl } = CoreEmailService.getConfig();

    // Render the React email template
    const template = UpcomingInvoiceEmail({
      name,
      workspaceName,
      plan,
      amount,
      currency,
      invoiceDate,
      nextBillingDate,
      frontendUrl,
      usageReport,
    });

    // Create subject line with usage insights
    const usageText = usageReport
      ? `${usageReport.monthlyMessages.toLocaleString()} messages this month`
      : "Monthly usage report";

    return CoreEmailService.sendEmail({
      to,
      subject: `${workspaceName} usage report & upcoming invoice - ${usageText}`,
      template,
      emailType: "upcoming_invoice",
      context: {
        name,
        workspaceName,
        plan,
      },
    });
  }
}
