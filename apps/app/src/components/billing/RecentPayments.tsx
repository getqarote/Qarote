import React from "react";

import { Receipt } from "lucide-react";

import { formatCurrency, formatDate } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

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
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 rounded-lg bg-muted">
            <Receipt className="w-4 h-4 text-muted-foreground" />
          </div>
          <h3 className="font-medium text-sm">Recent Payments</h3>
        </div>

        <div className="space-y-0 divide-y">
          {recentPayments.map((payment) => (
            <div
              key={payment.id}
              className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
            >
              <div>
                <p className="text-sm font-medium">
                  {payment.description || "Subscription payment"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDate(new Date(payment.createdAt))}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge
                  variant="outline"
                  className="text-xs bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800"
                >
                  {payment.status}
                </Badge>
                <span className="text-sm font-medium tabular-nums">
                  {formatCurrency(payment.amount)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
