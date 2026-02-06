/**
 * License Service
 * Handles license key generation, validation, and management
 */

import crypto from "node:crypto";

import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";

import { licenseConfig } from "@/config";

import type {
  GenerateLicenseFileOptions,
  GenerateLicenseFileResult,
  GenerateLicenseOptions,
  LicenseData,
  LicenseValidationResponse,
  RenewLicenseResult,
  ValidateLicenseOptions,
} from "./license.interfaces";
import { signLicenseData } from "./license-crypto.service";

class LicenseService {
  /**
   * Generate a new license key
   */
  async generateLicense(
    options: GenerateLicenseOptions
  ): Promise<{ licenseKey: string; licenseId: string }> {
    try {
      // Generate a secure license key
      // Format: RABBIT-{tier}-{random}-{checksum}
      const randomBytes = crypto.randomBytes(16).toString("hex");
      const tierPrefix = options.tier.substring(0, 3).toUpperCase();
      const checksum = crypto
        .createHash("sha256")
        .update(`${tierPrefix}-${randomBytes}-${options.customerEmail}`)
        .digest("hex")
        .substring(0, 8)
        .toUpperCase();

      const licenseKey = `RABBIT-${tierPrefix}-${randomBytes.toUpperCase()}-${checksum}`;

      // Create license record
      const license = await prisma.license.create({
        data: {
          licenseKey,
          tier: options.tier,
          customerEmail: options.customerEmail,
          workspaceId: options.workspaceId,
          expiresAt: options.expiresAt,
          stripeCustomerId: options.stripeCustomerId,
          stripePaymentId: options.stripePaymentId,
          stripeSubscriptionId: options.stripeSubscriptionId,
          currentVersion: 1, // Initial version
          isActive: true,
        },
      });

      logger.info(
        {
          licenseId: license.id,
          tier: options.tier,
          customerEmail: options.customerEmail,
        },
        "License generated successfully"
      );

      return { licenseKey, licenseId: license.id };
    } catch (error) {
      logger.error({ error }, "Failed to generate license");
      throw error;
    }
  }

  /**
   * Validate a license key
   */
  async validateLicense(
    options: ValidateLicenseOptions
  ): Promise<LicenseValidationResponse> {
    try {
      // Check if license exists in database
      const license = await prisma.license.findUnique({
        where: { licenseKey: options.licenseKey },
      });

      if (!license) {
        return {
          valid: false,
          message: "License not found",
        };
      }

      // Check if license is active
      if (!license.isActive) {
        return {
          valid: false,
          message: "License is inactive",
        };
      }

      // Check expiration
      if (license.expiresAt < new Date()) {
        return {
          valid: false,
          message: "License has expired",
        };
      }

      // Update last validated timestamp
      await prisma.license.update({
        where: { id: license.id },
        data: {
          lastValidatedAt: new Date(),
        },
      });

      return {
        valid: true,
        license: {
          id: license.id,
          tier: license.tier,
          expiresAt: license.expiresAt,
          isActive: license.isActive,
          customerEmail: license.customerEmail,
          workspaceId: license.workspaceId,
        },
      };
    } catch (error) {
      logger.error({ error }, "Failed to validate license");
      return {
        valid: false,
        message: "License validation failed",
      };
    }
  }

  /**
   * Get licenses for a user/workspace
   */
  async getLicensesForUser(userEmail: string, workspaceId?: string) {
    const where: {
      customerEmail: string;
      isActive: boolean;
      workspaceId?: string | null;
    } = {
      customerEmail: userEmail,
      isActive: true,
    };

    // If workspaceId is provided, match it; otherwise match licenses with null workspaceId or any workspaceId
    if (workspaceId) {
      where.workspaceId = workspaceId;
    }

    return prisma.license.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  /**
   * Deactivate a license
   */
  async deactivateLicense(licenseId: string) {
    return prisma.license.update({
      where: { id: licenseId },
      data: { isActive: false },
    });
  }

  /**
   * Renew a license - update expiration and increment version
   * Used during annual subscription renewals
   */
  async renewLicense(
    licenseId: string,
    newExpiresAt: Date
  ): Promise<RenewLicenseResult> {
    try {
      // Get current license
      const currentLicense = await prisma.license.findUnique({
        where: { id: licenseId },
      });

      if (!currentLicense) {
        throw new Error(`License ${licenseId} not found`);
      }

      const newVersion = currentLicense.currentVersion + 1;

      // Update license with new expiration and version
      const updatedLicense = await prisma.license.update({
        where: { id: licenseId },
        data: {
          expiresAt: newExpiresAt,
          currentVersion: newVersion,
          updatedAt: new Date(),
        },
      });

      logger.info(
        {
          licenseId,
          newVersion,
          newExpiresAt: newExpiresAt.toISOString(),
          previousExpiresAt: currentLicense.expiresAt.toISOString(),
        },
        "License renewed successfully"
      );

      return {
        license: updatedLicense,
        newVersion,
      };
    } catch (error) {
      logger.error({ error, licenseId }, "Failed to renew license");
      throw error;
    }
  }

  /**
   * Save a license file version for historical access
   * Sets deletesAt to 30 days in the future for grace period
   */
  async saveLicenseFileVersion(
    licenseId: string,
    version: number,
    fileContent: string,
    expiresAt: Date
  ): Promise<void> {
    try {
      // Calculate deletion date (30 days from now)
      const deletesAt = new Date();
      deletesAt.setDate(deletesAt.getDate() + 30);

      await prisma.licenseFileVersion.create({
        data: {
          licenseId,
          version,
          fileContent,
          expiresAt,
          deletesAt,
        },
      });

      logger.info(
        {
          licenseId,
          version,
          deletesAt: deletesAt.toISOString(),
        },
        "License file version saved with 30-day grace period"
      );
    } catch (error) {
      logger.error(
        { error, licenseId, version },
        "Failed to save license file version"
      );
      throw error;
    }
  }

  /**
   * Clean up expired license file versions
   * Deletes versions where deletesAt has passed
   * Should be called by a scheduled worker (license-monitor)
   */
  async cleanupExpiredLicenseVersions(): Promise<void> {
    try {
      const now = new Date();

      // Find expired versions
      const expiredVersions = await prisma.licenseFileVersion.findMany({
        where: {
          deletesAt: { lt: now },
        },
        select: {
          id: true,
          licenseId: true,
          version: true,
        },
      });

      if (expiredVersions.length === 0) {
        logger.debug("No expired license file versions to clean up");
        return;
      }

      // Delete expired versions
      const result = await prisma.licenseFileVersion.deleteMany({
        where: {
          deletesAt: { lt: now },
        },
      });

      logger.info(
        {
          deletedCount: result.count,
          expiredVersions: expiredVersions.map((v) => ({
            licenseId: v.licenseId,
            version: v.version,
          })),
        },
        "Cleaned up expired license file versions"
      );
    } catch (error) {
      logger.error(
        { error },
        "Failed to cleanup expired license file versions"
      );
      // Don't throw - this is cleanup, not critical
    }
  }

  /**
   * Get license file versions for a license
   */
  async getLicenseFileVersions(licenseId: string) {
    return prisma.licenseFileVersion.findMany({
      where: { licenseId },
      orderBy: { version: "desc" },
      take: 2, // Return only last 2 versions
    });
  }

  /**
   * Generate a signed license file (SaaS only - requires private key)
   * This creates a cryptographically signed license file that can be validated offline
   */
  async generateLicenseFile(
    options: GenerateLicenseFileOptions
  ): Promise<GenerateLicenseFileResult> {
    // Check if private key is available (SaaS only)
    const privateKey = licenseConfig.privateKey;
    if (!privateKey) {
      throw new Error(
        "License generation requires private key (SaaS only). " +
          "Please set LICENSE_PRIVATE_KEY environment variable."
      );
    }

    try {
      const now = new Date();

      // Prepare license data
      const licenseData: LicenseData = {
        licenseKey: options.licenseKey,
        tier: options.tier,
        customerEmail: options.customerEmail,
        issuedAt: now.toISOString(),
        expiresAt: options.expiresAt.toISOString(),
        features: options.features,
        maxInstances: options.maxInstances,
      };

      // Sign license data
      const signature = signLicenseData(licenseData, privateKey);

      // Create license file
      const licenseFile = {
        version: "1.0",
        ...licenseData,
        signature,
      };

      logger.info(
        {
          licenseKey: options.licenseKey,
          tier: options.tier,
          customerEmail: options.customerEmail,
        },
        "License file generated successfully"
      );

      return { licenseFile };
    } catch (error) {
      logger.error({ error }, "Failed to generate license file");
      throw error;
    }
  }
}

export const licenseService = new LicenseService();
