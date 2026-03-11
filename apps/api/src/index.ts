// Subcommand routing — must run before any config/dotenv imports
if (process.argv[2] === "setup") {
  const { runSetup } = await import("./cli/setup.js");
  await runSetup();
  process.exit(0);
}

import { parseArgs } from "node:util";

// CLI argument parsing — overrides env vars for binary mode.
// read process.env at module evaluation time (import-time side effects).
const { values: cliArgs } = parseArgs({
  options: {
    // Server
    port: { type: "string", short: "p" },
    host: { type: "string", short: "h" },
    // Database
    "database-url": { type: "string" },
    // Security
    "jwt-secret": { type: "string" },
    "encryption-key": { type: "string" },
    // Email
    "enable-email": { type: "string" },
    "from-email": { type: "string" },
    "smtp-host": { type: "string" },
    "smtp-port": { type: "string" },
    "smtp-user": { type: "string" },
    "smtp-pass": { type: "string" },
    // Admin bootstrap
    "admin-email": { type: "string" },
    // Registration
    "enable-registration": { type: "string" },
    // Email OAuth2
    "smtp-service": { type: "string" },
    "smtp-oauth-client-id": { type: "string" },
    "smtp-oauth-client-secret": { type: "string" },
    "smtp-oauth-refresh-token": { type: "string" },
    // SSO
    "sso-enabled": { type: "string" },
    "sso-type": { type: "string" },
    "sso-oidc-discovery-url": { type: "string" },
    "sso-oidc-client-id": { type: "string" },
    "sso-oidc-client-secret": { type: "string" },
    "sso-saml-metadata-url": { type: "string" },
    "sso-tenant": { type: "string" },
    "sso-product": { type: "string" },
    "sso-button-label": { type: "string" },
    "api-url": { type: "string" },
    "frontend-url": { type: "string" },
  },
  strict: false,
});

// Map CLI flags to env vars
const flagToEnv: Record<string, string> = {
  "database-url": "DATABASE_URL",
  port: "PORT",
  host: "HOST",
  "jwt-secret": "JWT_SECRET",
  "encryption-key": "ENCRYPTION_KEY",
  "enable-email": "ENABLE_EMAIL",
  "from-email": "FROM_EMAIL",
  "smtp-host": "SMTP_HOST",
  "smtp-port": "SMTP_PORT",
  "smtp-user": "SMTP_USER",
  "smtp-pass": "SMTP_PASS",
  "admin-email": "ADMIN_EMAIL",
  "enable-registration": "ENABLE_REGISTRATION",
  "smtp-service": "SMTP_SERVICE",
  "smtp-oauth-client-id": "SMTP_OAUTH_CLIENT_ID",
  "smtp-oauth-client-secret": "SMTP_OAUTH_CLIENT_SECRET",
  "smtp-oauth-refresh-token": "SMTP_OAUTH_REFRESH_TOKEN",
  "sso-enabled": "SSO_ENABLED",
  "sso-type": "SSO_TYPE",
  "sso-oidc-discovery-url": "SSO_OIDC_DISCOVERY_URL",
  "sso-oidc-client-id": "SSO_OIDC_CLIENT_ID",
  "sso-oidc-client-secret": "SSO_OIDC_CLIENT_SECRET",
  "sso-saml-metadata-url": "SSO_SAML_METADATA_URL",
  "sso-button-label": "SSO_BUTTON_LABEL",
  "api-url": "API_URL",
  "frontend-url": "FRONTEND_URL",
};
for (const [flag, env] of Object.entries(flagToEnv)) {
  if (typeof cliArgs[flag] === "string") process.env[env] = cliArgs[flag];
}

// Dynamic import — ensures env vars are set before config/prisma modules load
await import("./server.js");
