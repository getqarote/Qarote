import { areFeaturesEnabled } from "@/core/feature-flags";

import { CoreEmailService } from "@/services/email/core-email.service";

import { googleConfig, registrationConfig, ssoConfig } from "@/config";
import { getAllPremiumFeatures } from "@/config/features";

import { publicProcedure, router } from "@/trpc/trpc";

import { publicInvitationRouter } from "./invitation";

/**
 * Public router
 * Handles public endpoints that don't require authentication
 */
export const publicRouter = router({
  invitation: publicInvitationRouter,

  /**
   * Get public app configuration (PUBLIC)
   * Returns configuration flags needed by the frontend before authentication
   */
  getConfig: publicProcedure.query(async () => {
    // Use effective config (DB smtp_config > env ENABLE_EMAIL) so that
    // SMTP settings configured via the admin page are reflected here.
    const effectiveEmail = await CoreEmailService.loadEffectiveConfig();

    return {
      registrationEnabled: registrationConfig.enabled,
      emailEnabled: effectiveEmail.enabled,
      oauthEnabled: googleConfig.enabled,
      ssoEnabled: ssoConfig.enabled,
    };
  }),

  /**
   * Get feature flags (PUBLIC)
   * Returns which premium features are enabled for the current deployment
   */
  getFeatureFlags: publicProcedure.query(async () => {
    const allFeatures = getAllPremiumFeatures();
    const features = await areFeaturesEnabled(allFeatures);

    return {
      features,
    };
  }),
});
