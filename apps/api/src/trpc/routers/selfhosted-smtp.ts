/**
 * Self-Hosted SMTP Router
 * Allows self-hosted admins to configure, test, and manage SMTP/email settings via the UI
 * Settings are stored in SystemSetting (key: "smtp_config") and take priority over env vars
 */

import { TRPCError } from "@trpc/server";
import nodemailer from "nodemailer";
import { z } from "zod/v4";

import {
  CoreEmailService,
  type SmtpEffectiveConfig,
} from "@/services/email/core-email.service";

import { emailConfig } from "@/config";
import { isSelfHostedMode } from "@/config/deployment";

import { rateLimitedAdminProcedure, router } from "@/trpc/trpc";

const REDACTED = "••••••••";

/** Admin procedure that only runs in self-hosted mode */
const selfHostedProcedure = rateLimitedAdminProcedure.use(async (opts) => {
  if (!isSelfHostedMode()) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "SMTP settings are only available for self-hosted instances",
    });
  }
  return opts.next();
});

const smtpSettingsSchema = z.object({
  enabled: z.boolean(),
  host: z.string().optional(),
  port: z.number().optional(),
  user: z.string().optional(),
  pass: z.string().optional(),
  fromEmail: z.string().optional(),
  service: z.string().optional(),
  oauthClientId: z.string().optional(),
  oauthClientSecret: z.string().optional(),
  oauthRefreshToken: z.string().optional(),
});

export const selfhostedSmtpRouter = router({
  /**
   * Get current SMTP settings
   * Returns DB settings if present, otherwise env-var derived settings
   * Secrets are always redacted
   */
  getSettings: selfHostedProcedure.query(async ({ ctx }) => {
    const setting = await ctx.prisma.systemSetting.findUnique({
      where: { key: "smtp_config" },
    });

    if (setting) {
      try {
        const parsed = smtpSettingsSchema.safeParse(JSON.parse(setting.value));
        if (parsed.success) {
          return {
            source: "database" as const,
            ...parsed.data,
            pass: parsed.data.pass ? REDACTED : undefined,
            oauthClientSecret: parsed.data.oauthClientSecret
              ? REDACTED
              : undefined,
            oauthRefreshToken: parsed.data.oauthRefreshToken
              ? REDACTED
              : undefined,
          };
        }
        ctx.logger.warn(
          { error: parsed.error },
          "Malformed SMTP config in database, falling back to env vars"
        );
      } catch {
        ctx.logger.warn(
          "Invalid JSON in SMTP config database row, falling back to env vars"
        );
      }
    }

    // Fall back to env-var config
    return {
      source: "environment" as const,
      enabled: emailConfig.enabled,
      host: emailConfig.smtp.host,
      port: emailConfig.smtp.port,
      user: emailConfig.smtp.user,
      pass: emailConfig.smtp.pass ? REDACTED : undefined,
      fromEmail: emailConfig.fromEmail,
      service: emailConfig.smtp.service,
      oauthClientId: emailConfig.smtp.oauth?.clientId,
      oauthClientSecret: emailConfig.smtp.oauth?.clientSecret
        ? REDACTED
        : undefined,
      oauthRefreshToken: emailConfig.smtp.oauth?.refreshToken
        ? REDACTED
        : undefined,
    };
  }),

  /**
   * Update SMTP settings
   * Stores in SystemSetting and reinitializes the email service
   * If secrets are the redacted placeholder, preserve the existing values
   */
  updateSettings: selfHostedProcedure
    .input(smtpSettingsSchema)
    .mutation(async ({ input, ctx }) => {
      // Preserve existing secrets if the redacted placeholder was sent
      let pass = input.pass;
      let oauthClientSecret = input.oauthClientSecret;
      let oauthRefreshToken = input.oauthRefreshToken;

      if (
        pass === REDACTED ||
        oauthClientSecret === REDACTED ||
        oauthRefreshToken === REDACTED
      ) {
        // Try to get existing secrets from DB first, then env
        const existing = await ctx.prisma.systemSetting.findUnique({
          where: { key: "smtp_config" },
        });

        let existingConfig: Partial<SmtpEffectiveConfig> = {};
        if (existing) {
          try {
            existingConfig = JSON.parse(existing.value);
          } catch {
            // Malformed — fall through to env
          }
        }

        if (pass === REDACTED) {
          pass = existingConfig.pass || emailConfig.smtp.pass;
        }
        if (oauthClientSecret === REDACTED) {
          oauthClientSecret =
            existingConfig.oauthClientSecret ||
            emailConfig.smtp.oauth?.clientSecret;
        }
        if (oauthRefreshToken === REDACTED) {
          oauthRefreshToken =
            existingConfig.oauthRefreshToken ||
            emailConfig.smtp.oauth?.refreshToken;
        }
      }

      const configToStore = {
        ...input,
        pass,
        oauthClientSecret,
        oauthRefreshToken,
      };

      await ctx.prisma.systemSetting.upsert({
        where: { key: "smtp_config" },
        update: { value: JSON.stringify(configToStore) },
        create: { key: "smtp_config", value: JSON.stringify(configToStore) },
      });

      // Reinitialize email service with new config
      CoreEmailService.reinitialize();

      ctx.logger.info("SMTP settings updated successfully");

      return { success: true };
    }),

  /**
   * Test SMTP connection
   * Verifies the SMTP handshake and optionally sends a test email
   */
  testConnection: selfHostedProcedure
    .input(z.object({ recipientEmail: z.string().check(z.email()) }))
    .mutation(async ({ input, ctx }) => {
      // Load the effective config (DB → env fallback)
      const cfg = await CoreEmailService.loadEffectiveConfig();

      if (!cfg.host) {
        return {
          success: false,
          error: "SMTP host is not configured",
        };
      }

      const hasOAuth2 =
        cfg.oauthClientId && cfg.oauthClientSecret && cfg.oauthRefreshToken;

      const transporter = nodemailer.createTransport({
        host: cfg.host,
        port: cfg.port || 587,
        secure: (cfg.port || 587) === 465,
        service: cfg.service,
        auth: hasOAuth2
          ? {
              type: "OAuth2",
              user: cfg.user,
              clientId: cfg.oauthClientId,
              clientSecret: cfg.oauthClientSecret,
              refreshToken: cfg.oauthRefreshToken,
            }
          : cfg.user
            ? {
                user: cfg.user,
                pass: cfg.pass,
              }
            : undefined,
      });

      try {
        // Verify SMTP connection
        await transporter.verify();

        // Send a test email
        await transporter.sendMail({
          from: cfg.fromEmail || "noreply@localhost",
          to: input.recipientEmail,
          subject: "Qarote SMTP Test",
          html: "<p>This is a test email from Qarote. Your SMTP configuration is working correctly.</p>",
        });

        ctx.logger.info(
          { to: input.recipientEmail },
          "SMTP test email sent successfully"
        );

        return { success: true };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "SMTP connection failed",
        };
      } finally {
        transporter.close();
      }
    }),
});
