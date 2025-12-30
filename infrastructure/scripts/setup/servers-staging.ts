/**
 * Staging server configuration and provisioning utilities
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
 * Get staging server config options
 */
function getStagingServerConfig(): ServerConfig {
  return {
    applicationServer: {
      name: `rabbithq-app-staging`,
      type: "cpx21", // Smaller instance for staging
    },
    databaseServer: {
      name: `rabbithq-db-staging`,
      type: "cpx21",
    },
    loadBalancer: {
      name: `rabbithq-lb-staging`,
    },
  };
}

/**
 * Set up an application server with Dokku (staging)
 */
async function setupStagingApplicationServer(
  server: HetznerServer
): Promise<void> {
  const serverIP = server.public_net.ipv4.ip;
  Logger.info(`Setting up staging application server at ${serverIP}...`);

  await waitForSSH(serverIP);

  const scriptPath = `${Paths.scriptDir}/setup/application-setup.sh`;
  await uploadFile(serverIP, scriptPath, "/tmp/application-setup.sh");

  const scriptOutput = await executeRemoteCommands(serverIP, [
    "sudo chmod +x /tmp/application-setup.sh",
    `sudo /tmp/application-setup.sh`,
  ]);

  if (scriptOutput.toLowerCase().includes("error")) {
    Logger.error("Staging application server setup encountered errors:");
    Logger.error(scriptOutput);
    throw new Error("Staging application server setup failed");
  }

  Logger.success("Staging application server setup completed successfully!");
}

/**
 * Set up a database server with PostgreSQL (staging)
 */
async function setupStagingDatabaseServer(
  server: HetznerServer
): Promise<void> {
  const serverIP = server.public_net.ipv4.ip;
  Logger.info(`Setting up staging database server at ${serverIP}...`);

  await waitForSSH(serverIP);

  const scriptPath = `${Paths.scriptDir}/setup/database-setup.sh`;
  await uploadFile(serverIP, scriptPath, "/tmp/database-setup.sh");

  const scriptOutput = await executeRemoteCommands(serverIP, [
    "sudo chmod +x /tmp/database-setup.sh",
    `sudo /tmp/database-setup.sh`,
  ]);

  if (scriptOutput.toLowerCase().includes("error")) {
    Logger.error("Staging database server setup encountered errors:");
    Logger.error(scriptOutput);
    throw new Error("Staging database server setup failed");
  }

  Logger.success("Staging database server setup completed successfully!");
}

/**
 * Provision and configure staging application server
 */
export async function provisionStagingApplicationServer(
  sshKeyId: number
): Promise<HetznerServer> {
  Logger.info(`Provisioning staging application server...`);

  const config = getStagingServerConfig();

  const server = await getOrCreateHetznerServer(
    config.applicationServer.name,
    config.applicationServer.type,
    sshKeyId,
    "staging"
  );

  await waitForServerReady(server.id);
  await setupStagingApplicationServer(server);

  return server;
}

/**
 * Provision and configure staging database server
 */
export async function provisionStagingDatabaseServer(
  sshKeyId: number
): Promise<HetznerServer> {
  Logger.info(`Provisioning staging database server...`);

  const config = getStagingServerConfig();

  const server = await getOrCreateHetznerServer(
    config.databaseServer.name,
    config.databaseServer.type,
    sshKeyId,
    "staging"
  );

  await waitForServerReady(server.id);
  await setupStagingDatabaseServer(server);

  return server;
}

/**
 * Configure staging application server (uses public IPs)
 */
export async function configureStagingApplicationServer(
  server: HetznerServer,
  dbServer: HetznerServer
): Promise<void> {
  const serverIP = server.public_net.ipv4.ip;
  const dbServerIP = dbServer.public_net.ipv4.ip; // Public IP for staging

  Logger.info(`Configuring staging application server at ${serverIP}...`);

  await waitForSSH(serverIP);

  const envVars = {
    DATABASE_URL: `postgres://dokku:dokku@${dbServerIP}:5432/rabbithq`,
    NODE_ENV: "staging",
  };

  await executeRemoteCommands(serverIP, [
    "sudo dokku apps:create rabbithq || true",
    `sudo dokku config:set rabbithq ${Object.entries(envVars)
      .map(([key, value]) => `${key}="${value}"`)
      .join(" ")}`,
    "sudo dokku domains:add rabbithq staging.qarote.io",
  ]);

  Logger.success("Staging application server configuration completed!");
}

/**
 * Configure staging database server (allows public access)
 */
export async function configureStagingDatabaseServer(
  server: HetznerServer,
  appServerIP: string
): Promise<void> {
  const serverIP = server.public_net.ipv4.ip;

  Logger.info(`Configuring staging database server at ${serverIP}...`);

  await waitForSSH(serverIP);

  await executeRemoteCommands(serverIP, [
    'sudo -u postgres psql -c "CREATE DATABASE rabbithq;" || true',
    "sudo -u postgres psql -c \"CREATE USER dokku WITH PASSWORD 'dokku';\" || true",
    'sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE rabbithq TO dokku;" || true',
    `sudo sed -i "/# IPv4 local connections:/a host    rabbithq        dokku           ${appServerIP}/32            md5" /etc/postgresql/*/main/pg_hba.conf`,
    "sudo systemctl restart postgresql",
  ]);

  Logger.success("Staging database server configuration completed!");
}

/**
 * Setup complete staging infrastructure
 */
export async function setupStagingInfrastructure(
  sshKeyId: number
): Promise<{ appServer: HetznerServer; dbServer: HetznerServer }> {
  Logger.rocket("Setting up staging infrastructure...");

  // Provision database server first
  const dbServer = await provisionStagingDatabaseServer(sshKeyId);

  // Provision application server
  const appServer = await provisionStagingApplicationServer(sshKeyId);

  // Configure servers
  await configureStagingDatabaseServer(dbServer, appServer.public_net.ipv4.ip);
  await configureStagingApplicationServer(appServer, dbServer);

  Logger.success("Staging infrastructure setup completed!");

  return { appServer, dbServer };
}
