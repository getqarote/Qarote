#!/usr/bin/env -S npm run exec --

/**
 * Maintenance Mode Management Script
 *
 * This script provides easy management of maintenance mode across all servers
 * in staging and production environments using the dokku-maintenance plugin.
 */

import { program } from "commander";
import { config } from "dotenv";
import path from "path";
import chalk from "chalk";
import fs from "fs/promises";
import { executeCommand, Logger } from "./utils.js";

// Load environment variables from staging by default
config({ path: path.join(process.cwd(), "environments", "staging", ".env") });

interface MaintenanceConfig {
  servers: string[];
  sshUser: string;
  appName: string;
}

/**
 * Execute maintenance command on a server
 */
async function executeMaintenanceCommand(
  serverIp: string,
  sshUser: string,
  appName: string,
  command: "on" | "off" | "status"
): Promise<{ success: boolean; output: string }> {
  try {
    const sshCommand = `dokku maintenance:${command} ${appName}`;
    const result = await executeCommand("ssh", [
      `${sshUser}@${serverIp}`,
      sshCommand,
    ]);

    return {
      success: result.exitCode === 0,
      output: result.stdout || result.stderr || "",
    };
  } catch (error) {
    return {
      success: false,
      output: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Get servers configuration for environment
 */
async function getMaintenanceConfig(
  environment: "staging" | "production"
): Promise<MaintenanceConfig> {
  const envPath = path.join(process.cwd(), "environments", environment, ".env");
  const envFile = await fs.readFile(envPath, "utf-8");

  // Parse environment file to get server IPs
  const servers: string[] = [];
  const lines = envFile.split("\n");

  for (const line of lines) {
    if (line.startsWith("STAGING_SERVER_IP=") && environment === "staging") {
      const ip = line.split("=")[1]?.trim().replace(/"/g, "");
      if (ip) servers.push(ip);
    } else if (
      line.startsWith("PRODUCTION_") &&
      line.includes("_IP=") &&
      environment === "production"
    ) {
      const ip = line.split("=")[1]?.trim().replace(/"/g, "");
      if (ip && ip !== "your-production-server-ip") servers.push(ip);
    }
  }

  return {
    servers,
    sshUser: "root",
    appName: "rabbit-hq",
  };
}

/**
 * Enable maintenance mode
 */
async function enableMaintenance(
  environment: "staging" | "production"
): Promise<void> {
  Logger.info(`Enabling maintenance mode for ${environment}...`);

  const config = await getMaintenanceConfig(environment);

  if (config.servers.length === 0) {
    Logger.error(
      `No servers found for ${environment}. Make sure your .env file is configured.`
    );
    return;
  }

  Logger.info(
    `Found ${config.servers.length} server(s): ${config.servers.join(", ")}`
  );

  for (const server of config.servers) {
    Logger.info(`Enabling maintenance on ${server}...`);
    const result = await executeMaintenanceCommand(
      server,
      config.sshUser,
      config.appName,
      "on"
    );

    if (result.success) {
      Logger.success(`✅ Maintenance enabled on ${server}`);
    } else {
      Logger.error(
        `❌ Failed to enable maintenance on ${server}: ${result.output}`
      );
    }
  }

  Logger.success(`Maintenance mode enabled for ${environment} environment`);
  Logger.info("Your application will now show a maintenance page to visitors.");
}

/**
 * Disable maintenance mode
 */
async function disableMaintenance(
  environment: "staging" | "production"
): Promise<void> {
  Logger.info(`Disabling maintenance mode for ${environment}...`);

  const config = await getMaintenanceConfig(environment);

  if (config.servers.length === 0) {
    Logger.error(
      `No servers found for ${environment}. Make sure your .env file is configured.`
    );
    return;
  }

  Logger.info(
    `Found ${config.servers.length} server(s): ${config.servers.join(", ")}`
  );

  for (const server of config.servers) {
    Logger.info(`Disabling maintenance on ${server}...`);
    const result = await executeMaintenanceCommand(
      server,
      config.sshUser,
      config.appName,
      "off"
    );

    if (result.success) {
      Logger.success(`✅ Maintenance disabled on ${server}`);
    } else {
      Logger.error(
        `❌ Failed to disable maintenance on ${server}: ${result.output}`
      );
    }
  }

  Logger.success(`Maintenance mode disabled for ${environment} environment`);
  Logger.info("Your application is now live and serving traffic normally.");
}

/**
 * Check maintenance status
 */
async function checkMaintenanceStatus(
  environment: "staging" | "production"
): Promise<void> {
  Logger.info(`Checking maintenance status for ${environment}...`);

  const config = await getMaintenanceConfig(environment);

  if (config.servers.length === 0) {
    Logger.error(
      `No servers found for ${environment}. Make sure your .env file is configured.`
    );
    return;
  }

  console.log("");
  console.log(chalk.bold(`Maintenance Status - ${environment.toUpperCase()}`));
  console.log("─".repeat(50));

  for (const server of config.servers) {
    const result = await executeMaintenanceCommand(
      server,
      config.sshUser,
      config.appName,
      "status"
    );

    if (result.success) {
      const isOn =
        result.output.includes("maintenance mode is enabled") ||
        result.output.includes("maintenance is on");
      const status = isOn ? chalk.red("🔧 ON") : chalk.green("✅ OFF");
      console.log(`${server.padEnd(15)} │ ${status}`);
    } else {
      console.log(`${server.padEnd(15)} │ ${chalk.yellow("❓ UNKNOWN")}`);
    }
  }

  console.log("");
}

// CLI Setup
program
  .name("maintenance")
  .description("Manage maintenance mode for Rabbit Scout environments")
  .version("1.0.0");

program
  .command("on <environment>")
  .description("Enable maintenance mode")
  .action(async (environment: "staging" | "production") => {
    if (environment !== "staging" && environment !== "production") {
      Logger.error("Environment must be either 'staging' or 'production'");
      process.exit(1);
    }
    await enableMaintenance(environment);
  });

program
  .command("off <environment>")
  .description("Disable maintenance mode")
  .action(async (environment: "staging" | "production") => {
    if (environment !== "staging" && environment !== "production") {
      Logger.error("Environment must be either 'staging' or 'production'");
      process.exit(1);
    }
    await disableMaintenance(environment);
  });

program
  .command("status <environment>")
  .description("Check maintenance mode status")
  .action(async (environment: "staging" | "production") => {
    if (environment !== "staging" && environment !== "production") {
      Logger.error("Environment must be either 'staging' or 'production'");
      process.exit(1);
    }
    await checkMaintenanceStatus(environment);
  });

// Help examples
program.on("--help", () => {
  console.log("");
  console.log("Examples:");
  console.log("  $ npm run maintenance on staging");
  console.log("  $ npm run maintenance off production");
  console.log("  $ npm run maintenance status staging");
  console.log("");
  console.log("Available environments:");
  console.log("  staging     - Single server environment");
  console.log("  production  - Multi-server environment with load balancer");
});

if (process.argv.length <= 2) {
  program.help();
}

program.parse();
