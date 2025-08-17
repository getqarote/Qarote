/**
 * Main entry point for the server setup script
 */
import { Command } from "commander";
import { Environment, Logger, validateEnvironment } from "../utils";
import { InfrastructureResult, SetupOptions } from "./common";
import { ensureSSHKey, getOrCreateHetznerLoadBalancer } from "./hetzner";
import {
  getServerConfig,
  provisionApplicationServer,
  provisionDatabaseServer,
  configureApplicationServer,
  configureDatabaseServer,
} from "./servers";

/**
 * Main setup function
 */
export async function setupInfrastructure(
  options: SetupOptions
): Promise<InfrastructureResult> {
  const { environment } = options;
  Logger.rocket(`Starting infrastructure setup for ${environment}...`);

  try {
    // Get SSH key
    const sshKey = await ensureSSHKey();
    Logger.success(`Using SSH key: ${sshKey.name}`);

    // Provision application server
    const appServer = await provisionApplicationServer(environment, sshKey.id);
    Logger.success(
      `Application server ${appServer.name} is ready at ${appServer.public_net.ipv4.ip}`
    );

    // Provision database server
    const dbServer = await provisionDatabaseServer(environment, sshKey.id);
    Logger.success(
      `Database server ${dbServer.name} is ready at ${dbServer.public_net.ipv4.ip}`
    );

    // Configure the servers to work together
    await configureApplicationServer(appServer);
    await configureDatabaseServer(dbServer, appServer.public_net.ipv4.ip);

    // Setup load balancer if required
    const config = getServerConfig(environment);
    const loadBalancer = await getOrCreateHetznerLoadBalancer(
      config.loadBalancer.name,
      [appServer.id],
      environment
    );
    Logger.success(
      `Load balancer ${loadBalancer.name} is ready at ${loadBalancer.public_net.ipv4.ip}`
    );

    // Return infrastructure details
    return {
      appServers: [appServer.public_net.ipv4.ip],
      dbServer: dbServer.public_net.ipv4.ip,
      loadBalancer: loadBalancer.public_net.ipv4.ip,
    };
  } catch (error) {
    Logger.error(
      `Infrastructure setup failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    throw error;
  }
}

/**
 * Display setup instructions after infrastructure has been created
 */
export async function displaySetupInstructions(
  infrastructure: InfrastructureResult,
  environment: Environment
): Promise<void> {
  Logger.rocket(`Infrastructure setup completed for ${environment}!`);
  Logger.info("Infrastructure details:");
  console.log(JSON.stringify(infrastructure, null, 2));

  Logger.info("\nNext steps:");
  Logger.info(
    "1. Update your DNS records to point to the load balancer IP: " +
      infrastructure.loadBalancer
  );
  Logger.info(
    "2. Run deployment to deploy the application: npm run deploy -- " +
      environment
  );
  Logger.info(
    "3. Configure SSL for your application using Let's Encrypt: npm run ssl-setup -- " +
      environment
  );
}

/**
 * Main entry point when run directly
 */
async function main() {
  const program = new Command();

  program
    .name("setup-server")
    .description("Server infrastructure setup utility")
    .argument("<environment>", "Target environment (staging or production)")
    .addHelpText(
      "after",
      `
Examples:
  npm run setup-server -- staging
  npm run setup-server -- production
`
    )
    .action(async (env) => {
      try {
        // Parse and validate environment
        const environment = validateEnvironment(env);

        // Setup options
        const options: SetupOptions = {
          sshUser: "rabbithq",
          environment,
        };

        // Run the setup
        const infrastructure = await setupInfrastructure(options);

        // Display instructions
        await displaySetupInstructions(infrastructure, environment);
      } catch (error) {
        Logger.error(
          `Setup failed: ${error instanceof Error ? error.message : String(error)}`
        );
        process.exit(1);
      }
    });

  program.parse();
}

// Run main function if script is called directly
// Use the last part of the script path to check if we're the main module
const scriptPath = process.argv[1] || "";
const scriptName = scriptPath.split("/").pop();
if (scriptName === "index.js") {
  main();
}
