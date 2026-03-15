import { CoreEmailService, EmailResult } from "./core-email.service";
import { EmailVerification } from "./templates/email-verification";
import { InvitationEmail } from "./templates/invitation-email";
import { OrgInvitationEmail } from "./templates/org-invitation-email";
import WelcomeEmail from "./templates/welcome-email";

import { UserPlan } from "@/generated/prisma/client";
import { tEmail } from "@/i18n";

interface SendInvitationEmailParams {
  to: string;
  inviterName: string;
  inviterEmail: string;
  workspaceName: string;
  invitationToken: string;
  plan: UserPlan;
  locale?: string;
}

interface SendWelcomeEmailParams {
  to: string;
  name: string;
  workspaceName?: string;
  plan: UserPlan;
  locale?: string;
}

interface SendOrgInvitationEmailParams {
  to: string;
  inviterName: string;
  inviterEmail: string;
  orgName: string;
  invitationToken: string;
  locale?: string;
}

interface SendVerificationEmailParams {
  to: string;
  userName?: string;
  verificationToken: string;
  type: "SIGNUP" | "EMAIL_CHANGE";
  sourceApp?: "app" | "portal";
  locale?: string;
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
      locale = "en",
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
      subject: tEmail(locale, "subjects.invitedToWorkspace", { workspaceName }),
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
   * Send an organization invitation email using React Email templates
   */
  static async sendOrgInvitationEmail(
    params: SendOrgInvitationEmailParams
  ): Promise<EmailResult> {
    const {
      to,
      inviterName,
      inviterEmail,
      orgName,
      invitationToken,
      locale: _locale = "en",
    } = params;

    const { frontendUrl } = CoreEmailService.getConfig();

    const template = OrgInvitationEmail({
      inviterName,
      inviterEmail,
      orgName,
      invitationToken,
      frontendUrl,
    });

    return CoreEmailService.sendEmail({
      to,
      subject: `You've been invited to join ${orgName} on Qarote`,
      template,
      emailType: "org-invitation",
      context: {
        inviterEmail,
        orgName,
      },
    });
  }

  /**
   * Send a welcome email to newly registered users
   */
  static async sendWelcomeEmail(
    params: SendWelcomeEmailParams
  ): Promise<EmailResult> {
    const { to, name, workspaceName, plan, locale = "en" } = params;

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
      subject: tEmail(locale, "subjects.welcome", { name }),
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
    const {
      to,
      userName,
      verificationToken,
      type,
      sourceApp,
      locale = "en",
    } = params;

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
        ? tEmail(locale, "subjects.verifyEmailSignup")
        : tEmail(locale, "subjects.verifyEmailChange");

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
