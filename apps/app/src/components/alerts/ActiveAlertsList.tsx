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

  // Free tier: show top alert by severity + soft upgrade teaser
  if (userPlan === UserPlan.FREE) {
    const hiddenCount = Math.max(0, summary.total - alerts.length);

    if (summary.total === 0) {
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

        {hiddenCount > 0 && (
          <div className="border-t border-border px-4 py-5 bg-muted/20 text-center">
            <AlertTriangle className="h-6 w-6 mx-auto text-warning mb-2" />
            <p className="text-sm font-medium mb-1">
              {t("active.previewHiddenCount", { count: hiddenCount })}
            </p>
            <p className="text-sm text-muted-foreground mb-3">
              {t("active.previewUpgradeHint")}
            </p>
            <Button onClick={() => navigate(getUpgradePath())} size="sm">
              {t("active.upgradeCta")}
            </Button>
          </div>
        )}
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
