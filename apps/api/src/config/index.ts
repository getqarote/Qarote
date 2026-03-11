import path from "node:path";

import dotenv from "dotenv";
import { z } from "zod/v4";

import { cloudSchema } from "./schemas/cloud.js";
import { selfhostedSchema } from "./schemas/selfhosted.js";

// Load .env file from the api directory (where process.cwd() points when running from apps/api)
dotenv.config({ path: path.join(process.cwd(), ".env"), quiet: true });

// Union type of all possible configs (internal use only)
type Config = z.infer<typeof cloudSchema> | z.infer<typeof selfhostedSchema>;

// Deprecated aliases that map to "selfhosted"
const SELFHOSTED_ALIASES = ["community", "enterprise"] as const;

/**
 * Normalize deployment mode, mapping deprecated aliases to "selfhosted"
 */
function normalizeDeploymentMode(raw: string): "cloud" | "selfhosted" {
  if (raw === "cloud") return "cloud";
  if (raw === "selfhosted") return "selfhosted";
  if (SELFHOSTED_ALIASES.includes(raw as (typeof SELFHOSTED_ALIASES)[number])) {
    // eslint-disable-next-line no-console
    console.warn(
      `[Qarote] DEPLOYMENT_MODE="${raw}" is deprecated. Use "selfhosted" instead. This alias will be removed in a future version.`
    );
    return "selfhosted";
  }
  throw new Error(
    `Invalid DEPLOYMENT_MODE: ${raw}. Must be one of: cloud, selfhosted`
  );
}

/**
 * Parse and validate environment variables based on deployment mode
 * Different deployment modes have different requirements
 */
function parseConfig(): Config {
  const rawMode = process.env.DEPLOYMENT_MODE || "selfhosted";
  const deploymentMode = normalizeDeploymentMode(rawMode);

  // Create environment object with normalized DEPLOYMENT_MODE
  const envWithDefaults = {
    ...process.env,
    DEPLOYMENT_MODE: deploymentMode,
  };

  try {
    let config: Config;
    switch (deploymentMode) {
      case "cloud":
        config = cloudSchema.parse(envWithDefaults);
        break;
      case "selfhosted":
        config = selfhostedSchema.parse(envWithDefaults);
        break;
    }

    // Cross-field validation: OAuth credentials required when ENABLE_OAUTH is true
    if (config.ENABLE_OAUTH) {
      const missing: string[] = [];
      if (!config.GOOGLE_CLIENT_ID) missing.push("GOOGLE_CLIENT_ID");
      if (!("GOOGLE_CLIENT_SECRET" in config) || !config.GOOGLE_CLIENT_SECRET) {
        missing.push("GOOGLE_CLIENT_SECRET");
      }
      if (missing.length > 0) {
        throw new Error(
          `ENABLE_OAUTH is true but required OAuth credentials are missing: ${missing.join(", ")}. ` +
            "Set these environment variables or disable OAuth with ENABLE_OAUTH=false."
        );
      }
    }

    return config;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues.map(
        (issue) => `${issue.path.join(".")}: ${issue.message}`
      );
      throw new Error(
        `Configuration validation failed for ${deploymentMode} mode:\n${errorMessages.join("\n")}`,
        { cause: error }
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
  resendApiKey: "RESEND_API_KEY" in config ? config.RESEND_API_KEY : undefined,
  fromEmail: config.FROM_EMAIL,
  frontendUrl: config.FRONTEND_URL,
  portalFrontendUrl: config.PORTAL_FRONTEND_URL,
  enabled: config.ENABLE_EMAIL,
  provider: config.EMAIL_PROVIDER,
  smtp: {
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    user: config.SMTP_USER,
    pass: config.SMTP_PASS,
    // OAuth2 support
    service: "SMTP_SERVICE" in config ? config.SMTP_SERVICE : undefined,
    oauth: {
      clientId:
        "SMTP_OAUTH_CLIENT_ID" in config
          ? config.SMTP_OAUTH_CLIENT_ID
          : undefined,
      clientSecret:
        "SMTP_OAUTH_CLIENT_SECRET" in config
          ? config.SMTP_OAUTH_CLIENT_SECRET
          : undefined,
      refreshToken:
        "SMTP_OAUTH_REFRESH_TOKEN" in config
          ? config.SMTP_OAUTH_REFRESH_TOKEN
          : undefined,
    },
  },
} as const;

export const registrationConfig = {
  enabled: "ENABLE_REGISTRATION" in config ? config.ENABLE_REGISTRATION : true,
} as const;

export const adminBootstrapConfig = {
  email: "ADMIN_EMAIL" in config ? config.ADMIN_EMAIL : undefined,
  password: "ADMIN_PASSWORD" in config ? config.ADMIN_PASSWORD : undefined,
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
      monthly: config.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID,
      yearly: config.STRIPE_ENTERPRISE_YEARLY_PRICE_ID,
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
  release: `qarote-backend@${config.npm_package_version || "unknown"}`,
  tracesSampleRate: isProduction() ? 0.1 : 1.0,
  profilesSampleRate: isProduction() ? 0.05 : 1.0,
} as const;

export const googleConfig = {
  clientId: config.GOOGLE_CLIENT_ID,
  clientSecret:
    "GOOGLE_CLIENT_SECRET" in config ? config.GOOGLE_CLIENT_SECRET : undefined,
  enabled: config.ENABLE_OAUTH,
} as const;

export const ssoConfig = {
  enabled: "SSO_ENABLED" in config ? config.SSO_ENABLED : false,
  type: "SSO_TYPE" in config ? config.SSO_TYPE : ("oidc" as const),
  oidc: {
    discoveryUrl:
      "SSO_OIDC_DISCOVERY_URL" in config
        ? config.SSO_OIDC_DISCOVERY_URL
        : undefined,
    clientId:
      "SSO_OIDC_CLIENT_ID" in config ? config.SSO_OIDC_CLIENT_ID : undefined,
    clientSecret:
      "SSO_OIDC_CLIENT_SECRET" in config
        ? config.SSO_OIDC_CLIENT_SECRET
        : undefined,
  },
  saml: {
    metadataUrl:
      "SSO_SAML_METADATA_URL" in config
        ? config.SSO_SAML_METADATA_URL
        : undefined,
    metadataRaw:
      "SSO_SAML_METADATA_RAW" in config
        ? config.SSO_SAML_METADATA_RAW
        : undefined,
  },
  buttonLabel:
    "SSO_BUTTON_LABEL" in config
      ? (config.SSO_BUTTON_LABEL ?? "Sign in with SSO")
      : "Sign in with SSO",
} as const;

export const licenseConfig = {
  privateKey:
    "LICENSE_PRIVATE_KEY" in config ? config.LICENSE_PRIVATE_KEY : undefined,
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
  isSelfHosted: () => config.DEPLOYMENT_MODE === "selfhosted",
} as const;
