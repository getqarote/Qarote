#!/usr/bin/env tsx

/**
 * RabbitHQ Destroy Script
 * Remove applications and databases (BE CAREFUL!)
 */

import { Command } from "commander";
import inquirer from "inquirer";
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

interface DestroyOptions {
  environment: Environment;
  force: boolean;
  component: "all" | "backend" | "database" | "frontend";
}

/**
 * Confirm destruction with user
 */
async function confirmDestruction(
  environment: Environment,
  component: string,
  force: boolean
): Promise<boolean> {
  if (force) {
    Logger.warning("Force flag provided, skipping confirmation");
    return true;
  }

  console.log("");
  Logger.warning("⚠️  DANGER ZONE ⚠️");
  console.log("");
  console.log(
    `You are about to PERMANENTLY DELETE the following ${environment} resources:`
  );

  if (component === "all") {
    console.log("   ❌ Backend application and all data");
    console.log("   ❌ PostgreSQL database and all data");
    console.log("   ❌ SSL certificates");
    console.log("   ❌ Environment configurations");
  } else if (component === "backend") {
    console.log("   ❌ Backend application");
    console.log("   ❌ SSL certificates");
    console.log("   ❌ Environment configurations");
  } else if (component === "database") {
    console.log("   ❌ PostgreSQL database and ALL DATA");
  } else if (component === "frontend") {
    console.log("   ❌ Frontend application (Cloudflare Pages)");
  }

  console.log("");
  Logger.error("THIS ACTION CANNOT BE UNDONE!");
  console.log("");

  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "confirmation",
      message: `Type "DELETE ${environment.toUpperCase()}" to confirm:`,
      validate: (input: string) => {
        if (input === `DELETE ${environment.toUpperCase()}`) {
          return true;
        }
        return `Please type exactly: DELETE ${environment.toUpperCase()}`;
      },
    },
    {
      type: "confirm",
      name: "finalConfirm",
      message: "Are you absolutely sure you want to proceed?",
      default: false,
    },
  ]);

  return answers.finalConfirm;
}

/**
 * Destroy backend application
 */
async function destroyBackend(
  config: EnvConfig,
  environment: Environment
): Promise<void> {
  const { backend: backendApp } = getAppNames(environment);

  Logger.info(`Destroying backend application: ${backendApp}`);

  // Check if app exists
  const appExistsResult = await sshCommand(
    config.DOKKU_HOST,
    `apps:exists ${backendApp}`
  );
  if (appExistsResult.exitCode === 0) {
    // Remove SSL certificate
    Logger.info("Removing SSL certificate...");
    await sshCommand(config.DOKKU_HOST, `letsencrypt:disable ${backendApp}`);

    // Destroy the app
    Logger.info("Destroying application...");
    const destroyResult = await sshCommand(
      config.DOKKU_HOST,
      `apps:destroy ${backendApp} --force`
    );
    if (destroyResult.exitCode !== 0) {
      throw new Error(`Failed to destroy backend app: ${destroyResult.stderr}`);
    }

    Logger.success(`Backend application destroyed: ${backendApp}`);
  } else {
    Logger.warning(`Backend application not found: ${backendApp}`);
  }
}

/**
 * Destroy PostgreSQL database
 */
async function destroyDatabase(
  config: EnvConfig,
  environment: Environment
): Promise<void> {
  const { postgres: postgresDb } = getAppNames(environment);

  Logger.info(`Destroying PostgreSQL database: ${postgresDb}`);

  // Check if database exists
  const dbExistsResult = await sshCommand(
    config.DOKKU_HOST,
    `postgres:exists ${postgresDb}`
  );
  if (dbExistsResult.exitCode === 0) {
    // Destroy the database
    const destroyResult = await sshCommand(
      config.DOKKU_HOST,
      `postgres:destroy ${postgresDb} --force`
    );
    if (destroyResult.exitCode !== 0) {
      throw new Error(`Failed to destroy database: ${destroyResult.stderr}`);
    }

    Logger.success(`PostgreSQL database destroyed: ${postgresDb}`);
  } else {
    Logger.warning(`PostgreSQL database not found: ${postgresDb}`);
  }
}

/**
 * Destroy frontend (Cloudflare Pages)
 */
async function destroyFrontend(environment: Environment): Promise<void> {
  Logger.info("Destroying frontend (Cloudflare Pages)...");

  // Note: Cloudflare Pages projects need to be deleted via the dashboard or API
  // We can provide instructions for manual deletion
  console.log("");
  Logger.warning("Frontend (Cloudflare Pages) Manual Cleanup Required:");
  console.log("");
  console.log(
    "1. Go to Cloudflare Pages dashboard: https://dash.cloudflare.com/pages"
  );
  console.log(`2. Find project: rabbithq-${environment}`);
  console.log("3. Click on the project");
  console.log("4. Go to Settings > General");
  console.log('5. Scroll down and click "Delete project"');
  console.log("");
  console.log("Alternatively, use Wrangler CLI:");
  console.log(`   wrangler pages project delete rabbithq-${environment}`);
  console.log("");
}

/**
 * Main destroy function
 */
async function destroyResources(options: DestroyOptions): Promise<void> {
  const { environment, force, component } = options;

  Logger.info(`Starting destruction for ${environment} environment...`);

  try {
    // Load configuration (may fail if env file is missing, that's OK)
    let config: EnvConfig;
    try {
      config = await loadEnvConfig(environment);
    } catch (error) {
      Logger.warning(
        "Could not load environment config, some operations may fail"
      );
      // Create a minimal config for basic operations
      config = {
        DOKKU_HOST: "",
        DOMAIN_BACKEND: "",
        DOMAIN_FRONTEND: "",
      } as EnvConfig;
    }

    // Confirm destruction
    const confirmed = await confirmDestruction(environment, component, force);
    if (!confirmed) {
      Logger.info("Destruction cancelled by user");
      return;
    }

    console.log("");
    Logger.info("Proceeding with destruction...");

    // Check Dokku connection (skip if no host configured)
    if (config.DOKKU_HOST && !(await checkDokkuConnection(config.DOKKU_HOST))) {
      Logger.warning(`Cannot connect to Dokku host: ${config.DOKKU_HOST}`);
      Logger.warning("Some operations may fail");
    }

    // Destroy components based on selection
    switch (component) {
      case "all":
        if (config.DOKKU_HOST) {
          await destroyBackend(config, environment);
          await destroyDatabase(config, environment);
        }
        await destroyFrontend(environment);
        break;
      case "backend":
        if (config.DOKKU_HOST) {
          await destroyBackend(config, environment);
        } else {
          Logger.error("DOKKU_HOST not configured, cannot destroy backend");
        }
        break;
      case "database":
        if (config.DOKKU_HOST) {
          await destroyDatabase(config, environment);
        } else {
          Logger.error("DOKKU_HOST not configured, cannot destroy database");
        }
        break;
      case "frontend":
        await destroyFrontend(environment);
        break;
      default:
        throw new Error(`Invalid component: ${component}`);
    }

    console.log("");
    Logger.success("Destruction completed! 💥");

    // Provide cleanup instructions
    console.log("");
    console.log("🧹 Additional Cleanup:");
    console.log("");
    console.log("Consider removing:");
    console.log(`   • DNS records for ${environment} domains`);
    console.log(
      `   • Local git remotes: git remote remove dokku-${environment}`
    );
    console.log(
      `   • Environment files: infrastructure/environments/${environment}/.env`
    );
    console.log(
      `   • Backup files: infrastructure/backups/rabbithq-${environment}-*`
    );
    console.log("");

    if (component === "all") {
      Logger.warning("All resources have been destroyed. To redeploy:");
      console.log(`   npm run deploy:${environment}`);
    }
  } catch (error) {
    Logger.error(
      `Destruction failed: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }
}

/**
 * Show destruction information
 */
async function showDestroyInfo(environment: Environment): Promise<void> {
  console.log("");
  console.log("💥 Destruction Information:");
  console.log("");
  console.log("Available Components:");
  console.log("   all       - Everything (backend + database + frontend)");
  console.log("   backend   - Dokku app only");
  console.log("   database  - PostgreSQL database only");
  console.log("   frontend  - Cloudflare Pages project");
  console.log("");
  console.log("Safety Features:");
  console.log("   • Interactive confirmation required");
  console.log("   • Type exact phrase to confirm");
  console.log("   • Use --force to skip confirmations (dangerous!)");
  console.log("");
  console.log("Examples:");
  console.log(`   tsx scripts/destroy.ts ${environment} all`);
  console.log(`   tsx scripts/destroy.ts ${environment} backend`);
  console.log(`   tsx scripts/destroy.ts ${environment} database --force`);
  console.log("");
  Logger.warning("⚠️  REMEMBER: Destruction is permanent!");
  console.log("");
}

/**
 * Main program
 */
const program = new Command();

program
  .name("destroy")
  .description("Remove applications and databases (BE CAREFUL!)")
  .argument("<environment>", "Environment (staging, production)")
  .argument(
    "[component]",
    "Component to destroy (all, backend, database, frontend)",
    "all"
  )
  .option("--force", "Skip confirmation prompts (DANGEROUS!)", false)
  .option("--info", "Show destruction information", false)
  .action(async (env: string, comp: string, options: any) => {
    try {
      const environment = validateEnvironment(env);

      if (options.info) {
        await showDestroyInfo(environment);
        return;
      }

      const component = comp as DestroyOptions["component"];
      if (!["all", "backend", "database", "frontend"].includes(component)) {
        throw new Error(
          `Invalid component: ${component}\nValid components: all, backend, database, frontend`
        );
      }

      await destroyResources({
        environment,
        force: options.force,
        component,
      });
    } catch (error) {
      Logger.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program.on("--help", () => {
  console.log("");
  console.log("Examples:");
  console.log("  $ npm run destroy:staging");
  console.log("  $ npm run destroy:production backend");
  console.log("  $ tsx scripts/destroy.ts staging database --force");
  console.log("  $ tsx scripts/destroy.ts production --info");
  console.log("");
  console.log("Components:");
  console.log("  all       - Everything (backend + database + frontend)");
  console.log("  backend   - Dokku application only");
  console.log("  database  - PostgreSQL database only");
  console.log("  frontend  - Cloudflare Pages project");
  console.log("");
  Logger.warning("⚠️  WARNING: This action cannot be undone!");
});

if (import.meta.url === `file://${process.argv[1]}`) {
  program.parse(process.argv);
}
