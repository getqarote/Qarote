import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";

import {
  DeploymentDetector,
  type DeploymentMethod,
} from "./deployment-detector";

/**
 * Service for managing deployment method detection and persistence
 */
export class DeploymentService {
  private static readonly DEPLOYMENT_METHOD_KEY = "deployment_method";

  /**
   * Initialize deployment detection on application startup
   * Detects and stores the deployment method in the database
   */
  static async initialize(): Promise<void> {
    try {
      logger.info("Initializing deployment method detection...");

      // Check if deployment method is already stored
      const existingMethod = await this.getStoredDeploymentMethod();

      if (existingMethod) {
        logger.info(
          { method: existingMethod },
          "Deployment method already detected"
        );
        return;
      }

      // Detect current deployment method
      const detectedMethod = DeploymentDetector.detect();

      // Store in database
      await this.storeDeploymentMethod(detectedMethod);

      logger.info(
        { method: detectedMethod },
        "Deployment method detected and stored"
      );
    } catch (error) {
      logger.error({ error }, "Failed to initialize deployment detection");
    }
  }

  /**
   * Get the current deployment method
   * Returns stored method or detects it if not stored
   */
  static async getDeploymentMethod(): Promise<DeploymentMethod> {
    try {
      // Try to get stored method first
      const storedMethod = await this.getStoredDeploymentMethod();

      if (storedMethod) {
        return storedMethod;
      }

      // Fallback to detection
      const detectedMethod = DeploymentDetector.detect();

      // Store for future use
      await this.storeDeploymentMethod(detectedMethod);

      return detectedMethod;
    } catch (error) {
      logger.error({ error }, "Failed to get deployment method");
      // Safe fallback
      return "docker_compose";
    }
  }

  /**
   * Get stored deployment method from database
   */
  private static async getStoredDeploymentMethod(): Promise<DeploymentMethod | null> {
    try {
      const state = await prisma.systemState.findUnique({
        where: { key: this.DEPLOYMENT_METHOD_KEY },
      });

      return (state?.value as DeploymentMethod) || null;
    } catch (error) {
      logger.error({ error }, "Failed to get stored deployment method");
      return null;
    }
  }

  /**
   * Store deployment method in database
   */
  private static async storeDeploymentMethod(
    method: DeploymentMethod
  ): Promise<void> {
    try {
      await prisma.systemState.upsert({
        where: { key: this.DEPLOYMENT_METHOD_KEY },
        update: { value: method },
        create: {
          key: this.DEPLOYMENT_METHOD_KEY,
          value: method,
        },
      });

      logger.debug({ method }, "Deployment method stored in database");
    } catch (error) {
      logger.error({ error, method }, "Failed to store deployment method");
      throw error;
    }
  }

  /**
   * Update stored deployment method (useful for manual override)
   */
  static async updateDeploymentMethod(method: DeploymentMethod): Promise<void> {
    await this.storeDeploymentMethod(method);
    logger.info({ method }, "Deployment method manually updated");
  }

  /**
   * Get update instructions for current deployment method
   */
  static async getUpdateInstructions(): Promise<{
    method: DeploymentMethod;
    displayName: string;
    instructions: {
      title: string;
      command: string;
      description: string;
    };
  }> {
    const method = await this.getDeploymentMethod();
    const displayName = DeploymentDetector.getDisplayName(method);
    const instructions = DeploymentDetector.getUpdateInstructions(method);

    return {
      method,
      displayName,
      instructions,
    };
  }
}
