/**
 * Self-Hosted License Router
 * Allows self-hosted admins to activate, check, and deactivate license JWTs via the UI
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { recordFromContext } from "@/services/audit";
import { broadcastLicenseInvalidation } from "@/services/feature-gate/license-invalidation";
import { verifyLicenseJwt } from "@/services/license/license-crypto.service";
import { trackEvent } from "@/services/posthog";

import { isSelfHostedMode } from "@/config/deployment";

import { rateLimitedOrgAdminProcedure, router } from "@/trpc/trpc";

import { UserPlan } from "@/generated/prisma/client";

/**
 * Admin procedure that only runs in self-hosted mode AND only for the
 * bootstrap organization (the first org created by `bootstrap-admin.ts`).
 *
 * The license JWT is a single SystemSetting row that gates platform-wide
 * features — letting any org's admin overwrite it in a multi-org
 * self-hosted install would be a privilege escalation. Pinning authority
 * to the bootstrap org matches the install-time mental model: whoever
 * provisioned the instance owns the license.
 */
const selfHostedProcedure = rateLimitedOrgAdminProcedure.use(async (opts) => {
  if (!isSelfHostedMode()) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "License activation is only available for self-hosted instances",
    });
  }

  const bootstrapOrg = await opts.ctx.prisma.organization.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!bootstrapOrg || bootstrapOrg.id !== opts.ctx.organizationId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "License management is restricted to the platform administrator",
    });
  }

  return opts.next();
});

export const selfhostedLicenseRouter = router({
  /**
   * Activate a license by pasting a JWT
   * Verifies the JWT offline, then stores it in the database
   */
  activate: selfHostedProcedure
    .input(z.object({ licenseKey: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const { licenseKey } = input;

      // Verify JWT signature + expiry with baked-in public key
      const payload = await verifyLicenseJwt(licenseKey);

      if (!payload) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Invalid or expired license key. Please check the key and try again.",
        });
      }

      // Store in SystemSetting (upsert — replace if one already exists)
      await ctx.prisma.systemSetting.upsert({
        where: { key: "license_jwt" },
        update: { value: licenseKey },
        create: { key: "license_jwt", value: licenseKey },
      });

      // Invalidate cached license everywhere — local first, then NOTIFY
      // so peer processes (workers, other web replicas) clear theirs too.
      // Without the broadcast, the alert worker can keep sending Slack /
      // webhook notifications using a stale license for up to 60 s.
      await broadcastLicenseInvalidation();

      ctx.logger.info(
        { tier: payload.tier, exp: payload.exp },
        "License activated successfully"
      );

      try {
        trackEvent(
          {
            distinctId: ctx.user.id,
            superProperties: { app: "api" },
          },
          "selfhosted_license_activated",
          {
            tier: payload.tier,
            expires_at: new Date(payload.exp * 1000).toISOString(),
          }
        );
      } catch (analyticsError) {
        ctx.logger.warn(
          { error: analyticsError, userId: ctx.user.id },
          "PostHog capture failed"
        );
      }

      void recordFromContext(ctx, {
        action: "license.activated",
        category: "system",
        entityType: "license",
        entityId: null,
        entityLabel: payload.tier,
        metadata: {
          tier: payload.tier,
          expiresAt: new Date(payload.exp * 1000).toISOString(),
          tokenSet: true,
        },
        workspaceId: null,
        // License activation IS the gate — record unconditionally on
        // self-hosted installs so the audit trail of plan changes is
        // queryable regardless of which plan was active before.
        planSnapshot: UserPlan.ENTERPRISE,
      });

      return {
        tier: payload.tier,
        features: payload.features,
        expiresAt: new Date(payload.exp * 1000).toISOString(),
      };
    }),

  /**
   * Get current license status
   * Returns decoded license info if a valid JWT is stored, null otherwise
   */
  status: selfHostedProcedure.query(async ({ ctx }) => {
    const setting = await ctx.prisma.systemSetting.findUnique({
      where: { key: "license_jwt" },
    });

    if (!setting) {
      return { active: false, license: null };
    }

    const payload = await verifyLicenseJwt(setting.value);

    if (!payload) {
      return { active: false, license: null };
    }

    return {
      active: true,
      license: {
        tier: payload.tier,
        features: payload.features,
        expiresAt: new Date(payload.exp * 1000).toISOString(),
        issuedAt: new Date(payload.iat * 1000).toISOString(),
      },
    };
  }),

  /**
   * Deactivate the current license
   * Removes the JWT from the database — features revert to free tier
   */
  deactivate: selfHostedProcedure.mutation(async ({ ctx }) => {
    try {
      await ctx.prisma.systemSetting.delete({
        where: { key: "license_jwt" },
      });
    } catch (error: unknown) {
      // Prisma P2025 = record not found — already deleted or never existed
      const isNotFound =
        error != null &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code: string }).code === "P2025";
      if (!isNotFound) throw error;
    }

    await broadcastLicenseInvalidation();
    ctx.logger.info("License deactivated");

    try {
      trackEvent(
        {
          distinctId: ctx.user.id,
          superProperties: { app: "api" },
        },
        "selfhosted_license_deactivated",
        {}
      );
    } catch (analyticsError) {
      ctx.logger.warn(
        { error: analyticsError, userId: ctx.user.id },
        "PostHog capture failed"
      );
    }

    void recordFromContext(ctx, {
      action: "license.cleared",
      category: "system",
      entityType: "license",
      entityId: null,
      workspaceId: null,
      // Clearing the license drops the install from Enterprise → Free,
      // but the act itself must be recorded (compliance evidence).
      planSnapshot: UserPlan.ENTERPRISE,
    });

    return { success: true };
  }),
});
