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
  loadBalancer: {
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
export async function waitForSshReady(
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
export async function testSshConnection(
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
export function getDatabaseSetupScriptPath(): string {
  return `${Paths.scriptDir}/setup/database-setup.sh`;
}

/**
 * Create customized application setup script with database IP
 */
export async function createApplicationSetupScript(
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
