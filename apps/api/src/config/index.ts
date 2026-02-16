import path from "node:path";

import dotenv from "dotenv";
import { z } from "zod/v4";

import { cloudSchema } from "./schemas/cloud.js";
import { communitySchema } from "./schemas/community.js";
import { enterpriseSchema } from "./schemas/enterprise.js";

// Load .env file from the api directory (where process.cwd() points when running from apps/api)
dotenv.config({ path: path.join(process.cwd(), ".env") });

// Union type of all possible configs (internal use only)
type Config =
  | z.infer<typeof cloudSchema>
  | z.infer<typeof communitySchema>
  | z.infer<typeof enterpriseSchema>;

/**
 * Parse and validate environment variables based on deployment mode
 * Different deployment modes have different requirements
 */
function parseConfig(): Config {
  const deploymentMode = process.env.DEPLOYMENT_MODE || "community";

  // Create environment object with defaulted DEPLOYMENT_MODE
  // This ensures validation doesn't fail when DEPLOYMENT_MODE is undefined
  const envWithDefaults = {
    ...process.env,
    DEPLOYMENT_MODE: deploymentMode,
  };

  try {
    switch (deploymentMode) {
      case "cloud":
        return cloudSchema.parse(envWithDefaults);
      case "enterprise":
        return enterpriseSchema.parse(envWithDefaults);
      case "community":
        return communitySchema.parse(envWithDefaults);
      default:
        throw new Error(
          `Invalid DEPLOYMENT_MODE: ${deploymentMode}. Must be one of: cloud, community, enterprise`
        );
    }
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
  release: `qarote-backend@${config.npm_package_version || "unknown"}`,
  tracesSampleRate: isProduction() ? 0.1 : 1.0,
  profilesSampleRate: isProduction() ? 0.05 : 1.0,
} as const;

export const googleConfig = {
  clientId: config.GOOGLE_CLIENT_ID,
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
  tenant: "SSO_TENANT" in config ? (config.SSO_TENANT ?? "default") : "default",
  product:
    "SSO_PRODUCT" in config ? (config.SSO_PRODUCT ?? "qarote") : "qarote",
  buttonLabel:
    "SSO_BUTTON_LABEL" in config
      ? (config.SSO_BUTTON_LABEL ?? "Sign in with SSO")
      : "Sign in with SSO",
} as const;

export const licenseConfig = {
  licenseKey: config.LICENSE_KEY,
  licenseFilePath: config.LICENSE_FILE_PATH || "./qarote-license.json",
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
