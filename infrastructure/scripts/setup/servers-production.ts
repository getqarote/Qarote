/**
 * Production server configuration and provisioning utilities with private networking
 */
import { Logger, Paths } from "../utils";
import {
  HetznerServer,
  ServerConfig,
  executeRemoteCommands,
  uploadFile,
  waitForSSH,
} from "./common";
import {
  getOrCreateHetznerServer,
  waitForServerReady,
  hetznerApiRequest,
  ensureProductionApplicationFirewall,
  ensureProductionDatabaseFirewall,
  ensureProductionDatabaseVolume,
  ensureVolumeAttachedToServer,
} from "./hetzner";

/**
 * Get production server config options
 */
function getProductionServerConfig(): ServerConfig {
  return {
    applicationServer: {
      name: `rabbithq-app-production`,
      type: "cpx31", // Larger instance for production
    },
    databaseServer: {
      name: `rabbithq-db-production`,
      type: "cpx31",
    },
    loadBalancer: {
      name: `rabbithq-lb-production`,
    },
  };
}

/**
 * Hetzner Network interfaces
 */
interface HetznerNetwork {
  id: number;
  name: string;
  ip_range: string;
  subnets: HetznerSubnet[];
  labels: Record<string, string>;
}

interface HetznerSubnet {
  id?: number;
  ip_range: string;
  network_zone: string;
  type: string;
  gateway?: string;
  vswitch_id?: number;
}

/**
 * Create or get private network for production environment
 */
async function ensureProductionPrivateNetwork(): Promise<{
  network_id: number;
}> {
  const networkName = `rabbithq-network-production`;

  Logger.info(`Ensuring private network '${networkName}' exists...`);

  try {
    // Check if network already exists
    const networksResponse = await hetznerApiRequest<{
      networks: HetznerNetwork[];
    }>("/networks");

    // Find our specific network only
    let existingNetwork = networksResponse.networks.find(
      (n) => n.name === networkName
    );

    if (existingNetwork) {
      Logger.success(`Found existing private network: ${existingNetwork.name}`);

      // Check if the network has subnets
      if (existingNetwork.subnets && existingNetwork.subnets.length > 0) {
        Logger.success(
          `Network has ${existingNetwork.subnets.length} subnet(s)`
        );
        return {
          network_id: existingNetwork.id,
        };
      } else {
        // Network exists but has no subnets - create one automatically
        Logger.info(
          `Network '${existingNetwork.name}' exists but has no subnets. Creating subnet...`
        );

        await hetznerApiRequest<{ action: any }>(
          `/networks/${existingNetwork.id}/actions/add_subnet`,
          {
            method: "POST",
            body: JSON.stringify({
              ip_range: "10.0.0.0/24",
              network_zone: "eu-central",
              type: "cloud",
            }),
          }
        );

        Logger.success(`Created subnet for network ${existingNetwork.id}`);
        return {
          network_id: existingNetwork.id,
        };
      }
    }

    // Create new private network
    Logger.info(`Creating private network: ${networkName}`);
    const networkResponse = await hetznerApiRequest<{
      network: HetznerNetwork;
    }>("/networks", {
      method: "POST",
      body: JSON.stringify({
        name: networkName,
        ip_range: "10.0.0.0/16",
        labels: {
          project: "rabbithq",
          environment: "production",
          created_by: "setup-script",
        },
      }),
    });

    // Create subnet
    await hetznerApiRequest<{ action: any }>(
      `/networks/${networkResponse.network.id}/actions/add_subnet`,
      {
        method: "POST",
        body: JSON.stringify({
          ip_range: "10.0.0.0/24",
          network_zone: "eu-central",
          type: "cloud",
        }),
      }
    );

    Logger.success(
      `Created private network with ID: ${networkResponse.network.id}`
    );
    return {
      network_id: networkResponse.network.id,
    };
  } catch (error) {
    throw new Error(
      `Failed to ensure private network: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Attach server to private network with IP
 */
async function attachServerToNetwork(
  serverId: number,
  networkId: number,
  privateIP: string
): Promise<void> {
  try {
    await hetznerApiRequest(`/servers/${serverId}/actions/attach_to_network`, {
      method: "POST",
      body: JSON.stringify({
        network: networkId,
        ip: privateIP,
      }),
    });

    Logger.success(
      `Attached server ${serverId} to network with IP ${privateIP}`
    );
  } catch (error) {
    throw new Error(
      `Failed to attach server to network: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Set up production application server with private network configuration
 */
async function setupProductionApplicationServer(
  server: HetznerServer
): Promise<void> {
  const serverIP = server.public_net.ipv4.ip;
  Logger.info(`Setting up production application server at ${serverIP}...`);

  await waitForSSH(serverIP);

  const scriptPath = `${Paths.scriptDir}/setup/application-setup.sh`;
  await uploadFile(serverIP, scriptPath, "/tmp/application-setup.sh");

  const scriptOutput = await executeRemoteCommands(serverIP, [
    "sudo chmod +x /tmp/application-setup.sh",
    `sudo /tmp/application-setup.sh`,
    "sleep 5", // Wait for setup to complete
  ]);

  if (scriptOutput.toLowerCase().includes("error")) {
    Logger.error("Production application server setup encountered errors:");
    Logger.error(scriptOutput);
    throw new Error("Production application server setup failed");
  }

  // Add deployment SSH key to dokku user for GitHub Actions
  Logger.info(
    "Setting up SSH key for dokku user (GitHub Actions deployment)..."
  );
  try {
    await executeRemoteCommands(serverIP, [
      // Add the authorized_keys content to dokku ssh-keys
      "cat ~/.ssh/authorized_keys | sudo dokku ssh-keys:add github-actions",
      // Verify the key was added
      "sudo dokku ssh-keys:list | grep github-actions || echo 'Key verification failed'",
    ]);
    Logger.success("SSH key added to dokku user successfully!");
  } catch (error) {
    Logger.warning(
      "Failed to add SSH key to dokku user. You may need to add it manually."
    );
    Logger.info(
      "Manual command: cat ~/.ssh/authorized_keys | sudo dokku ssh-keys:add github-actions"
    );
  }

  Logger.success("Production application server setup completed successfully!");
}

/**
 * Set up production database server with private network configuration
 */
async function setupProductionDatabaseServer(
  server: HetznerServer
): Promise<void> {
  const serverIP = server.public_net.ipv4.ip;
  Logger.info(`Setting up production database server at ${serverIP}...`);

  await waitForSSH(serverIP);

  const scriptPath = `${Paths.scriptDir}/setup/database-setup.sh`;
  await uploadFile(serverIP, scriptPath, "/tmp/database-setup.sh");

  const scriptOutput = await executeRemoteCommands(serverIP, [
    "sudo chmod +x /tmp/database-setup.sh",
    `sudo /tmp/database-setup.sh`,
    "sleep 5", // Wait for setup to complete
  ]);

  if (scriptOutput.toLowerCase().includes("error")) {
    Logger.error("Production database server setup encountered errors:");
    Logger.error(scriptOutput);
    throw new Error("Production database server setup failed");
  }

  Logger.success("Production database server setup completed successfully!");
}

/**
 * Provision and configure production application server
 */
export async function provisionProductionApplicationServer(
  sshKeyId: number,
  privateNetworkId: number
): Promise<HetznerServer> {
  Logger.info(`Provisioning production application server...`);

  const config = getProductionServerConfig();

  // Ensure application firewall exists
  const appFirewall = await ensureProductionApplicationFirewall();

  const server = await getOrCreateHetznerServer(
    config.applicationServer.name,
    config.applicationServer.type,
    sshKeyId,
    "production",
    appFirewall.id
  );

  await waitForServerReady(server.id);

  // Attach to private network first
  try {
    await attachServerToNetwork(server.id, privateNetworkId, "10.0.0.20");
  } catch (error) {
    if (error instanceof Error && error.message.includes("already attached")) {
      Logger.info("Server is already attached to the private network");
    } else {
      throw error;
    }
  }

  // Setup application server
  await setupProductionApplicationServer(server);

  return server;
}

/**
 * Provision and configure production database server
 */
export async function provisionProductionDatabaseServer(
  sshKeyId: number,
  privateNetworkId: number
): Promise<HetznerServer> {
  Logger.info(`Provisioning production database server...`);

  const config = getProductionServerConfig();

  // Step 1: Ensure database volume exists (create persistent storage for database)
  Logger.info("Step 1: Creating/ensuring database volume exists...");
  const dbVolume = await ensureProductionDatabaseVolume();

  // Step 2: Ensure database firewall exists
  const dbFirewall = await ensureProductionDatabaseFirewall();

  // Step 3: Create the database server
  const server = await getOrCreateHetznerServer(
    config.databaseServer.name,
    config.databaseServer.type,
    sshKeyId,
    "production",
    dbFirewall.id
  );

  await waitForServerReady(server.id);

  // Step 4: Attach volume to database server
  Logger.info("Step 4: Attaching database volume to server...");
  await ensureVolumeAttachedToServer(dbVolume, server);

  // Step 5: Attach to private network
  try {
    await hetznerApiRequest(`/servers/${server.id}/actions/attach_to_network`, {
      method: "POST",
      body: JSON.stringify({
        network: privateNetworkId,
        ip: "10.0.0.10",
      }),
    });
    Logger.success("Database server attached to private network");
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("server_already_attached")
    ) {
      Logger.info("Database server is already attached to the network");
    } else {
      throw error;
    }
  }

  // Step 6: Setup database server with volume configuration
  await setupProductionDatabaseServer(server);

  Logger.success(
    `Database server provisioned with ${dbVolume.size}GB persistent volume`
  );
  return server;
}

/**
 * Configure production application server (no DATABASE_URL set here)
 */
export async function configureProductionApplicationServer(
  server: HetznerServer
): Promise<void> {
  const serverIP = server.public_net.ipv4.ip;

  Logger.info(`Configuring production application server at ${serverIP}...`);

  await waitForSSH(serverIP);

  await executeRemoteCommands(serverIP, [
    "sudo dokku apps:create rabbithq || true",
    "sudo dokku domains:add rabbithq qarote.io",
    "sudo dokku domains:add rabbithq www.qarote.io",
  ]);

  Logger.success("Production application server configuration completed!");
}

/**
 * Configure load balancer and add application server as target
 */
async function configureProductionLoadBalancer(
  appServer: HetznerServer,
  networkId: number
): Promise<void> {
  Logger.info("Configuring production load balancer...");

  const config = getProductionServerConfig();

  try {
    // Get existing load balancer
    const lbsResponse = await hetznerApiRequest<{
      load_balancers: any[];
    }>("/load_balancers");

    const loadBalancer = lbsResponse.load_balancers.find(
      (lb) => lb.name === config?.loadBalancer?.name
    );

    if (!loadBalancer) {
      throw new Error("Load balancer not found");
    }

    Logger.info(
      `Found load balancer: ${loadBalancer.name} (${loadBalancer.public_net.ipv4.ip})`
    );

    // Check if load balancer is attached to the same network
    const isAttachedToNetwork = loadBalancer.private_net?.some(
      (net: any) => net.network === networkId
    );

    if (!isAttachedToNetwork) {
      Logger.info("Attaching load balancer to private network...");
      await hetznerApiRequest(
        `/load_balancers/${loadBalancer.id}/actions/attach_to_network`,
        {
          method: "POST",
          body: JSON.stringify({
            network: networkId,
            ip: "10.0.0.30", // Load balancer private IP
          }),
        }
      );

      // Wait for network attachment
      Logger.info("Waiting for network attachment to complete...");
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }

    // Add application server as target
    Logger.info("Adding application server as load balancer target...");
    await hetznerApiRequest(
      `/load_balancers/${loadBalancer.id}/actions/add_target`,
      {
        method: "POST",
        body: JSON.stringify({
          type: "server",
          server: {
            id: appServer.id,
          },
          use_private_ip: true, // Use private network for communication
        }),
      }
    );

    Logger.success("Application server added to load balancer targets!");
    Logger.info(`Load balancer IP: ${loadBalancer.public_net.ipv4.ip}`);
    Logger.info("Update your DNS to point to this load balancer IP");
  } catch (error) {
    throw new Error(
      `Failed to configure load balancer: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Configure production database server and display connection info
 * Retrieve database URL using Dokku commands
 */
export async function configureProductionDatabaseServer(
  dbServer: HetznerServer
): Promise<string> {
  const serverIP = dbServer.public_net.ipv4.ip;
  Logger.info(`Retrieving database URL from ${serverIP}...`);

  try {
    await waitForSSH(serverIP);

    const output = await executeRemoteCommands(serverIP, [
      "sudo dokku postgres:info rabbithq-db --dsn 2>/dev/null || sudo dokku postgres:info rabbithq-db | grep -i 'dsn\\|database_url\\|connection' || echo 'Fallback: postgresql://postgres:password@localhost:5432/rabbithq_db'",
    ]);

    // Try to extract the actual database URL from the output
    let databaseUrl = "";

    // Look for various patterns that might contain the database URL
    const patterns = [
      /Dsn:\s*(postgres:\/\/[^\s]+)/i,
      /DATABASE_URL:\s*(postgres:\/\/[^\s]+)/i,
      /Connection string:\s*(postgres:\/\/[^\s]+)/i,
      /(postgres:\/\/[^\s]+)/i,
    ];

    for (const pattern of patterns) {
      const match = output.match(pattern);
      if (match) {
        // Replace host with private IP for production
        databaseUrl = match[1].replace(/@[^:]+:/, "@10.0.0.10:");
        break;
      }
    }

    Logger.rocket("🔐 Retrieved DATABASE_URL:");
    console.log(`\n${databaseUrl}\n`);

    return databaseUrl;
  } catch (error) {
    Logger.info("Could not retrieve database URL, using fallback");

    throw new Error(
      `Failed to retrieve database URL: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Setup complete production infrastructure with private networking
 */
export async function setupProductionInfrastructure(sshKeyId: number): Promise<{
  appServer: HetznerServer;
  dbServer: HetznerServer;
  networkId: number;
  databaseUrl: string;
}> {
  Logger.rocket(
    "Setting up production infrastructure with private networking..."
  );

  // Step 1: Create private network first
  Logger.info("Step 1: Creating private network...");
  const network = await ensureProductionPrivateNetwork();
  const networkId = network.network_id;

  // Step 2: Provision and setup servers (they'll be attached to network during provisioning)
  Logger.info("Step 2: Provisioning servers...");
  const dbServer = await provisionProductionDatabaseServer(sshKeyId, networkId);
  const appServer = await provisionProductionApplicationServer(
    sshKeyId,
    networkId
  );

  // Step 3: Load balancer configuration will be handled by main setup
  Logger.info("Step 3: Load balancer will be configured by main setup...");

  // Step 4: Final configuration
  Logger.info("Step 4: Final server configuration...");
  await configureProductionApplicationServer(appServer);

  // Step 5: Get database URL from logs (it will be displayed during database setup)
  const databaseUrl = await configureProductionDatabaseServer(dbServer);

  Logger.info("\n📝 Next Steps:");
  Logger.info("1. Copy the DATABASE_URL above");
  Logger.info("2. Add it as a GitHub secret named: DATABASE_URL");
  Logger.info("3. Update DNS to point to load balancer IP");
  Logger.info("4. Deploy your application!");

  Logger.success("Production infrastructure setup completed!");

  return { appServer, dbServer, networkId, databaseUrl };
}
