import { z } from "zod/v4";

/**
 * Base schema for all deployment modes
 * Contains configuration that is required regardless of deployment mode
 */
export const baseSchema = z
  .object({
    // Server Configuration
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("production"),
    PORT: z.coerce.number().int().positive(),
    HOST: z.string().describe("localhost"),

    // Logging
    LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),

    // Security - ALWAYS required
    JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
    ENCRYPTION_KEY: z
      .string()
      .min(32, "ENCRYPTION_KEY must be at least 32 characters"),

    // Database - ALWAYS required
    DATABASE_URL: z
      .string()
      .refine(
        (s) => s.startsWith("postgres://") || s.startsWith("postgresql://"),
        {
          message:
            "DATABASE_URL must start with 'postgres://' or 'postgresql://'",
        }
      ),

    // CORS
    CORS_ORIGIN: z.string().default("*"),

    // Alert Monitoring Configuration
    ALERT_CHECK_INTERVAL_MS: z.coerce.number().int().positive().default(300000), // 5 minutes
    ALERT_CHECK_CONCURRENCY: z.coerce.number().int().positive().default(10),

    // Metrics Polling Configuration
    METRICS_POLL_INTERVAL_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(300_000),
    METRICS_POLL_CONCURRENCY: z.coerce.number().int().positive().default(5),
    METRICS_PER_SERVER_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(30_000),

    // Incident diagnosis: a finding that hasn't re-fired for this long is
    // marked resolved on the next diagnose pass. Defaults to one poll cycle
    // (5 min). Operators wanting findings to linger (e.g. a long-lived demo
    // showcasing seeded findings) can raise it.
    DIAGNOSIS_RESOLVE_TTL_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(300_000),

    // Demo mode RabbitMQ connection. Only set when DEMO_MODE=true; bootstrap-demo
    // seeds a server connection pointing at the demo broker container. Host/user/
    // pass are optional (their absence skips the seed); ports/vhost have defaults.
    DEMO_RABBITMQ_HOST: z.string().optional(),
    DEMO_RABBITMQ_PORT: z.coerce.number().int().positive().default(15672),
    DEMO_RABBITMQ_AMQP_PORT: z.coerce.number().int().positive().default(5672),
    DEMO_RABBITMQ_USER: z.string().optional(),
    DEMO_RABBITMQ_PASS: z.string().optional(),
    DEMO_RABBITMQ_VHOST: z.string().default("/"),

    // NPM package version (for Sentry releases)
    npm_package_version: z.string().default("0.0.0"),

    // Managed LLM (uses Qarote's own Anthropic key, billed to Qarote).
    // Workspaces using LlmProvider.MANAGED route through this key, gated by
    // the per-workspace monthly quota counter. Self-hosted instances leave
    // these unset (default: disabled) and tenants must BYOK.
    MANAGED_LLM_ENABLED: z
      .enum(["true", "false"])
      .default("false")
      .transform((v) => v === "true"),
    MANAGED_LLM_API_KEY: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.MANAGED_LLM_ENABLED && !data.MANAGED_LLM_API_KEY?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["MANAGED_LLM_API_KEY"],
        message:
          "MANAGED_LLM_API_KEY is required when MANAGED_LLM_ENABLED is true",
      });
    }
  });
