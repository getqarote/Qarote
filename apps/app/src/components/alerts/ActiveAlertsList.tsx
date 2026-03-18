import { useNavigate } from "react-router";

import { AlertTriangle, CheckCircle } from "lucide-react";

import { RabbitMQAlert } from "@/lib/api/alertTypes";
import { getUpgradePath } from "@/lib/featureFlags";

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

  // Show upgrade notification for free users
  if (userPlan === UserPlan.FREE) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
        <h3 className="text-lg font-medium mb-2">
          {summary.total > 0
            ? `You have ${summary.total} active alert${summary.total > 1 ? "s" : ""}`
            : "No Active Alerts"}
        </h3>
        <p className="text-muted-foreground mb-4">
          {summary.total > 0
            ? `You have ${summary.critical > 0 ? `${summary.critical} critical` : ""}${summary.critical > 0 && summary.high > 0 ? " and " : ""}${summary.high > 0 ? `${summary.high} high` : ""} alert${summary.total > 1 ? "s" : ""} on your system.`
            : "Your RabbitMQ cluster is running smoothly with no alerts."}
        </p>
        {summary.total > 0 && (
          <p className="text-sm text-muted-foreground mb-4">
            Upgrade to Developer or Enterprise plan to view detailed alert
            information and configure alert thresholds.
          </p>
        )}
        <Button
          onClick={() => navigate(getUpgradePath())}
          className="btn-primary"
        >
          Upgrade now
        </Button>
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
        <h3 className="text-lg font-medium mb-2">No Active Alerts</h3>
        <p className="text-muted-foreground">
          Your RabbitMQ cluster is running smoothly with no alerts.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {alerts.map((alert) => (
        <AlertItem key={alert.id} alert={alert} />
      ))}

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
