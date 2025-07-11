#!/usr/bin/env tsx

/**
 * RabbitHQ Server Setup Script
 * This script sets up Dokku on servers or creates them via Hetzner Cloud API
 */

import { Command } from "commander";
import { Logger, executeCommand, Paths } from "./utils.js";
import { promises as fs } from "fs";
import * as path from "path";
import { config } from "dotenv";

// Load environment variables from both infrastructure and environment-specific directories
config({ path: path.join(process.cwd(), "environments", "staging", ".env") });
config({
  path: path.join(process.cwd(), "environments", "production", ".env"),
});

interface SetupOptions {
  sshUser: string;
  environment: "staging" | "production";
}

interface HetznerServer {
  id: number;
  name: string;
  status: string;
  public_net: {
    ipv4: {
      ip: string;
    };
  };
}

interface HetznerLoadBalancer {
  id: number;
  name: string;
  public_net: {
    ipv4: {
      ip: string;
    };
  };
}

interface HetznerSSHKey {
  id: number;
  name: string;
  public_key: string;
}

/**
 * Get the appropriate SSH key path - uses main id_rsa key
 */
function getSSHKeyPath(): string {
  const mainKeyPath = path.join(process.env.HOME || "", ".ssh", "id_rsa");

  try {
    require("fs").accessSync(mainKeyPath);
    return mainKeyPath;
  } catch {
    throw new Error(
      "No SSH key found at ~/.ssh/id_rsa. Please generate an SSH key pair first with: ssh-keygen -t rsa -b 4096"
    );
  }
}

/**
 * Wait for SSH connection to be ready with retries
 */
async function waitForSshReady(
  serverIp: string,
  sshUser: string,
  maxAttempts: number = 20
): Promise<void> {
  const sshKeyPath = getSSHKeyPath();

  Logger.info(
    `Waiting for SSH connection to ${serverIp} to be ready for user '${sshUser}'...`
  );

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await executeCommand("ssh", [
        "-i",
        sshKeyPath, // Use appropriate SSH key
        "-o",
        "ConnectTimeout=10",
        "-o",
        "StrictHostKeyChecking=no",
        "-o",
        "UserKnownHostsFile=/dev/null",
        "-o",
        "LogLevel=ERROR",
        `${sshUser}@${serverIp}`,
        "echo 'SSH connection successful'",
      ]);

      if (result.exitCode === 0) {
        Logger.success(
          `SSH connection established successfully for user '${sshUser}'!`
        );
        return;
      }
    } catch (error) {
      // Ignore errors during retry attempts
    }

    Logger.info(
      `Attempt ${attempt}/${maxAttempts}: SSH not ready yet for user '${sshUser}', waiting 15 seconds...`
    );
    await new Promise((resolve) => setTimeout(resolve, 15_000));
  }

  throw new Error(
    `SSH connection to ${serverIp} failed for user '${sshUser}' after ${maxAttempts} attempts. Please check user exists and has SSH access.`
  );
}

/**
 * Test SSH connection to server with sudo capabilities
 */
async function testSshConnection(
  serverIp: string,
  sshUser: string
): Promise<void> {
  const sshKeyPath = getSSHKeyPath();

  Logger.info(
    `Testing SSH connection and sudo access for user '${sshUser}'...`
  );

  try {
    // Test basic SSH connection
    const basicResult = await executeCommand("ssh", [
      "-i",
      sshKeyPath, // Use appropriate SSH key
      "-o",
      "ConnectTimeout=10",
      "-o",
      "StrictHostKeyChecking=no",
      "-o",
      "UserKnownHostsFile=/dev/null",
      `${sshUser}@${serverIp}`,
      "echo 'SSH connection successful'",
    ]);

    if (basicResult.exitCode !== 0) {
      throw new Error("SSH connection failed");
    }

    // Test sudo access
    const sudoResult = await executeCommand("ssh", [
      "-i",
      sshKeyPath, // Use appropriate SSH key
      "-o",
      "ConnectTimeout=10",
      "-o",
      "StrictHostKeyChecking=no",
      "-o",
      "UserKnownHostsFile=/dev/null",
      `${sshUser}@${serverIp}`,
      "sudo echo 'Sudo access confirmed'",
    ]);

    if (sudoResult.exitCode !== 0) {
      throw new Error("Sudo access failed");
    }

    Logger.success(
      `SSH connection and sudo access confirmed for user '${sshUser}'`
    );
  } catch (error) {
    Logger.error(`Failed to connect to server via SSH for user '${sshUser}'`);
    Logger.error("Please ensure:");
    Logger.error("1. Server is running and accessible");
    Logger.error("2. SSH key is added to the server");
    Logger.error(`3. User '${sshUser}' exists and has sudo privileges`);
    Logger.error("4. Server has finished initial cloud-config setup");
    throw error;
  }
}

/**
 * Hetzner Cloud API Configuration
 */
const HETZNER_API_URL = "https://api.hetzner.cloud/v1";
const HETZNER_API_TOKEN = process.env.HETZNER_API_TOKEN;

/**
 * Make a request to Hetzner Cloud API using fetch
 */
async function hetznerApiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  if (!HETZNER_API_TOKEN) {
    throw new Error("HETZNER_API_TOKEN environment variable is required");
  }

  const url = `${HETZNER_API_URL}${endpoint}`;
  const headers = {
    Authorization: `Bearer ${HETZNER_API_TOKEN}`,
    "Content-Type": "application/json",
    ...options.headers,
  };

  try {
    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Hetzner API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Failed to make request to Hetzner API: ${String(error)}`);
  }
}

/**
 * Get or create SSH key in Hetzner Cloud
 */
async function ensureSSHKey(environment: string): Promise<HetznerSSHKey> {
  Logger.info("Checking SSH key in Hetzner Cloud...");

  // Check for local SSH key first - use main id_rsa key
  const mainKeyPath = path.join(process.env.HOME || "", ".ssh", "id_rsa.pub");
  let localPublicKey: string;
  let keyUsed: string;

  try {
    localPublicKey = await fs.readFile(mainKeyPath, "utf-8");
    localPublicKey = localPublicKey.trim();
    keyUsed = "main key (id_rsa.pub)";
    Logger.info("Using main SSH key for authentication");
  } catch (error) {
    Logger.error("Please generate an SSH key pair first:");
    Logger.error("  ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa");
    process.exit(1);
  }

  // Get all existing SSH keys
  try {
    const response = await hetznerApiRequest<{ ssh_keys: HetznerSSHKey[] }>(
      "/ssh_keys"
    );

    // Check if any existing key matches our local key
    const matchingKey = response.ssh_keys.find((key) => {
      // Compare the public key content (strip whitespace and compare)
      const existingKeyContent = key.public_key.trim() + " " + key.name;
      const localKeyContent = localPublicKey.trim();
      return existingKeyContent === localKeyContent;
    });

    if (matchingKey) {
      Logger.success(`Found existing SSH key: ${matchingKey.name}`);
      return matchingKey;
    }

    Logger.info("No matching SSH key found, checking for preferred key...");

    // Check for key with our preferred name
    const keyName = `rabbit-hq-main-${keyUsed.includes("main") ? "standard" : "fallback"}`;
    const existingKeyByName = response.ssh_keys.find(
      (key) => key.name === keyName
    );

    if (!existingKeyByName) {
      Logger.info(
        `No existing SSH key found with name '${keyName}', creating a new one...`
      );
      throw new Error(`No existing SSH key found with name '${keyName}'`);
    }

    Logger.warning(
      `Key with name '${keyName}' exists but has different content`
    );
    Logger.info("Using existing key with that name...");
    return existingKeyByName;
  } catch (error) {
    Logger.warning(
      "Could not fetch existing SSH keys, will attempt to create new one"
    );
  }

  // Create new SSH key with unique name
  Logger.info(`Creating new SSH key using ${keyUsed}...`);

  const timestamp = Date.now();
  const keyName = `rabbit-hq-main-${keyUsed.includes("main") ? "standard" : "fallback"}-${timestamp}`;

  try {
    const newKey = await hetznerApiRequest<{ ssh_key: HetznerSSHKey }>(
      "/ssh_keys",
      {
        method: "POST",
        body: JSON.stringify({
          name: keyName,
          public_key: localPublicKey,
          labels: {
            environment,
            project: "rabbit-hq",
            createdBy: "setup-script",
            // createdAt: new Date().toISOString(),
          },
        }),
      }
    );

    Logger.success(`Created SSH key: ${keyName}`);
    return newKey.ssh_key;
  } catch (error) {
    if (error instanceof Error && error.message.includes("uniqueness_error")) {
      Logger.error(
        "SSH key with this fingerprint already exists in Hetzner Cloud"
      );
      Logger.info("Attempting to find and use the existing key...");

      // Try again to find existing keys
      try {
        const response = await hetznerApiRequest<{ ssh_keys: HetznerSSHKey[] }>(
          "/ssh_keys"
        );

        if (response.ssh_keys.length > 0) {
          const existingKey = response.ssh_keys[0];
          Logger.success(`Using existing SSH key: ${existingKey.name}`);
          return existingKey;
        }
      } catch (fetchError) {
        Logger.error("Could not fetch existing SSH keys");
      }

      Logger.error("Could not resolve SSH key conflict. Please:");
      Logger.error("1. Go to Hetzner Cloud Console → Security → SSH Keys");
      Logger.error("2. Delete duplicate SSH keys");
      Logger.error("3. Run the setup command again");
      process.exit(1);
    }
    throw error;
  }
}

/**
 * Get existing server by name or create new one (idempotent)
 */
async function getOrCreateHetznerServer(
  name: string,
  serverType: string,
  sshKeyId: number,
  environment: string
): Promise<HetznerServer> {
  Logger.info(`Checking if server '${name}' exists...`);

  try {
    // Check if server already exists
    const response = await hetznerApiRequest<{ servers: HetznerServer[] }>(
      "/servers"
    );

    const existingServer = response.servers.find(
      (server) => server.name === name
    );

    if (existingServer) {
      Logger.success(`Server '${name}' already exists, using existing server`);
      Logger.info(`Server IP: ${existingServer.public_net.ipv4.ip}`);
      return existingServer;
    }

    // Create new server if it doesn't exist
    Logger.info(`Server '${name}' not found, creating new server...`);
    return await createHetznerServer(name, serverType, sshKeyId, environment);
  } catch (error) {
    Logger.error(`Failed to check/create server: ${error}`);
    throw error;
  }
}

/**
 * Load and customize cloud-config template
 */
async function loadCloudConfig(publicKey: string): Promise<string> {
  const cloudConfigPath = path.join(Paths.scriptDir, "cloud-config.yml");

  try {
    const cloudConfigTemplate = await fs.readFile(cloudConfigPath, "utf-8");

    // Replace the SSH public key placeholder
    const customizedCloudConfig = cloudConfigTemplate.replace(
      /\{\{SSH_PUBLIC_KEY\}\}/g,
      publicKey
    );

    return customizedCloudConfig;
  } catch (error) {
    throw new Error(
      `Failed to load cloud-config template: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Create a server in Hetzner Cloud with rabbithq user
 */
async function createHetznerServer(
  name: string,
  serverType: string,
  sshKeyId: number,
  environment: string
): Promise<HetznerServer> {
  Logger.info(`Creating ${serverType} server: ${name} with rabbithq user...`);

  // Read local SSH public key for cloud-config - use main id_rsa key
  const mainKeyPath = path.join(process.env.HOME || "", ".ssh", "id_rsa.pub");
  let localPublicKey: string;

  try {
    localPublicKey = await fs.readFile(mainKeyPath, "utf-8");
    localPublicKey = localPublicKey.trim();
    Logger.info("Using main SSH key for cloud-config user creation");
  } catch (error) {
    throw new Error(
      "No SSH key found at ~/.ssh/id_rsa.pub. Please generate an SSH key pair first with: ssh-keygen -t rsa -b 4096"
    );
  }

  // Load and customize cloud-config
  const cloudConfig = await loadCloudConfig(localPublicKey);

  const server = await hetznerApiRequest<{
    server: HetznerServer;
    action: unknown;
  }>("/servers", {
    method: "POST",
    body: JSON.stringify({
      name,
      server_type: serverType,
      image: "ubuntu-24.04",
      ssh_keys: [sshKeyId], // This sets up root access initially
      location: "nbg1", // Nuremberg
      labels: {
        project: "rabbit-hq",
        environment,
        created_by: "setup-script",
      },
      user_data: cloudConfig,
    }),
  });

  Logger.success(`Server created with rabbithq user, ID: ${server.server.id}`);
  return server.server;
}

/**
 * Get existing load balancer by name or create new one (idempotent)
 */
async function getOrCreateHetznerLoadBalancer(
  name: string,
  serverIds: number[],
  environment: string
): Promise<HetznerLoadBalancer> {
  Logger.info(`Checking if load balancer '${name}' exists...`);

  try {
    // Check if load balancer already exists
    const response = await hetznerApiRequest<{
      load_balancers: HetznerLoadBalancer[];
    }>("/load_balancers");

    const existingLB = response.load_balancers.find((lb) => lb.name === name);

    if (existingLB) {
      Logger.success(
        `Load balancer '${name}' already exists, using existing load balancer`
      );
      Logger.info(`Load balancer IP: ${existingLB.public_net.ipv4.ip}`);
      return existingLB;
    }

    // Create new load balancer if it doesn't exist
    Logger.info(
      `Load balancer '${name}' not found, creating new load balancer...`
    );
    return await createHetznerLoadBalancer(name, serverIds, environment);
  } catch (error) {
    Logger.error(`Failed to check/create load balancer: ${error}`);
    throw error;
  }
}

/**
 * Create a load balancer in Hetzner Cloud
 */
async function createHetznerLoadBalancer(
  name: string,
  serverIds: number[],
  environment: string
): Promise<HetznerLoadBalancer> {
  Logger.info(`Creating load balancer: ${name}...`);

  const loadBalancer = await hetznerApiRequest<{
    load_balancer: HetznerLoadBalancer;
  }>("/load_balancers", {
    method: "POST",
    body: JSON.stringify({
      name,
      load_balancer_type: "lb11",
      location: "nbg1",
      algorithm: {
        type: "round_robin",
      },
      services: [
        {
          protocol: "http",
          listen_port: 80,
          destination_port: 80,
          health_check: {
            protocol: "http",
            port: 80,
            interval: 15,
            timeout: 10,
            retries: 3,
            http: {
              path: "/health",
            },
          },
        },
        {
          protocol: "tcp",
          listen_port: 443,
          destination_port: 443,
          health_check: {
            protocol: "tcp",
            port: 443,
            interval: 15,
            timeout: 10,
            retries: 3,
          },
        },
      ],
      targets: serverIds.map((id) => ({
        type: "server",
        server: { id },
        use_private_ip: false, // WHY ?
      })),
      labels: {
        project: "rabbit-hq",
        environment,
        created_by: "setup-script",
      },
    }),
  });

  Logger.success(
    `Load balancer created with ID: ${loadBalancer.load_balancer.id}`
  );
  return loadBalancer.load_balancer;
}

/**
 * Wait for server to be ready
 */
async function waitForServerReady(
  serverId: number,
  maxAttempts: number = 30
): Promise<void> {
  Logger.info("Waiting for server to be ready...");

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await hetznerApiRequest<{ server: HetznerServer }>(
        `/servers/${serverId}`
      );

      if (response.server.status === "running") {
        Logger.success("Server is ready!");
        return;
      }

      Logger.info(
        `Attempt ${attempt}/${maxAttempts}: Server status is ${response.server.status}, waiting...`
      );
      await new Promise((resolve) => setTimeout(resolve, 10_000)); // Wait 10 seconds
    } catch (error) {
      Logger.warning(`Attempt ${attempt}/${maxAttempts} failed, retrying...`);
      await new Promise((resolve) => setTimeout(resolve, 5_000)); // Wait 5 seconds before retry
    }
  }

  throw new Error("Server did not become ready within the expected time");
}

/**
 * Setup Hetzner Cloud infrastructure (idempotent)
 */
async function setupHetznerInfrastructure(
  environment: "staging" | "production"
): Promise<{
  appServers: string[];
  dbServer?: string;
  loadBalancer?: string;
}> {
  Logger.info(`Setting up Hetzner Cloud infrastructure for ${environment}...`);

  // Ensure SSH key exists
  const sshKey = await ensureSSHKey(environment);

  if (environment === "staging") {
    // Get or create single server for staging (app + database)
    const server = await getOrCreateHetznerServer(
      "rabbit-hq-staging",
      "cpx11", // cpx11: 2 vCPUs, 2GB RAM, 40GB SSD : 4.62€/month
      sshKey.id,
      environment
    );

    await waitForServerReady(server.id);

    Logger.success(`Staging server ready: ${server.public_net.ipv4.ip}`);
    Logger.info(
      "Staging uses a single server for both application and database"
    );

    return {
      appServers: [server.public_net.ipv4.ip],
    };
  } else {
    // Production: Get or create dedicated database server + 2 app servers + load balancer
    Logger.info(
      "Setting up production infrastructure with optimized server types..."
    );

    // 1. Get or create dedicated database server (CCX13 - dedicated vCPU)
    const dbServer = await getOrCreateHetznerServer(
      "rabbit-hq-db-prod",
      "ccx13", // 2 dedicated vCPUs, 4GB RAM, 80GB SSD : €7.35/month
      sshKey.id,
      environment
    );

    // 2. Get or create two application servers (CPX21 - shared vCPU)
    const appServer1 = await getOrCreateHetznerServer(
      "rabbit-hq-app-1",
      "cpx21", // 2 shared vCPUs, 4GB RAM, 40GB SSD : €6.49/month
      sshKey.id,
      environment
    );

    const appServer2 = await getOrCreateHetznerServer(
      "rabbit-hq-app-2",
      "cpx21", // 2 shared vCPUs, 4GB RAM, 40GB SSD : €6.49/month
      sshKey.id,
      environment
    );

    // Wait for all servers to be ready
    await Promise.all([
      waitForServerReady(dbServer.id),
      waitForServerReady(appServer1.id),
      waitForServerReady(appServer2.id),
    ]);

    // 3. Get or create load balancer for app servers only
    const loadBalancer = await getOrCreateHetznerLoadBalancer(
      "rabbit-hq-lb-prod",
      [appServer1.id, appServer2.id], // Only app servers behind load balancer
      environment
    );

    const appServers = [
      appServer1.public_net.ipv4.ip,
      appServer2.public_net.ipv4.ip,
    ];

    Logger.success(`Database server ready: ${dbServer.public_net.ipv4.ip}`);
    Logger.success(`Application servers ready: ${appServers.join(", ")}`);
    Logger.success(`Load balancer ready: ${loadBalancer.public_net.ipv4.ip}`);
    Logger.info(
      "Production architecture: Dedicated DB (CCX13) + 2 App Servers (CPX21) + Load Balancer"
    );

    return {
      appServers,
      dbServer: dbServer.public_net.ipv4.ip,
      loadBalancer: loadBalancer.public_net.ipv4.ip,
    };
  }
}

/**
 * Run the server setup (Hetzner Cloud only)
 */
async function setupServer(options: SetupOptions): Promise<void> {
  const { sshUser, environment } = options;

  Logger.info(`Creating Hetzner Cloud infrastructure for ${environment}...`);
  const infrastructure = await setupHetznerInfrastructure(environment);

  if (environment === "staging") {
    // Staging: Single server with both app and database
    Logger.info("Setting up staging server with Dokku (app + database)...");
    await setupDatabaseServer(infrastructure.appServers[0], sshUser);

    Logger.success("Staging server is ready!");
    Logger.info(`Staging URL: http://${infrastructure.appServers[0]}`);
  } else {
    // Production: Setup database server first, then app servers
    Logger.info("Setting up production infrastructure...");

    // 1. Setup dedicated database server
    if (infrastructure.dbServer) {
      Logger.info(
        `Setting up dedicated database server: ${infrastructure.dbServer}`
      );
      await setupDatabaseServer(infrastructure.dbServer, sshUser);
    }

    // 2. Setup application servers
    for (const appServerIp of infrastructure.appServers) {
      Logger.info(`Setting up application server: ${appServerIp}`);
      await setupApplicationServer(
        appServerIp,
        sshUser,
        infrastructure.dbServer!
      );
    }

    Logger.success("All production servers are ready!");
    Logger.success("Production architecture summary:");
    console.log("");
    console.log(`📊 Database Server: ${infrastructure.dbServer}`);
    console.log(`🚀 App Server 1: ${infrastructure.appServers[0]}`);
    console.log(`🚀 App Server 2: ${infrastructure.appServers[1]}`);
    console.log(`⚖️  Load Balancer: ${infrastructure.loadBalancer}`);
    console.log("");
    Logger.warning("Important: Point your domain DNS to the Load Balancer IP!");
    Logger.info(`Load Balancer IP: ${infrastructure.loadBalancer}`);
  }
}

/**
 * Get path to database setup script
 */
function getDatabaseSetupScriptPath(): string {
  return path.join(Paths.scriptDir, "database-setup.sh");
}

/**
 * Create customized application setup script with database IP
 */
async function createApplicationSetupScript(
  dbServerIp: string
): Promise<string> {
  const templatePath = path.join(Paths.scriptDir, "application-setup.sh");

  try {
    // Read the template script
    const templateContent = await fs.readFile(templatePath, "utf-8");

    // Replace the placeholder with actual database server IP
    const customizedScript = templateContent.replace(
      /\{\{DB_SERVER_IP\}\}/g,
      dbServerIp
    );

    // Write to temporary file
    const tmpFile = "/tmp/application-setup.sh";
    await fs.writeFile(tmpFile, customizedScript);

    return tmpFile;
  } catch (error) {
    throw new Error(
      `Failed to create application setup script: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Setup Dokku on a database server
 */
async function setupDatabaseServer(
  serverIp: string,
  sshUser: string
): Promise<void> {
  Logger.info(`Setting up database server: ${serverIp} with user '${sshUser}'`);

  // Wait for SSH to be ready (with retries)
  await waitForSshReady(serverIp, sshUser);

  // Additional wait for cloud-config to complete user creation
  Logger.info("Waiting for cloud-config and user setup to complete...");
  await new Promise((resolve) => setTimeout(resolve, 45_000)); // Wait 45 seconds

  // Test SSH connection and sudo access
  await testSshConnection(serverIp, sshUser);

  // Get database setup script path
  Logger.info("Using database server setup script...");
  const setupScriptPath = getDatabaseSetupScriptPath();

  // Verify script exists
  try {
    await fs.access(setupScriptPath);
  } catch (error) {
    throw new Error(`Database setup script not found at: ${setupScriptPath}`);
  }

  // Copy and run setup script on server
  Logger.info("Uploading and running database setup script...");

  try {
    // Upload script
    const sshKeyPath = getSSHKeyPath();
    const scpResult = await executeCommand("scp", [
      "-i",
      sshKeyPath, // Use appropriate SSH key
      "-o",
      "StrictHostKeyChecking=no",
      "-o",
      "UserKnownHostsFile=/dev/null",
      setupScriptPath,
      `${sshUser}@${serverIp}:/tmp/database-setup.sh`,
    ]);

    if (scpResult.exitCode !== 0) {
      throw new Error(
        `Failed to upload database setup script: ${scpResult.stderr}`
      );
    }

    // Make script executable and run it
    const sshResult = await executeCommand(
      "ssh",
      [
        "-i",
        sshKeyPath, // Use appropriate SSH key
        "-o",
        "StrictHostKeyChecking=no",
        "-o",
        "UserKnownHostsFile=/dev/null",
        `${sshUser}@${serverIp}`,
        "chmod +x /tmp/database-setup.sh && sudo bash /tmp/database-setup.sh",
      ],
      { stdio: "inherit" }
    );

    if (sshResult.exitCode !== 0) {
      throw new Error(
        `Database setup script failed with exit code: ${sshResult.exitCode}`
      );
    }

    // Set up dokku user permissions for rabbithq user (if not root)
    if (sshUser !== "root") {
      Logger.info("Configuring Dokku permissions for user...");
      await executeCommand("ssh", [
        "-i",
        sshKeyPath, // Use appropriate SSH key
        "-o",
        "StrictHostKeyChecking=no", // Don't prompt for host key
        "-o",
        "UserKnownHostsFile=/dev/null", // Don't save host key
        `${sshUser}@${serverIp}`,
        `sudo usermod -aG dokku ${sshUser}`,
      ]);
    }

    // Clean up - no temporary file to clean since we use the static script
    // await fs.unlink(setupScriptPath); // Don't delete the actual script file

    Logger.success(`Database server setup complete: ${serverIp}`);
  } catch (error) {
    Logger.error(
      `Database server setup failed: ${error instanceof Error ? error.message : String(error)}`
    );
    throw error;
  }
}

/**
 * Setup Dokku on an application server
 */
async function setupApplicationServer(
  serverIp: string,
  sshUser: string,
  dbServerIp: string
): Promise<void> {
  Logger.info(
    `Setting up application server: ${serverIp} with user '${sshUser}'`
  );

  // Wait for SSH to be ready (with retries)
  await waitForSshReady(serverIp, sshUser);

  // Additional wait for cloud-config to complete user creation
  Logger.info("Waiting for cloud-config and user setup to complete...");
  await new Promise((resolve) => setTimeout(resolve, 45_000)); // Wait 45 seconds

  // Test SSH connection and sudo access
  await testSshConnection(serverIp, sshUser);

  // Create application setup script with database IP
  Logger.info("Creating application server setup script...");
  const setupScriptPath = await createApplicationSetupScript(dbServerIp);

  // Copy and run setup script on server
  Logger.info("Uploading and running application setup script...");

  try {
    // Upload script
    const sshKeyPath = getSSHKeyPath();
    const scpResult = await executeCommand("scp", [
      "-i",
      sshKeyPath, // Use appropriate SSH key
      "-o",
      "StrictHostKeyChecking=no",
      "-o",
      "UserKnownHostsFile=/dev/null",
      setupScriptPath,
      `${sshUser}@${serverIp}:/tmp/application-setup.sh`,
    ]);

    if (scpResult.exitCode !== 0) {
      throw new Error(
        `Failed to upload application setup script: ${scpResult.stderr}`
      );
    }

    // Make script executable and run it
    const sshResult = await executeCommand(
      "ssh",
      [
        "-i",
        sshKeyPath, // Use appropriate SSH key
        "-o",
        "StrictHostKeyChecking=no",
        "-o",
        "UserKnownHostsFile=/dev/null",
        `${sshUser}@${serverIp}`,
        "chmod +x /tmp/application-setup.sh && sudo bash /tmp/application-setup.sh",
      ],
      { stdio: "inherit" }
    );

    if (sshResult.exitCode !== 0) {
      throw new Error(
        `Application setup script failed with exit code: ${sshResult.exitCode}`
      );
    }

    // Set up dokku user permissions for rabbithq user (if not root)
    if (sshUser !== "root") {
      Logger.info("Configuring Dokku permissions for user...");
      await executeCommand("ssh", [
        "-i",
        sshKeyPath, // Use appropriate SSH key
        "-o",
        "StrictHostKeyChecking=no",
        "-o",
        "UserKnownHostsFile=/dev/null",
        `${sshUser}@${serverIp}`,
        `sudo usermod -aG dokku ${sshUser}`,
      ]);
    }

    // Clean up temporary file
    await fs.unlink(setupScriptPath);

    Logger.success(`Application server setup complete: ${serverIp}`);
  } catch (error) {
    Logger.error(
      `Application server setup failed: ${error instanceof Error ? error.message : String(error)}`
    );
    throw error;
  }
}

/**
 * Main program
 */
const program = new Command();

program
  .name("setup-server")
  .description("Create and setup Dokku servers via Hetzner Cloud")
  .version("1.0.0")
  .argument("<environment>", "Environment: staging or production")
  .argument("[ssh-user]", "SSH user (default: rabbithq)", "rabbithq")
  .action(async (environment: "staging" | "production", sshUser: string) => {
    if (environment !== "staging" && environment !== "production") {
      Logger.error("Environment must be either 'staging' or 'production'");
      process.exit(1);
    }

    await setupServer({ sshUser, environment });
  });

program.on("--help", () => {
  console.log("");
  console.log("Examples:");
  console.log("  $ npm run setup:staging");
  console.log("  $ npm run setup:production");
});

if (Paths.isMainModule(import.meta.url)) {
  program.parse(process.argv);
}
