import { z } from "zod/v4";

import { baseSchema } from "./base.js";

/**
 * Cloud deployment mode schema
 * For SaaS deployments - requires all third-party services
 */
export const cloudSchema = baseSchema.extend({
  // Deployment Mode
  DEPLOYMENT_MODE: z.literal("cloud"),

  // Email Configuration - REQUIRED for cloud
  RESEND_API_KEY: z
    .string()
    .min(1, "RESEND_API_KEY is required for cloud mode"),
  FROM_EMAIL: z.email().describe("noreply@qarote.io"),
  FRONTEND_URL: z.url("FRONTEND_URL must be a valid URL"),
  API_URL: z
    .url("API_URL must be a valid URL")
    .describe("Backend API URL for OAuth callbacks"),
  PORTAL_FRONTEND_URL: z.url("PORTAL_FRONTEND_URL must be a valid URL"),
  ENABLE_EMAIL: z.coerce.boolean().default(true),
  EMAIL_PROVIDER: z.enum(["resend", "smtp"]).default("resend"),

  // SMTP Configuration - Optional even in cloud (in case they want SMTP instead of Resend)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),

  // Stripe Configuration - REQUIRED for cloud
  STRIPE_SECRET_KEY: z
    .string()
    .min(1, "STRIPE_SECRET_KEY is required for cloud mode"),
  STRIPE_WEBHOOK_SECRET: z
    .string()
    .min(1, "STRIPE_WEBHOOK_SECRET is required for cloud mode"),

  // Stripe Price IDs - REQUIRED for cloud
  STRIPE_DEVELOPER_MONTHLY_PRICE_ID: z
    .string()
    .min(1, "STRIPE_DEVELOPER_MONTHLY_PRICE_ID is required for cloud mode"),
  STRIPE_DEVELOPER_YEARLY_PRICE_ID: z
    .string()
    .min(1, "STRIPE_DEVELOPER_YEARLY_PRICE_ID is required for cloud mode"),
  STRIPE_ENTERPRISE_MONTHLY_PRICE_ID: z
    .string()
    .min(1, "STRIPE_ENTERPRISE_MONTHLY_PRICE_ID is required for cloud mode"),
  STRIPE_ENTERPRISE_YEARLY_PRICE_ID: z
    .string()
    .min(1, "STRIPE_ENTERPRISE_YEARLY_PRICE_ID is required for cloud mode"),

  // Sentry Configuration - REQUIRED for cloud
  SENTRY_DSN: z.string().min(1, "SENTRY_DSN is required for cloud mode"),
  SENTRY_ENABLED: z.coerce.boolean().default(true),

  // Google OAuth Configuration - REQUIRED for cloud
  GOOGLE_CLIENT_ID: z
    .string()
    .min(1, "GOOGLE_CLIENT_ID is required for cloud mode"),
  ENABLE_OAUTH: z.coerce.boolean().default(true),

  // License Configuration - For cloud to generate licenses for customers
  LICENSE_PRIVATE_KEY: z
    .string()
    .min(
      1,
      "LICENSE_PRIVATE_KEY is required for cloud mode to generate licenses"
    ),
  LICENSE_PUBLIC_KEY: z.string().optional(),
  LICENSE_FILE_PATH: z.string().optional(),
  LICENSE_KEY: z.string().optional(),
  LICENSE_VALIDATION_URL: z.string().optional(),

  // Notion Configuration - Optional
  NOTION_API_KEY: z.string().optional(),
  NOTION_DATABASE_ID: z.string().optional(),
  NOTION_SYNC_ENABLED: z.coerce.boolean().default(false),
  ENABLE_NOTION: z.coerce.boolean().default(false),
});
