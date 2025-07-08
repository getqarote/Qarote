import chalk from "chalk";
import { spawn, SpawnOptions } from "child_process";
import { promises as fs } from "fs";
import * as path from "path";

/**
 * Environment types
 */
export type Environment = "staging" | "production";

/**
 * Logger utility with colored output
 */
export class Logger {
  static info(message: string): void {
    console.log(chalk.blue("[INFO]"), message);
  }

  static success(message: string): void {
    console.log(chalk.green("[SUCCESS]"), message);
  }

  static warning(message: string): void {
    console.log(chalk.yellow("[WARNING]"), message);
  }

  static error(message: string): void {
    console.log(chalk.red("[ERROR]"), message);
  }

  static status(message: string): void {
    console.log(chalk.cyan("🔍"), message);
  }

  static rocket(message: string): void {
    console.log(chalk.magenta("🚀"), message);
  }
}

/**
 * Configuration paths
 */
export class Paths {
  static get scriptDir(): string {
    return __dirname;
  }

  static get infraDir(): string {
    return path.dirname(this.scriptDir);
  }

  static get projectRoot(): string {
    return path.dirname(this.infraDir);
  }

  static getEnvFile(environment: Environment): string {
    return path.join(this.infraDir, "environments", environment, ".env");
  }

  /**
   * Check if the current file is being run directly as the main module
   */
  static isMainModule(importMetaUrl: string): boolean {
    return importMetaUrl === `file://${process.argv[1]}`;
  }
}

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

  // Frontend Stripe
  VITE_STRIPE_PUBLISHABLE_KEY: string;

  // Monitoring
  SENTRY_DSN: string;
  SENTRY_ENABLED: string;
  VITE_SENTRY_DSN: string;
  VITE_SENTRY_ENABLED: string;
  VITE_APP_VERSION: string;
}

/**
 * Load and validate environment configuration
 */
export async function loadEnvConfig(
  environment: Environment
): Promise<EnvConfig> {
  const envFile = Paths.getEnvFile(environment);
  console.log(`Loading environment configuration from: ${envFile}`);

  try {
    await fs.access(envFile);
  } catch {
    throw new Error(
      `Environment file not found: ${envFile}\nPlease copy and configure: cp ${envFile}.example ${envFile}`
    );
  }

  // Load environment variables
  const envContent = await fs.readFile(envFile, "utf-8");
  const envVars: Record<string, string> = {};

  envContent.split("\n").forEach((line) => {
    const match = line.match(/^([^#=\s]+)=(.*)$/);
    if (match) {
      const [, key, value] = match;
      envVars[key] = value.replace(/^["']|["']$/g, ""); // Remove quotes
    }
  });

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
 * Execute shell command with better error handling
 */
export async function executeCommand(
  command: string,
  args: string[] = [],
  options: SpawnOptions = {}
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "pipe",
      ...options,
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (exitCode) => {
      resolve({ stdout, stderr, exitCode: exitCode || 0 });
    });

    child.on("error", (error) => {
      reject(error);
    });
  });
}

/**
 * Get the appropriate SSH key path (main id_rsa key)
 */
function getSSHKeyPath(): string {
  const mainKeyPath = path.join(process.env.HOME || "", ".ssh", "id_rsa");

  // Check if main key exists
  try {
    require("fs").accessSync(mainKeyPath);
    return mainKeyPath;
  } catch (error) {
    throw new Error(`cannot get ssh key path: ${error}`);
  }
}

/**
 * Execute SSH command on Dokku host with main SSH key and rabbithq user
 * Uses the main id_rsa key for SSH connections
 */
export async function sshCommand(
  host: string,
  command: string,
  options: { stdio?: "inherit" | "pipe" } = {}
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const sshKeyPath = getSSHKeyPath();

  const sshArgs = [
    "-i",
    sshKeyPath, // Use appropriate SSH key
    "-o",
    "StrictHostKeyChecking=no",
    "-o",
    "UserKnownHostsFile=/dev/null",
    `rabbithq@${host}`,
    command,
  ];

  return executeCommand("ssh", sshArgs, options);
}

/**
 * Check if SSH connection to Dokku host is working
 */
export async function checkDokkuConnection(host: string): Promise<boolean> {
  try {
    const result = await sshCommand(host, "dokku apps:list");
    return result.exitCode === 0;
  } catch (error) {
    Logger.error(`SSH connection failed: ${error}`);
    return false;
  }
}

/**
 * Get app names for environment
 */
export function getAppNames(environment: Environment) {
  return {
    backend: `rabbit-scout-backend-${environment}`,
    postgres: `rabbit-scout-postgres-${environment}`,
  };
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
 * Display help message
 */
export function displayUsage(
  scriptName: string,
  usage: string,
  examples: string[] = []
): void {
  Logger.error(`Usage: ${scriptName} ${usage}`);
  if (examples.length > 0) {
    console.log("Examples:");
    examples.forEach((example) => console.log(`  ${example}`));
  }
}
