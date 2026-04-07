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
        icon: <CheckCircle className="w-4 h-4 text-success" />,
        iconBg: "bg-success-muted",
        badge: "text-success border-success/30 bg-success-muted",
      };
    case "FAILED":
      return {
        icon: <AlertCircle className="w-4 h-4 text-destructive" />,
        iconBg: "bg-destructive/10",
        badge: "text-destructive border-destructive/30 bg-destructive/10",
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
        icon: <Clock className="w-4 h-4 text-warning" />,
        iconBg: "bg-warning-muted",
        badge: "text-warning border-warning/30 bg-warning-muted",
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
