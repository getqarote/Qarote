import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Settings,
  Activity,
  Server,
  Clock,
  Loader2,
  Lock,
} from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Separator } from "@/components/ui/separator";
import { useServerContext } from "@/contexts/ServerContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { apiClient } from "@/lib/api";
import { AlertsConfigureModal } from "@/components/alerts/AlertsConfigureModal";
import { PageLoader } from "@/components/PageLoader";
import { NoServerConfigured } from "@/components/NoServerConfigured";
import { PlanUpgradeModal } from "@/components/plans/PlanUpgradeModal";
import {
  AlertsResponse,
  RabbitMQAlert,
  AlertSeverity,
  AlertCategory,
  AlertThresholds,
} from "@/types/alerts";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

const Alerts = () => {
  const { serverId } = useParams<{ serverId: string }>();
  const { selectedServerId, hasServers } = useServerContext();
  const { workspacePlan, canConfigureAlerts } = useWorkspace();
  const [showConfigureModal, setShowConfigureModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const currentServerId = serverId || selectedServerId;

  // Default thresholds for query
  const defaultThresholds: AlertThresholds = {
    memory: { warning: 80, critical: 95 },
    disk: { warning: 15, critical: 10 },
    fileDescriptors: { warning: 80, critical: 90 },
    queueMessages: { warning: 10000, critical: 50000 },
    connections: { warning: 500, critical: 1000 },
  };

  // Query for alerts with 10-second refetch interval
  const {
    data: alertsData,
    isLoading: alertsLoading,
    error: alertsError,
  } = useQuery<AlertsResponse>({
    queryKey: ["rabbitmqAlerts", currentServerId],
    queryFn: () =>
      apiClient.getRabbitMQAlerts(currentServerId!, defaultThresholds),
    enabled: !!currentServerId,
    refetchInterval: 10000,
    placeholderData: (previousData) => previousData,
  });

  if (!hasServers) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <main className="flex-1">
          <div className="flex items-center gap-2 border-b px-6 py-4">
            <SidebarTrigger />
            <Separator orientation="vertical" />
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <h1 className="text-xl font-semibold">Alerts</h1>
            </div>
          </div>
          <div className="p-6">
            <NoServerConfigured
              title="No RabbitMQ Server Configured"
              description="Configure a RabbitMQ server to view alerts and monitoring data."
            />
          </div>
        </main>
      </SidebarProvider>
    );
  }

  if (!currentServerId) {
    return <PageLoader />;
  }

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

  // Get severity icon
  const getSeverityIcon = (severity: AlertSeverity) => {
    switch (severity) {
      case AlertSeverity.CRITICAL:
        return <XCircle className="h-4 w-4" />;
      case AlertSeverity.WARNING:
        return <AlertTriangle className="h-4 w-4" />;
      case AlertSeverity.INFO:
        return <Info className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return timestamp;
    }
  };

  // Get category icon
  const getCategoryIcon = (category: AlertCategory) => {
    switch (category) {
      case AlertCategory.MEMORY:
        return <Activity className="h-4 w-4" />;
      case AlertCategory.DISK:
        return <Server className="h-4 w-4" />;
      case AlertCategory.QUEUE:
        return <Clock className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  // Handle configure button click
  const handleConfigureClick = () => {
    if (canConfigureAlerts) {
      setShowConfigureModal(true);
    } else {
      setShowUpgradeModal(true);
    }
  };

  // Render main content
  const alerts = alertsData?.alerts || [];
  const summary = alertsData?.summary || {
    total: 0,
    critical: 0,
    warning: 0,
    info: 0,
  };

  if (alertsLoading && !alertsData) {
    return <PageLoader />;
  }

  if (alertsError) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <main className="flex-1">
          <div className="flex items-center gap-2 border-b px-6 py-4">
            <SidebarTrigger />
            <Separator orientation="vertical" />
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <h1 className="text-xl font-semibold">Alerts</h1>
            </div>
          </div>
          <div className="p-6">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Failed to load alerts data. Please try again.
              </AlertDescription>
            </Alert>
          </div>
        </main>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <Separator orientation="vertical" />
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <h1 className="text-xl font-semibold">Alerts</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {alertsLoading && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
            {canConfigureAlerts ? (
              <Button
                onClick={handleConfigureClick}
                className="bg-orange-500 hover:bg-orange-600"
              >
                <Settings className="h-4 w-4 mr-2" />
                Configure
              </Button>
            ) : (
              <Button
                onClick={handleConfigureClick}
                disabled={true}
                className="bg-gray-200 text-gray-400 cursor-not-allowed opacity-60 flex items-center gap-2"
                title="Upgrade to configure advanced alert settings"
              >
                <Lock className="w-4 h-4" />
                Configure
                <span className="ml-1 px-2 py-0.5 bg-orange-500 text-white text-xs rounded-full font-bold">
                  Pro
                </span>
              </Button>
            )}
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Alerts Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Total Alerts
                    </p>
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
                    <p className="text-sm text-muted-foreground">Warning</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {summary.warning}
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
                    <p className="text-sm text-muted-foreground">Info</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {summary.info}
                    </p>
                  </div>
                  <Info className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Active Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Active Alerts
                <Badge variant="outline">{alerts.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Active Alerts</h3>
                  <p className="text-muted-foreground">
                    Your RabbitMQ cluster is running smoothly with no alerts.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="flex items-start gap-4 p-4 border rounded-lg"
                    >
                      <div className="flex-shrink-0 mt-1">
                        {getSeverityIcon(alert.severity)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium">{alert.title}</h4>
                              <Badge
                                variant={getSeverityBadgeVariant(
                                  alert.severity
                                )}
                              >
                                {alert.severity}
                              </Badge>
                              {alert.category && (
                                <Badge
                                  variant="outline"
                                  className="flex items-center gap-1"
                                >
                                  {getCategoryIcon(alert.category)}
                                  {alert.category}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {alert.description}
                            </p>
                            {alert.details && (
                              <div className="text-xs text-muted-foreground space-y-1">
                                <div>Current: {alert.details.current}</div>
                                {alert.details.threshold && (
                                  <div>
                                    Threshold: {alert.details.threshold}
                                  </div>
                                )}
                                {alert.details.recommended && (
                                  <div>
                                    Recommended: {alert.details.recommended}
                                  </div>
                                )}
                                {alert.details.affected &&
                                  alert.details.affected.length > 0 && (
                                    <div>
                                      Affected:{" "}
                                      {alert.details.affected.join(", ")}
                                    </div>
                                  )}
                              </div>
                            )}
                          </div>
                          <div className="flex-shrink-0 text-right">
                            <div className="text-xs text-muted-foreground">
                              {formatTimestamp(alert.timestamp)}
                            </div>
                            {alert.source && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {alert.source.type}: {alert.source.name}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Configure Modal */}
        <AlertsConfigureModal
          isOpen={showConfigureModal}
          onClose={() => setShowConfigureModal(false)}
          serverId={currentServerId}
        />

        {/* Plan Upgrade Modal */}
        <PlanUpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          currentPlan={workspacePlan}
          feature="advanced alert configuration"
        />
      </main>
    </SidebarProvider>
  );
};

export default Alerts;
