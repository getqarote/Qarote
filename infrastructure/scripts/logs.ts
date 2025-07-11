#!/usr/bin/env tsx

/**
 * RabbitHQ Logs Script
 * View application logs
 */

import { Command } from "commander";
import {
  Logger,
  sshCommand,
  checkDokkuConnection,
  loadEnvConfig,
  validateEnvironment,
  getAppNames,
  type Environment,
  type EnvConfig,
} from "./utils.js";

interface LogsOptions {
  environment: Environment;
  tail: number;
  follow: boolean;
}

/**
 * View application logs
 */
async function viewLogs(options: LogsOptions): Promise<void> {
  const { environment, tail, follow } = options;

  Logger.info(`Viewing logs for ${environment} environment...`);

  try {
    // Load configuration
    const config = await loadEnvConfig(environment);

    // Check if Dokku host is accessible
    if (!(await checkDokkuConnection(config.DOKKU_HOST))) {
      Logger.error(`Cannot connect to Dokku host: ${config.DOKKU_HOST}`);
      process.exit(1);
    }

    const { backend: backendApp } = getAppNames(environment);

    // Check if app exists
    const appExistsResult = await sshCommand(
      config.DOKKU_HOST,
      `apps:exists ${backendApp}`
    );
    if (appExistsResult.exitCode !== 0) {
      Logger.error(`Backend app not found: ${backendApp}`);
      process.exit(1);
    }

    Logger.info(`Connected to ${config.DOKKU_HOST}`);
    Logger.info(`Viewing logs for: ${backendApp}`);

    if (follow) {
      Logger.info("Following logs in real-time (Press Ctrl+C to stop)...");
      console.log("");

      // Follow logs in real-time
      const followResult = await sshCommand(
        config.DOKKU_HOST,
        `logs ${backendApp} --tail ${tail} --follow`
      );
      if (followResult.exitCode !== 0) {
        throw new Error(`Failed to follow logs: ${followResult.stderr}`);
      }
    } else {
      Logger.info(`Showing last ${tail} lines...`);
      console.log("");

      // Show last N lines
      const logsResult = await sshCommand(
        config.DOKKU_HOST,
        `logs ${backendApp} --tail ${tail}`
      );
      if (logsResult.exitCode === 0) {
        console.log(logsResult.stdout);
      } else {
        throw new Error(`Failed to retrieve logs: ${logsResult.stderr}`);
      }
    }
  } catch (error) {
    Logger.error(
      `Failed to view logs: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }
}

/**
 * Show various log types
 */
async function showLogSummary(environment: Environment): Promise<void> {
  try {
    const config = await loadEnvConfig(environment);
    const { backend: backendApp } = getAppNames(environment);

    console.log("");
    console.log("📋 Available Log Commands:");
    console.log("");
    console.log("Application Logs:");
    console.log(`   npm run logs:${environment}              # Last 100 lines`);
    console.log(`   npm run logs:${environment} -- --tail=50 # Last 50 lines`);
    console.log(
      `   npm run logs:${environment} -- --follow  # Follow in real-time`
    );
    console.log("");
    console.log("Direct SSH Commands:");
    console.log(`   ssh dokku@${config.DOKKU_HOST} logs ${backendApp}`);
    console.log(
      `   ssh dokku@${config.DOKKU_HOST} logs ${backendApp} --tail 20`
    );
    console.log(
      `   ssh dokku@${config.DOKKU_HOST} logs ${backendApp} --follow`
    );
    console.log("");
    console.log("System Logs (requires root access):");
    console.log(`   ssh root@${config.DOKKU_HOST} journalctl -u dokku`);
    console.log(`   ssh root@${config.DOKKU_HOST} docker logs <container-id>`);
    console.log("");
  } catch (error) {
    Logger.error(
      `Failed to show log summary: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Main program
 */
const program = new Command();

program
  .name("logs")
  .description("View application logs")
  .argument("<environment>", "Environment (staging, production)")
  .option("--tail <number>", "Show last N lines", "100")
  .option("--follow", "Follow logs in real-time", false)
  .option("--help-commands", "Show available log commands", false)
  .action(async (env: string, options: any) => {
    try {
      const environment = validateEnvironment(env);

      if (options.helpCommands) {
        await showLogSummary(environment);
        return;
      }

      const tail = parseInt(options.tail, 10);
      if (isNaN(tail) || tail < 1) {
        throw new Error("Tail option must be a positive number");
      }

      await viewLogs({
        environment,
        tail,
        follow: options.follow,
      });
    } catch (error) {
      Logger.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program.on("--help", () => {
  console.log("");
  console.log("Examples:");
  console.log("  $ npm run logs:staging");
  console.log("  $ npm run logs:production -- --tail=50");
  console.log("  $ npm run logs:staging -- --follow");
  console.log("  $ tsx scripts/logs.ts staging --tail=20");
  console.log("  $ tsx scripts/logs.ts production --help-commands");
  console.log("");
  console.log("Options:");
  console.log("  --tail=N         Show last N lines (default: 100)");
  console.log("  --follow         Follow logs in real-time");
  console.log("  --help-commands  Show all available log commands");
});

if (import.meta.url === `file://${process.argv[1]}`) {
  program.parse(process.argv);
}
