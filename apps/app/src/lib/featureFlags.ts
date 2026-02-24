/**
 * Frontend Feature Flags
 * Note: These are for UI display only. All authorization is done server-side.
 */

export type PremiumFeature =
  | "workspace_management"
  | "alerting"
  | "slack_integration"
  | "webhook_integration"
  | "data_export"
  | "advanced_alert_rules";

/**
 * Get deployment mode from environment.
 * Checks build-time env first, then runtime config (served by /config.js in binary mode).
 */
function getDeploymentMode(): "cloud" | "community" | "enterprise" {
  const buildTime = import.meta.env.VITE_DEPLOYMENT_MODE as
    | "cloud"
    | "community"
    | "enterprise"
    | undefined;
  if (buildTime) return buildTime;

  if (typeof window !== "undefined") {
    const runtimeConfig = (window as unknown as Record<string, unknown>)
      .__QAROTE_CONFIG__ as { deploymentMode?: string } | undefined;
    if (
      runtimeConfig?.deploymentMode === "community" ||
      runtimeConfig?.deploymentMode === "enterprise"
    ) {
      return runtimeConfig.deploymentMode;
    }
  }

  return "cloud";
}

/**
 * Check if running in cloud mode
 */
export function isCloudMode(): boolean {
  return getDeploymentMode() === "cloud";
}

/**
 * Feature descriptions for UI
 */
const FEATURE_DESCRIPTIONS: Record<PremiumFeature, string> = {
  workspace_management: "Workspace Management",
  alerting: "Alerting System",
  slack_integration: "Slack Integration",
  webhook_integration: "Webhook Integration",
  data_export: "Data Export",
  advanced_alert_rules: "Advanced Alert Rules",
};

/**
 * Get feature description
 */
export function getFeatureDescription(feature: PremiumFeature): string {
  return FEATURE_DESCRIPTIONS[feature] || feature;
}
