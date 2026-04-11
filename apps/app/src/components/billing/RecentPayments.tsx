import React from "react";
import { useTranslation } from "react-i18next";

import { AlertCircle, CheckCircle, Clock, Receipt } from "lucide-react";

import { formatCurrency, formatDate } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";

type PaymentStatus =
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELED"
  | "PENDING"
  | "REQUIRES_ACTION";

interface StatusStyle {
  icon: React.ReactNode;
  iconBg: string;
  badge: string;
  labelKey: string;
}

// Matches PaymentStatus enum: SUCCEEDED, PENDING, FAILED, CANCELED, REQUIRES_ACTION
function getStatusStyle(status: string): StatusStyle {
  switch (status as PaymentStatus) {
    case "SUCCEEDED":
      return {
        icon: (
          <CheckCircle className="h-4 w-4 text-success" aria-hidden="true" />
        ),
        iconBg: "bg-success-muted",
        badge: "text-success border-success/30 bg-success-muted",
        labelKey: "paymentStatus.succeeded",
      };
    case "FAILED":
      return {
        icon: (
          <AlertCircle
            className="h-4 w-4 text-destructive"
            aria-hidden="true"
          />
        ),
        iconBg: "bg-destructive/10",
        badge: "text-destructive border-destructive/30 bg-destructive/10",
        labelKey: "paymentStatus.failed",
      };
    case "CANCELED":
      return {
        icon: (
          <AlertCircle
            className="h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
        ),
        iconBg: "bg-muted",
        badge: "text-muted-foreground border-border bg-muted",
        labelKey: "paymentStatus.canceled",
      };
    case "PENDING":
      return {
        icon: <Clock className="h-4 w-4 text-warning" aria-hidden="true" />,
        iconBg: "bg-warning-muted",
        badge: "text-warning border-warning/30 bg-warning-muted",
        labelKey: "paymentStatus.pending",
      };
    case "REQUIRES_ACTION":
      return {
        icon: <Clock className="h-4 w-4 text-warning" aria-hidden="true" />,
        iconBg: "bg-warning-muted",
        badge: "text-warning border-warning/30 bg-warning-muted",
        labelKey: "paymentStatus.requiresAction",
      };
    default:
      return {
        icon: (
          <Receipt
            className="h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
        ),
        iconBg: "bg-muted",
        badge: "text-muted-foreground border-border bg-muted",
        labelKey: "paymentStatus.pending",
      };
  }
}

interface RecentPaymentsProps {
  recentPayments: Array<{
    id: string;
    description?: string;
    createdAt: string;
    amount: number;
    status: string;
  }>;
}

export const RecentPayments: React.FC<RecentPaymentsProps> = ({
  recentPayments,
}) => {
  const { t } = useTranslation("billing");

  if (recentPayments.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary/10 shrink-0"
            aria-hidden="true"
          >
            <Receipt className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-sm leading-tight">
              {t("recentPayments.title")}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t("recentPayments.subtitle")}
            </p>
          </div>
        </div>

        <ul className="divide-y divide-border">
          {recentPayments.map((payment) => {
            const style = getStatusStyle(payment.status);
            return (
              <li
                key={payment.id}
                className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`flex items-center justify-center h-8 w-8 rounded-full shrink-0 ${style.iconBg}`}
                  >
                    {style.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {payment.description ||
                        t("recentPayments.defaultDescription")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(new Date(payment.createdAt))}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge variant="outline" className={`text-xs ${style.badge}`}>
                    {t(style.labelKey)}
                  </Badge>
                  <p className="font-semibold text-sm tabular-nums">
                    {formatCurrency(payment.amount)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};
