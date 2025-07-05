import { WorkspacePlan } from "@prisma/client";
import { getPlanFeatures } from "../plan/plan.service";
import { InvitationEmail } from "./templates/invitation-email";
import { WelcomeEmail } from "./templates/welcome-email";
import { EmailVerification } from "./templates/email-verification";
import { CoreEmailService, EmailResult } from "./core-email.service";

export interface SendInvitationEmailParams {
  to: string;
  inviterName: string;
  inviterEmail: string;
  workspaceName: string;
  invitationToken: string;
  plan: WorkspacePlan;
}

export interface SendWelcomeEmailParams {
  to: string;
  name: string;
  workspaceName: string;
  plan: WorkspacePlan;
}

export interface SendVerificationEmailParams {
  to: string;
  userName?: string;
  verificationToken: string;
  type: "SIGNUP" | "EMAIL_CHANGE";
}

/**
 * Authentication email service for handling user authentication-related emails
 */
export class AuthEmailService {
  /**
   * Send an invitation email using Resend and React Email templates
   */
  static async sendInvitationEmail(
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

    // Get plan information for the email
    const planLimits = getPlanFeatures(plan);
    const userCostPerMonth = planLimits.userCostPerMonth;
    const { frontendUrl } = CoreEmailService.getConfig();

    // Render the React email template
    const template = InvitationEmail({
      inviterName,
      inviterEmail,
      workspaceName,
      invitationToken,
      plan,
      userCostPerMonth,
      frontendUrl,
    });

    return CoreEmailService.sendEmail({
      to,
      subject: `You're invited to join ${workspaceName} on RabbitScout`,
      template,
      emailType: "invitation",
      context: {
        inviterEmail,
        workspaceName,
        plan,
      },
    });
  }

  /**
   * Send a welcome email to newly registered users
   */
  static async sendWelcomeEmail(
    params: SendWelcomeEmailParams
  ): Promise<EmailResult> {
    const { to, name, workspaceName, plan } = params;

    const { frontendUrl } = CoreEmailService.getConfig();

    // Render the React email template
    const template = WelcomeEmail({
      name,
      workspaceName,
      plan,
      frontendUrl,
    });

    return CoreEmailService.sendEmail({
      to,
      subject: `Welcome to RabbitScout, ${name}!`,
      template,
      emailType: "welcome",
      context: {
        name,
        workspaceName,
        plan,
      },
    });
  }

  /**
   * Send an email verification email using Resend and React Email templates
   */
  static async sendVerificationEmail(
    params: SendVerificationEmailParams
  ): Promise<EmailResult> {
    const { to, userName, verificationToken, type } = params;

    const { frontendUrl } = CoreEmailService.getConfig();
    const verificationUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;
    const expiryHours = 24;

    console.log("to", to);

    // Render the React email template
    const template = EmailVerification({
      email: to,
      userName,
      verificationUrl,
      type,
      frontendUrl,
      expiryHours,
    });

    const subject =
      type === "SIGNUP"
        ? "Please verify your email address - RabbitScout"
        : "Verify your new email address - RabbitScout";

    return CoreEmailService.sendEmail({
      to,
      subject,
      template,
      emailType: "verification",
      context: {
        userName,
        type,
      },
    });
  }
}
