interface AlertsSummaryProps {
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
}

/**
 * Compact inline alert summary — replaces the previous 6-card hero grid
 * (of which 4 cards perpetually showed "0"). Same information density,
 * a fraction of the vertical space. The actual alert items are the
 * dashboard's primary content; the summary is orientation, not headline.
 *
 * Severity colors are semantic tokens and only render when the count is
 * non-zero — a zero count renders neutral, so the eye is drawn only to
 * the severities that actually have alerts.
 */
export const AlertsSummary = ({ summary }: AlertsSummaryProps) => {
  const items: Array<{ label: string; count: number; tone: string }> = [
    {
      label: "critical",
      count: summary.critical,
      tone: summary.critical > 0 ? "text-destructive" : "text-muted-foreground",
    },
    {
      label: "high",
      count: summary.high,
      tone: summary.high > 0 ? "text-warning" : "text-muted-foreground",
    },
    {
      label: "medium",
      count: summary.medium,
      tone: summary.medium > 0 ? "text-warning/70" : "text-muted-foreground",
    },
    {
      label: "low",
      count: summary.low,
      tone: "text-muted-foreground",
    },
    {
      label: "info",
      count: summary.info,
      tone: "text-muted-foreground",
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
      <span className="font-semibold text-foreground">
        <span className="font-mono tabular-nums">{summary.total}</span>{" "}
        {summary.total === 1 ? "alert" : "alerts"}
      </span>
      <span className="text-muted-foreground">·</span>
      {items.map((item, i) => (
        <span key={item.label} className="flex items-center gap-1.5">
          <span className={`font-mono tabular-nums font-semibold ${item.tone}`}>
            {item.count}
          </span>
          <span className="text-muted-foreground">{item.label}</span>
          {i < items.length - 1 && (
            <span className="text-muted-foreground ml-3">·</span>
          )}
        </span>
      ))}
    </div>
  );
};
