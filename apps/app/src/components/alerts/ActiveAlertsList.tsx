import { useNavigate } from "react-router";

import { AlertTriangle, CheckCircle } from "lucide-react";

import { RabbitMQAlert } from "@/lib/api/alertTypes";

import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { UserPlan } from "@/types/plans";

import { AlertItem } from "./AlertItem";

interface ActiveAlertsListProps {
  alerts: RabbitMQAlert[];
  summary: {
    total: number;
    critical: number;
    warning: number;
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

  const totalPages = Math.ceil(total / pageSize);
  const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

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
            ? `You have ${summary.critical > 0 ? `${summary.critical} critical` : ""}${summary.critical > 0 && summary.warning > 0 ? " and " : ""}${summary.warning > 0 ? `${summary.warning} warning` : ""} alert${summary.total > 1 ? "s" : ""} on your system.`
            : "Your RabbitMQ cluster is running smoothly with no alerts."}
        </p>
        {summary.total > 0 && (
          <p className="text-sm text-muted-foreground mb-4">
            Upgrade to Developer or Enterprise plan to view detailed alert
            information and configure alert thresholds.
          </p>
        )}
        <Button onClick={() => navigate("/plans")} className="btn-primary">
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

      {/* Pagination Controls - Always show when there are alerts */}
      {total > 0 && (
        <div className="mt-6 space-y-4">
          {/* Total count and page size selector */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {startItem}-{endItem} of {total} alerts
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Items per page:
              </span>
              <Select
                value={pageSize.toString()}
                onValueChange={(value) => onPageSizeChange(Number(value))}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Pagination buttons - Only show when there are multiple pages */}
          {totalPages > 1 && (
            <div className="flex justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => onPageChange(Math.max(1, page - 1))}
                      className={
                        page <= 1
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                    />
                  </PaginationItem>

                  {[...Array(Math.min(5, totalPages))].map((_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }

                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          onClick={() => onPageChange(pageNum)}
                          isActive={page === pageNum}
                          className="cursor-pointer"
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}

                  {totalPages > 5 && page < totalPages - 2 && (
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() =>
                        onPageChange(Math.min(totalPages, page + 1))
                      }
                      className={
                        page >= totalPages
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
