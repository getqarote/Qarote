import { areFeaturesEnabled } from "@/core/feature-flags";

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
