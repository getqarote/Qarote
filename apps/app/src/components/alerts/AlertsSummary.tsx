import {
  Activity,
  AlertTriangle,
  Info,
  ShieldAlert,
  XCircle,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

interface AlertsSummaryProps {
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
}

export const AlertsSummary = ({ summary }: AlertsSummaryProps) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{summary.total}</p>
            </div>
            <Activity className="h-8 w-8 text-blue-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Critical</p>
              <p className="text-2xl font-bold text-red-600">
                {summary.critical}
              </p>
            </div>
            <XCircle className="h-8 w-8 text-red-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">High</p>
              <p className="text-2xl font-bold text-orange-600">
                {summary.high}
              </p>
            </div>
            <ShieldAlert className="h-8 w-8 text-orange-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Medium</p>
              <p className="text-2xl font-bold text-yellow-600">
                {summary.medium}
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-yellow-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Low</p>
              <p className="text-2xl font-bold text-blue-600">{summary.low}</p>
            </div>
            <Info className="h-8 w-8 text-blue-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Info</p>
              <p className="text-2xl font-bold text-gray-600">{summary.info}</p>
            </div>
            <Info className="h-8 w-8 text-gray-400" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
