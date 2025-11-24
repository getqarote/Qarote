import React from "react";
import { UserPlan } from "@prisma/client";
import TrialEndingEmail from "./templates/trial-ending-email";
import PaymentActionRequiredEmail from "./templates/payment-action-required-email";
import UpcomingInvoiceEmail from "./templates/upcoming-invoice-email";
import PaymentConfirmationEmail from "./templates/payment-confirmation-email";
import AlertNotificationEmail from "./templates/alert-notification-email";
import { CoreEmailService, EmailResult } from "./core-email.service";
import { RabbitMQAlert } from "@/types/alert";

export interface TrialEndingEmailParams {
  to: string;
  name: string;
  workspaceName: string;
  plan: UserPlan;
  trialEndDate: string;
  currentUsage?: {
    servers: number;
  };
}

export interface PaymentActionRequiredEmailParams {
  to: string;
  name: string;
  workspaceName: string;
  plan: UserPlan;
  invoiceUrl: string;
  amount: string;
  currency: string;
}

export interface UpcomingInvoiceEmailParams {
  to: string;
  name: string;
  workspaceName: string;
  plan: UserPlan;
  amount: string;
  currency: string;
  invoiceDate: string;
  nextBillingDate: string;
  usageReport?: {
    servers: number;
  };
}

export interface PaymentFailedEmailParams {
  to: string;
  userName: string;
  amount: number;
  failureReason: string;
}

export interface PaymentConfirmationEmailParams {
  to: string;
  userName: string;
  amount: number;
  currency: string;
  paymentMethod: string;
}

export interface AlertNotificationEmailParams {
  to: string;
  workspaceName: string;
  workspaceId: string;
  serverName: string;
  serverId: string;
  alerts: RabbitMQAlert[];
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
      ? `Don't lose your ${currentUsage.servers} servers`
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
    });

    return CoreEmailService.sendEmail({
      to,
      subject: `${workspaceName} usage report & upcoming invoice`,
      template,
      emailType: "upcoming_invoice",
      context: {
        name,
        workspaceName,
        plan,
      },
    });
  }

  /**
   * Send payment confirmation email
   */
  static async sendPaymentConfirmationEmail(
    params: PaymentConfirmationEmailParams
  ): Promise<EmailResult> {
    const { to, userName, amount, currency, paymentMethod } = params;

    const { frontendUrl } = CoreEmailService.getConfig();

    // Render the React email template
    const template = React.createElement(PaymentConfirmationEmail, {
      userName,
      amount,
      currency,
      paymentMethod,
      frontendUrl,
    });

    return CoreEmailService.sendEmail({
      to,
      subject: `✅ Payment Confirmed - ${new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency.toUpperCase(),
      }).format(amount)}`,
      template,
      emailType: "payment_confirmation",
      context: {
        userName,
        amount,
        currency,
        paymentMethod,
      },
    });
  }

  /**
   * Send payment failed notification email
   */
  static async sendPaymentFailedEmail(
    params: PaymentFailedEmailParams
  ): Promise<EmailResult> {
    const { to, userName, amount, failureReason } = params;

    const { frontendUrl } = CoreEmailService.getConfig();

    // Create a simple HTML template for payment failed email
    const template = (
      <div
        style={{
          fontFamily: "Arial, sans-serif",
          maxWidth: "600px",
          margin: "0 auto",
        }}
      >
        <h2>Payment Failed</h2>
        <p>Hello {userName},</p>
        <p>We were unable to process your payment of ${amount.toFixed(2)}.</p>
        <p>
          <strong>Reason:</strong> {failureReason}
        </p>
        <p>Please update your payment method to continue using our service.</p>
        <a
          href={`${frontendUrl}/billing`}
          style={{
            display: "inline-block",
            padding: "12px 24px",
            backgroundColor: "#007bff",
            color: "white",
            textDecoration: "none",
            borderRadius: "4px",
          }}
        >
          Update Payment Method
        </a>
        <p>If you have any questions, please contact our support team.</p>
      </div>
    );

    return CoreEmailService.sendEmail({
      to,
      subject: `Payment Failed - Action Required`,
      template,
      emailType: "payment_failed",
      context: {
        userName,
        amount,
        failureReason,
      },
    });
  }

  /**
   * Send alert notification email when new alerts are detected
   */
  static async sendAlertNotificationEmail(
    params: AlertNotificationEmailParams
  ): Promise<EmailResult> {
    const { to, workspaceName, workspaceId, serverName, serverId, alerts } =
      params;

    const { frontendUrl } = CoreEmailService.getConfig();

    // Render the React email template
    const template = AlertNotificationEmail({
      workspaceName,
      workspaceId,
      serverName,
      serverId,
      alerts,
      frontendUrl,
    });

    // Determine subject line based on alert severity
    const criticalCount = alerts.filter(
      (a) => a.severity === "critical"
    ).length;
    const warningCount = alerts.filter((a) => a.severity === "warning").length;

    let subject: string;
    if (criticalCount > 0) {
      subject = `🔴 ${criticalCount} Critical Alert${criticalCount > 1 ? "s" : ""} on ${serverName}`;
    } else {
      subject = `⚠️ ${warningCount} Warning Alert${warningCount > 1 ? "s" : ""} on ${serverName}`;
    }

    return CoreEmailService.sendEmail({
      to,
      subject,
      template,
      emailType: "alert_notification",
      context: {
        workspaceName,
        serverName,
        alertCount: alerts.length,
        criticalCount,
        warningCount,
      },
    });
  }
}
