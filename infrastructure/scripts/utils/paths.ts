/**
 * Path utilities for infrastructure scripts
 */
import path from "node:path";

/**
 * Configuration paths
 */
export class Paths {
  static get scriptDir(): string {
    return path.dirname(__dirname);
  }

  static get infraDir(): string {
    return path.dirname(this.scriptDir);
  }

  static get projectRoot(): string {
    return path.dirname(this.infraDir);
  }

  static getEnvFile(environment: string): string {
    return path.join(this.infraDir, "environments", environment, ".env");
  }

  static getFrontendEnvFile(environment: string): string {
    return path.join(
      this.infraDir,
      "environments",
      environment,
      ".frontend.env"
    );
  }

  /**
   * Check if the current file is being run directly as the main module
   */
  static isMainModule(importMetaUrl: string): boolean {
    return importMetaUrl === `file://${process.argv[1]}`;
  }

  /**
   * Get the main SSH key path
   */
  static get sshKeyPath(): string {
    const keyPath = `${process.env.HOME || ""}/.ssh/id_rsa_deploy`; // id_rsa is for local

    this.verifyFileExists(keyPath);

    return keyPath;
  }

  /**
   * Get the main SSH key public path
   */
  static get sshKeyPublicPath(): string {
    const publicKeyPath = `${process.env.HOME || ""}/.ssh/id_rsa_deploy.pub`; // id_rsa is for local

    this.verifyFileExists(publicKeyPath);

    return publicKeyPath;
  }

  /**
   * Verify if a file exists
   */
  static verifyFileExists(filePath: string) {
    try {
      require("fs").accessSync(filePath);
    } catch {
      throw new Error(`File does not exist: ${filePath}`);
    }
  }
}
