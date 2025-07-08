#!/usr/bin/env tsx

/**
 * Rabbit Scout Scale Script
 * Scale application processes
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

interface ScaleOptions {
  environment: Environment;
  scale: number;
}

/**
 * Scale application processes
 */
async function scaleApplication(options: ScaleOptions): Promise<void> {
  const { environment, scale } = options;

  Logger.info(`Scaling ${environment} environment to ${scale} processes...`);

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

    // Get current scale
    Logger.info("Checking current process count...");
    const currentScaleResult = await sshCommand(
      config.DOKKU_HOST,
      `ps:scale ${backendApp}`
    );
    if (currentScaleResult.exitCode === 0) {
      console.log(
        `   Current: ${currentScaleResult.stdout.trim() || "Unknown"}`
      );
    }

    // Scale the application
    Logger.info(`Scaling to ${scale} processes...`);
    const scaleResult = await sshCommand(
      config.DOKKU_HOST,
      `ps:scale ${backendApp} web=${scale}`
    );

    if (scaleResult.exitCode !== 0) {
      throw new Error(`Failed to scale application: ${scaleResult.stderr}`);
    }

    Logger.success(`Application scaled successfully!`);

    // Show new scale
    const newScaleResult = await sshCommand(
      config.DOKKU_HOST,
      `ps:scale ${backendApp}`
    );
    if (newScaleResult.exitCode === 0) {
      console.log(`   New scale: ${newScaleResult.stdout.trim()}`);
    }

    // Show process status
    Logger.info("Checking process status...");
    const statusResult = await sshCommand(
      config.DOKKU_HOST,
      `ps:report ${backendApp}`
    );
    if (statusResult.exitCode === 0) {
      const lines = statusResult.stdout.split("\n");
      lines.forEach((line) => {
        if (line.includes("Status:") || line.includes("Processes:")) {
          console.log(`   ${line.trim()}`);
        }
      });
    }

    console.log("");
    Logger.success("Scaling completed! 🎉");

    console.log("");
    console.log("📊 Scaling Information:");
    console.log(`   Environment: ${environment}`);
    console.log(`   Application: ${backendApp}`);
    console.log(`   Process Count: ${scale}`);
    console.log(`   URL: https://${config.DOMAIN_BACKEND}`);
    console.log("");
    console.log("🔍 Next steps:");
    console.log(`   • Check status: npm run status:${environment}`);
    console.log(`   • View logs:    npm run logs:${environment}`);
    console.log(
      `   • Test API:     curl https://${config.DOMAIN_BACKEND}/health`
    );
  } catch (error) {
    Logger.error(
      `Scaling failed: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }
}

/**
 * Show scaling recommendations
 */
async function showScalingInfo(environment: Environment): Promise<void> {
  try {
    const config = await loadEnvConfig(environment);
    const { backend: backendApp } = getAppNames(environment);

    console.log("");
    console.log("📈 Scaling Guidelines:");
    console.log("");
    console.log("Environment Recommendations:");
    console.log("   Staging:    1-2 processes (for testing)");
    console.log("   Production: 2-5 processes (based on load)");
    console.log("");
    console.log("Resource Considerations:");
    console.log("   • Each process uses ~100-200MB RAM");
    console.log("   • Monitor CPU and memory usage");
    console.log("   • Scale horizontally for better fault tolerance");
    console.log("");
    console.log("Scaling Commands:");
    console.log(`   npm run scale:${environment} 1    # Minimal (development)`);
    console.log(`   npm run scale:${environment} 2    # Recommended (staging)`);
    console.log(`   npm run scale:${environment} 3    # Production (low load)`);
    console.log(
      `   npm run scale:${environment} 5    # Production (high load)`
    );
    console.log("");
    console.log("Direct SSH Commands:");
    console.log(`   ssh dokku@${config.DOKKU_HOST} ps:scale ${backendApp}`);
    console.log(
      `   ssh dokku@${config.DOKKU_HOST} ps:scale ${backendApp} web=3`
    );
    console.log(`   ssh dokku@${config.DOKKU_HOST} ps:restart ${backendApp}`);
    console.log("");
  } catch (error) {
    Logger.error(
      `Failed to show scaling info: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Main program
 */
const program = new Command();

program
  .name("scale")
  .description("Scale application processes")
  .argument("<environment>", "Environment (staging, production)")
  .argument("[scale]", "Number of processes (1-10)")
  .option("--info", "Show scaling information and guidelines", false)
  .action(async (env: string, scaleArg: string | undefined, options: any) => {
    try {
      const environment = validateEnvironment(env);

      if (options.info) {
        await showScalingInfo(environment);
        return;
      }

      if (!scaleArg) {
        Logger.error("Scale argument is required");
        console.log("");
        console.log("Usage: scale <environment> <scale>");
        console.log("Examples:");
        console.log(`  npm run scale:${environment} 2`);
        console.log(`  tsx scripts/scale.ts ${environment} 3`);
        console.log("");
        console.log("For scaling guidelines, use:");
        console.log(`  tsx scripts/scale.ts ${environment} --info`);
        process.exit(1);
      }

      const scale = parseInt(scaleArg, 10);
      if (isNaN(scale) || scale < 1 || scale > 10) {
        throw new Error("Scale must be a number between 1 and 10");
      }

      await scaleApplication({ environment, scale });
    } catch (error) {
      Logger.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program.on("--help", () => {
  console.log("");
  console.log("Examples:");
  console.log("  $ npm run scale:staging 2");
  console.log("  $ npm run scale:production 3");
  console.log("  $ tsx scripts/scale.ts staging 1");
  console.log("  $ tsx scripts/scale.ts production --info");
  console.log("");
  console.log("Scale Range: 1-10 processes");
  console.log("Recommendations:");
  console.log("  Staging:    1-2 processes");
  console.log("  Production: 2-5 processes");
});

if (import.meta.url === `file://${process.argv[1]}`) {
  program.parse(process.argv);
}
