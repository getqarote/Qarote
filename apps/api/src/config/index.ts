import path from "node:path";

import dotenv from "dotenv";
import { z } from "zod/v4";

// Load .env file from the api directory (where process.cwd() points when running from apps/api)
dotenv.config({ path: path.join(process.cwd(), ".env") });

// Environment validation schema
const envSchema = z.object({
  // Server Configuration
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .describe("development"),
  PORT: z.coerce.number().int().positive(),
  HOST: z.string().describe("localhost"),
  NODE_ID: z.string().describe("Unique identifier for this node"),

  // Deployment Mode
  DEPLOYMENT_MODE: z
    .enum(["cloud", "community", "enterprise"])
    .describe("cloud")
    .default("cloud"),

  // Logging
  LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).describe("info"),

  // Security
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  ENCRYPTION_KEY: z
    .string()
    .min(32, "ENCRYPTION_KEY must be at least 32 characters"),

  // Database
  DATABASE_URL: z.string().startsWith("postgres://", {
    message: "DATABASE_URL must start with 'postgres://'",
  }),

  // CORS
  CORS_ORIGIN: z.string().describe("*"),

  // Email Configuration
  RESEND_API_KEY: z.string().optional(),
  FROM_EMAIL: z.email().describe("noreply@qarote.io"),
  FRONTEND_URL: z.url("FRONTEND_URL must be a valid URL"),
  ENABLE_EMAIL: z.coerce.boolean().default(true),
  EMAIL_PROVIDER: z.enum(["resend", "smtp"]).default("resend"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),

  // Stripe Configuration (optional - only required for cloud mode)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // Stripe Price IDs (optional - only required for cloud mode)
  STRIPE_DEVELOPER_MONTHLY_PRICE_ID: z.string().optional(),
  STRIPE_DEVELOPER_YEARLY_PRICE_ID: z.string().optional(),
  STRIPE_ENTERPRISE_MONTHLY_PRICE_ID: z.string().optional(),
  STRIPE_ENTERPRISE_YEARLY_PRICE_ID: z.string().optional(),

  // Sentry Configuration
  SENTRY_DSN: z.string().optional(),
  SENTRY_ENABLED: z.coerce.boolean().default(false),
  ENABLE_SENTRY: z.coerce.boolean().default(true),

  // Google OAuth Configuration
  GOOGLE_CLIENT_ID: z.string().optional(),
  ENABLE_OAUTH: z.coerce.boolean().default(true),

  // License Configuration (for enterprise/self-hosted)
  LICENSE_KEY: z.string().optional(),
  LICENSE_VALIDATION_URL: z.string().optional(),
  LICENSE_FILE_PATH: z.string().optional(),
  LICENSE_PUBLIC_KEY: z.string().optional(),
  LICENSE_PRIVATE_KEY: z.string().optional(),

  // Notion Configuration
  NOTION_API_KEY: z.string().optional(),
  NOTION_DATABASE_ID: z.string().optional(),
  NOTION_SYNC_ENABLED: z.coerce.boolean().default(false),
  ENABLE_NOTION: z.coerce.boolean().default(false),

  // Alert Monitoring Configuration
  ALERT_CHECK_INTERVAL_MS: z.coerce.number().int().positive().default(300000), // 5 minutes
  ALERT_CHECK_CONCURRENCY: z.coerce.number().int().positive().default(10),

  // NPM package version (for Sentry releases)
  npm_package_version: z.string().describe("1.0.0"),
});

// Parse and validate environment variables
function parseConfig() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues.map(
        (issue) => `${issue.path.join(".")}: ${issue.message}`
      );
      throw new Error(
        `Configuration validation failed:\n${errorMessages.join("\n")}`
      );
    }
    throw error;
  }
}

// Export validated config
export const config = parseConfig();

// Helper functions to check configuration
export const isDevelopment = () => config.NODE_ENV === "development";
export const isProduction = () => config.NODE_ENV === "production";

// Specific config getters with validation
export const serverConfig = {
  port: config.PORT,
  host: config.HOST,
  nodeEnv: config.NODE_ENV,
} as const;

export const authConfig = {
  jwtSecret: config.JWT_SECRET,
  encryptionKey: config.ENCRYPTION_KEY,
} as const;

export const corsConfig = {
  origin: config.CORS_ORIGIN,
} as const;

export const emailConfig = {
  resendApiKey: config.RESEND_API_KEY,
  fromEmail: config.FROM_EMAIL,
  frontendUrl: config.FRONTEND_URL,
  enabled: config.ENABLE_EMAIL,
  provider: config.EMAIL_PROVIDER,
  smtp: {
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    user: config.SMTP_USER,
    pass: config.SMTP_PASS,
  },
} as const;

export const stripeConfig = {
  secretKey: config.STRIPE_SECRET_KEY,
  webhookSecret: config.STRIPE_WEBHOOK_SECRET,
  priceIds: {
    developer: {
      monthly: config.STRIPE_DEVELOPER_MONTHLY_PRICE_ID,
      yearly: config.STRIPE_DEVELOPER_YEARLY_PRICE_ID,
    },
    enterprise: {
      monthly: config.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID, // Reuse business prices for enterprise
      yearly: config.STRIPE_ENTERPRISE_YEARLY_PRICE_ID, // Reuse business prices for enterprise
    },
  },
} as const;

export const logConfig = {
  level: config.LOG_LEVEL,
  isDevelopment: isDevelopment(),
} as const;

export const sentryConfig = {
  dsn: config.SENTRY_DSN,
  enabled: config.SENTRY_ENABLED && config.ENABLE_SENTRY,
  environment: config.NODE_ENV,
  release: `qarote-backend@${config.npm_package_version || "unknown"}`,
  tracesSampleRate: isProduction() ? 0.1 : 1.0,
  profilesSampleRate: isProduction() ? 0.05 : 1.0,
} as const;

export const googleConfig = {
  clientId: config.GOOGLE_CLIENT_ID,
  enabled: config.ENABLE_OAUTH,
} as const;

export const licenseConfig = {
  licenseKey: config.LICENSE_KEY,
  validationUrl: config.LICENSE_VALIDATION_URL || "https://api.qarote.io",
  licenseFilePath: config.LICENSE_FILE_PATH || "./license.json",
  publicKey: config.LICENSE_PUBLIC_KEY,
  privateKey: config.LICENSE_PRIVATE_KEY,
} as const;

export const notionConfig = {
  apiKey: config.NOTION_API_KEY,
  databaseId: config.NOTION_DATABASE_ID,
  syncEnabled: config.NOTION_SYNC_ENABLED && config.ENABLE_NOTION,
  enabled: config.ENABLE_NOTION,
} as const;

export const alertConfig = {
  checkIntervalMs: config.ALERT_CHECK_INTERVAL_MS,
  concurrency: config.ALERT_CHECK_CONCURRENCY,
} as const;

export const deploymentConfig = {
  mode: config.DEPLOYMENT_MODE,
  isCloud: () => config.DEPLOYMENT_MODE === "cloud",
  isCommunity: () => config.DEPLOYMENT_MODE === "community",
  isEnterprise: () => config.DEPLOYMENT_MODE === "enterprise",
  isSelfHosted: () =>
    config.DEPLOYMENT_MODE === "enterprise" ||
    config.DEPLOYMENT_MODE === "community",
} as const;
