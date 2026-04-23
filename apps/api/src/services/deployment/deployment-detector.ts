import fs from "node:fs";
import path from "node:path";

import { logger } from "@/core/logger";

/**
 * Supported deployment methods for Qarote self-hosted instances
 */
export type DeploymentMethod =
  | "dokku" // Dokku PaaS deployment
  | "docker_compose" // Docker Compose deployment
  | "binary"; // Binary deployment (standalone or manual)

/**
 * Deployment method detector
 * Analyzes the runtime environment to determine how Qarote was deployed
 */
export class DeploymentDetector {
  /**
   * Detect the current deployment method based on environment indicators
   */
  static detect(): DeploymentMethod {
    logger.debug("Detecting deployment method...");

    // 1. Dokku: Check for Dokku-specific environment variables
    if (this.isDokku()) {
      logger.info("Detected deployment method: dokku");
      return "dokku";
    }

    // 2. Docker Compose: Check for Docker container environment
    if (this.isDockerCompose()) {
      logger.info("Detected deployment method: docker_compose");
      return "docker_compose";
    }

    // 3. Binary: Check for binary deployment indicators
    if (this.isBinary()) {
      logger.info("Detected deployment method: binary");
      return "binary";
    }

    // 4. Binary: Default fallback
    logger.info("Detected deployment method: binary (fallback)");
    return "binary";
  }

  /**
   * Check if running under Dokku
   */
  private static isDokku(): boolean {
    return !!(
      process.env.DOKKU_APP_NAME ||
      process.env.DOKKU_ROOT ||
      process.env.DOKKU_HOST ||
      // Additional Dokku indicators
      process.env.BUILDPACK_URL ||
      process.env.SOURCE_VERSION
    );
  }

  /**
   * Check if running in Docker Compose environment
   */
  private static isDockerCompose(): boolean {
    // Compose-specific env var is a direct indicator
    if (process.env.COMPOSE_PROJECT_NAME) {
      return true;
    }

    // Generic Docker indicators need compose files to confirm it's Compose
    const inDocker = !!(fs.existsSync("/.dockerenv") || process.env.IS_DOCKER);

    return inDocker && this.hasDockerComposeFiles();
  }

  /**
   * Check if running from binary deployment
   */
  private static isBinary(): boolean {
    // Check for binary-specific indicators
    const execPath = process.execPath;
    const cwd = process.cwd();

    // Path-segment-aware check: match "qarote" as an exact directory segment
    const hasQaroteSegment = (p: string): boolean => {
      const segments = path.normalize(p).split(path.sep);
      return segments.includes("qarote");
    };

    return !!(
      // Binary typically extracted to a qarote directory
      (
        hasQaroteSegment(execPath) ||
        hasQaroteSegment(cwd) ||
        // Binary deployment has different directory structure
        (fs.existsSync(path.join(cwd, "qarote")) &&
          !fs.existsSync(path.join(cwd, "package.json")))
      )
    );
  }

  /**
   * Check for Docker Compose files in current and parent directories
   */
  private static hasDockerComposeFiles(): boolean {
    const composeFiles = [
      "docker-compose.yml",
      "docker-compose.selfhosted.yml",
      "compose.yml",
    ];

    // Check current directory and up to 2 parent directories
    const searchPaths = [
      process.cwd(),
      path.resolve(process.cwd(), ".."),
      path.resolve(process.cwd(), "../.."),
    ];

    for (const searchPath of searchPaths) {
      for (const filename of composeFiles) {
        if (fs.existsSync(path.join(searchPath, filename))) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Get human-readable deployment method name
   */
  static getDisplayName(method: DeploymentMethod): string {
    switch (method) {
      case "dokku":
        return "Dokku";
      case "docker_compose":
        return "Docker Compose";
      case "binary":
        return "Binary";
    }
  }

  /**
   * Get update instructions for the deployment method
   */
  static getUpdateInstructions(method: DeploymentMethod): {
    title: string;
    command: string;
    description: string;
  } {
    switch (method) {
      case "dokku":
        return {
          title: "Update via Dokku",
          command: `git pull origin main
git push dokku main`,
          description:
            "Pull the latest Qarote release, then push to your Dokku remote. Dokku will automatically build and deploy the update.",
        };

      case "docker_compose":
        return {
          title: "Update via Docker Compose",
          command: "./scripts/update.sh",
          description:
            "Run the update script from your Qarote directory to pull changes, rebuild containers, and restart services.",
        };

      case "binary":
        return {
          title: "Update Binary Installation",
          command: `# Stop the current instance
kill $(pgrep -f './qarote') 2>/dev/null || true

# Download and extract the latest version (auto-detects OS and architecture)
PLATFORM="$(uname -s | tr '[:upper:]' '[:lower:]')-$(uname -m | sed 's/x86_64/x64/' | sed 's/aarch64/arm64/')"
curl -L "https://github.com/getqarote/Qarote/releases/latest/download/qarote-\${PLATFORM}.tar.gz" | tar xz --strip-components=1

# Restart (migrations run automatically)
./qarote`,
          description:
            "Download the latest binary release, extract it to replace your current installation, and restart the service.",
        };
    }
  }
}
