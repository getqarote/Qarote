import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  XCircle,
  Info,
  Activity,
  ArrowRight,
  Clock,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useServerContext } from "@/contexts/ServerContext";
import { apiClient } from "@/lib/api";
import { AlertSeverity, AlertCategory, AlertThresholds } from "@/types/alerts";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useUser } from "@/hooks/useUser";
import { UserPlan } from "@/types/plans";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

export const RecentAlerts = () => {
  const navigate = useNavigate();
  const { selectedServerId } = useServerContext();
  const { workspace } = useWorkspace();
  const { userPlan } = useUser();

  // Default thresholds for query
  const defaultThresholds: AlertThresholds = {
    memory: { warning: 80, critical: 95 },
    disk: { warning: 15, critical: 10 },
    fileDescriptors: { warning: 80, critical: 90 },
    queueMessages: { warning: 10000, critical: 50000 },
    connections: { warning: 500, critical: 1000 },
  };

  // Query for recent alerts with limit of 3
  const {
    data: alertsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["recentAlerts", selectedServerId],
    queryFn: () =>
      apiClient.getRabbitMQAlerts(
        selectedServerId!,
        workspace.id,
        defaultThresholds,
        {
          limit: 3, // Only fetch 3 most recent alerts
          resolved: false, // Only get active alerts
        }
      ),
    enabled: !!selectedServerId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Get severity icon
  const getSeverityIcon = (severity: AlertSeverity) => {
    switch (severity) {
      case AlertSeverity.CRITICAL:
        return <XCircle className="h-4 w-4 text-red-500" />;
      case AlertSeverity.WARNING:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case AlertSeverity.INFO:
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  // Get severity badge variant
  const getSeverityBadgeVariant = (severity: AlertSeverity): BadgeVariant => {
    switch (severity) {
      case AlertSeverity.CRITICAL:
        return "destructive";
      case AlertSeverity.WARNING:
        return "default";
      case AlertSeverity.INFO:
        return "secondary";
      default:
        return "outline";
    }
  };

  // Format timestamp to relative time
  const formatRelativeTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${diffDays}d ago`;
    } catch {
      return "Unknown";
    }
  };

  // Get category icon
  const getCategoryIcon = (category: AlertCategory) => {
    switch (category) {
      case AlertCategory.MEMORY:
        return <Activity className="h-3 w-3" />;
      case AlertCategory.DISK:
        return <Activity className="h-3 w-3" />;
      case AlertCategory.QUEUE:
        return <Clock className="h-3 w-3" />;
      default:
        return <Activity className="h-3 w-3" />;
    }
  };

  const alerts = alertsData?.alerts || [];
  const summary = alertsData?.summary || {
    total: 0,
    critical: 0,
    warning: 0,
    info: 0,
  };
  // Already limited to 3 by the API call, but sort by timestamp to ensure newest first
  const recentAlerts = alerts.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  if (error) {
    return (
      <Card className="border-0 shadow-md bg-card backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Recent Alerts
              <Badge variant="outline">Error</Badge>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <AlertTriangle className="h-8 w-8 mx-auto text-orange-500 mb-2" />
            <p className="text-sm text-muted-foreground">
              Failed to load alerts data
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-md bg-card backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              Recent Alerts
              {isLoading ? (
                <Badge variant="outline">Loading...</Badge>
              ) : (
                <Badge
                  variant={summary.total > 0 ? "destructive" : "secondary"}
                >
                  {summary.total}
                </Badge>
              )}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Latest system notifications
            </p>
          </div>
          <Link
            to="/alerts"
            className="flex items-center gap-1 text-sm text-orange-600 hover:text-orange-700 transition-colors font-medium"
          >
            View All
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 border rounded-lg animate-pulse"
              >
                <div className="h-4 w-4 bg-gray-300 rounded"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-300 rounded mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                </div>
                <div className="h-3 bg-gray-200 rounded w-12"></div>
              </div>
            ))}
          </div>
        ) : summary.total === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <AlertTriangle className="h-12 w-12 text-gray-300 mb-3" />
            <p className="text-sm text-gray-500 font-medium">
              No recent alerts
            </p>
            <p className="text-xs text-gray-400 mt-1">
              All systems are running normally
            </p>
          </div>
        ) : userPlan === UserPlan.FREE ? (
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              Upgrade to Developer or Enterprise plan to view detailed alert
              information and configure alert thresholds.
            </p>
            <Button onClick={() => navigate("/plans")} className="btn-primary">
              Upgrade now
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Recent Alerts List - Limited to 3 */}
            {recentAlerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-start gap-3 p-3 border rounded-lg hover:bg-accent transition-colors cursor-pointer"
                onClick={() =>
                  navigate(
                    `/alerts${selectedServerId ? `/${selectedServerId}` : ""}`
                  )
                }
              >
                <div className="flex-shrink-0 mt-0.5">
                  {getSeverityIcon(alert.severity)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm truncate">
                      {alert.title}
                    </p>
                    <Badge
                      variant={getSeverityBadgeVariant(alert.severity)}
                      className="text-xs"
                    >
                      {alert.severity}
                    </Badge>
                    {alert.category && (
                      <Badge
                        variant="outline"
                        className="text-xs flex items-center gap-1"
                      >
                        {getCategoryIcon(alert.category)}
                        {alert.category}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {alert.description}
                  </p>
                  {alert.details && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Current: {alert.details.current}
                    </p>
                  )}
                </div>
                <div className="flex-shrink-0 text-right">
                  <div className="text-xs text-muted-foreground">
                    {formatRelativeTime(alert.timestamp)}
                  </div>
                  {alert.source && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {alert.source.name}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
