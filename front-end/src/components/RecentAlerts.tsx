import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  Clock,
  CheckCircle,
  Server,
  ArrowRight,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiClient, AlertInstance, AlertSeverity } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";

export const RecentAlerts = () => {
  const { data: alertsResponse, isLoading } = useQuery({
    queryKey: ["alerts", "recent"],
    queryFn: () =>
      apiClient.getAlerts({
        limit: 3, // Only get 3 recent alerts
        status: ["ACTIVE", "ACKNOWLEDGED"],
      }),
    staleTime: 10000, // 10 seconds
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const alerts = alertsResponse?.alerts || [];

  const getAlertIcon = (severity: AlertSeverity) => {
    switch (severity) {
      case "CRITICAL":
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case "HIGH":
        return <AlertTriangle className="w-4 h-4 text-orange-600" />;
      case "MEDIUM":
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case "LOW":
        return <Server className="w-4 h-4 text-blue-600" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getAlertBadge = (severity: AlertSeverity) => {
    switch (severity) {
      case "CRITICAL":
        return <Badge className="bg-red-100 text-red-700">Critical</Badge>;
      case "HIGH":
        return <Badge className="bg-orange-100 text-orange-700">High</Badge>;
      case "MEDIUM":
        return <Badge className="bg-yellow-100 text-yellow-700">Medium</Badge>;
      case "LOW":
        return <Badge className="bg-blue-100 text-blue-700">Low</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-700">Unknown</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <AlertTriangle className="w-3 h-3 text-red-500" />;
      case "ACKNOWLEDGED":
        return <Clock className="w-3 h-3 text-yellow-500" />;
      case "RESOLVED":
        return <CheckCircle className="w-3 h-3 text-green-500" />;
      default:
        return <AlertTriangle className="w-3 h-3 text-gray-500" />;
    }
  };

  return (
    <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              Recent Alerts
            </CardTitle>
            <p className="text-sm text-gray-500">Latest system notifications</p>
          </div>
          <Link to="/alerts">
            <Button
              variant="ghost"
              size="sm"
              className="text-blue-600 hover:text-blue-800"
            >
              View All
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="p-3 bg-gray-50 rounded-lg border border-gray-100"
              >
                <div className="flex items-start gap-3">
                  <Skeleton className="h-4 w-4 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-5 w-16" />
                    </div>
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : alerts.length > 0 ? (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className="p-3 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-100 hover:shadow-sm transition-all duration-200"
            >
              <div className="flex items-start gap-3">
                {getAlertIcon(alert.severity)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    {alert.title}
                  </p>
                  <p className="text-xs text-gray-600 mb-2">
                    {alert.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(alert.createdAt), {
                        addSuffix: true,
                      })}
                    </div>
                    {getAlertBadge(alert.severity)}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                    {getStatusIcon(alert.status)}
                    <span>Status: {alert.status}</span>
                    {alert.alertRule?.server && (
                      <>
                        <span>•</span>
                        <Server className="w-3 h-3" />
                        <span>{alert.alertRule.server.name}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-6">
            <AlertTriangle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500 mb-3">No recent alerts</p>
            <Link to="/alerts">
              <Button variant="outline" size="sm">
                View All Alerts
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
