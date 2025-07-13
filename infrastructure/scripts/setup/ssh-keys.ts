#!/usr/bin/env tsx

/**
 * Setup SSH keys for both rabbithq and dokku users
 * This script adds the main SSH key to both users on existing servers
 */

import fs from "node:fs/promises";
import { Logger, executeCommand, Paths } from "../utils";

/**
 * Add main SSH key to both users on a server
 */
async function setupSSHKeysOnServer(serverIp: string): Promise<void> {
  Logger.info(`Setting up SSH keys on server: ${serverIp}`);

  const sshKeyPath = Paths.sshKeyPath;
  const mainKeyPubPath = Paths.sshKeyPublicPath;

  try {
    // Read the public key
    const localPublicKey = await fs.readFile(mainKeyPubPath, "utf-8");
    const publicKeyContent = localPublicKey.trim();

    // Test connection with rabbithq user
    Logger.info("Testing connection with rabbithq user...");
    const testResult = await executeCommand("ssh", [
      "-i",
      sshKeyPath,
      "-o",
      "StrictHostKeyChecking=no",
      "-o",
      "UserKnownHostsFile=/dev/null",
      "-o",
      "ConnectTimeout=10",
      `rabbithq@${serverIp}`,
      "echo 'RabbitHQ user connection works'",
    ]);

    if (testResult.exitCode !== 0) {
      Logger.error(`Cannot connect to rabbithq user on ${serverIp}`);
      Logger.error(
        "Make sure the main SSH key is already added to the rabbithq user"
      );
      return;
    }

    Logger.success("RabbitHQ user connection works");

    // Add main SSH key to dokku user
    Logger.info("Adding main SSH key to dokku user...");
    const dokkuSetupResult = await executeCommand("ssh", [
      "-i",
      sshKeyPath,
      "-o",
      "StrictHostKeyChecking=no",
      "-o",
      "UserKnownHostsFile=/dev/null",
      `rabbithq@${serverIp}`,
      `sudo mkdir -p /home/dokku/.ssh && echo "${publicKeyContent}" | sudo tee /home/dokku/.ssh/authorized_keys && sudo chown -R dokku:dokku /home/dokku/.ssh && sudo chmod 700 /home/dokku/.ssh && sudo chmod 600 /home/dokku/.ssh/authorized_keys`,
    ]);

    if (dokkuSetupResult.exitCode !== 0) {
      Logger.error("Failed to set up dokku user SSH key");
      Logger.error(dokkuSetupResult.stderr);
      return;
    }

    // Test connection with dokku user
    Logger.info("Testing connection with dokku user...");
    const dokkuTestResult = await executeCommand("ssh", [
      "-i",
      sshKeyPath,
      "-o",
      "StrictHostKeyChecking=no",
      "-o",
      "UserKnownHostsFile=/dev/null",
      "-o",
      "ConnectTimeout=10",
      `dokku@${serverIp}`,
      "echo 'Dokku user connection works'",
    ]);

    if (dokkuTestResult.exitCode === 0) {
      Logger.success("Dokku user connection works");
      Logger.success(`SSH keys setup complete for ${serverIp}`);
    } else {
      Logger.warning("Dokku user connection test failed, but key was added");
    }
  } catch (error) {
    Logger.error(`Failed to setup SSH keys on ${serverIp}: ${error}`);
  }
}

/**
 * Main function
 */
async function main(): Promise<void> {
  const serverIp = process.argv[2];

  if (!serverIp) {
    Logger.error("Usage: tsx setup-ssh-keys.ts <server-ip>");
    Logger.error("Example: tsx setup-ssh-keys.ts 5.75.164.253");
    process.exit(1);
  }

  Logger.info("Setting up SSH keys for two-user architecture:");
  Logger.info("  • rabbithq user: Server management and Dokku commands");
  Logger.info("  • dokku user: Git push operations");
  Logger.info("");

  await setupSSHKeysOnServer(serverIp);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    Logger.error(`Setup failed: ${error}`);
    process.exit(1);
  });
}
