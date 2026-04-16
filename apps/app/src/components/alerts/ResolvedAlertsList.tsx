import { useTranslation } from "react-i18next";

import { AlertTriangle, Loader2 } from "lucide-react";

import { CleanupRabbit } from "@/components/CleanupRabbit";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PaginationControls } from "@/components/ui/PaginationControls";

import { AlertItem } from "./AlertItem";

interface ResolvedAlert {
  id: string;
  title: string;
  description: string;
  severity: string;
  category: string;
  details?: {
    current?: number | string;
    threshold?: number;
    recommended?: string;
    affected?: string[];
  };
  firstSeenAt: string;
  resolvedAt: string;
  duration?: number;
  vhost?: string; // Virtual host for queue-related alerts
  source?: {
    type: string;
    name: string;
  };
}

interface ResolvedAlertsListProps {
  alerts: ResolvedAlert[];
  isLoading: boolean;
  error: Error | null;
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export const ResolvedAlertsList = ({
  alerts,
  isLoading,
  error,
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: ResolvedAlertsListProps) => {
  const { t } = useTranslation("alerts");

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
        <p className="text-muted-foreground mt-2">{t("loadingResolved")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{t("failedToLoadResolved")}</AlertDescription>
      </Alert>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-muted-foreground/70">
          <CleanupRabbit />
        </div>
        <h3 className="text-lg font-medium mb-2">{t("noResolvedAlerts")}</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          {t("noAlertsResolvedYet")}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="divide-y divide-border">
        {alerts.map((alert) => (
          <AlertItem key={alert.id} alert={alert} isResolved={true} />
        ))}
      </div>

      {total > pageSize && (
        <PaginationControls
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          itemLabel={t("resolvedAlertsLabel")}
        />
      )}
    </div>
  );
};
