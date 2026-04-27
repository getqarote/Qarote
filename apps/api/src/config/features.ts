/**
 * Feature Flag Configuration
 * Defines which features are premium and require enterprise license
 */

export type PremiumFeature =
  | "workspace_management"
  | "alerting"
  | "slack_integration"
  | "webhook_integration"
  | "data_export"
  | "advanced_alert_rules"
  | "topology_visualization"
  | "sso"
  | "digest_customization";

/**
 * Feature definitions
 */
export const FEATURES = {
  WORKSPACE_MANAGEMENT: "workspace_management" as const,
  ALERTING: "alerting" as const,
  SLACK_INTEGRATION: "slack_integration" as const,
  WEBHOOK_INTEGRATION: "webhook_integration" as const,
  DATA_EXPORT: "data_export" as const,
  ADVANCED_ALERT_RULES: "advanced_alert_rules" as const,
  TOPOLOGY_VISUALIZATION: "topology_visualization" as const,
  SSO: "sso" as const,
  DIGEST_CUSTOMIZATION: "digest_customization" as const,
} as const;

/**
 * Feature descriptions for error messages
 */
export const FEATURE_DESCRIPTIONS: Record<PremiumFeature, string> = {
  workspace_management: "Workspace Management",
  alerting: "Alerting System",
  slack_integration: "Slack Integration",
  webhook_integration: "Webhook Integration",
  data_export: "Data Export",
  advanced_alert_rules: "Advanced Alert Rules",
  topology_visualization: "Topology Visualization",
  sso: "SSO / SAML / OIDC",
  digest_customization: "Daily Digest Customization",
};

/**
 * Get all premium features
 */
export function getAllPremiumFeatures(): PremiumFeature[] {
  return Object.values(FEATURES);
}
