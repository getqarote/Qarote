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
 * Normalizes deprecated "community" and "enterprise" to "selfhosted".
 */
function getDeploymentMode(): "cloud" | "selfhosted" {
  const buildTime = import.meta.env.VITE_DEPLOYMENT_MODE as string | undefined;
  if (buildTime) {
    if (buildTime === "cloud") return "cloud";
    return "selfhosted"; // "selfhosted", "community", "enterprise" all map here
  }

  if (typeof window !== "undefined") {
    const runtimeConfig = window.__QAROTE_CONFIG__;
    if (
      runtimeConfig?.deploymentMode &&
      runtimeConfig.deploymentMode !== "cloud"
    ) {
      return "selfhosted";
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
 * Check if running in self-hosted mode
 */
export function isSelfHostedMode(): boolean {
  return getDeploymentMode() === "selfhosted";
}

/**
 * Get the path for upgrade/license CTAs based on deployment mode.
 * Cloud → /plans, Self-hosted → /settings/license
 */
export function getUpgradePath(): "/plans" | "/settings/license" {
  return isCloudMode() ? "/plans" : "/settings/license";
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
