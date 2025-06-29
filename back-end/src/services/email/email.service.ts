import { WorkspacePlan } from "@prisma/client";
import { Resend } from "resend";
import { render } from "@react-email/render";
import { getPlanLimits } from "../plan-validation.service";
import { InvitationEmail } from "./templates/invitation-email";
import { WelcomeEmail } from "./templates/welcome-email";
import { UpgradeConfirmationEmail } from "./templates/upgrade-confirmation-email";

const resend = new Resend(process.env.RESEND_API_KEY);

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
    // Validate email service configuration
    if (!process.env.RESEND_API_KEY) {
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
      frontendUrl: process.env.FRONTEND_URL!,
    });
    const emailHtml = await render(email);

    // Send the email using Resend
    const { data, error } = await resend.emails.send({
      from: process.env.FROM_EMAIL!,
      to,
      subject: `You're invited to join ${workspaceName} on RabbitScout`,
      html: emailHtml,
    });

    if (error) {
      console.error("Failed to send invitation email:", error);
      return {
        success: false,
        error: error.message || "Failed to send email",
      };
    }

    console.log("Invitation email sent successfully:", data?.id);
    return {
      success: true,
      messageId: data?.id,
    };
  } catch (error) {
    console.error("Error sending invitation email:", error);
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
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY environment variable is not set");
    }

    const frontendUrl = process.env.FRONTEND_URL!;

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
      from: process.env.FROM_EMAIL!,
      to,
      subject: `Welcome to RabbitScout, ${name}!`,
      html: emailHtml,
    });

    if (error) {
      console.error("Failed to send welcome email:", error);
      return {
        success: false,
        error: error.message || "Failed to send email",
      };
    }

    return {
      success: true,
      messageId: data?.id,
    };
  } catch (error) {
    console.error("Error sending welcome email:", error);
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
    const emailHtml = await render(
      UpgradeConfirmationEmail({
        userName,
        workspaceName,
        plan,
        billingInterval,
      })
    );

    const result = await resend.emails.send({
      from: process.env.FROM_EMAIL || "noreply@rabbitscout.com",
      to,
      subject: `Welcome to ${plan} Plan - Upgrade Confirmed!`,
      html: emailHtml,
    });

    console.log("Upgrade confirmation email sent:", result);
    return result;
  } catch (error) {
    console.error("Failed to send upgrade confirmation email:", error);
    throw error;
  }
}
