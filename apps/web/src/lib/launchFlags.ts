/**
 * Features hidden across the public site at launch (T7 / T16a): Message Spy,
 * Firehose Tracing, Daily Digest. The code stays in the tree (hide-don't-delete)
 * but these surfaces are filtered out so the marketing site never advertises
 * what a user can't reach.
 *
 * ONE source of truth so the features grid (FeaturesSection card `key`) and the
 * pricing table (PricingSection row `name`) can never drift — a feature hidden
 * here must disappear from BOTH. Remove an entry when its feature returns.
 *
 * Note: Alerting / Notifications is NOT hidden — it's a shipped V2 feature.
 */
export const LAUNCH_HIDDEN_FEATURE_KEYS = [
  "messageSpy",
  "messageTracing",
  "dailyDigest",
];
