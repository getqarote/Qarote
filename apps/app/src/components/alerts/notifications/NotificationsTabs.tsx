import { useTranslation } from "react-i18next";

export type NotificationsView = "alerts" | "config" | "rules";

interface NotificationsTabsProps {
  view: NotificationsView;
  alertsCount: number;
  findingsCount: number;
  /** Whether to show the Alert rules tab (admin-gated, premium feature). */
  showRules: boolean;
  onSelect: (view: NotificationsView) => void;
}

/**
 * Underline tab bar for the Notifications page (prototype `.tabs`): Alerts,
 * Config scan, and Alert rules each switch the panel below. Counts render in
 * mono next to the label.
 */
export function NotificationsTabs({
  view,
  alertsCount,
  findingsCount,
  showRules,
  onSelect,
}: NotificationsTabsProps) {
  const { t } = useTranslation("alerts");

  const tabClass = (on: boolean) =>
    `mr-[18px] border-b-2 px-1 py-[11px] text-sm font-medium transition-colors ${
      on
        ? "border-primary text-foreground"
        : "border-transparent text-muted-foreground hover:text-foreground/80"
    }`;

  return (
    <div className="flex flex-wrap gap-1 border-b border-border" role="tablist">
      <button
        type="button"
        role="tab"
        aria-selected={view === "alerts"}
        className={tabClass(view === "alerts")}
        onClick={() => onSelect("alerts")}
      >
        {t("alerts")}
        <Count value={alertsCount} />
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={view === "config"}
        className={tabClass(view === "config")}
        onClick={() => onSelect("config")}
      >
        {t("configScan")}
        <Count value={findingsCount} />
      </button>
      {showRules && (
        <button
          type="button"
          role="tab"
          aria-selected={view === "rules"}
          className={tabClass(view === "rules")}
          onClick={() => onSelect("rules")}
        >
          {t("alertRules")}
        </button>
      )}
    </div>
  );
}

function Count({ value }: { value: number }) {
  if (!value) return null;
  return (
    <span className="ml-1.5 font-mono text-[11px] text-muted-foreground">
      {value}
    </span>
  );
}
