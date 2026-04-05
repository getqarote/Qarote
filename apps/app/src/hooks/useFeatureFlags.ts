/**
 * React hook for feature flags
 * Note: Frontend feature flags are for UI display only.
 * All authorization is enforced server-side.
 */

import type { PremiumFeature } from "@/lib/featureFlags";
import { isCloudMode } from "@/lib/featureFlags";
import { trpc } from "@/lib/trpc/client";

/**
 * Hook to check if a premium feature is enabled
 * In cloud mode, all features are enabled.
 * In community/enterprise mode, checks with server.
 */
export function useFeatureFlags() {
  // In cloud mode or demo mode, all features are enabled
  const cloudMode = isCloudMode();
  const demoMode = import.meta.env.VITE_DEMO_MODE === "true";
  const allFeaturesEnabled = cloudMode || demoMode;

  // Query feature availability from server (for enterprise/community)
  const { data: features, isLoading: queryIsLoading } =
    trpc.public.getFeatureFlags.useQuery(undefined, {
      enabled: !allFeaturesEnabled,
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    });

  const hasFeature = (feature: PremiumFeature): boolean => {
    // Cloud/demo mode: all features enabled
    if (allFeaturesEnabled) {
      return true;
    }

    // Enterprise/Community: check server response
    return features?.features?.[feature] ?? false;
  };

  return {
    hasFeature,
    isLoading: !allFeaturesEnabled && queryIsLoading,
    features: features?.features ?? {},
  };
}
