/**
 * License Service
 * Handles license key generation, validation, and management
 */

import { UserPlan } from "@prisma/client";
import crypto from "crypto";

import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";

interface GenerateLicenseOptions {
  tier: UserPlan;
  customerEmail: string;
  workspaceId?: string;
  expiresAt?: Date;
  stripeCustomerId?: string;
  stripePaymentId?: string;
}

interface ValidateLicenseOptions {
  licenseKey: string;
  instanceId?: string;
}

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
  async validateLicense(options: ValidateLicenseOptions): Promise<{
    valid: boolean;
    license?: {
      id: string;
      tier: UserPlan;
      expiresAt: Date | null;
      isActive: boolean;
      customerEmail: string;
      workspaceId: string | null;
    };
    message?: string;
  }> {
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
      if (license.expiresAt && license.expiresAt < new Date()) {
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
          instanceId: options.instanceId || license.instanceId,
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
}

export const licenseService = new LicenseService();
