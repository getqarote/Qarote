#!/usr/bin/env tsx

/**
 * Rabbit HQ Frontend Deployment Script
 * Deploy frontend to Cloudflare Pages
 */

import { Command } from "commander";
import {
  Logger,
  validateEnvironment,
  loadFrontendEnvConfig,
  type Environment,
} from "../../utils";
import { displayFrontendDeploymentSummary } from "../common";
import { deployFrontend } from "./frontend";

/**
 * Main frontend deployment function
 */
async function deployFrontendOnly(environment: Environment): Promise<void> {
  Logger.info(`Starting frontend deployment for ${environment} environment...`);

  try {
    const frontendConfig = await loadFrontendEnvConfig(environment);
    await deployFrontend(frontendConfig, environment);

    displayFrontendDeploymentSummary(environment, frontendConfig);
  } catch (error) {
    Logger.error(
      `Frontend deployment failed: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }
}

/**
 * Frontend deployment command
 */
const program = new Command();

program
  .name("deploy-frontend")
  .description("Deploy frontend to Cloudflare Pages")
  .argument("<environment>", "Environment (staging, production)")
  .action(async (env: string) => {
    try {
      const environment = validateEnvironment(env);
      await deployFrontendOnly(environment);
    } catch (error) {
      Logger.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program.on("--help", () => {
  console.log("");
  console.log("Examples:");
  console.log("  $ npm run deploy:frontend:staging");
  console.log("  $ npm run deploy:frontend:production");
  console.log(
    "  $ tsx infrastructure/scripts/deploy/deploy-frontend.ts staging"
  );
});

if (import.meta.url === `file://${process.argv[1]}`) {
  program.parse(process.argv);
}
