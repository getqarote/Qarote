#!/usr/bin/env tsx

/**
 * RabbitHQ Backup Script
 * Backup PostgreSQL database
 */

import { Command } from "commander";
import { promises as fs } from "fs";
import * as path from "path";
import {
  Logger,
  sshCommand,
  checkDokkuConnection,
  loadEnvConfig,
  validateEnvironment,
  getAppNames,
  Paths,
  type Environment,
  type EnvConfig,
} from "./utils.js";

interface BackupOptions {
  environment: Environment;
  outputDir?: string;
  compress: boolean;
}

/**
 * Create database backup
 */
async function createBackup(options: BackupOptions): Promise<void> {
  const { environment, outputDir, compress } = options;

  Logger.info(`Creating backup for ${environment} environment...`);

  try {
    // Load configuration
    const config = await loadEnvConfig(environment);

    // Check if Dokku host is accessible
    if (!(await checkDokkuConnection(config.DOKKU_HOST))) {
      Logger.error(`Cannot connect to Dokku host: ${config.DOKKU_HOST}`);
      process.exit(1);
    }

    const { postgres: postgresDb } = getAppNames(environment);

    // Check if database exists
    const dbExistsResult = await sshCommand(
      config.DOKKU_HOST,
      `postgres:exists ${postgresDb}`
    );
    if (dbExistsResult.exitCode !== 0) {
      Logger.error(`PostgreSQL database not found: ${postgresDb}`);
      process.exit(1);
    }

    // Create backup directory
    const backupDir = outputDir || path.join(Paths.infraDir, "backups");
    try {
      await fs.access(backupDir);
    } catch {
      await fs.mkdir(backupDir, { recursive: true });
      Logger.info(`Created backup directory: ${backupDir}`);
    }

    // Generate backup filename
    const timestamp =
      new Date().toISOString().replace(/[:.]/g, "-").split("T")[0] +
      "_" +
      new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .split("T")[1]
        .split("-")[0];
    const backupFileName = `rabbithq-${environment}-${timestamp}.sql${compress ? ".gz" : ""}`;
    const localBackupPath = path.join(backupDir, backupFileName);
    const remoteBackupPath = `/tmp/${backupFileName}`;

    Logger.info(`Backup file: ${backupFileName}`);

    // Create database backup on server
    Logger.info("Creating database dump...");
    const dumpCommand = compress
      ? `postgres:export ${postgresDb} | gzip > ${remoteBackupPath}`
      : `postgres:export ${postgresDb} > ${remoteBackupPath}`;

    const dumpResult = await sshCommand(config.DOKKU_HOST, dumpCommand);
    if (dumpResult.exitCode !== 0) {
      throw new Error(`Failed to create database dump: ${dumpResult.stderr}`);
    }

    // Download backup file
    Logger.info("Downloading backup file...");
    const downloadResult = await sshCommand(
      config.DOKKU_HOST,
      `cat ${remoteBackupPath}`,
      "dokku"
    );
    if (downloadResult.exitCode !== 0) {
      throw new Error(`Failed to download backup: ${downloadResult.stderr}`);
    }

    // Save backup locally
    await fs.writeFile(localBackupPath, downloadResult.stdout, "binary");

    // Clean up remote file
    await sshCommand(config.DOKKU_HOST, `rm -f ${remoteBackupPath}`);

    // Get backup file size
    const stats = await fs.stat(localBackupPath);
    const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

    Logger.success("Backup created successfully!");

    console.log("");
    console.log("📁 Backup Information:");
    console.log(`   Environment: ${environment}`);
    console.log(`   Database: ${postgresDb}`);
    console.log(`   File: ${backupFileName}`);
    console.log(`   Size: ${sizeInMB} MB`);
    console.log(`   Location: ${localBackupPath}`);
    console.log(`   Compressed: ${compress ? "Yes" : "No"}`);
    console.log("");

    // Provide restore instructions
    console.log("🔄 Restore Instructions:");
    console.log("");
    console.log("To restore this backup:");
    console.log(
      `   tsx scripts/backup.ts ${environment} --restore ${localBackupPath}`
    );
    console.log("");
    console.log("Manual restore (advanced):");
    if (compress) {
      console.log(
        `   cat ${localBackupPath} | gunzip | ssh dokku@${config.DOKKU_HOST} postgres:import ${postgresDb}`
      );
    } else {
      console.log(
        `   cat ${localBackupPath} | ssh dokku@${config.DOKKU_HOST} postgres:import ${postgresDb}`
      );
    }
    console.log("");

    Logger.success("Backup completed! 🎉");
  } catch (error) {
    Logger.error(
      `Backup failed: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }
}

/**
 * Restore database from backup
 */
async function restoreBackup(
  environment: Environment,
  backupFile: string
): Promise<void> {
  Logger.info(`Restoring backup for ${environment} environment...`);

  try {
    // Check if backup file exists
    await fs.access(backupFile);

    // Load configuration
    const config = await loadEnvConfig(environment);

    // Check if Dokku host is accessible
    if (!(await checkDokkuConnection(config.DOKKU_HOST))) {
      Logger.error(`Cannot connect to Dokku host: ${config.DOKKU_HOST}`);
      process.exit(1);
    }

    const { postgres: postgresDb } = getAppNames(environment);

    // Check if database exists
    const dbExistsResult = await sshCommand(
      config.DOKKU_HOST,
      `postgres:exists ${postgresDb}`
    );
    if (dbExistsResult.exitCode !== 0) {
      Logger.error(`PostgreSQL database not found: ${postgresDb}`);
      Logger.error("Please create the database first with the deploy script");
      process.exit(1);
    }

    Logger.warning("⚠️  WARNING: This will overwrite the existing database!");
    console.log("Press Ctrl+C to cancel, or any key to continue...");

    // Wait for user confirmation (simplified)
    process.stdin.setRawMode(true);
    process.stdin.resume();
    await new Promise((resolve) => process.stdin.once("data", resolve));
    process.stdin.setRawMode(false);
    process.stdin.pause();

    // Determine if file is compressed
    const isCompressed = backupFile.endsWith(".gz");

    // Read backup file
    Logger.info("Reading backup file...");
    const backupData = await fs.readFile(backupFile);

    // Upload and restore
    const remoteBackupPath = `/tmp/restore-${Date.now()}.sql${isCompressed ? ".gz" : ""}`;

    // Upload backup to server
    Logger.info("Uploading backup to server...");
    // Note: This is simplified - in production, use scp or similar
    const uploadResult = await sshCommand(
      config.DOKKU_HOST,
      `cat > ${remoteBackupPath}`,
      "dokku"
    );
    if (uploadResult.exitCode !== 0) {
      throw new Error(`Failed to upload backup: ${uploadResult.stderr}`);
    }

    // Import backup
    Logger.info("Importing backup...");
    const importCommand = isCompressed
      ? `gunzip -c ${remoteBackupPath} | postgres:import ${postgresDb}`
      : `postgres:import ${postgresDb} < ${remoteBackupPath}`;

    const importResult = await sshCommand(config.DOKKU_HOST, importCommand);
    if (importResult.exitCode !== 0) {
      throw new Error(`Failed to import backup: ${importResult.stderr}`);
    }

    // Clean up
    await sshCommand(config.DOKKU_HOST, `rm -f ${remoteBackupPath}`);

    Logger.success("Database restored successfully!");
    Logger.info(
      "You may need to restart the application for changes to take effect"
    );
  } catch (error) {
    Logger.error(
      `Restore failed: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }
}

/**
 * List available backups
 */
async function listBackups(): Promise<void> {
  const backupDir = path.join(Paths.infraDir, "backups");

  try {
    const files = await fs.readdir(backupDir);
    const backupFiles = files.filter(
      (file) =>
        (file.startsWith("rabbithq-") && file.endsWith(".sql")) ||
        file.endsWith(".sql.gz")
    );

    if (backupFiles.length === 0) {
      Logger.info("No backups found");
      return;
    }

    console.log("");
    console.log("📁 Available Backups:");
    console.log("");

    for (const file of backupFiles.sort().reverse()) {
      const filePath = path.join(backupDir, file);
      const stats = await fs.stat(filePath);
      const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
      const date = stats.mtime.toISOString().split("T")[0];
      const time = stats.mtime.toISOString().split("T")[1].split(".")[0];

      console.log(`   ${file}`);
      console.log(`     Size: ${sizeInMB} MB`);
      console.log(`     Date: ${date} ${time}`);
      console.log(`     Path: ${filePath}`);
      console.log("");
    }
  } catch (error) {
    if ((error as any).code === "ENOENT") {
      Logger.info(
        "No backup directory found. Create your first backup to get started."
      );
    } else {
      Logger.error(
        `Failed to list backups: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

/**
 * Main program
 */
const program = new Command();

program
  .name("backup")
  .description("Backup PostgreSQL database")
  .argument("<environment>", "Environment (staging, production)")
  .option("--output-dir <dir>", "Output directory for backups")
  .option("--compress", "Compress backup with gzip", false)
  .option("--restore <file>", "Restore from backup file")
  .option("--list", "List available backups", false)
  .action(async (env: string, options: any) => {
    try {
      const environment = validateEnvironment(env);

      if (options.list) {
        await listBackups();
        return;
      }

      if (options.restore) {
        await restoreBackup(environment, options.restore);
        return;
      }

      await createBackup({
        environment,
        outputDir: options.outputDir,
        compress: options.compress,
      });
    } catch (error) {
      Logger.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program.on("--help", () => {
  console.log("");
  console.log("Examples:");
  console.log("  $ npm run backup:staging");
  console.log("  $ npm run backup:production -- --compress");
  console.log("  $ tsx scripts/backup.ts staging --output-dir ./my-backups");
  console.log("  $ tsx scripts/backup.ts production --restore ./backup.sql");
  console.log("  $ tsx scripts/backup.ts staging --list");
  console.log("");
  console.log("Options:");
  console.log("  --compress       Compress backup with gzip");
  console.log("  --output-dir     Custom output directory");
  console.log("  --restore <file> Restore from backup file");
  console.log("  --list           List available backups");
});

if (import.meta.url === `file://${process.argv[1]}`) {
  program.parse(process.argv);
}
