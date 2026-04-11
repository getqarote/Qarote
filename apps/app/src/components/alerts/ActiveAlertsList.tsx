import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { AlertTriangle } from "lucide-react";

import { RabbitMQAlert } from "@/lib/api/alertTypes";
import { getUpgradePath } from "@/lib/featureFlags";

import { HappyRabbit } from "@/components/HappyRabbit";
import { Button } from "@/components/ui/button";
import { PaginationControls } from "@/components/ui/PaginationControls";

import { UserPlan } from "@/types/plans";

import { AlertItem } from "./AlertItem";

interface ActiveAlertsListProps {
  alerts: RabbitMQAlert[];
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  userPlan: UserPlan;
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export const ActiveAlertsList = ({
  alerts,
  summary,
  userPlan,
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: ActiveAlertsListProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation("alerts");

  // Show upgrade notification for free users
  if (userPlan === UserPlan.FREE) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-12 w-12 mx-auto text-warning mb-4" />
        <h3 className="text-lg font-medium mb-2">
          {summary.total > 0
            ? t("active.upgradeTitleWithCount", { count: summary.total })
            : t("active.noneTitle")}
        </h3>
        <p className="text-muted-foreground mb-4">
          {summary.total > 0
            ? t("active.upgradeSubtitle", {
                total: summary.total,
                critical: summary.critical,
                high: summary.high,
              })
            : t("active.noneDesc")}
        </p>
        {summary.total > 0 && (
          <p className="text-sm text-muted-foreground mb-4">
            {t("active.upgradeHint")}
          </p>
        )}
        <Button
          onClick={() => navigate(getUpgradePath())}
          className="btn-primary"
        >
          {t("active.upgradeCta")}
        </Button>
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-muted-foreground/70">
          <HappyRabbit />
        </div>
        <h3 className="text-lg font-medium mb-2">{t("active.noneTitle")}</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          {t("active.noneDesc")}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="divide-y divide-border">
        {alerts.map((alert) => (
          <AlertItem key={alert.id} alert={alert} />
        ))}
      </div>

      <PaginationControls
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        itemLabel="alerts"
      />
    </div>
  );
};
