import type { ReactElement } from "react";
import { render } from "@react-email/render";
import { Resend } from "resend";
import { logger } from "@/core/logger";
import { Sentry, setSentryContext } from "@/core/sentry";
import { emailConfig } from "@/config";

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface BaseEmailParams {
  to: string;
  subject: string;
  template: ReactElement;
  emailType: string;
  context?: Record<string, any>;
}

/**
 * Core email service providing base functionality for all email operations
 */
export class CoreEmailService {
  private static resend = new Resend(emailConfig.resendApiKey);

  /**
   * Send an email using a React template
   */
  static async sendEmail(params: BaseEmailParams): Promise<EmailResult> {
    const { to, subject, template, emailType, context = {} } = params;

    try {
      logger.info(`Sending ${emailType} email`, {
        to,
        emailType,
        ...context,
      });

      // Render the React email template to HTML
      const emailHtml = await render(template);

      // Send the email using Resend
      const { data, error } = await this.resend.emails.send({
        from: emailConfig.fromEmail,
        to,
        subject,
        html: emailHtml,
      });

      if (error) {
        logger.error(error, `Failed to send ${emailType} email`);

        // Capture email error in Sentry
        Sentry.withScope((scope) => {
          scope.setTag("component", "email");
          scope.setTag("email_type", emailType);
          scope.setContext("email_operation", {
            operation: `send${emailType}Email`,
            to,
            error: error.message,
            ...context,
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
        type: emailType,
        messageId: data?.id,
        to,
        ...context,
      });

      logger.info(`${emailType} email sent successfully`, {
        messageId: data?.id,
        to,
        ...context,
      });

      return {
        success: true,
        messageId: data?.id,
      };
    } catch (error) {
      logger.error(error, `Error sending ${emailType} email`);

      // Capture email error in Sentry
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

      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  static getConfig() {
    return {
      frontendUrl: emailConfig.frontendUrl,
      fromEmail: emailConfig.fromEmail,
    };
  }
}
