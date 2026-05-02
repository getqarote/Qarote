/**
 * License read layer of the feature gate.
 *
 * Owns the in-memory cache + JWT verification + the `isFeatureEnabled`
 * binary check used by the license axis and by callers that just need a
 * yes/no answer (workers, cron, public router).
 *
 * Pre-ADR-002 this code lived in `core/feature-flags.ts`. It moved here as
 * part of the boundary collapse documented in ADR-002 follow-up so that
 * "license" lives in one module instead of two mutually-referential ones.
 */

import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";

import type { LicenseJwtPayload } from "@/services/license/license.interfaces";
import { verifyLicenseJwt } from "@/services/license/license-crypto.service";

import { isCloudMode, isDemoMode } from "@/config/deployment";
import { type PremiumFeature } from "@/config/features";

import { getFeatureGateConfig } from "./gate.config";
import type { FeatureGateResult, FeatureKey } from "./types";

// ─── In-memory cache for decoded license ─────────────────────────────
// Avoids hitting the DB on every feature check (which happens per-request).

const CACHE_TTL_MS = 60_000; // 60 seconds

let cachedPayload: LicenseJwtPayload | null = null;
let cachedAt = 0;
let cacheChecked = false; // distinguishes "no license" from "not yet checked"

/**
 * Invalidate the in-memory license cache.
 * Called after activate/deactivate to reflect changes immediately within
 * the current process. Multi-worker invalidation is tracked separately
 * (see issue #41).
 */
export function invalidateLicenseCache(): void {
  cachedPayload = null;
  cachedAt = 0;
  cacheChecked = false;
}

/**
 * Get the current license payload from DB, with caching.
 */
export async function getLicensePayload(): Promise<LicenseJwtPayload | null> {
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
 * Binary check: is `feature` enabled on this instance?
 *
 * - Cloud mode: every feature except SSO is enabled (SSO is per-workspace
 *   plan-gated inside the SSO router).
 * - Demo mode: every feature enabled so visitors see the full product.
 * - Self-hosted: consult the JWT license.
 *
 * Used by the license axis and by ad-hoc callers that don't need the full
 * `FeatureGateResult` shape (workers, public introspection endpoints).
 */
export async function isFeatureEnabled(
  feature: PremiumFeature
): Promise<boolean> {
  if (isCloudMode()) {
    if (feature === "sso") return false;
    return true;
  }

  if (isDemoMode()) {
    return true;
  }

  try {
    const payload = await getLicensePayload();
    if (!payload) return false;

    // SSO: also grant if the license tier is ENTERPRISE — backwards-compat
    // for older licenses that don't list "sso" explicitly in the features
    // array.
    if (feature === "sso") {
      return payload.features.includes("sso") || payload.tier === "ENTERPRISE";
    }

    return payload.features.includes(feature);
  } catch (error) {
    logger.error({ error, feature }, "Error checking feature availability");
    return false;
  }
}

/**
 * Multi-feature variant of `isFeatureEnabled`. Returns a record keyed by
 * each requested feature.
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

// ─── License axis (composer-facing) ──────────────────────────────────
// Lives next to the cache + binary check it wraps; pre-collapse this
// was a separate `license-axis.ts` file. Keeping the binary check
// (`isFeatureEnabled`) and its `FeatureGateResult`-shaped sibling
// (`resolveLicenseAxis`) in one module avoids the mutually-referential
// pair the ADR-002 follow-up called out.

/**
 * Resolve the license axis for `feature`.
 *
 * Returns `kind: "ok"` when:
 * - the feature is not license-gated, OR
 * - cloud/demo mode (license is implicit), OR
 * - the JWT license includes the feature.
 *
 * Returns `kind: "blocked", blockedBy: "license"` otherwise. The CTA points
 * to the deployment-mode-appropriate path: `/plans` (cloud) is a no-op for
 * license blocks because cloud cannot be license-blocked, and self-hosted
 * users land on `/settings/license`.
 */
export async function resolveLicenseAxis(
  feature: FeatureKey
): Promise<FeatureGateResult> {
  const config = getFeatureGateConfig(feature);

  if (!config.licenseRequired) {
    return { kind: "ok" };
  }

  const enabled = await isFeatureEnabled(feature);
  if (enabled) return { kind: "ok" };

  // In cloud mode, `isFeatureEnabled` only returns false for SSO (which is
  // plan-gated per-workspace, not license-gated). Falling through here means
  // the plan axis will surface the right CTA. We return "ok" so the composer
  // continues to the next axis instead of incorrectly attributing the block
  // to "license" in cloud.
  if (isCloudMode()) {
    return { kind: "ok" };
  }

  return {
    kind: "blocked",
    blockedBy: "license",
    feature,
    reasonKey: "license.featureRequiresLicense",
    reasonParams: { feature },
    upgrade: {
      ctaKey: "license.cta.activate",
      ctaUrl: "/settings/license",
    },
  };
}
