import fs from "node:fs";
import path from "node:path";

import semver from "semver";
import { z } from "zod/v4";

import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";

import { EmailService } from "@/services/email/email.service";

import { emailConfig } from "@/config";

/**
 * GitHub API response schema for tags endpoint
 */
const githubTagsSchema = z.array(
  z.object({
    name: z.string(),
  })
);

/**
 * Update Checker Cron Service
 * Runs in cloud mode to check for new Qarote versions on GitHub
 * and notify self-hosted license holders via email
 * Runs once every 24 hours
 */
class UpdateCheckerCronService {
  private isRunning = false;
  private isChecking = false;
  private intervalId: NodeJS.Timeout | null = null;
  private readonly checkInterval: number;

  private static readonly GITHUB_REPO = "getqarote/Qarote";
  private static readonly GITHUB_API_TIMEOUT = 10_000;
  private static readonly SYSTEM_STATE_KEY = "last_notified_version";

  constructor() {
    // Check once per day (24 hours)
    this.checkInterval = 24 * 60 * 60 * 1000;
  }

  /**
   * Start the update checker service
   */
  start(): void {
    if (this.isRunning) {
      logger.info("Update checker service is already running");
      return;
    }

    if (!emailConfig.enabled) {
      logger.info("Update checker service not started - email is disabled");
      return;
    }

    this.isRunning = true;
    logger.info(
      { checkInterval: this.checkInterval },
      "Starting update checker service..."
    );

    // Run immediately, then at intervals
    this.checkForUpdates();
    this.intervalId = setInterval(() => {
      this.checkForUpdates();
    }, this.checkInterval);
  }

  /**
   * Stop the service
   */
  stop(): void {
    if (!this.isRunning) {
      logger.info("Update checker service is not running");
      return;
    }

    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    logger.info("Update checker service stopped");
  }

  /**
   * Check for available updates and notify license holders if a newer version exists
   */
  private async checkForUpdates(): Promise<void> {
    if (this.isChecking) {
      logger.debug(
        "Skipping update check cycle - previous cycle still in progress"
      );
      return;
    }

    this.isChecking = true;
    const startTime = Date.now();

    try {
      logger.info("Starting update check cycle");

      // 1. Read current deployed version
      const currentVersion = this.getCurrentVersion();
      if (!currentVersion) {
        logger.warn(
          "Could not determine current version, skipping update check"
        );
        return;
      }

      // 2. Fetch latest version from GitHub
      const latestVersionData = await this.getLatestVersion();
      if (!latestVersionData) {
        logger.debug("Could not fetch latest version, skipping update check");
        return;
      }

      const { version: latestVersion, tagName: latestTagName } =
        latestVersionData;

      logger.info(
        { currentVersion, latestVersion, latestTagName },
        "Version check completed"
      );

      // 3. Compare versions
      if (!semver.gt(latestVersion, currentVersion)) {
        logger.info("Qarote is up to date");
        return;
      }

      // 4. Don't re-notify for the same version
      const lastNotifiedVersion = await this.getLastNotifiedVersion();
      if (lastNotifiedVersion === latestVersion) {
        logger.debug(
          { latestVersion },
          "Already notified about this version, skipping"
        );
        return;
      }

      // 5. Get all active license holder emails
      const recipients = await this.getLicenseHolderEmails();
      if (recipients.length === 0) {
        logger.info("No active license holders to notify");
        return;
      }

      // 6. Send email to each license holder
      let successCount = 0;
      for (const email of recipients) {
        try {
          const result = await EmailService.sendUpdateAvailableEmail({
            to: email,
            currentVersion,
            latestVersion,
            latestTagName,
          });

          if (result.success) {
            successCount++;
          } else {
            logger.warn(
              { email, error: result.error },
              "Failed to send update notification"
            );
          }
        } catch (error) {
          logger.error({ error, email }, "Error sending update notification");
        }
      }

      if (successCount > 0) {
        await this.setLastNotifiedVersion(latestVersion);
      }

      const duration = Date.now() - startTime;
      logger.info(
        {
          latestVersion,
          totalRecipients: recipients.length,
          successCount,
          duration,
        },
        `Update check cycle completed in ${duration}ms`
      );
    } catch (error) {
      logger.error({ error }, "Error in update check cycle");
    } finally {
      this.isChecking = false;
    }
  }

  /**
   * Get the last notified version from the database
   */
  private async getLastNotifiedVersion(): Promise<string | null> {
    try {
      const state = await prisma.systemState.findUnique({
        where: { key: UpdateCheckerCronService.SYSTEM_STATE_KEY },
      });
      return state?.value || null;
    } catch (error) {
      logger.error({ error }, "Failed to get last notified version");
      return null;
    }
  }

  /**
   * Set the last notified version in the database
   */
  private async setLastNotifiedVersion(version: string): Promise<void> {
    try {
      await prisma.systemState.upsert({
        where: { key: UpdateCheckerCronService.SYSTEM_STATE_KEY },
        update: { value: version },
        create: {
          key: UpdateCheckerCronService.SYSTEM_STATE_KEY,
          value: version,
        },
      });
      logger.info({ version }, "Updated last notified version");
    } catch (error) {
      logger.error({ error, version }, "Failed to set last notified version");
    }
  }

  /**
   * Read current version from VERSION file or package.json
   * Strips 'v' prefix to ensure valid semver format
   */
  private getCurrentVersion(): string | null {
    // In Docker, the project root is /app and WORKDIR is /app/apps/api
    // The VERSION file is at /app/VERSION
    const versionPaths = [
      path.resolve(process.cwd(), "../../VERSION"),
      path.resolve(process.cwd(), "VERSION"),
      "/app/VERSION",
    ];

    for (const versionPath of versionPaths) {
      try {
        const rawVersion = fs.readFileSync(versionPath, "utf-8").trim();
        if (rawVersion) {
          // Strip 'v' prefix to ensure valid semver format
          const version = rawVersion.startsWith("v")
            ? rawVersion.slice(1)
            : rawVersion;
          return version;
        }
      } catch {
        // Try next path
      }
    }

    // Fallback: read from package.json
    try {
      const pkgPath = path.resolve(process.cwd(), "package.json");
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      const rawVersion = pkg.version;
      if (rawVersion) {
        // Strip 'v' prefix to ensure valid semver format
        const version = rawVersion.startsWith("v")
          ? rawVersion.slice(1)
          : rawVersion;
        return version;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Fetch the latest version tag from GitHub API
   * Fetches multiple tags and compares them semantically to find the actual latest version
   * Returns an object with the normalized version and the original tag name for URL construction
   */
  private async getLatestVersion(): Promise<{
    version: string;
    tagName: string;
  } | null> {
    try {
      // Fetch up to 100 tags to ensure we find the latest semantic version
      // GitHub API returns tags by creation date, not semantic version
      const response = await fetch(
        `https://api.github.com/repos/${UpdateCheckerCronService.GITHUB_REPO}/tags?per_page=100`,
        {
          headers: { "User-Agent": "Qarote-Update-Checker" },
          signal: AbortSignal.timeout(
            UpdateCheckerCronService.GITHUB_API_TIMEOUT
          ),
        }
      );

      if (!response.ok) {
        logger.debug(
          { status: response.status },
          "GitHub API returned non-OK status"
        );
        return null;
      }

      const data = await response.json();

      // Validate response shape
      const parseResult = githubTagsSchema.safeParse(data);
      if (!parseResult.success) {
        logger.debug(
          { error: parseResult.error },
          "GitHub API returned unexpected response format"
        );
        return null;
      }

      const tags = parseResult.data;
      if (tags.length === 0) return null;

      // Parse all valid semver tags and keep track of original tag names
      const versions: Array<{ version: string; tagName: string }> = [];
      for (const tag of tags) {
        const normalized = tag.name.startsWith("v")
          ? tag.name.slice(1)
          : tag.name;

        // Only include valid semver versions
        if (semver.valid(normalized)) {
          versions.push({ version: normalized, tagName: tag.name });
        }
      }

      if (versions.length === 0) return null;

      // Sort by semantic version and return the latest
      versions.sort((a, b) => semver.compare(a.version, b.version));
      return versions[versions.length - 1];
    } catch (error) {
      logger.debug(
        { error },
        "Could not check for updates (network may be unavailable)"
      );
      return null;
    }
  }

  /**
   * Get unique emails of all active license holders
   */
  private async getLicenseHolderEmails(): Promise<string[]> {
    try {
      const licenses = await prisma.license.findMany({
        where: { isActive: true },
        select: { customerEmail: true },
        distinct: ["customerEmail"],
      });

      return licenses.map((l) => l.customerEmail);
    } catch (error) {
      logger.error({ error }, "Could not query license holder emails");
      return [];
    }
  }
}

// Export a singleton instance
export const updateCheckerCronService = new UpdateCheckerCronService();
