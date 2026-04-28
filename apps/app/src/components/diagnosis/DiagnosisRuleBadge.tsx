import { useTranslation } from "react-i18next";

export type DiagnosisRuleType =
  | "CONSUMER_CRASH"
  | "SLOW_CONSUMER"
  | "QUEUE_BACKLOG"
  | "PRODUCER_SPIKE"
  | "QUEUE_DRAIN_STALL"
  | "NO_ACTIVITY";

const RULE_I18N_KEYS: Record<DiagnosisRuleType, string> = {
  CONSUMER_CRASH: "ruleLabel.consumerCrash",
  SLOW_CONSUMER: "ruleLabel.slowConsumer",
  QUEUE_BACKLOG: "ruleLabel.queueBacklog",
  PRODUCER_SPIKE: "ruleLabel.producerSpike",
  QUEUE_DRAIN_STALL: "ruleLabel.queueDrainStall",
  NO_ACTIVITY: "ruleLabel.noActivity",
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
