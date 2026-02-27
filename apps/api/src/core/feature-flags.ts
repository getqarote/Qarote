/**
 * Feature Flags System
 * Server-side feature gating based on deployment mode and license JWT
 */

import { TRPCError } from "@trpc/server";

import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";

import type { LicenseJwtPayload } from "@/services/license/license.interfaces";
import { verifyLicenseJwt } from "@/services/license/license-crypto.service";

import { isCloudMode } from "@/config/deployment";
import { FEATURE_DESCRIPTIONS, type PremiumFeature } from "@/config/features";

import { te } from "@/i18n";

// ─── In-memory cache for decoded license ─────────────────────────────
// Avoids hitting the DB on every feature check (which happens per-request)

const CACHE_TTL_MS = 60_000; // 60 seconds

let cachedPayload: LicenseJwtPayload | null = null;
let cachedAt = 0;
let cacheChecked = false; // distinguishes "no license" from "not yet checked"

/**
 * Invalidate the in-memory license cache
 * Called after activate/deactivate to reflect changes immediately
 */
export function invalidateLicenseCache(): void {
  cachedPayload = null;
  cachedAt = 0;
  cacheChecked = false;
}

/**
 * Get the current license payload from DB, with caching
 */
async function getLicensePayload(): Promise<LicenseJwtPayload | null> {
  const now = Date.now();

  // Return cached value if still fresh and not expired
  if (cacheChecked && now - cachedAt < CACHE_TTL_MS) {
    // Also check JWT exp — evict if the license has expired since we cached it
    if (cachedPayload && cachedPayload.exp * 1000 < now) {
      cachedPayload = null;
    }
    return cachedPayload;
  }

  // Read from DB
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: "license_jwt" },
    });

    if (!setting) {
      cachedPayload = null;
      cachedAt = now;
      cacheChecked = true;
      return null;
    }

    const payload = await verifyLicenseJwt(setting.value);

    cachedPayload = payload;
    cachedAt = now;
    cacheChecked = true;
    return payload;
  } catch (error) {
    logger.error(
      { error, hasStaleCache: cachedPayload != null },
      "Error reading license from database, returning stale cache"
    );
    // On error, don't cache — retry next time
    return cachedPayload;
  }
}

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

  // Self-hosted mode: check license JWT from database
  try {
    const payload = await getLicensePayload();

    if (!payload) {
      return false;
    }

    return payload.features.includes(feature);
  } catch (error) {
    logger.error({ error, feature }, "Error checking feature availability");
    return false;
  }
}

/**
 * Require premium feature middleware for tRPC procedures
 * Throws TRPCError if feature is not available
 */
export function requirePremiumFeature(feature: PremiumFeature) {
  // @ts-expect-error - tRPC provides correct types when used with .use()
  return async (opts) => {
    const enabled = await isFeatureEnabled(feature);

    if (!enabled) {
      const featureName = FEATURE_DESCRIPTIONS[feature];
      const locale = opts.ctx?.locale || "en";

      throw new TRPCError({
        code: "FORBIDDEN",
        message: te(locale, "feature.requiresLicense", { featureName }),
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
