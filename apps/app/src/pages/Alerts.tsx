import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useSearchParams } from "react-router";

import { usePostHog } from "@posthog/react";
import { AlertTriangle, Loader2 } from "lucide-react";

import { UserRole } from "@/lib/api";

import { ActiveAlertsList } from "@/components/alerts/ActiveAlertsList";
import { AlertNotificationSettingsModal } from "@/components/alerts/AlertNotificationSettingsModal";
import { AlertRulesModal } from "@/components/alerts/AlertRulesModal";
import { AlertsSummary } from "@/components/alerts/AlertsSummary";
import { ResolvedAlertsList } from "@/components/alerts/ResolvedAlertsList";
import { FeatureGate } from "@/components/FeatureGate";
import { NoServerConfigured } from "@/components/NoServerConfigured";
import { PageLoader } from "@/components/PageLoader";
import { PageShell } from "@/components/PageShell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
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
  const posthog = usePostHog();
  const { serverId } = useParams<{ serverId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedServerId, hasServers, setSelectedServerId } =
    useServerContext();
  const { selectedVHost, setSelectedVHost } = useVHostContext();
  const { userPlan, user, isLoading: isUserLoading } = useUser();
  const isAdmin = user?.role === UserRole.ADMIN;
  const { hasFeature: hasAlertingFeature, isLoading: featureFlagsLoading } =
    useFeatureFlags();
  const [showNotificationSettingsModal, setShowNotificationSettingsModal] =
    useState(false);
  const [showAlertRulesModal, setShowAlertRulesModal] = useState(false);

  const shouldOpenNotificationSettingsFromUrl = useMemo(() => {
    if (isUserLoading) return false;
    if (!isAdmin) return false;
    return searchParams.get("openNotificationSettings") === "true";
  }, [isAdmin, isUserLoading, searchParams]);

  useEffect(() => {
    if (!shouldOpenNotificationSettingsFromUrl) return;
    searchParams.delete("openNotificationSettings");
    setSearchParams(searchParams, { replace: true });
  }, [searchParams, setSearchParams, shouldOpenNotificationSettingsFromUrl]);

  const isNotificationSettingsOpen =
    showNotificationSettingsModal || shouldOpenNotificationSettingsFromUrl;
  const [viewMode, setViewMode] = useState<"active" | "resolved">("active");

  const [activeAlertsPage, setActiveAlertsPage] = useState(1);
  const [activeAlertsPageSize, setActiveAlertsPageSize] = useState(25);
  const [resolvedAlertsPage, setResolvedAlertsPage] = useState(1);
  const [resolvedAlertsPageSize, setResolvedAlertsPageSize] = useState(25);

  useEffect(() => {
    const queryServerId = searchParams.get("serverId");
    const queryVHost = searchParams.get("vhost");
    const decodedVHost = queryVHost ? decodeURIComponent(queryVHost) : null;

    if (queryServerId && queryServerId !== selectedServerId) {
      setSelectedServerId(queryServerId);
      searchParams.delete("serverId");
      setSearchParams(searchParams, { replace: true });
    }

    if (decodedVHost && decodedVHost !== selectedVHost) {
      setSelectedVHost(decodedVHost);
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
  const currentVHost = selectedVHost || "/";
  const isAlertingEnabled = hasAlertingFeature("alerting");

  const {
    data: alertsData,
    isLoading: alertsLoading,
    error: alertsError,
  } = useRabbitMQAlerts(currentServerId, currentVHost, {
    limit: activeAlertsPageSize,
    offset: (activeAlertsPage - 1) * activeAlertsPageSize,
    enabled: isAlertingEnabled,
  });

  const {
    data: resolvedAlertsData,
    isLoading: resolvedAlertsLoading,
    error: resolvedAlertsError,
  } = useResolvedAlerts(currentServerId, currentVHost, {
    limit: resolvedAlertsPageSize,
    offset: (resolvedAlertsPage - 1) * resolvedAlertsPageSize,
    enabled: isAlertingEnabled,
  });

  const { data: notificationSettings } =
    useAlertNotificationSettings(isAlertingEnabled);

  useBrowserNotifications(alertsData?.alerts, {
    enabled:
      isAlertingEnabled &&
      notificationSettings?.settings?.browserNotificationsEnabled,
    severities:
      notificationSettings?.settings?.browserNotificationSeverities || [],
  });

  if (!hasServers) {
    return (
      <PageShell bare>
        <div className="flex items-center gap-4">
          <SidebarTrigger />
        </div>
        <NoServerConfigured
          title={t("noServerTitle")}
          subtitle={t("pageSubtitle")}
          description={t("noServerDescription")}
        />
      </PageShell>
    );
  }

  if (!currentServerId) {
    return <PageLoader />;
  }

  return (
    <PageShell>
      <FeatureGate feature="alerting" fallback={<PageLoader />}>
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
                  onClick={() => {
                    posthog?.capture("alert_rule_modal_opened");
                    setShowAlertRulesModal(true);
                  }}
                  className="btn-primary"
                >
                  {t("alertRules")}
                </Button>
                <Button
                  onClick={() => setShowNotificationSettingsModal(true)}
                  className="btn-primary"
                >
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

            {/* Alerts list with tabs */}
            <div className="rounded-lg border border-border overflow-hidden">
              <Tabs
                value={viewMode}
                onValueChange={(value) =>
                  setViewMode(value as "active" | "resolved")
                }
              >
                <div className="px-4 py-2 border-b border-border">
                  <TabsList className="grid w-full max-w-xs grid-cols-2">
                    <TabsTrigger value="active">
                      {t("activeAlerts")}
                    </TabsTrigger>
                    <TabsTrigger value="resolved">
                      {t("resolvedAlerts")}
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="active" className="m-0">
                  <ActiveAlertsList
                    alerts={alertsData?.alerts || []}
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
                    userPlan={userPlan}
                    total={alertsData?.total || 0}
                    page={activeAlertsPage}
                    pageSize={activeAlertsPageSize}
                    onPageChange={setActiveAlertsPage}
                    onPageSizeChange={(size) => {
                      setActiveAlertsPageSize(size);
                      setActiveAlertsPage(1);
                    }}
                  />
                </TabsContent>

                <TabsContent value="resolved" className="m-0">
                  <ResolvedAlertsList
                    alerts={resolvedAlertsData?.alerts || []}
                    isLoading={resolvedAlertsLoading && !resolvedAlertsData}
                    error={resolvedAlertsError}
                    total={resolvedAlertsData?.total || 0}
                    page={resolvedAlertsPage}
                    pageSize={resolvedAlertsPageSize}
                    onPageChange={setResolvedAlertsPage}
                    onPageSizeChange={(size) => {
                      setResolvedAlertsPageSize(size);
                      setResolvedAlertsPage(1);
                    }}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </>
        )}
      </FeatureGate>

      {/* Notification Settings Modal */}
      {isAdmin && (
        <AlertNotificationSettingsModal
          isOpen={isNotificationSettingsOpen}
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
    </PageShell>
  );
};

export default Alerts;
