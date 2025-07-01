import { WorkspacePlan } from "@prisma/client";
import { Resend } from "resend";
import { render } from "@react-email/render";
import { logger } from "@/core/logger";
import { Sentry, setSentryContext } from "@/core/sentry";
import { getPlanLimits } from "../plan-validation.service";
import { InvitationEmail } from "./templates/invitation-email";
import { WelcomeEmail } from "./templates/welcome-email";
import { UpgradeConfirmationEmail } from "./templates/upgrade-confirmation-email";
import { EmailVerification } from "./templates/email-verification";
import { TrialEndingEmail } from "./templates/trial-ending-email";
import { PaymentActionRequiredEmail } from "./templates/payment-action-required-email";
import { UpcomingInvoiceEmail } from "./templates/upcoming-invoice-email";
import { emailConfig } from "@/config";

const resend = new Resend(emailConfig.resendApiKey);

export interface SendInvitationEmailParams {
  to: string;
  inviterName: string;
  inviterEmail: string;
  workspaceName: string;
  invitationToken: string;
  plan: WorkspacePlan;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send an invitation email using Resend and React Email templates
 */
export async function sendInvitationEmail(
  params: SendInvitationEmailParams
): Promise<EmailResult> {
  const {
    to,
    inviterName,
    inviterEmail,
    workspaceName,
    invitationToken,
    plan,
  } = params;

  try {
    logger.info("Sending invitation email", {
      to,
      inviterEmail,
      workspaceName,
      plan,
    });

    // Validate email service configuration
    if (!emailConfig.resendApiKey) {
      throw new Error("RESEND_API_KEY environment variable is not set");
    }

    // Get plan information for the email
    const planLimits = getPlanLimits(plan);
    const userCostPerMonth = planLimits.userCostPerMonth;

    // Render the React email template to HTML
    const email = InvitationEmail({
      inviterName,
      inviterEmail,
      workspaceName,
      invitationToken,
      plan,
      userCostPerMonth,
      frontendUrl: emailConfig.frontendUrl,
    });
    const emailHtml = await render(email);

    // Send the email using Resend
    const { data, error } = await resend.emails.send({
      from: emailConfig.fromEmail,
      to,
      subject: `You're invited to join ${workspaceName} on RabbitScout`,
      html: emailHtml,
    });

    if (error) {
      logger.error("Failed to send invitation email:", error);

      // Capture email error in Sentry
      Sentry.withScope((scope) => {
        scope.setTag("component", "email");
        scope.setTag("email_type", "invitation");
        scope.setContext("email_operation", {
          operation: "sendInvitationEmail",
          to,
          inviterEmail,
          workspaceName,
          plan,
          error: error.message,
        });
        Sentry.captureException(
          new Error(`Email sending failed: ${error.message}`)
        );
      });

      return {
        success: false,
        error: error.message || "Failed to send email",
      };
    }

    // Set Sentry context for email tracking
    setSentryContext("email_sent", {
      type: "invitation",
      messageId: data?.id,
      to,
      workspaceName,
      plan,
    });

    logger.info("Invitation email sent successfully", {
      messageId: data?.id,
      to,
      workspaceName,
    });

    return {
      success: true,
      messageId: data?.id,
    };
  } catch (error) {
    logger.error("Error sending invitation email:", error);

    // Capture email error in Sentry
    Sentry.withScope((scope) => {
      scope.setTag("component", "email");
      scope.setTag("email_type", "invitation");
      scope.setContext("email_operation", {
        operation: "sendInvitationEmail",
        to,
        inviterEmail,
        workspaceName,
        plan,
      });
      Sentry.captureException(error);
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Send a welcome email to newly registered users
 */
export async function sendWelcomeEmail(params: {
  to: string;
  name: string;
  workspaceName: string;
  plan: WorkspacePlan;
}): Promise<EmailResult> {
  const { to, name, workspaceName, plan } = params;

  try {
    logger.info("Sending welcome email", {
      to,
      name,
      workspaceName,
      plan,
    });

    if (!emailConfig.resendApiKey) {
      throw new Error("RESEND_API_KEY environment variable is not set");
    }

    const frontendUrl = emailConfig.frontendUrl;

    // Render the React email template
    const emailHtml = await render(
      WelcomeEmail({
        name,
        workspaceName,
        plan,
        frontendUrl,
      })
    );

    const { data, error } = await resend.emails.send({
      from: emailConfig.fromEmail,
      to,
      subject: `Welcome to RabbitScout, ${name}!`,
      html: emailHtml,
    });

    if (error) {
      logger.error("Failed to send welcome email:", error);

      // Capture email error in Sentry
      Sentry.withScope((scope) => {
        scope.setTag("component", "email");
        scope.setTag("email_type", "welcome");
        scope.setContext("email_operation", {
          operation: "sendWelcomeEmail",
          to,
          name,
          workspaceName,
          plan,
          error: error.message,
        });
        Sentry.captureException(
          new Error(`Email sending failed: ${error.message}`)
        );
      });

      return {
        success: false,
        error: error.message || "Failed to send email",
      };
    }

    // Set Sentry context for email tracking
    setSentryContext("email_sent", {
      type: "welcome",
      messageId: data?.id,
      to,
      name,
      workspaceName,
      plan,
    });

    logger.info("Welcome email sent successfully", {
      messageId: data?.id,
      to,
      name,
    });

    return {
      success: true,
      messageId: data?.id,
    };
  } catch (error) {
    logger.error("Error sending welcome email:", error);

    // Capture email error in Sentry
    Sentry.withScope((scope) => {
      scope.setTag("component", "email");
      scope.setTag("email_type", "welcome");
      scope.setContext("email_operation", {
        operation: "sendWelcomeEmail",
        to,
        name,
        workspaceName,
        plan,
      });
      Sentry.captureException(error);
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

export interface UpgradeConfirmationEmailParams {
  to: string;
  userName: string;
  workspaceName: string;
  plan: WorkspacePlan;
  billingInterval: "monthly" | "yearly";
}

export async function sendUpgradeConfirmationEmail({
  to,
  userName,
  workspaceName,
  plan,
  billingInterval,
}: UpgradeConfirmationEmailParams) {
  try {
    logger.info("Sending upgrade confirmation email", {
      to,
      userName,
      workspaceName,
      plan,
      billingInterval,
    });

    const emailHtml = await render(
      UpgradeConfirmationEmail({
        userName,
        workspaceName,
        plan,
        billingInterval,
      })
    );

    const result = await resend.emails.send({
      from: emailConfig.fromEmail,
      to,
      subject: `Welcome to ${plan} Plan - Upgrade Confirmed!`,
      html: emailHtml,
    });

    // Set Sentry context for email tracking
    setSentryContext("email_sent", {
      type: "upgrade_confirmation",
      messageId: result.data?.id,
      to,
      userName,
      workspaceName,
      plan,
      billingInterval,
    });

    logger.info("Upgrade confirmation email sent successfully", {
      messageId: result.data?.id,
      to,
      plan,
    });

    return result;
  } catch (error) {
    logger.error("Failed to send upgrade confirmation email:", error);

    // Capture email error in Sentry
    Sentry.withScope((scope) => {
      scope.setTag("component", "email");
      scope.setTag("email_type", "upgrade_confirmation");
      scope.setContext("email_operation", {
        operation: "sendUpgradeConfirmationEmail",
        to,
        userName,
        workspaceName,
        plan,
        billingInterval,
      });
      Sentry.captureException(error);
    });

    throw error;
  }
}

export interface SendVerificationEmailParams {
  to: string;
  userName?: string;
  verificationToken: string;
  type: "SIGNUP" | "EMAIL_CHANGE";
}

/**
 * Send an email verification email using Resend and React Email templates
 */
export async function sendVerificationEmail(
  params: SendVerificationEmailParams
): Promise<EmailResult> {
  const { to, userName, verificationToken, type } = params;

  try {
    logger.info("Sending verification email", {
      to,
      userName,
      type,
    });

    // Validate email service configuration
    if (!emailConfig.resendApiKey) {
      throw new Error("RESEND_API_KEY environment variable is not set");
    }

    const verificationUrl = `${emailConfig.frontendUrl}/verify-email?token=${verificationToken}`;
    const expiryHours = 24;

    // Render the React email template to HTML
    const email = EmailVerification({
      email: to,
      userName,
      verificationUrl,
      type,
      frontendUrl: emailConfig.frontendUrl,
      expiryHours,
    });
    const emailHtml = await render(email);

    const subject =
      type === "SIGNUP"
        ? "Please verify your email address - RabbitScout"
        : "Verify your new email address - RabbitScout";

    // Send the email using Resend
    const { data, error } = await resend.emails.send({
      from: emailConfig.fromEmail,
      to,
      subject,
      html: emailHtml,
    });

    if (error) {
      logger.error("Failed to send verification email:", error);

      // Capture email error in Sentry
      Sentry.withScope((scope) => {
        scope.setTag("component", "email");
        scope.setTag("email_type", "verification");
        scope.setContext("email_operation", {
          operation: "sendVerificationEmail",
          to,
          userName,
          type,
          error: error.message,
        });
        Sentry.captureException(
          new Error(`Email sending failed: ${error.message}`)
        );
      });

      return {
        success: false,
        error: error.message || "Failed to send email",
      };
    }

    // Set Sentry context for email tracking
    setSentryContext("email_sent", {
      type: "verification",
      subType: type,
      messageId: data?.id,
      to,
      userName,
    });

    logger.info("Verification email sent successfully", {
      messageId: data?.id,
      to,
      type,
    });

    return {
      success: true,
      messageId: data?.id,
    };
  } catch (error) {
    logger.error("Error sending verification email:", error);

    // Capture email error in Sentry
    Sentry.withScope((scope) => {
      scope.setTag("component", "email");
      scope.setTag("email_type", "verification");
      scope.setContext("email_operation", {
        operation: "sendVerificationEmail",
        to,
        userName,
        type,
      });
      Sentry.captureException(error);
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Send trial ending notification email
 */
export async function sendTrialEndingEmail(params: {
  to: string;
  name: string;
  workspaceName: string;
  plan: "DEVELOPER" | "STARTUP" | "BUSINESS";
  trialEndDate: string;
}): Promise<EmailResult> {
  const { to, name, workspaceName, plan, trialEndDate } = params;

  try {
    logger.info("Sending trial ending email", {
      to,
      name,
      workspaceName,
      plan,
      trialEndDate,
    });

    if (!emailConfig.resendApiKey) {
      throw new Error("RESEND_API_KEY environment variable is not set");
    }

    const frontendUrl = emailConfig.frontendUrl;

    // Render the React email template
    const emailHtml = await render(
      TrialEndingEmail({
        name,
        workspaceName,
        plan,
        trialEndDate,
        frontendUrl,
      })
    );

    const { data, error } = await resend.emails.send({
      from: emailConfig.fromEmail,
      to,
      subject: `Your ${plan.toLowerCase()} trial ends soon - Action required`,
      html: emailHtml,
    });

    if (error) {
      logger.error("Failed to send trial ending email:", error);

      // Capture email error in Sentry
      Sentry.withScope((scope) => {
        scope.setTag("component", "email");
        scope.setTag("email_type", "trial_ending");
        scope.setContext("email_operation", {
          operation: "sendTrialEndingEmail",
          to,
          name,
          workspaceName,
          plan,
          error: error.message,
        });
        Sentry.captureException(
          new Error(`Email sending failed: ${error.message}`)
        );
      });

      return {
        success: false,
        error: error.message || "Failed to send email",
      };
    }

    // Set Sentry context for email tracking
    setSentryContext("email_sent", {
      type: "trial_ending",
      messageId: data?.id,
      to,
      workspaceName,
      plan,
    });

    logger.info("Trial ending email sent successfully", {
      messageId: data?.id,
      to,
      workspaceName,
    });

    return {
      success: true,
      messageId: data?.id,
    };
  } catch (error) {
    logger.error("Error sending trial ending email:", error);

    // Capture email error in Sentry
    Sentry.withScope((scope) => {
      scope.setTag("component", "email");
      scope.setTag("email_type", "trial_ending");
      scope.setContext("email_operation", {
        operation: "sendTrialEndingEmail",
        to,
        name,
        workspaceName,
        plan,
      });
      Sentry.captureException(error);
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Send payment action required email
 */
export async function sendPaymentActionRequiredEmail(params: {
  to: string;
  name: string;
  workspaceName: string;
  plan: "DEVELOPER" | "STARTUP" | "BUSINESS";
  invoiceUrl: string;
  amount: string;
  currency: string;
}): Promise<EmailResult> {
  const { to, name, workspaceName, plan, invoiceUrl, amount, currency } =
    params;

  try {
    logger.info("Sending payment action required email", {
      to,
      name,
      workspaceName,
      plan,
      amount,
      currency,
    });

    if (!emailConfig.resendApiKey) {
      throw new Error("RESEND_API_KEY environment variable is not set");
    }

    const frontendUrl = emailConfig.frontendUrl;

    // Render the React email template
    const emailHtml = await render(
      PaymentActionRequiredEmail({
        name,
        workspaceName,
        plan,
        invoiceUrl,
        amount,
        currency,
        frontendUrl,
      })
    );

    const { data, error } = await resend.emails.send({
      from: emailConfig.fromEmail,
      to,
      subject: `Action required: Complete your payment for ${workspaceName}`,
      html: emailHtml,
    });

    if (error) {
      logger.error("Failed to send payment action required email:", error);

      // Capture email error in Sentry
      Sentry.withScope((scope) => {
        scope.setTag("component", "email");
        scope.setTag("email_type", "payment_action_required");
        scope.setContext("email_operation", {
          operation: "sendPaymentActionRequiredEmail",
          to,
          name,
          workspaceName,
          plan,
          error: error.message,
        });
        Sentry.captureException(
          new Error(`Email sending failed: ${error.message}`)
        );
      });

      return {
        success: false,
        error: error.message || "Failed to send email",
      };
    }

    // Set Sentry context for email tracking
    setSentryContext("email_sent", {
      type: "payment_action_required",
      messageId: data?.id,
      to,
      workspaceName,
      plan,
    });

    logger.info("Payment action required email sent successfully", {
      messageId: data?.id,
      to,
      workspaceName,
    });

    return {
      success: true,
      messageId: data?.id,
    };
  } catch (error) {
    logger.error("Error sending payment action required email:", error);

    // Capture email error in Sentry
    Sentry.withScope((scope) => {
      scope.setTag("component", "email");
      scope.setTag("email_type", "payment_action_required");
      scope.setContext("email_operation", {
        operation: "sendPaymentActionRequiredEmail",
        to,
        name,
        workspaceName,
        plan,
      });
      Sentry.captureException(error);
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Send upcoming invoice notification email
 */
export async function sendUpcomingInvoiceEmail(params: {
  to: string;
  name: string;
  workspaceName: string;
  plan: "DEVELOPER" | "STARTUP" | "BUSINESS";
  amount: string;
  currency: string;
  invoiceDate: string;
  nextBillingDate: string;
}): Promise<EmailResult> {
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

  try {
    logger.info("Sending upcoming invoice email", {
      to,
      name,
      workspaceName,
      plan,
      amount,
      currency,
      invoiceDate,
      nextBillingDate,
    });

    if (!emailConfig.resendApiKey) {
      throw new Error("RESEND_API_KEY environment variable is not set");
    }

    const frontendUrl = emailConfig.frontendUrl;

    // Render the React email template
    const emailHtml = await render(
      UpcomingInvoiceEmail({
        name,
        workspaceName,
        plan,
        amount,
        currency,
        invoiceDate,
        nextBillingDate,
        frontendUrl,
      })
    );

    const { data, error } = await resend.emails.send({
      from: emailConfig.fromEmail,
      to,
      subject: `Upcoming invoice for ${workspaceName} - ${currency.toUpperCase()} ${amount}`,
      html: emailHtml,
    });

    if (error) {
      logger.error("Failed to send upcoming invoice email:", error);

      // Capture email error in Sentry
      Sentry.withScope((scope) => {
        scope.setTag("component", "email");
        scope.setTag("email_type", "upcoming_invoice");
        scope.setContext("email_operation", {
          operation: "sendUpcomingInvoiceEmail",
          to,
          name,
          workspaceName,
          plan,
          error: error.message,
        });
        Sentry.captureException(
          new Error(`Email sending failed: ${error.message}`)
        );
      });

      return {
        success: false,
        error: error.message || "Failed to send email",
      };
    }

    // Set Sentry context for email tracking
    setSentryContext("email_sent", {
      type: "upcoming_invoice",
      messageId: data?.id,
      to,
      workspaceName,
      plan,
    });

    logger.info("Upcoming invoice email sent successfully", {
      messageId: data?.id,
      to,
      workspaceName,
    });

    return {
      success: true,
      messageId: data?.id,
    };
  } catch (error) {
    logger.error("Error sending upcoming invoice email:", error);

    // Capture email error in Sentry
    Sentry.withScope((scope) => {
      scope.setTag("component", "email");
      scope.setTag("email_type", "upcoming_invoice");
      scope.setContext("email_operation", {
        operation: "sendUpcomingInvoiceEmail",
        to,
        name,
        workspaceName,
        plan,
      });
      Sentry.captureException(error);
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
