import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useSearchParams } from "react-router";

import { AlertTriangle, Loader2, Mail, Settings } from "lucide-react";

import { UserRole } from "@/lib/api";

import { ActiveAlertsList } from "@/components/alerts/ActiveAlertsList";
import { AlertNotificationSettingsModal } from "@/components/alerts/AlertNotificationSettingsModal";
import { AlertRulesModal } from "@/components/alerts/AlertRulesModal";
import { AlertsSummary } from "@/components/alerts/AlertsSummary";
import { ResolvedAlertsList } from "@/components/alerts/ResolvedAlertsList";
import { AppSidebar } from "@/components/AppSidebar";
import { FeatureGate } from "@/components/FeatureGate";
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
  const { t } = useTranslation("alerts");
  const { serverId } = useParams<{ serverId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedServerId, hasServers, setSelectedServerId } =
    useServerContext();
  const { selectedVHost, setSelectedVHost } = useVHostContext();
  const { userPlan, user, isLoading: isUserLoading } = useUser();
  const isAdmin = user?.role === UserRole.ADMIN;
  const { hasFeature: hasAlertingFeature, isLoading: featureFlagsLoading } =
    useFeatureFlags();
  // const [showConfigureModal, setShowConfigureModal] = useState(false);
  const [showNotificationSettingsModal, setShowNotificationSettingsModal] =
    useState(false);
  const [showAlertRulesModal, setShowAlertRulesModal] = useState(false);

  // Open notification settings from query param only for admins.
  // Wait for user context to hydrate so isAdmin is accurate before evaluating
  // the deep-link param; also cleans up the param from the URL here so a
  // separate cleanup effect is not needed.
  useEffect(() => {
    const shouldOpen = searchParams.get("openNotificationSettings") === "true";
    if (isUserLoading || !shouldOpen) return;

    if (isAdmin) {
      setShowNotificationSettingsModal(true);
    }

    searchParams.delete("openNotificationSettings");
    setSearchParams(searchParams, { replace: true });
  }, [isAdmin, isUserLoading, searchParams, setSearchParams]);
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
              title={t("noServerTitle")}
              subtitle={t("pageSubtitle")}
              description={t("noServerDescription")}
            />
          </main>
        </div>
      </SidebarProvider>
    );
  }

  // FeatureGate is applied at the component level to guard the alerting feature content
  if (!currentServerId) {
    return <PageLoader />;
  }

  return (
    <SidebarProvider>
      <div className="page-layout">
        <AppSidebar />
        <FeatureGate feature="alerting" fallback={<PageLoader />}>
          <main className="main-content-scrollable">
            <div className="content-container-large">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <SidebarTrigger />
                  <div>
                    <h1 className="title-page">{t("pageTitle")}</h1>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {alertsLoading && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                  {isAdmin && (
                    <>
                      <Button
                        onClick={() => setShowAlertRulesModal(true)}
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        <Settings className="h-4 w-4" />
                        {t("alertRules")}
                      </Button>
                      <Button
                        onClick={() => setShowNotificationSettingsModal(true)}
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        <Mail className="h-4 w-4" />
                        {t("notificationSettings")}
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Loading state */}
              {featureFlagsLoading || (alertsLoading && !alertsData) ? (
                <PageLoader />
              ) : alertsError ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{t("failedToLoad")}</AlertDescription>
                </Alert>
              ) : (
                <>
                  {/* Alerts Summary */}
                  <AlertsSummary
                    summary={
                      alertsData?.summary || {
                        total: 0,
                        critical: 0,
                        high: 0,
                        medium: 0,
                        low: 0,
                        info: 0,
                      }
                    }
                  />

                  {/* Alerts with Tabs */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        {t("pageTitle")}
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
                          <TabsTrigger value="active">
                            {t("activeAlerts")}
                          </TabsTrigger>
                          <TabsTrigger value="resolved">
                            {t("resolvedAlerts")}
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
        </FeatureGate>
      </div>
      {/* Notification Settings Modal */}
      {isAdmin && (
        <AlertNotificationSettingsModal
          isOpen={showNotificationSettingsModal}
          onClose={() => setShowNotificationSettingsModal(false)}
        />
      )}

      {/* Alert Rules Modal */}
      {isAdmin && (
        <AlertRulesModal
          isOpen={showAlertRulesModal}
          onClose={() => setShowAlertRulesModal(false)}
        />
      )}
    </SidebarProvider>
  );
};

export default Alerts;
