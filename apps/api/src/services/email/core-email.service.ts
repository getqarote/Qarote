import { render } from "@react-email/render";
import nodemailer from "nodemailer";
import type { ReactElement } from "react";
import { Resend } from "resend";

import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";
import { retryWithBackoff } from "@/core/retry";

import { Sentry, setSentryContext } from "@/services/sentry";

import { emailConfig } from "@/config";
import { isCloudMode } from "@/config/deployment";

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string | null;
}

/** Shape of SMTP settings stored in SystemSetting (key: "smtp_config") */
export interface SmtpEffectiveConfig {
  enabled: boolean;
  fromEmail: string;
  host?: string;
  port: number;
  user?: string;
  pass?: string;
  service?: string;
  oauthClientId?: string;
  oauthClientSecret?: string;
  oauthRefreshToken?: string;
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
  /** Cached effective config from DB; null means "not loaded yet" */
  private static effectiveSmtpConfig: SmtpEffectiveConfig | null = null;

  /**
   * Reset SMTP transporter so the next send recreates it from current config.
   * Called after admin UI saves new SMTP settings.
   */
  static reinitialize() {
    this.smtpTransporter = null;
    this.effectiveSmtpConfig = null;
    logger.info("SMTP transporter reset — will reload config on next send");
  }

  /**
   * Load SMTP config from SystemSetting (key: "smtp_config"), falling back to
   * the env-var-based `emailConfig`. Result is cached until `reinitialize()`.
   */
  static async loadEffectiveConfig(): Promise<SmtpEffectiveConfig> {
    if (this.effectiveSmtpConfig) return this.effectiveSmtpConfig;

    try {
      const setting = await prisma.systemSetting.findUnique({
        where: { key: "smtp_config" },
      });
      if (setting) {
        const parsed = JSON.parse(
          setting.value
        ) as Partial<SmtpEffectiveConfig>;
        if (parsed && typeof parsed.enabled === "boolean") {
          this.effectiveSmtpConfig = {
            enabled: parsed.enabled,
            fromEmail: parsed.fromEmail || emailConfig.fromEmail,
            host: parsed.host,
            port: parsed.port ?? 587,
            user: parsed.user,
            pass: parsed.pass,
            service: parsed.service,
            oauthClientId: parsed.oauthClientId,
            oauthClientSecret: parsed.oauthClientSecret,
            oauthRefreshToken: parsed.oauthRefreshToken,
          };
          return this.effectiveSmtpConfig;
        }
      }
    } catch {
      // DB not ready or malformed — fall through to env config
    }

    // Fall back to env-var config
    this.effectiveSmtpConfig = {
      enabled: emailConfig.enabled,
      fromEmail: emailConfig.fromEmail,
      host: emailConfig.smtp.host,
      port: emailConfig.smtp.port || 587,
      user: emailConfig.smtp.user,
      pass: emailConfig.smtp.pass,
      service: emailConfig.smtp.service,
      oauthClientId: emailConfig.smtp.oauth?.clientId,
      oauthClientSecret: emailConfig.smtp.oauth?.clientSecret,
      oauthRefreshToken: emailConfig.smtp.oauth?.refreshToken,
    };
    return this.effectiveSmtpConfig;
  }

  private static initializeResend() {
    if (!this.resend && emailConfig.resendApiKey) {
      this.resend = new Resend(emailConfig.resendApiKey);
    }
    return this.resend;
  }

  private static async initializeSMTP(cfg?: SmtpEffectiveConfig) {
    if (this.smtpTransporter) return this.smtpTransporter;

    const smtp = cfg ?? (await this.loadEffectiveConfig());
    if (!smtp.host) return null;

    const hasOAuth2 =
      smtp.oauthClientId && smtp.oauthClientSecret && smtp.oauthRefreshToken;

    this.smtpTransporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port || 587,
      secure: (smtp.port || 587) === 465,
      service: smtp.service,
      auth: hasOAuth2
        ? {
            type: "OAuth2",
            user: smtp.user,
            clientId: smtp.oauthClientId,
            clientSecret: smtp.oauthClientSecret,
            refreshToken: smtp.oauthRefreshToken,
          }
        : smtp.user
          ? {
              user: smtp.user,
              pass: smtp.pass,
            }
          : undefined,
    });
    return this.smtpTransporter;
  }

  /**
   * Send an email using a React template
   */
  static async sendEmail(params: BaseEmailParams): Promise<EmailResult> {
    const { to, subject, template, emailType, context = {} } = params;

    // Load effective config (DB → env fallback) for SMTP-based sending
    const effectiveCfg = await this.loadEffectiveConfig();

    // Check if email is enabled — effectiveCfg is authoritative (DB-first, env fallback)
    if (!effectiveCfg.enabled) {
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
          effectiveCfg,
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
    effectiveCfg: SmtpEffectiveConfig;
  }): Promise<EmailResult> {
    const { to, subject, html, emailType, context, effectiveCfg } = params;

    if (!effectiveCfg.host) {
      throw new Error("SMTP host not configured");
    }

    const transporter = await this.initializeSMTP(effectiveCfg);
    if (!transporter) {
      throw new Error("SMTP transporter not initialized");
    }

    const info = await transporter.sendMail({
      from: effectiveCfg.fromEmail,
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
