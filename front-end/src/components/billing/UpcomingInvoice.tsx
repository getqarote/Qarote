import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface UpcomingInvoiceProps {
  upcomingInvoice: {
    period_end: number;
    amount_due?: number;
    lines: {
      data: Array<{
        description: string;
      }>;
    };
  };
}

export const UpcomingInvoice: React.FC<UpcomingInvoiceProps> = ({
  upcomingInvoice,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Upcoming Invoice
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">
              Next billing date:{" "}
              {formatDate(new Date(upcomingInvoice.period_end * 1000))}
            </p>
            <p className="text-sm text-gray-600">
              {upcomingInvoice.lines.data
                .map((line) => line.description)
                .join(", ")}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">
              {formatCurrency(upcomingInvoice.amount_due || 0)}
            </div>
            <div className="text-sm text-gray-600">
              Due {formatDate(new Date(upcomingInvoice.period_end * 1000))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
