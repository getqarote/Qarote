import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

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
      <CardHeader>
        <CardTitle>Recent Payments</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentPayments.map((payment) => (
            <div
              key={payment.id}
              className="flex items-center justify-between py-3 border-b last:border-b-0"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">
                    {payment.description || "Subscription payment"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(new Date(payment.createdAt))}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium">{formatCurrency(payment.amount)}</p>
                <Badge variant="outline" className="text-xs">
                  {payment.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
