/**
 * License Features Service
 * Maps plan tiers to license features
 */

import { UserPlan } from "@prisma/client";

import { getAllPremiumFeatures, type PremiumFeature } from "@/config/features";

/**
 * Get premium features for a plan tier
 * Enterprise plans get all premium features
 */
export function getLicenseFeaturesForTier(tier: UserPlan): PremiumFeature[] {
  // Enterprise tier gets all premium features
  if (tier === UserPlan.ENTERPRISE) {
    return getAllPremiumFeatures();
  }

  // Developer tier gets workspace management and alerting (but not all integrations)
  if (tier === UserPlan.DEVELOPER) {
    return ["workspace_management", "alerting", "data_export"];
  }

  // Free tier gets no premium features
  return [];
}
