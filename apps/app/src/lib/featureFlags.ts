/**
 * Frontend Feature Flags
 * Note: These are for UI display only. All authorization is done server-side.
 */

import { getDeploymentMode } from "@/lib/runtimeConfig";

export type PremiumFeature =
  | "workspace_management"
  | "alerting"
  | "slack_integration"
  | "webhook_integration"
  | "data_export"
  | "advanced_alert_rules"
  | "topology_visualization"
  | "digest_customization"
  | "incident_diagnosis"
  | "message_tracing";

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
  topology_visualization: "Topology Visualization",
  digest_customization: "Daily Digest Customization",
  incident_diagnosis: "Incident Diagnosis Engine",
  message_tracing: "Message Tracing",
};

/**
 * Get feature description
 */
export function getFeatureDescription(feature: PremiumFeature): string {
  return FEATURE_DESCRIPTIONS[feature] || feature;
}
