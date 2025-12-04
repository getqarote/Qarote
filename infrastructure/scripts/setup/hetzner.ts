/**
 * Hetzner Cloud API utilities
 */
import fs from "node:fs/promises";
import { Logger, Paths } from "../utils";
import {
  HetznerServer,
  HetznerLoadBalancer,
  HetznerSSHKey,
  HetznerFirewall,
  CreateServerRequest,
  CreateVolumeRequest,
  HetznerVolume,
} from "./common";

/**
 * Hetzner Cloud API configuration
 */
const HETZNER_API_URL = "https://api.hetzner.cloud/v1";

/**
 * Get Hetzner API token (checked dynamically)
 */
function getHetznerApiToken(): string {
  const token = process.env.HETZNER_API_TOKEN;
  if (!token) {
    throw new Error(
      "HETZNER_API_TOKEN environment variable is not set. Please set it in your .env file."
    );
  }
  return token;
}

/**
 * Make a request to Hetzner Cloud API using fetch
 */
export async function hetznerApiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const HETZNER_API_TOKEN = getHetznerApiToken();

  const url = `${HETZNER_API_URL}${endpoint}`;
  const headers = {
    Authorization: `Bearer ${HETZNER_API_TOKEN}`,
    "Content-Type": "application/json",
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Hetzner API request failed: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    return (await response.json()) as T;
  } catch (error) {
    throw new Error(
      `Hetzner API request failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Get or create SSH key in Hetzner Cloud
 */
export async function ensureSSHKey(): Promise<HetznerSSHKey> {
  Logger.info("Checking SSH key in Hetzner Cloud...");

  // Check for deployment SSH key first - use dedicated id_rsa_deploy key
  let localPublicKey: string;
  let keyUsed: string;

  try {
    localPublicKey = await fs.readFile(Paths.sshKeyPublicPath, "utf-8");
    keyUsed = "deployment";
    Logger.info("Using deployment SSH key from: " + Paths.sshKeyPublicPath);
  } catch (error) {
    throw new Error(
      `Failed to read deployment SSH public key from ${Paths.sshKeyPublicPath}: ${
        error instanceof Error ? error.message : String(error)
      }. Please run 'tsx create-deploy-key.ts' first to create the deployment key.`
    );
  }

  // Get all existing SSH keys
  try {
    const response = await hetznerApiRequest<{ ssh_keys: HetznerSSHKey[] }>(
      "/ssh_keys"
    );

    // First, try exact public key match
    const normalizedLocalKey = localPublicKey.trim().replace(/\s+/g, " ");

    for (const key of response.ssh_keys) {
      const normalizedRemoteKey = key.public_key.trim().replace(/\s+/g, " ");

      if (normalizedRemoteKey === normalizedLocalKey) {
        Logger.success(
          `Found existing SSH key with exact public key match: ${key.name} (ID: ${key.id})`
        );
        return key;
      }
    }

    // If no exact match, try to find any rabbithq key
    for (const key of response.ssh_keys) {
      if (key.name.includes("rabbithq") || key.name.startsWith("rabbithq")) {
        Logger.success(
          `Found existing RabbitHQ SSH key: ${key.name} (ID: ${key.id})`
        );
        Logger.info("Using this key for infrastructure setup.");
        return key;
      }
    }

    // If no rabbithq keys, use the first available key
    if (response.ssh_keys.length > 0) {
      const firstKey = response.ssh_keys[0];
      Logger.success(
        `Using first available SSH key: ${firstKey.name} (ID: ${firstKey.id})`
      );
      return firstKey;
    }

    // No SSH keys found at all
    throw new Error(
      "No SSH keys found in your Hetzner Cloud account. Please add an SSH key manually through the Hetzner Cloud Console first."
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("No SSH keys found")) {
      throw error; // Re-throw our custom error
    }

    throw new Error(
      `Failed to retrieve SSH keys: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Get existing server by name or create new one (idempotent)
 */
export async function getOrCreateHetznerServer(
  name: string,
  serverType: string,
  sshKeyId: number,
  environment: string,
  firewallId?: number
): Promise<HetznerServer> {
  Logger.info(`Checking if server '${name}' exists...`);

  try {
    // Try to find existing server by name
    const response = await hetznerApiRequest<{ servers: HetznerServer[] }>(
      "/servers",
      {
        method: "GET",
      }
    );

    const existingServer = response.servers.find((s) => s.name === name);
    if (existingServer) {
      Logger.success(
        `Found existing server '${name}' with ID ${existingServer.id} at IP ${existingServer.public_net.ipv4.ip}`
      );

      // Apply firewall to existing server if provided and not already applied
      if (firewallId) {
        await applyFirewallToServer(firewallId, existingServer.id);
      }

      return existingServer;
    }

    // Create server if it doesn't exist
    Logger.info(`Server '${name}' not found, creating new one...`);
    return await createHetznerServer(
      name,
      serverType,
      sshKeyId,
      environment,
      firewallId
    );
  } catch (error) {
    throw new Error(
      `Failed to check or create server '${name}': ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Load and customize cloud-config template
 */
export async function loadCloudConfig(publicKey: string): Promise<string> {
  const cloudConfigPath = `${Paths.scriptDir}/setup/cloud-config.yml`;

  try {
    const template = await fs.readFile(cloudConfigPath, "utf8");
    return template.replace(
      /\{\s*\{\s*SSH_PUBLIC_KEY\s*\}\s*\}/g,
      publicKey.trim()
    );
  } catch (error) {
    throw new Error(
      `Failed to load cloud-config template: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Create a server in Hetzner Cloud with rabbithq user and firewall
 */
export async function createHetznerServer(
  name: string,
  serverType: string,
  sshKeyId: number,
  environment: string,
  firewallId?: number
): Promise<HetznerServer> {
  Logger.info(`Creating ${serverType} server: ${name} with rabbithq user...`);

  // Read deployment SSH public key for cloud-config - use dedicated id_rsa_deploy key
  let localPublicKey: string;

  try {
    localPublicKey = await fs.readFile(Paths.sshKeyPublicPath, "utf-8");
  } catch (error) {
    throw new Error(
      `Failed to read deployment SSH public key from ${Paths.sshKeyPublicPath}: ${
        error instanceof Error ? error.message : String(error)
      }. Please run 'tsx create-deploy-key.ts' first to create the deployment key.`
    );
  }

  // Load and customize cloud-config
  const cloudConfig = await loadCloudConfig(localPublicKey);

  const requestBody: CreateServerRequest = {
    name,
    server_type: serverType,
    image: "ubuntu-24.04",
    ssh_keys: [sshKeyId],
    location: "nbg1", // Use Nuremberg for all resources
    labels: {
      project: "rabbithq",
      environment,
      created_by: "setup-script",
    },
    user_data: cloudConfig,
  };

  // Add firewall if provided
  if (firewallId) {
    requestBody.firewalls = [{ firewall: firewallId }];
    Logger.info(`Server will be created with firewall ${firewallId}`);
  }

  const server = await hetznerApiRequest<{
    server: HetznerServer;
    action: unknown;
  }>("/servers", {
    method: "POST",
    body: JSON.stringify(requestBody),
  });

  Logger.success(`Server created with rabbithq user, ID: ${server.server.id}`);
  return server.server;
}

/**
 * Get existing load balancer by name or create new one (idempotent)
 */
export async function getOrCreateHetznerLoadBalancer(
  name: string,
  serverIds: number[],
  environment: string
): Promise<HetznerLoadBalancer> {
  Logger.info(`Checking if load balancer '${name}' exists...`);

  try {
    // Try to find existing load balancer by name
    const response = await hetznerApiRequest<{
      load_balancers: HetznerLoadBalancer[];
    }>("/load_balancers", {
      method: "GET",
    });

    const existingLB = response.load_balancers.find((lb) => lb.name === name);
    if (existingLB) {
      Logger.success(
        `Found existing load balancer '${name}' with ID ${existingLB.id} at IP ${existingLB.public_net.ipv4.ip}`
      );
      return existingLB;
    }

    // Create load balancer if it doesn't exist
    Logger.info(`Load balancer '${name}' not found, creating new one...`);
    return await createHetznerLoadBalancer(name, serverIds, environment);
  } catch (error) {
    throw new Error(
      `Failed to check or create load balancer '${name}': ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Create a load balancer in Hetzner Cloud
 */
export async function createHetznerLoadBalancer(
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
        use_private_ip: false,
      })),
      labels: {
        project: "rabbithq",
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
export async function waitForServerReady(
  serverId: number,
  maxAttempts: number = 50
): Promise<void> {
  Logger.info("Waiting for server to be ready...");

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await hetznerApiRequest<{ server: HetznerServer }>(
        `/servers/${serverId}`,
        {
          method: "GET",
        }
      );

      if (response.server.status === "running") {
        Logger.success("Server is now running!");
        return;
      }
    } catch (error) {
      // Ignore error and continue retrying
    }

    Logger.info(`Attempt ${attempt}/${maxAttempts}, server not ready yet...`);
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  throw new Error("Server did not become ready within the expected time");
}

/**
 * Create or get existing firewall for production application servers
 */
export async function ensureProductionApplicationFirewall(): Promise<HetznerFirewall> {
  const firewallName = "rabbithq-app-production";

  Logger.info(`Ensuring application firewall '${firewallName}' exists...`);

  try {
    // Check if firewall already exists
    const response = await hetznerApiRequest<{ firewalls: HetznerFirewall[] }>(
      "/firewalls"
    );

    const existingFirewall = response.firewalls.find(
      (fw) => fw.name === firewallName
    );
    if (existingFirewall) {
      Logger.success(
        `Found existing application firewall: ${existingFirewall.name} (ID: ${existingFirewall.id})`
      );
      return existingFirewall;
    }

    // Create new firewall for application servers
    Logger.info(`Creating application firewall: ${firewallName}`);
    const firewall = await hetznerApiRequest<{ firewall: HetznerFirewall }>(
      "/firewalls",
      {
        method: "POST",
        body: JSON.stringify({
          name: firewallName,
          labels: {
            project: "rabbithq",
            environment: "production",
            server_type: "application",
            created_by: "setup-script",
          },
          rules: [
            {
              description: "Allow SSH",
              direction: "in",
              source_ips: ["0.0.0.0/0", "::/0"],
              protocol: "tcp",
              port: "22",
            },
            {
              description: "Allow HTTP",
              direction: "in",
              source_ips: ["0.0.0.0/0", "::/0"],
              protocol: "tcp",
              port: "80",
            },
            {
              description: "Allow HTTPS",
              direction: "in",
              source_ips: ["0.0.0.0/0", "::/0"],
              protocol: "tcp",
              port: "443",
            },
            {
              description: "Allow private network communication",
              direction: "in",
              source_ips: ["10.0.0.0/16"],
              protocol: "tcp",
              port: "1-65535",
            },
          ],
        }),
      }
    );

    Logger.success(
      `Application firewall created with ID: ${firewall.firewall.id}`
    );
    return firewall.firewall;
  } catch (error) {
    throw new Error(
      `Failed to ensure application firewall: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Create or get existing firewall for production database servers
 */
export async function ensureProductionDatabaseFirewall(): Promise<HetznerFirewall> {
  const firewallName = "rabbithq-db-production";

  Logger.info(`Ensuring database firewall '${firewallName}' exists...`);

  try {
    // Check if firewall already exists
    const response = await hetznerApiRequest<{ firewalls: HetznerFirewall[] }>(
      "/firewalls"
    );

    const existingFirewall = response.firewalls.find(
      (fw) => fw.name === firewallName
    );
    if (existingFirewall) {
      Logger.success(
        `Found existing database firewall: ${existingFirewall.name} (ID: ${existingFirewall.id})`
      );
      return existingFirewall;
    }

    // Create new firewall for database servers
    Logger.info(`Creating database firewall: ${firewallName}`);
    const firewall = await hetznerApiRequest<{ firewall: HetznerFirewall }>(
      "/firewalls",
      {
        method: "POST",
        body: JSON.stringify({
          name: firewallName,
          labels: {
            project: "rabbithq",
            environment: "production",
            server_type: "database",
            created_by: "setup-script",
          },
          rules: [
            {
              description: "Allow SSH",
              direction: "in",
              source_ips: ["0.0.0.0/0", "::/0"],
              protocol: "tcp",
              port: "22",
            },
            {
              description: "Allow PostgreSQL from private network",
              direction: "in",
              source_ips: ["10.0.0.0/16"],
              protocol: "tcp",
              port: "5432",
            },
            {
              description: "Allow private network communication",
              direction: "in",
              source_ips: ["10.0.0.0/16"],
              protocol: "tcp",
              port: "1-65535",
            },
          ],
        }),
      }
    );

    Logger.success(
      `Database firewall created with ID: ${firewall.firewall.id}`
    );
    return firewall.firewall;
  } catch (error) {
    throw new Error(
      `Failed to ensure database firewall: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Apply firewall to a server
 */
export async function applyFirewallToServer(
  firewallId: number,
  serverId: number
): Promise<void> {
  Logger.info(`Applying firewall ${firewallId} to server ${serverId}...`);

  try {
    await hetznerApiRequest<{ actions: unknown[] }>(
      `/firewalls/${firewallId}/actions/apply_to_resources`,
      {
        method: "POST",
        body: JSON.stringify({
          apply_to: [
            {
              type: "server",
              server: {
                id: serverId,
              },
            },
          ],
        }),
      }
    );

    Logger.success(`Firewall ${firewallId} applied to server ${serverId}`);
  } catch (error) {
    // Check if firewall is already applied
    if (
      error instanceof Error &&
      (error.message.includes("already applied") ||
        error.message.includes("firewall_already_applied"))
    ) {
      Logger.info(
        `Firewall ${firewallId} is already applied to server ${serverId}`
      );
      return;
    }

    throw new Error(
      `Failed to apply firewall to server: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Wait for a Hetzner action to complete
 */
async function waitForAction(
  actionId: number,
  timeoutMs = 300000
): Promise<void> {
  const apiToken = process.env.HETZNER_API_TOKEN;
  if (!apiToken) {
    throw new Error("HETZNER_API_TOKEN environment variable is required");
  }

  const startTime = Date.now();
  const pollInterval = 2000; // 2 seconds

  while (Date.now() - startTime < timeoutMs) {
    try {
      const response = await fetch(`${HETZNER_API_URL}/actions/${actionId}`, {
        headers: {
          Authorization: `Bearer ${apiToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get action status: ${response.status}`);
      }

      const data = await response.json();
      const action = data.action;

      if (action.status === "success") {
        Logger.info(`Action ${actionId} completed successfully`);
        return;
      }

      if (action.status === "error") {
        throw new Error(
          `Action ${actionId} failed: ${action.error?.message || "Unknown error"}`
        );
      }

      if (action.status === "running") {
        Logger.info(
          `Action ${actionId} is still running... (${action.progress || 0}%)`
        );
      }

      // Wait before polling again
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    } catch (error) {
      if (error instanceof Error && error.message.includes("failed")) {
        throw error;
      }
      Logger.warning(`Error checking action status: ${error}, retrying...`);
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }
  }

  throw new Error(`Action ${actionId} did not complete within ${timeoutMs}ms`);
}

/**
 * Create a volume on Hetzner Cloud
 */
export async function createHetznerVolume(
  request: CreateVolumeRequest
): Promise<HetznerVolume> {
  const apiToken = process.env.HETZNER_API_TOKEN;
  if (!apiToken) {
    throw new Error("HETZNER_API_TOKEN environment variable is required");
  }

  try {
    Logger.info(`Creating volume: ${request.name} (${request.size}GB)`);

    const response = await fetch(`${HETZNER_API_URL}/volumes`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Failed to create volume: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`
      );
    }

    const data = await response.json();
    Logger.info(
      `Volume created successfully: ${data.volume.name} (ID: ${data.volume.id})`
    );
    return data.volume;
  } catch (error) {
    throw new Error(
      `Failed to create volume: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Attach a volume to a server
 */
export async function attachVolumeToServer(
  volumeId: number,
  serverId: number,
  automount = true
): Promise<void> {
  const apiToken = process.env.HETZNER_API_TOKEN;
  if (!apiToken) {
    throw new Error("HETZNER_API_TOKEN environment variable is required");
  }

  try {
    Logger.info(`Attaching volume ${volumeId} to server ${serverId}`);

    const response = await fetch(
      `${HETZNER_API_URL}/volumes/${volumeId}/actions/attach`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          server: serverId,
          automount,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Failed to attach volume: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`
      );
    }

    const data = await response.json();
    Logger.info(`Volume attachment action started: ${data.action.id}`);

    // Wait for the action to complete
    await waitForAction(data.action.id);
    Logger.info(
      `Volume ${volumeId} successfully attached to server ${serverId}`
    );
  } catch (error) {
    throw new Error(
      `Failed to attach volume to server: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Get volume by name
 */
export async function getVolumeByName(
  name: string
): Promise<HetznerVolume | null> {
  const apiToken = process.env.HETZNER_API_TOKEN;
  if (!apiToken) {
    throw new Error("HETZNER_API_TOKEN environment variable is required");
  }

  try {
    const response = await fetch(
      `${HETZNER_API_URL}/volumes?name=${encodeURIComponent(name)}`,
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to get volumes: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    return data.volumes.length > 0 ? data.volumes[0] : null;
  } catch (error) {
    throw new Error(
      `Failed to get volume by name: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Ensure a production database volume exists and is properly configured
 */
export async function ensureProductionDatabaseVolume(): Promise<HetznerVolume> {
  const volumeName = "rabbithq-db-prod";
  const volumeSize = 50; // 50GB for database storage

  try {
    // Check if volume already exists
    let volume = await getVolumeByName(volumeName);

    if (volume) {
      Logger.info(
        `Database volume already exists: ${volume.name} (ID: ${volume.id})`
      );
      return volume;
    }

    // Create new volume
    const createRequest: CreateVolumeRequest = {
      size: volumeSize,
      name: volumeName,
      location: "nbg1",
      format: "ext4", // Better for database workloads
      labels: {
        project: "rabbithq",
        environment: "production",
        type: "database",
        created_by: "infrastructure-setup",
      },
    };

    volume = await createHetznerVolume(createRequest);
    Logger.info(
      `Created database volume: ${volume.name} with ${volume.size}GB capacity`
    );

    return volume;
  } catch (error) {
    throw new Error(
      `Failed to ensure database volume: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Attach database volume to database server if not already attached
 */
export async function ensureVolumeAttachedToServer(
  volume: HetznerVolume,
  server: HetznerServer
): Promise<void> {
  try {
    // Check if volume is already attached to this server
    if (volume.server === server.id) {
      Logger.info(
        `Volume ${volume.name} is already attached to server ${server.name}`
      );
      return;
    }

    // If volume is attached to a different server, that's an error
    if (volume.server && volume.server !== server.id) {
      throw new Error(
        `Volume ${volume.name} is already attached to a different server (ID: ${volume.server})`
      );
    }

    // Attach the volume to the server
    await attachVolumeToServer(volume.id, server.id, true);
    Logger.info(
      `Successfully attached volume ${volume.name} to server ${server.name}`
    );
  } catch (error) {
    throw new Error(
      `Failed to ensure volume attachment: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
