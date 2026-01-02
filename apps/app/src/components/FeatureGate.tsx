/**
 * Feature Gate Component
 * Wraps premium features and shows upgrade prompt if feature is not enabled
 */

import { ReactNode } from "react";

import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { type PremiumFeature } from "@/lib/featureFlags";
import { UpgradePrompt } from "./UpgradePrompt";

interface FeatureGateProps {
  feature: PremiumFeature;
  children: ReactNode;
  fallback?: ReactNode;
  showUpgradePrompt?: boolean;
}

export function FeatureGate({
  feature,
  children,
  fallback,
  showUpgradePrompt = true,
}: FeatureGateProps) {
  const { hasFeature, isLoading } = useFeatureFlags();

  // Show loading state
  if (isLoading) {
    return fallback || <div>Loading...</div>;
  }

  // Feature is enabled - show children
  if (hasFeature(feature)) {
    return <>{children}</>;
  }

  // Feature is disabled - show upgrade prompt or fallback
  if (showUpgradePrompt) {
    return (
      <div className="relative">
        {/* Show the UI but overlay upgrade prompt */}
        <div className="opacity-50 pointer-events-none">{children}</div>
        <UpgradePrompt feature={feature} />
      </div>
    );
  }

  // Show fallback if provided
  return <>{fallback || null}</>;
}

