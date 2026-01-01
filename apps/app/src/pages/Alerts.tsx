import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";

import { AlertTriangle, Loader2, Mail, Settings } from "lucide-react";

import { ActiveAlertsList } from "@/components/alerts/ActiveAlertsList";
import { AlertNotificationSettingsModal } from "@/components/alerts/AlertNotificationSettingsModal";
import { AlertRulesModal } from "@/components/alerts/AlertRulesModal";
import { AlertsSummary } from "@/components/alerts/AlertsSummary";
import { ResolvedAlertsList } from "@/components/alerts/ResolvedAlertsList";
import { AppSidebar } from "@/components/AppSidebar";
import { NoServerConfigured } from "@/components/NoServerConfigured";
import { PageLoader } from "@/components/PageLoader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useServerContext } from "@/contexts/ServerContext";
import { useVHostContext } from "@/contexts/VHostContextDefinition";

import {
  useAlertNotificationSettings,
  useRabbitMQAlerts,
  useResolvedAlerts,
} from "@/hooks/queries/useAlerts";
import { useBrowserNotifications } from "@/hooks/ui/useBrowserNotifications";
import { useUser } from "@/hooks/ui/useUser";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";

const Alerts = () => {
  const { serverId } = useParams<{ serverId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedServerId, hasServers, setSelectedServerId } =
    useServerContext();
  const { selectedVHost, setSelectedVHost } = useVHostContext();
  const { userPlan } = useUser();
  const { hasFeature: hasAlertingFeature, isLoading: featureFlagsLoading } =
    useFeatureFlags();
  // const [showConfigureModal, setShowConfigureModal] = useState(false);
  const [showNotificationSettingsModal, setShowNotificationSettingsModal] =
    useState(false);
  const [showAlertRulesModal, setShowAlertRulesModal] = useState(false);
  const [viewMode, setViewMode] = useState<"active" | "resolved">("active");

  // Pagination state for Active Alerts
  const [activeAlertsPage, setActiveAlertsPage] = useState(1);
  const [activeAlertsPageSize, setActiveAlertsPageSize] = useState(25);

  // Pagination state for Resolved Alerts
  const [resolvedAlertsPage, setResolvedAlertsPage] = useState(1);
  const [resolvedAlertsPageSize, setResolvedAlertsPageSize] = useState(25);

  // Read serverId and vhost from query parameters (from email/Slack links)
  // This must run early and take priority over context defaults
  useEffect(() => {
    const queryServerId = searchParams.get("serverId");
    const queryVHost = searchParams.get("vhost");

    // Decode vhost if present (searchParams.get() should decode, but be explicit)
    const decodedVHost = queryVHost ? decodeURIComponent(queryVHost) : null;

    if (queryServerId && queryServerId !== selectedServerId) {
      setSelectedServerId(queryServerId);
      // Remove from URL after setting
      searchParams.delete("serverId");
      setSearchParams(searchParams, { replace: true });
    }

    if (decodedVHost && decodedVHost !== selectedVHost) {
      // Set vhost from URL - this takes priority over context defaults
      setSelectedVHost(decodedVHost);
      // Remove from URL after setting
      searchParams.delete("vhost");
      setSearchParams(searchParams, { replace: true });
    }
  }, [
    searchParams,
    setSearchParams,
    selectedServerId,
    selectedVHost,
    setSelectedServerId,
    setSelectedVHost,
  ]);

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

  // Ensure vhost is always set (use "/" as default if not selected)
  const currentVHost = selectedVHost || "/";

  // Check if alerting feature is enabled before making API calls
  const isAlertingEnabled = hasAlertingFeature("alerting");

  // Query for alerts with the RabbitMQ alerts hook (filtered by vhost, with pagination)
  // Only enable queries if the feature is available
  const {
    data: alertsData,
    isLoading: alertsLoading,
    error: alertsError,
  } = useRabbitMQAlerts(currentServerId, currentVHost, {
    limit: activeAlertsPageSize,
    offset: (activeAlertsPage - 1) * activeAlertsPageSize,
    enabled: isAlertingEnabled,
  });

  // Query for resolved alerts (with pagination)
  // Only enable queries if the feature is available
  const {
    data: resolvedAlertsData,
    isLoading: resolvedAlertsLoading,
    error: resolvedAlertsError,
  } = useResolvedAlerts(currentServerId, currentVHost, {
    limit: resolvedAlertsPageSize,
    offset: (resolvedAlertsPage - 1) * resolvedAlertsPageSize,
    enabled: isAlertingEnabled,
  });

  // Get browser notification settings
  // Only enable if feature is available
  const { data: notificationSettings } =
    useAlertNotificationSettings(isAlertingEnabled);

  // Set up browser notifications (only if feature is enabled and settings are available)
  useBrowserNotifications(alertsData?.alerts, {
    enabled:
      isAlertingEnabled &&
      notificationSettings?.settings?.browserNotificationsEnabled,
    severities:
      notificationSettings?.settings?.browserNotificationSeverities || [],
  });

  // Early return for "no servers" case - this is not feature-gated
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

  // FeatureGate is handled at the route level in App.tsx
  // No need to wrap here to avoid double-wrapping issues
  if (!currentServerId) {
    return <PageLoader />;
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
                  onClick={() => setShowAlertRulesModal(true)}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Alert Rules
                </Button>
                <Button
                  onClick={() => setShowNotificationSettingsModal(true)}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Mail className="h-4 w-4" />
                  Notification Settings
                </Button>
              </div>
            </div>

            {/* Loading state */}
            {featureFlagsLoading || (alertsLoading && !alertsData) ? (
              <PageLoader />
            ) : alertsError ? (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Failed to load alerts data. Please try again.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                {/* Alerts Summary */}
                <AlertsSummary
                  summary={
                    alertsData?.summary || {
                      total: 0,
                      critical: 0,
                      warning: 0,
                      info: 0,
                    }
                  }
                />

                {/* Alerts with Tabs */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      Alerts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Tabs
                      value={viewMode}
                      onValueChange={(value) =>
                        setViewMode(value as "active" | "resolved")
                      }
                    >
                      <TabsList className="grid w-full grid-cols-2 mb-6">
                        <TabsTrigger value="active">Active Alerts</TabsTrigger>
                        <TabsTrigger value="resolved">
                          Resolved Alerts
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="active">
                        <ActiveAlertsList
                          alerts={alertsData?.alerts || []}
                          summary={
                            alertsData?.summary || {
                              total: 0,
                              critical: 0,
                              warning: 0,
                              info: 0,
                            }
                          }
                          userPlan={userPlan}
                          total={alertsData?.total || 0}
                          page={activeAlertsPage}
                          pageSize={activeAlertsPageSize}
                          onPageChange={setActiveAlertsPage}
                          onPageSizeChange={(size) => {
                            setActiveAlertsPageSize(size);
                            setActiveAlertsPage(1); // Reset to first page when changing page size
                          }}
                        />
                      </TabsContent>

                      <TabsContent value="resolved">
                        <ResolvedAlertsList
                          alerts={resolvedAlertsData?.alerts || []}
                          isLoading={
                            resolvedAlertsLoading && !resolvedAlertsData
                          }
                          error={resolvedAlertsError}
                          total={resolvedAlertsData?.total || 0}
                          page={resolvedAlertsPage}
                          pageSize={resolvedAlertsPageSize}
                          onPageChange={setResolvedAlertsPage}
                          onPageSizeChange={(size) => {
                            setResolvedAlertsPageSize(size);
                            setResolvedAlertsPage(1); // Reset to first page when changing page size
                          }}
                        />
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </main>
      </div>
      {/* Notification Settings Modal */}
      <AlertNotificationSettingsModal
        isOpen={showNotificationSettingsModal}
        onClose={() => setShowNotificationSettingsModal(false)}
      />

      {/* Alert Rules Modal */}
      <AlertRulesModal
        isOpen={showAlertRulesModal}
        onClose={() => setShowAlertRulesModal(false)}
      />
    </SidebarProvider>
  );
};

export default Alerts;
