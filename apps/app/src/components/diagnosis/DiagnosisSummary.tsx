import { useTranslation } from "react-i18next";

interface SummaryData {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
}

interface DiagnosisSummaryProps {
  summary: SummaryData;
}

export function DiagnosisSummary({ summary }: DiagnosisSummaryProps) {
  const { t } = useTranslation("diagnosis");

  const counts = [
    {
      label: t("severity.critical"),
      value: summary.critical,
      color: "text-destructive",
    },
    {
      label: t("severity.high"),
      value: summary.high,
      color: "text-orange-600 dark:text-orange-400",
    },
    {
      label: t("severity.medium"),
      value: summary.medium,
      color: "text-yellow-700 dark:text-yellow-400",
    },
    {
      label: t("severity.low"),
      value: summary.low,
      color: "text-muted-foreground",
    },
    {
      label: t("severity.info"),
      value: summary.info,
      color: "text-blue-600 dark:text-blue-400",
    },
  ].filter((c) => c.value > 0);

  return (
    <div className="flex items-center gap-4 rounded-md border border-border bg-muted/30 px-4 py-3 text-sm">
      <span className="font-medium text-foreground">
        {t("summary.total", { count: summary.total })}
      </span>
      {counts.map((c) => (
        <span key={c.label} className={c.color}>
          {c.value} {c.label}
        </span>
      ))}
    </div>
  );
}
