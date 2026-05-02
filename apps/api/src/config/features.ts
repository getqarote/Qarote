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
  | "digest_customization"
  | "incident_diagnosis"
  | "message_tracing"
  | "message_spy";

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
  INCIDENT_DIAGNOSIS: "incident_diagnosis" as const,
  MESSAGE_TRACING: "message_tracing" as const,
  // Plan-gated only (not license-gated) — see plan note in preview plan doc.
  MESSAGE_SPY: "message_spy" as const,
} as const;

/**
 * Get all premium features.
 *
 * Used for the gate config completeness invariant test. Human-readable
 * descriptions live in the frontend `gate.json` namespace; the backend
 * deals only in the keys.
 */
export function getAllPremiumFeatures(): PremiumFeature[] {
  return Object.values(FEATURES);
}
