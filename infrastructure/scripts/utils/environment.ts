/**
 * Environment utilities for infrastructure scripts
 */
import fs from "node:fs/promises";
import { Paths } from "./paths";

/**
 * Environment types
 */
export type Environment = "staging" | "production";

/**
 * Environment configuration
 */
export interface EnvConfig {
  // Dokku & Infrastructure
  DOKKU_HOST: string;

  // Domain configuration
  DOMAIN_BACKEND: string;
  DOMAIN_FRONTEND: string;

  // Server Configuration
  PORT: string;
  HOST: string;
  NODE_ENV: string;
  ENVIRONMENT: string;
  LOG_LEVEL: string;
  NODE_TLS_REJECT_UNAUTHORIZED: string;

  // Authentication & Security
  JWT_SECRET: string;
  ENCRYPTION_KEY: string;
  CORS_ORIGIN: string;
  FRONTEND_URL: string;

  // Database
  DATABASE_URL: string;

  // Email
  RESEND_API_KEY: string;
  FROM_EMAIL: string;

  // Stripe
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_DEVELOPER_MONTHLY_PRICE_ID: string;
  STRIPE_DEVELOPER_YEARLY_PRICE_ID: string;
  STRIPE_STARTUP_MONTHLY_PRICE_ID: string;
  STRIPE_STARTUP_YEARLY_PRICE_ID: string;
  STRIPE_BUSINESS_MONTHLY_PRICE_ID: string;
  STRIPE_BUSINESS_YEARLY_PRICE_ID: string;

  // Monitoring
  SENTRY_DSN: string;
  SENTRY_ENABLED: string;
  VITE_SENTRY_DSN: string;
  VITE_SENTRY_ENABLED: string;
  VITE_APP_VERSION: string;
}

/**
 * Frontend environment configuration
 */
export interface FrontendEnvConfig {
  // API Configuration
  VITE_API_URL: string;

  // Monitoring
  VITE_SENTRY_DSN: string;
  VITE_SENTRY_ENABLED: string;
  VITE_APP_VERSION: string;

  // Domain Configuration
  DOMAIN_FRONTEND: string;
}

/**
 * Load environment variables from a file
 */
export async function loadEnvFromFile(
  filePath: string
): Promise<Record<string, string>> {
  try {
    await fs.access(filePath);
  } catch {
    throw new Error(
      `Environment file not found: ${filePath}\nPlease copy and configure: cp ${filePath}.example ${filePath}`
    );
  }

  // Load environment variables
  const content = await fs.readFile(filePath, "utf-8");
  const vars: Record<string, string> = {};

  content.split("\n").forEach((line: string) => {
    const match = line.match(/^([^#=\\s]+)=(.*)$/);
    if (match) {
      const [, key, value] = match;
      vars[key] = value.replace(/^["']|["']$/g, ""); // Remove quotes
    }
  });

  return vars;
}

/**
 * Load and validate environment configuration
 */
export async function loadEnvConfig(
  environment: Environment
): Promise<EnvConfig> {
  const envFile = Paths.getEnvFile(environment);
  console.log(`Loading environment configuration from: ${envFile}`);

  const envVars = await loadEnvFromFile(envFile);

  // Required variables
  const requiredVars = [
    "DOKKU_HOST",
    "DOMAIN_BACKEND",
    "DOMAIN_FRONTEND",
    "PORT",
    "HOST",
    "NODE_ENV",
    "ENVIRONMENT",
    "LOG_LEVEL",
    "NODE_TLS_REJECT_UNAUTHORIZED",
    "JWT_SECRET",
    "ENCRYPTION_KEY",
    "FRONTEND_URL",
    "CORS_ORIGIN",
    "DATABASE_URL",
    "RESEND_API_KEY",
    "FROM_EMAIL",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "STRIPE_DEVELOPER_MONTHLY_PRICE_ID",
    "STRIPE_DEVELOPER_YEARLY_PRICE_ID",
    "STRIPE_STARTUP_MONTHLY_PRICE_ID",
    "STRIPE_STARTUP_YEARLY_PRICE_ID",
    "STRIPE_BUSINESS_MONTHLY_PRICE_ID",
    "STRIPE_BUSINESS_YEARLY_PRICE_ID",
    "SENTRY_DSN",
    "SENTRY_ENABLED",
  ];

  for (const varName of requiredVars) {
    if (!envVars[varName]) {
      throw new Error(`Required variable ${varName} is not set in ${envFile}`);
    }
  }

  return envVars as unknown as EnvConfig;
}

/**
 * Load frontend environment configuration
 */
export async function loadFrontendEnvConfig(
  environment: Environment
): Promise<FrontendEnvConfig> {
  const envFile = Paths.getFrontendEnvFile(environment);
  console.log(`Loading frontend environment configuration from: ${envFile}`);

  const envVars = await loadEnvFromFile(envFile);

  // Required variables
  const requiredVars = [
    "VITE_API_URL",
    "VITE_SENTRY_DSN",
    "VITE_SENTRY_ENABLED",
    "VITE_APP_VERSION",
    "DOMAIN_FRONTEND",
  ];

  for (const varName of requiredVars) {
    if (!envVars[varName]) {
      throw new Error(
        `Required frontend variable ${varName} is not set in ${envFile}`
      );
    }
  }

  return envVars as unknown as FrontendEnvConfig;
}

/**
 * Validate environment parameter
 */
export function validateEnvironment(env: string): Environment {
  if (env !== "staging" && env !== "production") {
    throw new Error(
      `Invalid environment: ${env}\nValid environments: staging, production`
    );
  }
  return env as Environment;
}

/**
 * Get app names for environment
 */
export function getAppNames(environment: Environment) {
  return {
    backend: `rabbithq-backend-${environment}`,
    postgres: `rabbithq-postgres-${environment}`,
  };
}

/**
 * Display help message
 */
export function displayUsage(
  scriptName: string,
  usage: string,
  examples: string[] = []
): void {
  console.error(`Usage: ${scriptName} ${usage}`);
  if (examples.length > 0) {
    console.log("Examples:");
    examples.forEach((example) => console.log(`  ${example}`));
  }
}
