#!/usr/bin/env tsx

/**
 * RabbitHQ Status Check Script
 * Check the status of deployed applications
 */

import { Command } from "commander";
import {
  Logger,
  executeCommand,
  sshCommand,
  checkDokkuConnection,
  loadEnvConfig,
  validateEnvironment,
  getAppNames,
  type Environment,
  type EnvConfig,
} from "./utils.js";

/**
 * Check backend application status
 */
async function checkBackendStatus(
  config: EnvConfig,
  environment: Environment
): Promise<void> {
  const { backend: backendApp, postgres: postgresDb } =
    getAppNames(environment);

  console.log("");
  console.log("🔍 Backend Application Status:");

  const appExistsResult = await sshCommand(
    config.DOKKU_HOST,
    `apps:exists ${backendApp}`
  );
  if (appExistsResult.exitCode === 0) {
    console.log(`   App Name: ${backendApp}`);
    console.log(`   URL: https://${config.DOMAIN_BACKEND}`);

    // Get app status
    const statusResult = await sshCommand(
      config.DOKKU_HOST,
      `ps:report ${backendApp}`
    );
    if (statusResult.exitCode === 0) {
      const statusMatch = statusResult.stdout.match(/Status:\s*(.+)/);
      const status = statusMatch ? statusMatch[1].trim() : "Unknown";
      console.log(`   Status: ${status}`);
    }

    // Get running processes
    const scaleResult = await sshCommand(
      config.DOKKU_HOST,
      `ps:scale ${backendApp}`
    );
    if (scaleResult.exitCode === 0) {
      console.log(`   Processes: ${scaleResult.stdout.trim() || "Unknown"}`);
    }

    // Test health endpoint
    try {
      const healthResult = await executeCommand("curl", [
        "-s",
        "-f",
        `https://${config.DOMAIN_BACKEND}/health`,
      ]);

      if (healthResult.exitCode === 0) {
        Logger.success("   Health check: PASSED");
      } else {
        Logger.warning("   Health check: FAILED");
      }
    } catch {
      Logger.warning("   Health check: FAILED");
    }
  } else {
    Logger.error(`   Backend app not found: ${backendApp}`);
  }
}

/**
 * Check PostgreSQL database status
 */
async function checkDatabaseStatus(
  config: EnvConfig,
  environment: Environment
): Promise<void> {
  const { postgres: postgresDb } = getAppNames(environment);

  console.log("");
  console.log("🗄️  PostgreSQL Database Status:");

  const dbExistsResult = await sshCommand(
    config.DOKKU_HOST,
    `postgres:exists ${postgresDb}`
  );
  if (dbExistsResult.exitCode === 0) {
    console.log(`   Database Name: ${postgresDb}`);

    // Get database info
    const infoResult = await sshCommand(
      config.DOKKU_HOST,
      `postgres:info ${postgresDb}`
    );
    if (infoResult.exitCode === 0) {
      const lines = infoResult.stdout.split("\n");
      lines.forEach((line) => {
        if (line.trim() && !line.includes("====")) {
          console.log(`   ${line.trim()}`);
        }
      });
    }

    // Check if database is linked to app
    const { backend: backendApp } = getAppNames(environment);
    const linksResult = await sshCommand(
      config.DOKKU_HOST,
      `postgres:links ${postgresDb}`
    );
    if (linksResult.exitCode === 0 && linksResult.stdout.includes(backendApp)) {
      Logger.success(`   Linked to: ${backendApp}`);
    } else {
      Logger.warning(`   Not linked to: ${backendApp}`);
    }
  } else {
    Logger.error(`   PostgreSQL database not found: ${postgresDb}`);
  }
}

/**
 * Check frontend status
 */
async function checkFrontendStatus(
  config: EnvConfig,
  environment: Environment
): Promise<void> {
  console.log("");
  console.log("🌐 Frontend Application Status:");
  console.log(`   URL: https://${config.DOMAIN_FRONTEND}`);
  console.log(`   Platform: Cloudflare Pages`);
  console.log(`   Project: rabbithq-${environment}`);

  // Test frontend accessibility
  try {
    const frontendResult = await executeCommand("curl", [
      "-s",
      "-f",
      "-I",
      `https://${config.DOMAIN_FRONTEND}`,
    ]);

    if (frontendResult.exitCode === 0) {
      Logger.success("   Accessibility: ACCESSIBLE");
    } else {
      Logger.warning("   Accessibility: FAILED");
    }
  } catch {
    Logger.warning("   Accessibility: FAILED");
  }
}

/**
 * Check SSL certificates
 */
async function checkSSLStatus(
  config: EnvConfig,
  environment: Environment
): Promise<void> {
  const { backend: backendApp } = getAppNames(environment);

  console.log("");
  console.log("🔐 SSL Certificate Status:");

  const sslResult = await sshCommand(config.DOKKU_HOST, `letsencrypt:ls`);
  if (sslResult.exitCode === 0) {
    if (sslResult.stdout.includes(backendApp)) {
      Logger.success(`   Backend SSL: ENABLED`);
    } else {
      Logger.warning(`   Backend SSL: NOT ENABLED`);
    }
  }

  // Check certificate expiry for both domains
  for (const domain of [config.DOMAIN_BACKEND, config.DOMAIN_FRONTEND]) {
    try {
      const certResult = await executeCommand("echo", [""], {
        shell: true,
      });

      // Use openssl command directly via shell
      const opensslResult = await executeCommand("sh", [
        "-c",
        `echo "" | openssl s_client -connect ${domain}:443 -servername ${domain} -showcerts 2>/dev/null | openssl x509 -noout -dates`,
      ]);

      if (
        opensslResult.exitCode === 0 &&
        opensslResult.stdout.includes("notAfter")
      ) {
        Logger.success(`   ${domain}: SSL VALID`);
      } else {
        Logger.warning(`   ${domain}: SSL ISSUES`);
      }
    } catch {
      Logger.warning(`   ${domain}: SSL CHECK FAILED`);
    }
  }
}

/**
 * Display resource usage
 */
async function checkResourceUsage(
  config: EnvConfig,
  environment: Environment
): Promise<void> {
  console.log("");
  console.log("📊 Server Resource Usage:");

  const commands = [
    { label: "CPU Usage", cmd: "top -bn1 | grep 'Cpu(s)' | awk '{print $2}'" },
    {
      label: "Memory Usage",
      cmd: "free -h | awk 'NR==2{printf \"%.1f%%\", $3/$2*100}'",
    },
    { label: "Disk Usage", cmd: "df -h / | awk 'NR==2{print $5}'" },
  ];

  for (const { label, cmd } of commands) {
    try {
      const result = await sshCommand(config.DOKKU_HOST, cmd);
      if (result.exitCode === 0) {
        console.log(`   ${label}: ${result.stdout.trim()}`);
      }
    } catch {
      console.log(`   ${label}: Unable to fetch`);
    }
  }
}

/**
 * Main status check function
 */
async function checkStatus(environment: Environment): Promise<void> {
  Logger.info(`Checking status for ${environment} environment...`);

  try {
    // Load configuration
    const config = await loadEnvConfig(environment);

    // Check if Dokku host is accessible
    if (!(await checkDokkuConnection(config.DOKKU_HOST))) {
      Logger.error(`Cannot connect to Dokku host: ${config.DOKKU_HOST}`);
      process.exit(1);
    }

    Logger.success(`Connected to Dokku host: ${config.DOKKU_HOST}`);

    // Run all status checks
    await checkBackendStatus(config, environment);
    await checkDatabaseStatus(config, environment);
    await checkFrontendStatus(config, environment);
    await checkSSLStatus(config, environment);
    await checkResourceUsage(config, environment);

    console.log("");
    Logger.success("Status check completed! 🎉");

    console.log("");
    console.log("🔧 Useful commands:");
    console.log(`   • View logs:     npm run logs:${environment}`);
    console.log(`   • Scale app:     npm run scale:${environment} 2`);
    console.log(`   • SSH to server: ssh dokku@${config.DOKKU_HOST}`);
  } catch (error) {
    Logger.error(
      `Status check failed: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }
}

/**
 * Main program
 */
const program = new Command();

program
  .name("status")
  .description("Check the status of deployed applications")
  .argument("<environment>", "Environment (staging, production)")
  .action(async (env: string) => {
    try {
      const environment = validateEnvironment(env);
      await checkStatus(environment);
    } catch (error) {
      Logger.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program.on("--help", () => {
  console.log("");
  console.log("Examples:");
  console.log("  $ npm run status:staging");
  console.log("  $ npm run status:production");
  console.log("  $ tsx scripts/status.ts staging");
});

if (import.meta.url === `file://${process.argv[1]}`) {
  program.parse(process.argv);
}
