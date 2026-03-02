import { render } from "@react-email/render";
import nodemailer from "nodemailer";
import type { ReactElement } from "react";
import { Resend } from "resend";

import { logger } from "@/core/logger";
import { retryWithBackoff } from "@/core/retry";

import { Sentry, setSentryContext } from "@/services/sentry";

import { emailConfig } from "@/config";
import { isCloudMode } from "@/config/deployment";

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string | null;
}

interface BaseEmailParams {
  to: string;
  subject: string;
  template: ReactElement;
  emailType: string;
  context?: Record<string, unknown>;
  attachments?: Array<{
    content?: string;
    path?: string;
    filename: string;
    contentId?: string;
    contentType?: string;
  }>;
}

/**
 * Core email service providing base functionality for all email operations
 * Supports both Resend API and SMTP
 */
export class CoreEmailService {
  private static resend: Resend | null = null;
  private static smtpTransporter: nodemailer.Transporter | null = null;

  private static initializeResend() {
    if (!this.resend && emailConfig.resendApiKey) {
      this.resend = new Resend(emailConfig.resendApiKey);
    }
    return this.resend;
  }

  private static initializeSMTP() {
    if (!this.smtpTransporter && emailConfig.smtp.host) {
      // Check if OAuth2 is configured
      const hasOAuth2 =
        emailConfig.smtp.oauth?.clientId &&
        emailConfig.smtp.oauth?.clientSecret &&
        emailConfig.smtp.oauth?.refreshToken;

      this.smtpTransporter = nodemailer.createTransport({
        host: emailConfig.smtp.host,
        port: emailConfig.smtp.port || 587,
        secure: (emailConfig.smtp.port || 587) === 465,
        service: emailConfig.smtp.service, // Optional: 'gmail', 'outlook', etc.
        auth: hasOAuth2
          ? {
              type: "OAuth2",
              user: emailConfig.smtp.user,
              clientId: emailConfig.smtp.oauth.clientId,
              clientSecret: emailConfig.smtp.oauth.clientSecret,
              refreshToken: emailConfig.smtp.oauth.refreshToken,
            }
          : emailConfig.smtp.user
            ? {
                user: emailConfig.smtp.user,
                pass: emailConfig.smtp.pass,
              }
            : undefined,
      });
    }
    return this.smtpTransporter;
  }

  /**
   * Send an email using a React template
   */
  static async sendEmail(params: BaseEmailParams): Promise<EmailResult> {
    const { to, subject, template, emailType, context = {} } = params;

    // Check if email is enabled
    if (!emailConfig.enabled) {
      logger.warn(
        {
          to,
          emailType,
        },
        `Email is disabled - skipping ${emailType} email`
      );
      return {
        success: false,
        error: "Email service is disabled",
      };
    }

    try {
      logger.info(
        {
          to,
          emailType,
          provider: emailConfig.provider,
          ...context,
        },
        `Sending ${emailType} email`
      );

      // Render the React email template to HTML
      const emailHtml = await render(template);

      // Choose provider based on configuration
      if (emailConfig.provider === "resend") {
        return await this.sendViaResend({
          to,
          subject,
          html: emailHtml,
          emailType,
          context,
        });
      } else if (emailConfig.provider === "smtp") {
        return await this.sendViaSMTP({
          to,
          subject,
          html: emailHtml,
          emailType,
          context,
        });
      } else {
        throw new Error(`Unknown email provider: ${emailConfig.provider}`);
      }
    } catch (error) {
      logger.error(error, `Error sending ${emailType} email`);

      // Capture email error in Sentry (if enabled)
      if (Sentry) {
        Sentry.withScope((scope) => {
          scope.setTag("component", "email");
          scope.setTag("email_type", emailType);
          scope.setContext("email_operation", {
            operation: `send${emailType}Email`,
            to,
            ...context,
          });
          Sentry.captureException(error);
        });
      }

      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  private static async sendViaResend(params: {
    to: string;
    subject: string;
    html: string;
    emailType: string;
    context: Record<string, unknown>;
  }): Promise<EmailResult> {
    const { to, subject, html, emailType, context } = params;

    // Cloud mode requires Resend
    if (isCloudMode() && !emailConfig.resendApiKey) {
      throw new Error("Resend API key is required for cloud deployments");
    }

    const resend = this.initializeResend();
    if (!resend) {
      throw new Error("Resend API key not configured");
    }

    // Use retry logic with exponential backoff for 5xx errors and timeouts
    const { data, error } = await retryWithBackoff(
      async () => {
        const result = await resend.emails.send({
          from: emailConfig.fromEmail,
          to,
          subject,
          html,
        });

        // If there's an error with a 5xx status code, throw it so retry can handle it
        if (result.error) {
          const errorObj = result.error as {
            message?: string;
            status?: number;
            statusCode?: number;
          };

          // Check if it's a 5xx error
          const statusCode = errorObj.status ?? errorObj.statusCode;
          if (typeof statusCode === "number" && statusCode >= 500) {
            throw result.error;
          }

          // For 4xx errors, return as-is (don't retry)
          return result;
        }

        return result;
      },
      {
        maxRetries: 3,
        retryDelayMs: 1_000,
        timeoutMs: 10_000,
      },
      "resend"
    );

    if (error) {
      logger.error(error, `Failed to send ${emailType} email via Resend`);
      return {
        success: false,
        error:
          (error as { message?: string }).message || "Failed to send email",
      };
    }

    // Set Sentry context for email tracking (if enabled)
    if (Sentry) {
      setSentryContext("email_sent", {
        type: emailType,
        messageId: data?.id,
        to,
        provider: "resend",
        ...context,
      });
    }

    logger.info(
      {
        messageId: data?.id,
        to,
        ...context,
      },
      `${emailType} email sent successfully via Resend`
    );

    return {
      success: true,
      messageId: data?.id,
    };
  }

  private static async sendViaSMTP(params: {
    to: string;
    subject: string;
    html: string;
    emailType: string;
    context: Record<string, unknown>;
  }): Promise<EmailResult> {
    const { to, subject, html, emailType, context } = params;

    if (!emailConfig.smtp.host) {
      throw new Error("SMTP host not configured");
    }

    const transporter = this.initializeSMTP();
    if (!transporter) {
      throw new Error("SMTP transporter not initialized");
    }

    const info = await transporter.sendMail({
      from: emailConfig.fromEmail,
      to,
      subject,
      html,
    });

    // Set Sentry context for email tracking (if enabled)
    if (Sentry) {
      setSentryContext("email_sent", {
        type: emailType,
        messageId: info.messageId,
        to,
        provider: "smtp",
        ...context,
      });
    }

    logger.info(
      {
        messageId: info.messageId,
        to,
        ...context,
      },
      `${emailType} email sent successfully via SMTP`
    );

    return {
      success: true,
      messageId: info.messageId,
    };
  }

  static getConfig() {
    return {
      frontendUrl: emailConfig.frontendUrl,
      portalFrontendUrl: emailConfig.portalFrontendUrl,
      fromEmail: emailConfig.fromEmail,
    };
  }
}
