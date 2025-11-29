/**
 * License Middleware
 * Validates license and enforces feature limits for self-hosted deployments
 */

import { Context, Next } from "hono";

import { isSelfHostedMode } from "@/config/deployment";

import { licenseService } from "./license.service";

interface Variables {
  user: {
    id: string;
    workspaceId: string | null;
  };
  license?: {
    id: string;
    tier: string;
    expiresAt: Date | null;
    isActive: boolean;
  };
}

/**
 * Middleware to validate license for self-hosted deployments
 * Only applies in self-hosted mode
 */
export const licenseValidationMiddleware = () => {
  return async (c: Context<{ Variables: Variables }>, next: Next) => {
    // Only validate licenses in self-hosted mode
    if (!isSelfHostedMode()) {
      return next();
    }

    // Get license key from environment or request header
    const licenseKey = process.env.LICENSE_KEY || c.req.header("X-License-Key");

    if (!licenseKey) {
      return c.json(
        {
          error: "License required",
          message:
            "A valid license key is required for self-hosted deployments",
        },
        403
      );
    }

    // Validate license
    const validation = await licenseService.validateLicense({
      licenseKey,
    });

    if (!validation.valid || !validation.license) {
      return c.json(
        {
          error: "Invalid license",
          message: validation.message || "License validation failed",
        },
        403
      );
    }

    // Store license in context for use in route handlers
    c.set("license", validation.license);

    return next();
  };
};

/**
 * Middleware to check license tier for feature access
 */
export const requireLicenseTier = (requiredTier: string) => {
  return async (c: Context<{ Variables: Variables }>, next: Next) => {
    if (!isSelfHostedMode()) {
      return next();
    }

    const license = c.get("license");
    if (!license) {
      return c.json(
        {
          error: "License required",
          message: "A valid license is required for this feature",
        },
        403
      );
    }

    // Tier hierarchy: FREE < DEVELOPER < ENTERPRISE
    const tierHierarchy = {
      FREE: 0,
      DEVELOPER: 1,
      ENTERPRISE: 2,
    };

    const currentTierLevel =
      tierHierarchy[license.tier as keyof typeof tierHierarchy] ?? 0;
    const requiredTierLevel =
      tierHierarchy[requiredTier as keyof typeof tierHierarchy] ?? 0;

    if (currentTierLevel < requiredTierLevel) {
      return c.json(
        {
          error: "Insufficient license tier",
          message: `This feature requires ${requiredTier} license. Current: ${license.tier}`,
        },
        403
      );
    }

    return next();
  };
};
