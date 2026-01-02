/**
 * Feature Flags System
 * Server-side feature gating based on deployment mode and license
 */

import { TRPCError } from "@trpc/server";

import { logger } from "@/core/logger";

import {
  hasFeature,
  readLicenseFile,
  validateLicenseFileOffline,
} from "@/services/license/license-file.service";
import { validateLicenseFileIntegrity } from "@/services/license/license-file-integrity.service";

import {
  isCloudMode,
  isCommunityMode,
  isEnterpriseMode,
} from "@/config/deployment";
import { FEATURE_DESCRIPTIONS, PremiumFeature } from "@/config/features";

/**
 * Check if a premium feature is enabled
 * This is the main function that determines feature availability
 */
export async function isFeatureEnabled(
  feature: PremiumFeature
): Promise<boolean> {
  // Cloud mode: all features enabled
  if (isCloudMode()) {
    return true;
  }

  // Community mode: all premium features disabled
  if (isCommunityMode()) {
    return false;
  }

  // Enterprise mode: check license file
  if (isEnterpriseMode()) {
    try {
      // Validate license file integrity first
      const integrityCheck = await validateLicenseFileIntegrity();
      if (!integrityCheck.valid) {
        logger.warn(
          { reason: integrityCheck.reason },
          "License file integrity check failed"
        );
        return false;
      }

      // Read and validate license file
      const licenseFile = await readLicenseFile();
      const validation = await validateLicenseFileOffline(licenseFile);

      if (!validation.valid || !validation.license) {
        logger.warn(
          { reason: validation.reason },
          "License file validation failed"
        );
        return false;
      }

      // Check if feature is included in license
      return hasFeature(validation.license, feature);
    } catch (error) {
      logger.error({ error, feature }, "Error checking feature availability");
      return false;
    }
  }

  // Default: feature disabled
  return false;
}

/**
 * Require premium feature middleware for tRPC procedures
 * Throws TRPCError if feature is not available
 *
 * Note: Type is inferred by tRPC when used with .use() method
 */
export function requirePremiumFeature(feature: PremiumFeature) {
  // @ts-expect-error - tRPC provides correct types when used with .use()
  return async (opts) => {
    const enabled = await isFeatureEnabled(feature);

    if (!enabled) {
      const featureName = FEATURE_DESCRIPTIONS[feature];

      if (isCommunityMode()) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `${featureName} requires Enterprise Edition. Upgrade from Community Edition to unlock this feature.`,
        });
      }

      if (isEnterpriseMode()) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `${featureName} is not included in your license or your license is invalid. Please check your license file.`,
        });
      }

      throw new TRPCError({
        code: "FORBIDDEN",
        message: `${featureName} is not available.`,
      });
    }

    return opts.next();
  };
}

/**
 * Check multiple features at once
 */
export async function areFeaturesEnabled(
  features: PremiumFeature[]
): Promise<Record<PremiumFeature, boolean>> {
  const results: Record<string, boolean> = {};

  await Promise.all(
    features.map(async (feature) => {
      results[feature] = await isFeatureEnabled(feature);
    })
  );

  return results as Record<PremiumFeature, boolean>;
}
