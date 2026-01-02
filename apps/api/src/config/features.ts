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
  | "advanced_alert_rules";

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
};

/**
 * Get all premium features
 */
export function getAllPremiumFeatures(): PremiumFeature[] {
  return Object.values(FEATURES);
}
