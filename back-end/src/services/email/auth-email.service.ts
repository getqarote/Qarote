import { UserPlan } from "@prisma/client";
import { InvitationEmail } from "./templates/invitation-email";
import { EmailVerification } from "./templates/email-verification";
import { CoreEmailService, EmailResult } from "./core-email.service";
import WelcomeEmail from "./templates/welcome-email";

export interface SendInvitationEmailParams {
  to: string;
  inviterName: string;
  inviterEmail: string;
  workspaceName: string;
  invitationToken: string;
  plan: UserPlan;
}

export interface SendWelcomeEmailParams {
  to: string;
  name: string;
  workspaceName: string;
  plan: UserPlan;
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
    const { frontendUrl } = CoreEmailService.getConfig();

    // Render the React email template
    const template = InvitationEmail({
      inviterName,
      inviterEmail,
      workspaceName,
      invitationToken,
      frontendUrl,
    });

    return CoreEmailService.sendEmail({
      to,
      subject: `You're invited to join ${workspaceName} on RabbitHQ`,
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
      subject: `Welcome to RabbitHQ, ${name}!`,
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

    console.log("Verification URL:", verificationUrl);

    // Render the React email template
    const template = EmailVerification({
      email: to,
      userName,
      token: verificationToken,
      type,
      frontendUrl,
      expiryHours,
    });

    const subject =
      type === "SIGNUP"
        ? "Please verify your email address - RabbitHQ"
        : "Verify your new email address - RabbitHQ";

    return await CoreEmailService.sendEmail({
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
