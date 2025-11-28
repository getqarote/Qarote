import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";

import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Info,
  Loader2,
  Server,
  XCircle,
} from "lucide-react";
import { Mail } from "lucide-react";

// import { AlertsConfigureModal } from "@/components/alerts/AlertsConfigureModal";
import { AlertNotificationSettingsModal } from "@/components/alerts/AlertNotificationSettingsModal";
import { AppSidebar } from "@/components/AppSidebar";
import { NoServerConfigured } from "@/components/NoServerConfigured";
import { PageLoader } from "@/components/PageLoader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

import { useServerContext } from "@/contexts/ServerContext";

import {
  useAlertNotificationSettings,
  useRabbitMQAlerts,
} from "@/hooks/useApi";
// import { Settings } from "lucide-react"; // Commented out - used in Configure Thresholds button
import { useBrowserNotifications } from "@/hooks/useBrowserNotifications";
import { useUser } from "@/hooks/useUser";

// import { PlanUpgradeModal } from "@/components/plans/PlanUpgradeModal";
import { AlertCategory, AlertSeverity, AlertThresholds } from "@/types/alerts";
import { UserPlan } from "@/types/plans";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

const Alerts = () => {
  const { serverId } = useParams<{ serverId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedServerId, hasServers } = useServerContext();
  const { userPlan } = useUser();
  // const [showConfigureModal, setShowConfigureModal] = useState(false);
  const [showNotificationSettingsModal, setShowNotificationSettingsModal] =
    useState(false);
  // const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const navigate = useNavigate();

  const currentServerId = serverId || selectedServerId;

  // Check for query parameter to open notification settings modal
  useEffect(() => {
    const openNotificationSettings = searchParams.get(
      "openNotificationSettings"
    );
    if (openNotificationSettings === "true") {
      setShowNotificationSettingsModal(true);
      // Remove the query parameter from URL after opening modal
      searchParams.delete("openNotificationSettings");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Default thresholds for query
  const defaultThresholds: AlertThresholds = {
    memory: { warning: 80, critical: 95 },
    disk: { warning: 15, critical: 10 },
    fileDescriptors: { warning: 80, critical: 90 },
    queueMessages: { warning: 10000, critical: 50000 },
    connections: { warning: 500, critical: 1000 },
  };

  // Query for alerts with the RabbitMQ alerts hook
  const {
    data: alertsData,
    isLoading: alertsLoading,
    error: alertsError,
  } = useRabbitMQAlerts(currentServerId, defaultThresholds);

  // Get browser notification settings
  const { data: notificationSettings } = useAlertNotificationSettings(true);

  // Set up browser notifications
  useBrowserNotifications(alertsData?.alerts, {
    enabled: notificationSettings.settings.browserNotificationsEnabled,
    severities: notificationSettings.settings.browserNotificationSeverities,
  });

  if (!hasServers) {
    return (
      <SidebarProvider>
        <div className="page-layout">
          <AppSidebar />
          <main className="main-content-scrollable">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
            </div>
            <NoServerConfigured
              title="Alerts"
              description="Monitor system alerts and notifications"
            />
          </main>
        </div>
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
  // const handleConfigureClick = () => {
  //   if (canConfigureAlerts) {
  //     setShowConfigureModal(true);
  //   } else {
  //     setShowUpgradeModal(true);
  //   }
  // };

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
        <div className="page-layout">
          <AppSidebar />
          <main className="main-content-scrollable">
            <div className="content-container-large">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <div>
                  <h1 className="title-page">Alerts</h1>
                  <p className="text-gray-500">
                    Monitor system alerts and notifications
                  </p>
                </div>
              </div>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Failed to load alerts data. Please try again.
                </AlertDescription>
              </Alert>
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="page-layout">
        <AppSidebar />
        <main className="main-content-scrollable">
          <div className="content-container-large">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <div>
                  <h1 className="title-page">Alerts</h1>
                  <p className="text-gray-500">
                    Monitor system alerts and notifications
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {alertsLoading && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
                <Button
                  onClick={() => setShowNotificationSettingsModal(true)}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Mail className="h-4 w-4" />
                  Notification Settings
                </Button>
                {/* {canConfigureAlerts && (
                  <Button
                    onClick={handleConfigureClick}
                    className="bg-gradient-button hover:bg-gradient-button-hover text-white"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Configure Thresholds
                  </Button>
                )} */}
              </div>
            </div>
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
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Show upgrade notification for free users */}
                {userPlan === UserPlan.FREE ? (
                  <div className="text-center py-8">
                    <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
                    <h3 className="text-lg font-medium mb-2">
                      {summary.total > 0
                        ? `You have ${summary.total} active alert${summary.total > 1 ? "s" : ""}`
                        : "No Active Alerts"}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {summary.total > 0
                        ? `You have ${summary.critical > 0 ? `${summary.critical} critical` : ""}${summary.critical > 0 && summary.warning > 0 ? " and " : ""}${summary.warning > 0 ? `${summary.warning} warning` : ""} alert${summary.total > 1 ? "s" : ""} on your system.`
                        : "Your RabbitMQ cluster is running smoothly with no alerts."}
                    </p>
                    {summary.total > 0 && (
                      <p className="text-sm text-muted-foreground mb-4">
                        Upgrade to Developer or Enterprise plan to view detailed
                        alert information and configure alert thresholds.
                      </p>
                    )}
                    <Button
                      onClick={() => navigate("/plans")}
                      className="btn-primary"
                    >
                      Upgrade now
                    </Button>
                  </div>
                ) : alerts.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                    <h3 className="text-lg font-medium mb-2">
                      No Active Alerts
                    </h3>
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
        </main>
      </div>

      {/* Configure Modal */}
      {/* <AlertsConfigureModal
        isOpen={showConfigureModal}
        onClose={() => setShowConfigureModal(false)}
        serverId={currentServerId}
      /> */}

      {/* Notification Settings Modal */}
      <AlertNotificationSettingsModal
        isOpen={showNotificationSettingsModal}
        onClose={() => setShowNotificationSettingsModal(false)}
      />

      {/* Plan Upgrade Modal */}
      {/* <PlanUpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature="advanced alert configuration"
      /> */}
    </SidebarProvider>
  );
};

export default Alerts;
