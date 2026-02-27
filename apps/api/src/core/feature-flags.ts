/**
 * Feature Flags System
 * Server-side feature gating based on deployment mode and license JWT
 */

import { TRPCError } from "@trpc/server";

import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";

import type {
  LicenseFile,
  LicenseJwtPayload,
} from "@/services/license/license.interfaces";
import {
  verifyLicenseJwt,
  verifyLicenseSignature,
} from "@/services/license/license-crypto.service";
import { LICENSE_PUBLIC_KEY } from "@/services/license/license-public-key";

import { isCloudMode } from "@/config/deployment";
import { FEATURE_DESCRIPTIONS, type PremiumFeature } from "@/config/features";

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
 * Parse a legacy JSON license file into a LicenseJwtPayload
 * Used for backward compatibility with old enterprise license files
 */
function parseLegacyLicense(json: string): LicenseJwtPayload | null {
  try {
    const file: LicenseFile = JSON.parse(json);

    if (!file.signature) return null;

    const publicKey = process.env.LICENSE_PUBLIC_KEY || LICENSE_PUBLIC_KEY;
    const valid = verifyLicenseSignature(
      {
        licenseKey: file.licenseKey,
        tier: file.tier,
        customerEmail: file.customerEmail,
        issuedAt: file.issuedAt,
        expiresAt: file.expiresAt,
        features: file.features,
        maxInstances: file.maxInstances,
      },
      file.signature,
      publicKey
    );

    if (!valid) return null;

    const expiresAt = new Date(file.expiresAt);
    if (expiresAt < new Date()) return null;

    return {
      sub: file.licenseKey,
      tier: file.tier as LicenseJwtPayload["tier"],
      features: file.features,
      iss: "qarote",
      iat: Math.floor(new Date(file.issuedAt).getTime() / 1000),
      exp: Math.floor(expiresAt.getTime() / 1000),
    };
  } catch (error) {
    logger.error({ error }, "Failed to parse legacy license");
    return null;
  }
}

/**
 * Get the current license payload from DB, with caching
 */
async function getLicensePayload(): Promise<LicenseJwtPayload | null> {
  const now = Date.now();

  // Return cached value if still fresh
  if (cacheChecked && now - cachedAt < CACHE_TTL_MS) {
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

    // Detect format and verify accordingly
    const payload = setting.value.startsWith("legacy:")
      ? parseLegacyLicense(setting.value.slice("legacy:".length))
      : await verifyLicenseJwt(setting.value);

    cachedPayload = payload;
    cachedAt = now;
    cacheChecked = true;
    return payload;
  } catch (error) {
    logger.error({ error }, "Error reading license from database");
    // On error, don't cache — retry next time
    return cachedPayload; // return stale value if any
  }
}

import { te } from "@/i18n";

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
