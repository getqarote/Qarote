/**
 * Common types and utilities for server setup
 */

import fs from "node:fs/promises";
import { Environment, Logger, Paths, executeCommand } from "../utils";

/**
 * Setup options
 */
export interface SetupOptions {
  sshUser: string;
  environment: Environment;
}

/**
 * Server configuration
 */
export interface ServerConfig {
  applicationServer: {
    name: string;
    type: string;
  };
  databaseServer: {
    name: string;
    type: string;
  };
  loadBalancer?: {
    name: string;
  };
}

/**
 * Hetzner Cloud server interface
 */
export interface HetznerServer {
  id: number;
  name: string;
  status: string;
  public_net: {
    ipv4: {
      ip: string;
    };
  };
}

/**
 * Hetzner Cloud load balancer interface
 */
export interface HetznerLoadBalancer {
  id: number;
  name: string;
  public_net: {
    ipv4: {
      ip: string;
    };
  };
}

/**
 * Hetzner Cloud SSH key interface
 */
export interface HetznerSSHKey {
  id: number;
  name: string;
  public_key: string;
}

/**
 * Hetzner Cloud firewall interface
 */
export interface HetznerFirewall {
  id: number;
  name: string;
  labels: Record<string, string>;
  created: string;
  rules: Array<{
    description?: string;
    direction: "in" | "out";
    source_ips: string[];
    destination_ips: string[];
    protocol: "tcp" | "udp" | "icmp" | "esp" | "gre";
    port?: string;
  }>;
  applied_to: Array<{
    type: "server" | "label_selector";
    server?: {
      id: number;
    };
    label_selector?: {
      selector: string;
    };
    applied_to_resources: Array<{
      type: "server";
      server: {
        id: number;
      };
    }>;
  }>;
}

/**
 * Hetzner Cloud create server request interface
 */
export interface CreateServerRequest {
  name: string;
  server_type: string;
  image: string;
  ssh_keys: Array<string | number>;
  location?: string;
  datacenter?: string;
  start_after_create?: boolean;
  placement_group?: number;
  volumes?: number[];
  networks?: number[];
  firewalls?: Array<{
    firewall: number;
  }>;
  user_data?: string;
  labels?: Record<string, string>;
  automount?: boolean;
  public_net?: {
    enable_ipv4?: boolean;
    enable_ipv6?: boolean;
    ipv4?: number | null;
    ipv6?: number | null;
  };
}

/**
 * Hetzner Cloud volume interface
 */
export interface HetznerVolume {
  id: number;
  name: string;
  size: number;
  server?: number | null;
  location: {
    id: number;
    name: string;
    description: string;
    country: string;
    city: string;
    latitude: number;
    longitude: number;
    network_zone: string;
  };
  linux_device?: string;
  protection: {
    delete: boolean;
  };
  labels: Record<string, string>;
  status: "creating" | "available" | "attached";
  format?: string;
  created: string;
}

/**
 * Hetzner Cloud create volume request interface
 */
export interface CreateVolumeRequest {
  size: number;
  name: string;
  labels?: Record<string, string>;
  automount?: boolean;
  format?: "xfs" | "ext4";
  location?: string;
  server?: number;
}

/**
 * Setup infrastructure result
 */
export interface InfrastructureResult {
  appServers: string[];
  dbServer?: string;
  loadBalancer?: string;
}

/**
 * Wait for SSH connection to be ready with retries
 */
async function waitForSshReady(
  serverIp: string,
  sshUser: string,
  maxAttempts: number = 20
): Promise<void> {
  const sshKeyPath = Paths.sshKeyPath;

  Logger.info(
    `Waiting for SSH connection to ${serverIp} to be ready for user '${sshUser}'...`
  );

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await executeCommand(
        "ssh",
        [
          "-i",
          sshKeyPath,
          "-o",
          "StrictHostKeyChecking=no",
          "-o",
          "UserKnownHostsFile=/dev/null",
          "-o",
          "ConnectTimeout=5",
          `${sshUser}@${serverIp}`,
          "echo SSH connection successful",
        ],
        { stdio: "inherit" }
      );

      if (result.exitCode === 0) {
        Logger.success(`SSH connection to ${serverIp} is ready!`);
        return;
      }
    } catch (error) {
      // Ignore error and continue retrying
    }

    Logger.info(`Attempt ${attempt}/${maxAttempts} failed, retrying in 10s...`);
    await new Promise((resolve) => setTimeout(resolve, 10000));
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
  const sshKeyPath = Paths.sshKeyPath;

  Logger.info(
    `Testing SSH connection and sudo access for user '${sshUser}'...`
  );

  try {
    const result = await executeCommand(
      "ssh",
      [
        "-i",
        sshKeyPath,
        "-o",
        "StrictHostKeyChecking=no",
        "-o",
        "UserKnownHostsFile=/dev/null",
        `${sshUser}@${serverIp}`,
        "sudo -n echo 'Sudo access confirmed'",
      ],
      { stdio: "inherit" }
    );

    if (result.exitCode !== 0) {
      throw new Error(`Sudo access test failed: ${result.stderr}`);
    }

    Logger.success(`SSH connection and sudo access confirmed for ${serverIp}`);
  } catch (error) {
    throw new Error(
      `SSH connection or sudo access failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Get path to database setup script
 */
function getDatabaseSetupScriptPath(): string {
  return `${Paths.scriptDir}/setup/database-setup.sh`;
}

/**
 * Create customized application setup script with database IP
 */
async function createApplicationSetupScript(
  dbServerIp: string
): Promise<string> {
  const templatePath = `${Paths.scriptDir}/setup/application-setup.sh`;

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
 * Wait for SSH to be available on a server
 */
export async function waitForSSH(
  serverIP: string,
  maxAttempts: number = 20
): Promise<void> {
  Logger.info(`Waiting for SSH to be available on ${serverIP}...`);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await executeCommand(
        "ssh",
        [
          "-i",
          `${process.env.HOME}/.ssh/id_rsa_deploy`, // Use deployment key explicitly
          "-o",
          "StrictHostKeyChecking=no",
          "-o",
          "UserKnownHostsFile=/dev/null",
          "-o",
          "ConnectTimeout=5",
          `rabbithq@${serverIP}`,
          "echo SSH is available",
        ],
        { stdio: "inherit" }
      );

      if (result.exitCode === 0) {
        Logger.success(`SSH is now available on ${serverIP}`);
        return;
      }
    } catch (error) {
      // Ignore error and continue retrying
    }

    Logger.info(`Attempt ${attempt}/${maxAttempts}, retrying in 5s...`);
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  throw new Error(
    `SSH did not become available on ${serverIP} within the expected time`
  );
}

/**
 * Execute a list of commands on a remote server via SSH
 */
export async function executeRemoteCommands(
  serverIP: string,
  commands: string[]
): Promise<string> {
  const sshKeyPath = Paths.sshKeyPath;
  const combinedCommand = commands.join(" && ");

  try {
    const result = await executeCommand(
      "ssh",
      [
        "-i",
        sshKeyPath,
        "-o",
        "StrictHostKeyChecking=no",
        "-o",
        "UserKnownHostsFile=/dev/null",
        `rabbithq@${serverIP}`,
        combinedCommand,
      ],
      { stdio: "inherit" }
    );

    if (result.exitCode !== 0) {
      throw new Error(
        `Command execution failed with exit code ${result.exitCode}`
      );
    }

    return result.stdout || "Command completed successfully";
  } catch (error) {
    throw new Error(
      `Failed to execute remote commands: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Upload a file to a remote server via SCP
 */
export async function uploadFile(
  serverIP: string,
  localPath: string,
  remotePath: string
): Promise<void> {
  const sshKeyPath = Paths.sshKeyPath;

  try {
    const result = await executeCommand(
      "scp",
      [
        "-i",
        sshKeyPath,
        "-o",
        "StrictHostKeyChecking=no",
        "-o",
        "UserKnownHostsFile=/dev/null",
        localPath,
        `rabbithq@${serverIP}:${remotePath}`,
      ],
      { stdio: "inherit" }
    );

    if (result.exitCode !== 0) {
      throw new Error(`File upload failed: ${result.stderr}`);
    }

    Logger.success(`Uploaded ${localPath} to ${serverIP}:${remotePath}`);
  } catch (error) {
    throw new Error(
      `Failed to upload file: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
