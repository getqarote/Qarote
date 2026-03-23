import React from "react";

import { AlertCircle, CheckCircle, Clock, Receipt } from "lucide-react";

import { formatCurrency, formatDate } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

// Matches PaymentStatus enum: SUCCEEDED, PENDING, FAILED, CANCELED, REQUIRES_ACTION
function getStatusStyle(status: string) {
  switch (status) {
    case "SUCCEEDED":
      return {
        icon: (
          <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        ),
        iconBg: "bg-emerald-50 dark:bg-emerald-950/30",
        badge:
          "text-emerald-600 border-emerald-200 bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:bg-emerald-950/30",
      };
    case "FAILED":
      return {
        icon: (
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
        ),
        iconBg: "bg-red-50 dark:bg-red-950/30",
        badge:
          "text-red-600 border-red-200 bg-red-50 dark:text-red-400 dark:border-red-800 dark:bg-red-950/30",
      };
    case "CANCELED":
      return {
        icon: <AlertCircle className="w-4 h-4 text-muted-foreground" />,
        iconBg: "bg-muted",
        badge: "text-muted-foreground border-border bg-muted",
      };
    case "PENDING":
    case "REQUIRES_ACTION":
      return {
        icon: <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
        iconBg: "bg-amber-50 dark:bg-amber-950/30",
        badge:
          "text-amber-600 border-amber-200 bg-amber-50 dark:text-amber-400 dark:border-amber-800 dark:bg-amber-950/30",
      };
    default:
      return {
        icon: <Receipt className="w-4 h-4 text-muted-foreground" />,
        iconBg: "bg-muted",
        badge: "text-muted-foreground border-border bg-muted",
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
  if (recentPayments.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardContent className="pt-6 pb-2 px-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <Receipt className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Recent Payments</h3>
            <p className="text-xs text-muted-foreground">
              Your latest transactions
            </p>
          </div>
        </div>

        <div className="divide-y divide-border">
          {recentPayments.map((payment) => (
            <div
              key={payment.id}
              className="flex items-center justify-between py-3"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`h-8 w-8 rounded-full ${getStatusStyle(payment.status).iconBg} flex items-center justify-center shrink-0`}
                >
                  {getStatusStyle(payment.status).icon}
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {payment.description || "Subscription payment"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(new Date(payment.createdAt))}
                  </p>
                </div>
              </div>
              <div className="text-right flex items-center gap-3">
                <Badge
                  variant="outline"
                  className={`text-xs ${getStatusStyle(payment.status).badge}`}
                >
                  {payment.status}
                </Badge>
                <p className="font-semibold text-sm tabular-nums">
                  {formatCurrency(payment.amount)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
