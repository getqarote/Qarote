#!/usr/bin/env tsx

/**
 * Rabbit HQ Backend Deployment Script
 * Deploy backend to Dokku
 */

import { Command } from "commander";
import {
  Logger,
  loadEnvConfig,
  validateEnvironment,
  type Environment,
} from "../../utils";
import { displayBackendDeploymentSummary } from "../common";
import { deployBackend } from "./backend";

/**
 * Main backend deployment function
 */
async function deployBackendOnly(environment: Environment): Promise<void> {
  Logger.info(`Starting backend deployment for ${environment} environment...`);

  try {
    const backendConfig = await loadEnvConfig(environment);
    await deployBackend(backendConfig, environment);

    displayBackendDeploymentSummary(environment, backendConfig);
    Logger.success(
      `Backend deployment for ${environment} completed successfully!`
    );
  } catch (error) {
    Logger.error(
      `Backend deployment failed: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }
}

/**
 * Backend deployment command
 */
const program = new Command();

program
  .name("deploy-backend")
  .description("Deploy backend to Dokku")
  .argument("<environment>", "Environment (staging, production)")
  .action(async (env: string) => {
    try {
      const environment = validateEnvironment(env);
      await deployBackendOnly(environment);
    } catch (error) {
      Logger.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program.on("--help", () => {
  console.log("");
  console.log("Examples:");
  console.log("  $ npm run deploy:backend:staging");
  console.log("  $ npm run deploy:backend:production");
  console.log(
    "  $ tsx infrastructure/scripts/deploy/deploy-backend.ts staging"
  );
});

if (import.meta.url === `file://${process.argv[1]}`) {
  program.parse(process.argv);
}
