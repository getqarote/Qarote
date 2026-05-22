/**
 * License Service
 * Handles license key generation, validation, and management
 */

import crypto from "node:crypto";

import { addDays } from "date-fns";

import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";

import { licenseConfig } from "@/config";

import type {
  GenerateLicenseOptions,
  LicenseValidationResponse,
  RenewLicenseResult,
  ValidateLicenseOptions,
} from "./license.interfaces";
import { signLicenseJwt } from "./license-crypto.service";

import { Prisma, UserPlan } from "@/generated/prisma/client";

type DbClient = Prisma.TransactionClient | typeof prisma;

class LicenseService {
  /**
   * Generate a new license key
   */
  async generateLicense(
    options: GenerateLicenseOptions,
    tx: DbClient = prisma
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

      // Create license record. When a tx is provided the create participates
      // in the caller's transaction so license + file version + outbox row
      // commit atomically — without it, a crash between license create and
      // saveLicenseFileVersion would leave the License persisted and the
      // existing-license idempotency check on retry would short-circuit
      // before recovering the missing version + delivery email.
      const license = await tx.license.create({
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

      // Caller logs the successful outcome after the surrounding
      // transaction commits.
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
      include: {
        fileVersions: {
          where: { deletesAt: { gt: new Date() } },
          orderBy: { version: "desc" },
          take: 1,
          select: { fileContent: true },
        },
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
    newExpiresAt: Date,
    tx: DbClient = prisma
  ): Promise<RenewLicenseResult> {
    try {
      // Get current license
      const currentLicense = await tx.license.findUnique({
        where: { id: licenseId },
      });

      if (!currentLicense) {
        throw new Error(`License ${licenseId} not found`);
      }

      const newVersion = currentLicense.currentVersion + 1;

      // Update license with new expiration and version
      const updatedLicense = await tx.license.update({
        where: { id: licenseId },
        data: {
          expiresAt: newExpiresAt,
          currentVersion: newVersion,
          updatedAt: new Date(),
        },
      });

      // Caller logs the successful outcome after the surrounding
      // transaction commits — logging inside the tx would be misleading
      // if the outer write fails and rolls back.
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
    expiresAt: Date,
    stripeInvoiceId?: string,
    tx: DbClient = prisma
  ): Promise<void> {
    try {
      // Calculate deletion date (30 days from now)
      const deletesAt = addDays(new Date(), 30);

      await tx.licenseFileVersion.create({
        data: {
          licenseId,
          version,
          fileContent,
          expiresAt,
          deletesAt,
          stripeInvoiceId,
        },
      });

      // Caller logs after the surrounding transaction commits.
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
   * Generate a signed license JWT (cloud-side only — requires private key)
   * This creates a compact JWT string that self-hosted instances paste in the UI
   */
  async generateLicenseJwt(options: {
    licenseId: string;
    tier: UserPlan;
    features: string[];
    expiresAt: Date;
  }): Promise<string> {
    const privateKey = licenseConfig.privateKey;
    if (!privateKey) {
      throw new Error(
        "License JWT generation requires private key (cloud only). " +
          "Please set LICENSE_PRIVATE_KEY environment variable."
      );
    }

    try {
      const jwt = await signLicenseJwt(
        {
          sub: options.licenseId,
          tier: options.tier,
          features: options.features,
          exp: Math.floor(options.expiresAt.getTime() / 1000),
        },
        privateKey
      );

      logger.info(
        { licenseId: options.licenseId, tier: options.tier },
        "License JWT generated successfully"
      );

      return jwt;
    } catch (error) {
      logger.error({ error }, "Failed to generate license JWT");
      throw error;
    }
  }
}

export const licenseService = new LicenseService();
