import { CoreEmailService, EmailResult } from "./core-email.service";
import { EmailVerification } from "./templates/email-verification";
import { InvitationEmail } from "./templates/invitation-email";
import WelcomeEmail from "./templates/welcome-email";

import { UserPlan } from "@/generated/prisma/client";

interface SendInvitationEmailParams {
  to: string;
  inviterName: string;
  inviterEmail: string;
  workspaceName: string;
  invitationToken: string;
  plan: UserPlan;
}

interface SendWelcomeEmailParams {
  to: string;
  name: string;
  workspaceName?: string;
  plan: UserPlan;
}

interface SendVerificationEmailParams {
  to: string;
  userName?: string;
  verificationToken: string;
  type: "SIGNUP" | "EMAIL_CHANGE";
  sourceApp?: "app" | "portal";
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
      subject: `You're invited to join ${workspaceName} on Qarote`,
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
      subject: `Welcome to Qarote, ${name}!`,
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
    const { to, userName, verificationToken, type, sourceApp } = params;

    const config = CoreEmailService.getConfig();
    const expiryHours = 24;

    // Determine which frontend URL to use based on source app
    let frontendUrl = config.frontendUrl;
    if (sourceApp === "portal") {
      if (!config.portalFrontendUrl) {
        throw new Error(
          "PORTAL_FRONTEND_URL is not configured but portal registration was attempted. " +
            "Please set PORTAL_FRONTEND_URL in your environment variables."
        );
      }
      frontendUrl = config.portalFrontendUrl;
    }

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
        ? "Please verify your email address - Qarote"
        : "Verify your new email address - Qarote";

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
