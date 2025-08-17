/**
 * Server configuration and provisioning utilities
 */
import { Logger, Paths } from "../utils";
import {
  HetznerServer,
  ServerConfig,
  executeRemoteCommands,
  uploadFile,
  waitForSSH,
} from "./common";
import { getOrCreateHetznerServer, waitForServerReady } from "./hetzner";

/**
 * Get standard server config options based on environment
 */
export function getServerConfig(environment: string): ServerConfig {
  const isProd = environment === "production";

  return {
    applicationServer: {
      name: `rabbithq-app-${environment}`,
      type: isProd ? "cpx31" : "cpx21",
    },
    databaseServer: {
      name: `rabbithq-db-${environment}`,
      type: isProd ? "cpx31" : "cpx21",
    },
    loadBalancer: {
      name: `rabbithq-lb-${environment}`,
    },
  };
}

/**
 * Set up an application server with Dokku
 */
export async function setupApplicationServer(
  server: HetznerServer,
  environment: string
): Promise<void> {
  const serverIP = server.public_net.ipv4.ip;
  Logger.info(`Setting up application server at ${serverIP}...`);

  // Wait for SSH to be available on the server
  await waitForSSH(serverIP);

  // Upload application setup script
  const scriptPath = `${Paths.scriptDir}/setup/application-setup.sh`;
  await uploadFile(serverIP, scriptPath, "/tmp/application-setup.sh");

  // Execute setup script
  Logger.info("Running application server setup script...");
  const scriptOutput = await executeRemoteCommands(serverIP, [
    "sudo chmod +x /tmp/application-setup.sh",
    `sudo ENV=${environment} /tmp/application-setup.sh`, // ??
  ]);

  if (scriptOutput.toLowerCase().includes("error")) {
    Logger.error("Application server setup encountered errors:");
    Logger.error(scriptOutput);
    throw new Error("Application server setup failed");
  }

  Logger.success("Application server setup completed successfully!");
}

/**
 * Set up a database server with PostgreSQL
 */
export async function setupDatabaseServer(
  server: HetznerServer,
  environment: string
): Promise<void> {
  const serverIP = server.public_net.ipv4.ip;
  Logger.info(`Setting up database server at ${serverIP}...`);

  // Wait for SSH to be available on the server
  await waitForSSH(serverIP);

  // Upload database setup script
  const scriptPath = `${Paths.scriptDir}/setup/database-setup.sh`;
  await uploadFile(serverIP, scriptPath, "/tmp/database-setup.sh");

  // Execute setup script
  Logger.info("Running database server setup script...");
  const scriptOutput = await executeRemoteCommands(serverIP, [
    "sudo chmod +x /tmp/database-setup.sh",
    `sudo ENV=${environment} /tmp/database-setup.sh`,
  ]);

  if (scriptOutput.toLowerCase().includes("error")) {
    Logger.error("Database server setup encountered errors:");
    Logger.error(scriptOutput);
    throw new Error("Database server setup failed");
  }

  Logger.success("Database server setup completed successfully!");
}

/**
 * Provision and configure application server
 */
export async function provisionApplicationServer(
  environment: string,
  sshKeyId: number
): Promise<HetznerServer> {
  Logger.info(`Provisioning application server for ${environment}...`);

  // Get server configuration
  const config = getServerConfig(environment);

  // Create or get application server
  const server = await getOrCreateHetznerServer(
    config.applicationServer.name,
    config.applicationServer.type,
    sshKeyId,
    environment
  );

  // Wait for server to be ready
  await waitForServerReady(server.id);

  // Set up application server
  await setupApplicationServer(server, environment);

  return server;
}

/**
 * Provision and configure database server
 */
export async function provisionDatabaseServer(
  environment: string,
  sshKeyId: number
): Promise<HetznerServer> {
  Logger.info(`Provisioning database server for ${environment}...`);

  // Get server configuration
  const config = getServerConfig(environment);

  // Create or get database server
  const server = await getOrCreateHetznerServer(
    config.databaseServer.name,
    config.databaseServer.type,
    sshKeyId,
    environment
  );

  // Wait for server to be ready
  await waitForServerReady(server.id);

  // Set up database server
  await setupDatabaseServer(server, environment);

  return server;
}

/**
 * Configure application server with environment variables and settings
 */
export async function configureApplicationServer(
  server: HetznerServer
  // dbServer: HetznerServer
): Promise<void> {
  const serverIP = server.public_net.ipv4.ip;
  // const dbServerIP = dbServer.public_net.ipv4.ip;

  Logger.info(`Configuring application server at ${serverIP}...`);

  // Wait for SSH to be available
  await waitForSSH(serverIP);

  // Set up database connection info
  // const envVars = {
  //   DATABASE_URL: `postgres://dokku:dokku@${dbServerIP}:5432/rabbithq`,
  // };

  // Create app if it doesn't exist
  await executeRemoteCommands(serverIP, [
    "sudo dokku apps:create rabbithq || true",
    // `sudo dokku config:set rabbithq ${Object.entries(envVars)
    //   .map(([key, value]) => `${key}="${value}"`)
    //   .join(" ")}`,
    "sudo dokku domains:add rabbithq rabbithq.io",
  ]);

  Logger.success("Application server configuration completed!");
}

/**
 * Configure database server for the application
 */
export async function configureDatabaseServer(
  server: HetznerServer,
  appServerIP: string
): Promise<void> {
  const serverIP = server.public_net.ipv4.ip;

  Logger.info(`Configuring database server at ${serverIP}...`);

  // Wait for SSH to be available
  await waitForSSH(serverIP);

  // Create database and user for application
  await executeRemoteCommands(serverIP, [
    'sudo -u postgres psql -c "CREATE DATABASE rabbithq;" || true',
    "sudo -u postgres psql -c \"CREATE USER dokku WITH PASSWORD 'dokku';\" || true",
    'sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE rabbithq TO dokku;" || true',
    `sudo sed -i "/# IPv4 local connections:/a host    rabbithq        dokku           ${appServerIP}/32            md5" /etc/postgresql/*/main/pg_hba.conf`,
    "sudo systemctl restart postgresql",
  ]);

  Logger.success("Database server configuration completed!");
}
