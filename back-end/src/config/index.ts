import path from "node:path";
import dotenv from "dotenv";
import { z } from "zod/v4";

dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });

// Environment validation schema
const envSchema = z.object({
  // Server Configuration
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .describe("development"),
  PORT: z.coerce.number().int().positive(),
  HOST: z.string().describe("localhost"),
  NODE_ID: z.string().describe("Unique identifier for this node"),

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
  RESEND_API_KEY: z.string(),
  FROM_EMAIL: z.email().describe("noreply@rabbithq.com"),
  FRONTEND_URL: z.url("FRONTEND_URL must be a valid URL"),

  // Stripe Configuration
  STRIPE_SECRET_KEY: z.string().describe("sk_test_... or sk_live_..."),
  STRIPE_WEBHOOK_SECRET: z.string().describe("sk_test_... or sk_live_..."),

  // Stripe Price IDs
  STRIPE_DEVELOPER_MONTHLY_PRICE_ID: z.string(),
  STRIPE_DEVELOPER_YEARLY_PRICE_ID: z.string(),
  STRIPE_ENTERPRISE_MONTHLY_PRICE_ID: z.string(),
  STRIPE_ENTERPRISE_YEARLY_PRICE_ID: z.string(),

  // Sentry Configuration
  SENTRY_DSN: z.string(),
  SENTRY_ENABLED: z.coerce.boolean(),

  // Google OAuth Configuration
  GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is required"),

  // Discourse Configuration
  DISCOURSE_SSO_SECRET: z.string().min(1, "DISCOURSE_SSO_SECRET is required"),
  DISCOURSE_URL: z.url("DISCOURSE_URL must be a valid URL"),

  // Notion Configuration
  NOTION_API_KEY: z.string().min(1, "NOTION_API_KEY is required"),
  NOTION_DATABASE_ID: z.string().min(1, "NOTION_DATABASE_ID is required"),
  NOTION_SYNC_ENABLED: z.coerce
    .boolean()
    .describe("Enable Notion sync (set to false for staging)"),

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

// Export types for TypeScript
export type Config = z.infer<typeof envSchema>;

// Helper functions to check configuration
export const isDevelopment = () => config.NODE_ENV === "development";
export const isProduction = () => config.NODE_ENV === "production";
export const isTest = () => config.NODE_ENV === "test";

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

export const databaseConfig = {
  url: config.DATABASE_URL,
} as const;

export const corsConfig = {
  origin: config.CORS_ORIGIN,
} as const;

export const emailConfig = {
  resendApiKey: config.RESEND_API_KEY,
  fromEmail: config.FROM_EMAIL,
  frontendUrl: config.FRONTEND_URL,
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
  enabled: config.SENTRY_ENABLED,
  environment: config.NODE_ENV,
  release: `rabbithq-backend@${config.npm_package_version || "unknown"}`,
  tracesSampleRate: isProduction() ? 0.1 : 1.0,
  profilesSampleRate: isProduction() ? 0.05 : 1.0,
} as const;

export const googleConfig = {
  clientId: config.GOOGLE_CLIENT_ID,
} as const;

export const discourseConfig = {
  ssoSecret: config.DISCOURSE_SSO_SECRET,
  url: config.DISCOURSE_URL,
} as const;

export const notionConfig = {
  apiKey: config.NOTION_API_KEY,
  databaseId: config.NOTION_DATABASE_ID,
  syncEnabled: config.NOTION_SYNC_ENABLED,
} as const;
