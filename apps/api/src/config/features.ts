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
  | "message_tracing"
  | "message_spy"
  | "ai_explain_inline"
  | "ai_explain_digest"
  | "audit_log"
  | "rbac_advanced";

/**
 * Capability-only features: NOT EE-licensed (free in CE and on every plan),
 * but still gated on the capability axis — "does this feature work on THIS
 * broker?". `incident_diagnosis` is the rules-based detection engine: free
 * everywhere, yet degraded until ~3h of metric snapshots exist. Kept in a
 * separate type from `PremiumFeature` so "is this EE-licensed?" and "can this
 * be gated?" are answered by different types (SoC — T21 CE/EE split). The AI
 * Explain layer (`ai_explain_inline` / `ai_explain_digest`) stays premium.
 */
export type CapabilityOnlyFeature = "incident_diagnosis";

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
  MESSAGE_TRACING: "message_tracing" as const,
  // Plan-gated only (not license-gated) — see plan note in preview plan doc.
  MESSAGE_SPY: "message_spy" as const,
  // Developer+ for BYOK providers; Enterprise for Managed provider.
  AI_EXPLAIN_INLINE: "ai_explain_inline" as const,
  AI_EXPLAIN_DIGEST: "ai_explain_digest" as const,
  // Operator audit log — Enterprise-only DB writes; Pino mirror runs
  // on every plan. See docs/internal/AUDIT_LOG.md.
  AUDIT_LOG: "audit_log" as const,
  // RBAC Phase 3 — custom roles + resource scopes. Enterprise-only at
  // both license + plan axes (see gate.config.ts developerBehaviour).
  RBAC_ADVANCED: "rbac_advanced" as const,
} as const;

/**
 * Capability-only feature constants — gatable (capability axis) but not
 * EE-licensed. Mirror of {@link CapabilityOnlyFeature}.
 */
export const CAPABILITY_FEATURES = {
  INCIDENT_DIAGNOSIS: "incident_diagnosis" as const,
} as const;

/**
 * Get all premium (EE-licensed) features.
 *
 * Drives license/plan resolution and the EE feature wire surface. Human-readable
 * descriptions live in the frontend `gate.json` namespace; the backend
 * deals only in the keys.
 */
export function getAllPremiumFeatures(): PremiumFeature[] {
  return Object.values(FEATURES);
}

/**
 * Get every gatable feature key — premium (license-bearing) plus
 * capability-only (free but capability-gated). This is the key space the
 * gate config Record must cover; the gate-config completeness invariant
 * test asserts against it.
 */
export function getAllFeatureKeys(): (
  | PremiumFeature
  | CapabilityOnlyFeature
)[] {
  return [...Object.values(FEATURES), ...Object.values(CAPABILITY_FEATURES)];
}

/**
 * Type guard: is this feature key EE-licensed (vs capability-only)?
 *
 * Lets the license axis narrow a `FeatureKey` to `PremiumFeature` before
 * consulting the license, instead of casting. Capability-only keys
 * (`incident_diagnosis`) are never license-bearing.
 */
export function isPremiumFeature(
  feature: PremiumFeature | CapabilityOnlyFeature
): feature is PremiumFeature {
  return (Object.values(FEATURES) as string[]).includes(feature);
}
