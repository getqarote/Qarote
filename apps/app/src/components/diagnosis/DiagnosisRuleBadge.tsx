import { useTranslation } from "react-i18next";

export type DiagnosisRuleType =
  | "CONSUMER_CRASH"
  | "SLOW_CONSUMER"
  | "QUEUE_BACKLOG"
  | "PRODUCER_SPIKE"
  | "QUEUE_DRAIN_STALL"
  | "NO_ACTIVITY"
  | "MEMORY_ALARM_ACTIVE"
  | "DISK_ALARM_ACTIVE"
  | "PUBLISHER_FLOW_CONTROL"
  | "CHANNEL_LEAK"
  | "NO_CONSUMER_PERSISTENT_QUEUE"
  | "QUEUE_NEAR_LENGTH_LIMIT"
  | "DLX_FILLING"
  | "CONSUMER_UTILIZATION_LOW"
  | "QUORUM_LEADER_CHURN"
  | "STREAM_NO_OFFSET_TRACKING"
  | "CLASSIC_QUEUE_V1_LARGE";

const RULE_I18N_KEYS: Record<DiagnosisRuleType, string> = {
  CONSUMER_CRASH: "ruleLabel.consumerCrash",
  SLOW_CONSUMER: "ruleLabel.slowConsumer",
  QUEUE_BACKLOG: "ruleLabel.queueBacklog",
  PRODUCER_SPIKE: "ruleLabel.producerSpike",
  QUEUE_DRAIN_STALL: "ruleLabel.queueDrainStall",
  NO_ACTIVITY: "ruleLabel.noActivity",
  MEMORY_ALARM_ACTIVE: "ruleLabel.memoryAlarmActive",
  DISK_ALARM_ACTIVE: "ruleLabel.diskAlarmActive",
  PUBLISHER_FLOW_CONTROL: "ruleLabel.publisherFlowControl",
  CHANNEL_LEAK: "ruleLabel.channelLeak",
  NO_CONSUMER_PERSISTENT_QUEUE: "ruleLabel.noConsumerPersistentQueue",
  QUEUE_NEAR_LENGTH_LIMIT: "ruleLabel.queueNearLengthLimit",
  DLX_FILLING: "ruleLabel.dlxFilling",
  CONSUMER_UTILIZATION_LOW: "ruleLabel.consumerUtilizationLow",
  QUORUM_LEADER_CHURN: "ruleLabel.quorumLeaderChurn",
  STREAM_NO_OFFSET_TRACKING: "ruleLabel.streamNoOffsetTracking",
  CLASSIC_QUEUE_V1_LARGE: "ruleLabel.classicQueueV1Large",
};

const RULE_COLORS: Record<DiagnosisRuleType, string> = {
  CONSUMER_CRASH: "bg-destructive/10 text-destructive border-destructive/20",
  SLOW_CONSUMER:
    "bg-orange-500/10 text-orange-600 border-orange-500/20 dark:text-orange-400",
  QUEUE_BACKLOG:
    "bg-orange-500/10 text-orange-600 border-orange-500/20 dark:text-orange-400",
  PRODUCER_SPIKE:
    "bg-yellow-500/10 text-yellow-700 border-yellow-500/20 dark:text-yellow-400",
  QUEUE_DRAIN_STALL:
    "bg-yellow-500/10 text-yellow-700 border-yellow-500/20 dark:text-yellow-400",
  NO_ACTIVITY: "bg-muted text-muted-foreground border-border",
  // Tier A — broker-scoped alarm and flow-control rules render with the
  // critical (red) palette to match their CRITICAL/HIGH severities.
  MEMORY_ALARM_ACTIVE:
    "bg-destructive/10 text-destructive border-destructive/20",
  DISK_ALARM_ACTIVE: "bg-destructive/10 text-destructive border-destructive/20",
  PUBLISHER_FLOW_CONTROL:
    "bg-orange-500/10 text-orange-600 border-orange-500/20 dark:text-orange-400",
  // Tier A — queue-scoped structural rules.
  CHANNEL_LEAK:
    "bg-yellow-500/10 text-yellow-700 border-yellow-500/20 dark:text-yellow-400",
  NO_CONSUMER_PERSISTENT_QUEUE:
    "bg-orange-500/10 text-orange-600 border-orange-500/20 dark:text-orange-400",
  QUEUE_NEAR_LENGTH_LIMIT:
    "bg-orange-500/10 text-orange-600 border-orange-500/20 dark:text-orange-400",
  DLX_FILLING:
    "bg-yellow-500/10 text-yellow-700 border-yellow-500/20 dark:text-yellow-400",
  CONSUMER_UTILIZATION_LOW:
    "bg-yellow-500/10 text-yellow-700 border-yellow-500/20 dark:text-yellow-400",
  // Tier B — capability-gated, lower severity.
  QUORUM_LEADER_CHURN:
    "bg-orange-500/10 text-orange-600 border-orange-500/20 dark:text-orange-400",
  STREAM_NO_OFFSET_TRACKING:
    "bg-yellow-500/10 text-yellow-700 border-yellow-500/20 dark:text-yellow-400",
  CLASSIC_QUEUE_V1_LARGE: "bg-muted text-muted-foreground border-border",
};

interface DiagnosisRuleBadgeProps {
  rule: DiagnosisRuleType;
}

export function DiagnosisRuleBadge({ rule }: DiagnosisRuleBadgeProps) {
  const { t } = useTranslation("diagnosis");
  const i18nKey = RULE_I18N_KEYS[rule];
  const label = i18nKey ? t(i18nKey) : rule;
  const colors =
    RULE_COLORS[rule] ?? "bg-muted text-muted-foreground border-border";

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium border rounded-sm ${colors}`}
    >
      {label}
    </span>
  );
}
