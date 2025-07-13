/**
 * Frontend deployment to Cloudflare Pages
 */
import fs from "node:fs/promises";
import path from "node:path";
import {
  Logger,
  executeCommand,
  Paths,
  isRunningInCI,
  type Environment,
  type FrontendEnvConfig,
} from "../../utils";

/**
 * Deploy frontend to Cloudflare Pages
 *
 * Note: backendConfig parameter is kept for backward compatibility but is no longer used
 * as all frontend configuration comes from .frontend.env file
 */
export async function deployFrontend(
  frontendConfig: FrontendEnvConfig,
  environment: Environment
): Promise<void> {
  Logger.info("Deploying frontend to Cloudflare Pages...");

  // Load frontend-specific configuration from separate .frontend.env file

  await ensureWranglerInstalled();
  await authenticateCloudflare();
  await buildAndDeployFrontend(frontendConfig, environment);
}

/**
 * Ensure Wrangler is installed
 */
async function ensureWranglerInstalled(): Promise<void> {
  try {
    await executeCommand("wrangler", ["--version"]);
  } catch {
    Logger.error("Wrangler CLI not found. Installing...");
    await executeCommand("npm", ["install", "-g", "wrangler"], {
      stdio: "inherit",
    });
  }
}

/**
 * Authenticate with Cloudflare
 */
async function authenticateCloudflare(): Promise<void> {
  if (isRunningInCI()) {
    // In GitHub Actions CI environment, authentication is handled by the wrangler-action
    // For other CI environments, we can authenticate with environment variables directly
    Logger.info(
      "Running in CI environment, authentication will be handled by environment variables or CI action"
    );

    // The Cloudflare token should be set as CLOUDFLARE_API_TOKEN in the environment
    if (!process.env.CLOUDFLARE_API_TOKEN) {
      Logger.info("CLOUDFLARE_API_TOKEN environment variable not found in CI");
      Logger.info(
        "If using GitHub Actions with wrangler-action, this is expected and will work"
      );
      Logger.info(
        "Otherwise, ensure CLOUDFLARE_API_TOKEN is properly set in your CI environment"
      );
    }
  } else {
    // For local environment, check if already authenticated
    const whoamiResult = await executeCommand("wrangler", ["whoami"]);
    if (whoamiResult.exitCode !== 0) {
      Logger.error("Please login to Cloudflare first:");
      Logger.error("wrangler login");
      process.exit(1);
    }
  }
}

/**
 * Build and deploy the frontend to Cloudflare Pages
 */
async function buildAndDeployFrontend(
  frontendConfig: FrontendEnvConfig,
  environment: Environment
): Promise<void> {
  const frontendDir = path.join(Paths.projectRoot, "front-end");
  process.chdir(frontendDir);

  // Install dependencies
  Logger.info("Installing frontend dependencies...");
  await executeCommand("npm", ["install"], { stdio: "inherit" });

  // Create environment file for build
  const envContent = [
    `VITE_API_URL=${frontendConfig.VITE_API_URL}`,
    `VITE_SENTRY_DSN=${frontendConfig.VITE_SENTRY_DSN}`,
    `VITE_SENTRY_ENABLED=${frontendConfig.VITE_SENTRY_ENABLED}`,
    `VITE_APP_VERSION=${frontendConfig.VITE_APP_VERSION}`,
  ].join("\n");

  await fs.writeFile(".env", envContent);

  try {
    // Build the application
    Logger.info("Building frontend application...");
    await executeCommand("npm", ["run", "build"], { stdio: "inherit" });

    // Deploy to Cloudflare Pages
    Logger.info("Deploying to Cloudflare Pages...");
    await executeCommand(
      "wrangler",
      [
        "pages",
        "deploy",
        "dist",
        "--project-name",
        `rabbithq-${environment}`,
        "--compatibility-date",
        "2024-01-01",
        // Add custom domain if specified in frontend config
        ...(frontendConfig.DOMAIN_FRONTEND
          ? ["--custom-domain", frontendConfig.DOMAIN_FRONTEND]
          : []),
      ],
      { stdio: "inherit" }
    );

    Logger.success("Frontend deployed successfully!");
    Logger.info(`Frontend URL: https://${frontendConfig.DOMAIN_FRONTEND}`);
  } finally {
    // Clean up
    try {
      await fs.unlink(".env");
    } catch {
      // Ignore if file doesn't exist
    }
  }
}
