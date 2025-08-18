/**
 * SSH and command execution utilities
 */
import { spawn, SpawnOptions } from "node:child_process";
import { Logger } from "./logger";

/**
 * Execute shell command with better error handling
 */
export async function executeCommand(
  command: string,
  args: string[] = [],
  options: SpawnOptions = {}
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "pipe",
      ...options,
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (exitCode) => {
      resolve({ stdout, stderr, exitCode: exitCode || 0 });
    });

    child.on("error", (error) => {
      reject(error);
    });
  });
}

/**
 * Detect if running in CI environment (GitHub Actions)
 */
export function isRunningInCI(): boolean {
  return process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true";
}

/**
 * Get the appropriate SSH key path or determine if using SSH agent
 */
function getSSHArgs(host: string): string[] {
  // Check if running in CI with SSH agent
  if (isRunningInCI()) {
    // In CI, the webfactory/ssh-agent action manages the SSH key
    // so we don't need to specify a key file
    return ["-o", "StrictHostKeyChecking=no", `rabbithq@${host}`];
  }

  // For local environment, use SSH key file
  const mainKeyPath = `${process.env.HOME || ""}/.ssh/id_rsa`;

  // Check if main key exists
  try {
    require("fs").accessSync(mainKeyPath);
    return [
      "-i",
      mainKeyPath, // Use appropriate SSH key
      "-o",
      "StrictHostKeyChecking=no",
      "-o",
      "UserKnownHostsFile=/dev/null",
      `rabbithq@${host}`,
    ];
  } catch (error) {
    throw new Error(`cannot get ssh key path: ${error}`);
  }
}

/**
 * Execute SSH command on Dokku host with main SSH key and rabbithq user
 * Uses SSH agent in CI, and id_rsa_deploy key locally
 */
export async function sshCommand(
  host: string,
  command: string,
  options: { stdio?: "inherit" | "pipe" } = {}
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const sshArgs = [...getSSHArgs(host), command];

  return executeCommand("ssh", sshArgs, options);
}

/**
 * Check if SSH connection to Dokku host is working
 */
export async function checkDokkuConnection(host: string): Promise<boolean> {
  try {
    const result = await sshCommand(host, "dokku apps:list");
    if (result.stderr) {
      Logger.error(`SSH command failed: ${result.stderr}`);
      return false;
    }
    Logger.success(`SSH connection to ${host} is successful.`);
    return result.exitCode === 0;
  } catch (error) {
    Logger.error(`SSH connection failed: ${error}`);
    return false;
  }
}
