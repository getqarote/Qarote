/**
 * Static map from `DiagnosisRuleType` to its canonical citation URL.
 *
 * The backend already validates these against the citation allowlist
 * at registration time (apps/api/src/ee/services/incident/
 * citation-allowlist.ts). Mirroring them on the frontend lets the
 * "Why this diagnosis?" disclosure render the link without an extra
 * round-trip — and keeps the i18n burden minimal (English-only
 * recommendations per the rules-sourcing plan).
 *
 * If a rule is added on the backend without a row here the badge
 * falls back to no citation; the disclosure still renders the rule
 * id, just without a link. New rules SHOULD be added here in the
 * same PR as the backend registration.
 */

import type { DiagnosisRuleType } from "./DiagnosisRuleBadge";

export const RULE_CITATIONS: Record<DiagnosisRuleType, string> = {
  CONSUMER_CRASH: "https://www.rabbitmq.com/docs/consumers",
  SLOW_CONSUMER: "https://www.rabbitmq.com/docs/consumer-prefetch",
  QUEUE_BACKLOG: "https://www.rabbitmq.com/docs/queues",
  PRODUCER_SPIKE: "https://www.rabbitmq.com/docs/flow-control",
  QUEUE_DRAIN_STALL: "https://www.rabbitmq.com/docs/consumers",
  NO_ACTIVITY: "https://www.rabbitmq.com/docs/management",
  MEMORY_ALARM_ACTIVE: "https://www.rabbitmq.com/docs/memory-use",
  DISK_ALARM_ACTIVE: "https://www.rabbitmq.com/docs/disk-alarms",
  PUBLISHER_FLOW_CONTROL: "https://www.rabbitmq.com/docs/flow-control",
  CHANNEL_LEAK: "https://www.rabbitmq.com/docs/channels",
  NO_CONSUMER_PERSISTENT_QUEUE: "https://www.rabbitmq.com/docs/queues",
  QUEUE_NEAR_LENGTH_LIMIT: "https://www.rabbitmq.com/docs/maxlength",
  DLX_FILLING: "https://www.rabbitmq.com/docs/dlx",
  CONSUMER_UTILIZATION_LOW: "https://www.rabbitmq.com/docs/consumer-prefetch",
  QUORUM_LEADER_CHURN: "https://www.rabbitmq.com/docs/quorum-queues",
  STREAM_NO_OFFSET_TRACKING: "https://www.rabbitmq.com/docs/streams",
  CLASSIC_QUEUE_V1_LARGE: "https://www.rabbitmq.com/docs/persistence-conf",
};

/**
 * Format a citation URL for display next to the rule. Strips the
 * leading `https://www.` and trailing slash so the host fits on one
 * line in the badge (`rabbitmq.com/docs/alarms` vs the noisy full
 * URL).
 */
export function formatCitationLabel(url: string): string {
  return url.replace(/^https:\/\/(www\.)?/, "").replace(/\/$/, "");
}
