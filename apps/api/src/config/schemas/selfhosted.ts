import { z } from "zod/v4";

import { baseSchema } from "./base.js";

/**
 * Self-hosted base schema
 * Shared by both Community and Enterprise modes
 * Most third-party services are optional
 */
export const selfhostedBaseSchema = baseSchema.extend({
  // Email Configuration - All optional with sensible defaults
  ENABLE_EMAIL: z.coerce.boolean().default(false),
  EMAIL_PROVIDER: z.literal("smtp").default("smtp"),
  FROM_EMAIL: z
    .email()
    .optional()
    .default("noreply@localhost")
    .describe("Email sender address - only needed if ENABLE_EMAIL=true"),
  FRONTEND_URL: z
    .url()
    .optional()
    .default("http://localhost:8080")
    .describe(
      "Frontend URL for email links - only needed if ENABLE_EMAIL=true"
    ),
  PORTAL_FRONTEND_URL: z
    .url()
    .optional()
    .describe("Portal frontend URL - only needed if ENABLE_EMAIL=true"),

  // SMTP Configuration - Optional (only email provider for self-hosted)
  // Basic Authentication (simple):
  SMTP_HOST: z.string().optional().describe("SMTP server hostname"),
  SMTP_PORT: z.coerce.number().optional().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  // OAuth2 Authentication (recommended for production):
  SMTP_SERVICE: z
    .string()
    .optional()
    .describe(
      "SMTP service name for OAuth2 (e.g., 'gmail', 'outlook'). See https://nodemailer.com/smtp/oauth2/"
    ),
  SMTP_OAUTH_CLIENT_ID: z
    .string()
    .optional()
    .describe("OAuth2 client ID from your email provider"),
  SMTP_OAUTH_CLIENT_SECRET: z
    .string()
    .optional()
    .describe("OAuth2 client secret from your email provider"),
  SMTP_OAUTH_REFRESH_TOKEN: z
    .string()
    .optional()
    .describe("OAuth2 refresh token from your email provider"),

  // Stripe Configuration - Not available for self-hosted
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_DEVELOPER_MONTHLY_PRICE_ID: z.string().optional(),
  STRIPE_DEVELOPER_YEARLY_PRICE_ID: z.string().optional(),
  STRIPE_ENTERPRISE_MONTHLY_PRICE_ID: z.string().optional(),
  STRIPE_ENTERPRISE_YEARLY_PRICE_ID: z.string().optional(),

  // Sentry Configuration - Optional
  SENTRY_DSN: z.string().optional(),
  SENTRY_ENABLED: z.coerce.boolean().default(false),

  // Google OAuth - Not available for self-hosted (email/password only)
  GOOGLE_CLIENT_ID: z.string().optional(),
  ENABLE_OAUTH: z.coerce.boolean().default(false),

  // Notion Configuration - Optional
  NOTION_API_KEY: z.string().optional(),
  NOTION_DATABASE_ID: z.string().optional(),
  NOTION_SYNC_ENABLED: z.coerce.boolean().default(false),
  ENABLE_NOTION: z.coerce.boolean().default(false),
});
