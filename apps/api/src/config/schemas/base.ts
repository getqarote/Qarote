import { z } from "zod/v4";

/**
 * Base schema for all deployment modes
 * Contains configuration that is required regardless of deployment mode
 */
export const baseSchema = z.object({
  // Server Configuration
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .describe("development"),
  PORT: z.coerce.number().int().positive(),
  HOST: z.string().describe("localhost"),

  // Logging
  LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).describe("info"),

  // Security - ALWAYS required
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  ENCRYPTION_KEY: z
    .string()
    .min(32, "ENCRYPTION_KEY must be at least 32 characters"),

  // Database - ALWAYS required
  DATABASE_URL: z.string().startsWith("postgres://", {
    message: "DATABASE_URL must start with 'postgres://'",
  }),

  // CORS
  CORS_ORIGIN: z.string().describe("*"),

  // Alert Monitoring Configuration
  ALERT_CHECK_INTERVAL_MS: z.coerce.number().int().positive().default(300000), // 5 minutes
  ALERT_CHECK_CONCURRENCY: z.coerce.number().int().positive().default(10),

  // NPM package version (for Sentry releases)
  npm_package_version: z.string().describe("1.0.0"),
});
