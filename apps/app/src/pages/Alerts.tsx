import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useSearchParams } from "react-router";

import { AlertTriangle, Loader2 } from "lucide-react";
import {
  parseAsBoolean,
  parseAsInteger,
  parseAsStringEnum,
  useQueryStates,
} from "nuqs";

import { ActiveAlertsList } from "@/components/alerts/ActiveAlertsList";
import { AlertNotificationSettingsModal } from "@/components/alerts/AlertNotificationSettingsModal";
import { AlertRulesModal } from "@/components/alerts/AlertRulesModal";
import { AlertsSummary } from "@/components/alerts/AlertsSummary";
import { ConfigFindingsList } from "@/components/alerts/ConfigFindingsList";
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
import { useIsWorkspaceAdmin } from "@/hooks/queries/useWorkspaceRole";
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
  const { userPlan, isLoading: isUserLoading } = useUser();
  const isAdmin = useIsWorkspaceAdmin() === true;
  const { hasFeature: hasAlertingFeature, isLoading: featureFlagsLoading } =
    useFeatureFlags();
  const [showNotificationSettingsModal, setShowNotificationSettingsModal] =
    useState(false);
  const [showAlertRulesModal, setShowAlertRulesModal] = useState(false);

  // Deep-link: `?openNotificationSettings=true` auto-opens the modal.
  //
  // We *latch* the open state into local state on first detection, then strip
  // the param from the URL. A previous implementation derived this from
  // searchParams via useMemo, but the same effect that stripped the param
  // also made the memo flip back to false on the next render — closing the
  // modal immediately. Hence the latch.
  useEffect(() => {
    if (isUserLoading || !isAdmin) return;
    if (searchParams.get("openNotificationSettings") !== "true") return;
    setShowNotificationSettingsModal(true);
    searchParams.delete("openNotificationSettings");
    setSearchParams(searchParams, { replace: true });
  }, [isAdmin, isUserLoading, searchParams, setSearchParams]);

  const [
    {
      view: viewMode,
      resolved: showResolvedAlerts,
      ap: activeAlertsPage,
      aps: activeAlertsPageSize,
      rp: resolvedAlertsPage,
      rps: resolvedAlertsPageSize,
    },
    setFilters,
  ] = useQueryStates(
    {
      view: parseAsStringEnum<"alerts" | "config">([
        "alerts",
        "config",
      ]).withDefault("alerts"),
      resolved: parseAsBoolean.withDefault(false),
      ap: parseAsInteger.withDefault(1),
      aps: parseAsInteger.withDefault(25),
      rp: parseAsInteger.withDefault(1),
      rps: parseAsInteger.withDefault(25),
    },
    { history: "replace" as const, clearOnDefault: true }
  );

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
            {/* Advanced Smart Alerting (custom metric-threshold rules) is
                hidden at launch — keep only the 3-channel notification setup
                (Email / Slack / Webhook). AlertRulesModal stays in the tree
                for when advanced rules return. */}
            {isAdmin && (
              <Button
                onClick={() => setShowNotificationSettingsModal(true)}
                className="btn-primary"
              >
                {t("notificationSettings")}
              </Button>
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
                  void setFilters({
                    view: value as "alerts" | "config",
                    ap: 1,
                    rp: 1,
                  })
                }
              >
                <div className="px-4 py-2 border-b border-border flex items-center justify-between gap-3 flex-wrap">
                  <TabsList className="grid w-full max-w-xs grid-cols-2">
                    <TabsTrigger value="alerts">{t("alerts")}</TabsTrigger>
                    <TabsTrigger value="config">{t("configScan")}</TabsTrigger>
                  </TabsList>
                  {viewMode === "alerts" && (
                    <Button
                      variant={showResolvedAlerts ? "default" : "outline"}
                      size="sm"
                      className="h-8 text-sm"
                      onClick={() =>
                        void setFilters({
                          resolved: !showResolvedAlerts,
                          ap: 1,
                          rp: 1,
                        })
                      }
                      aria-pressed={showResolvedAlerts}
                    >
                      {/* Toggle label reflects the *next* action so the
                          button verb-form stays accurate in either state. */}
                      {showResolvedAlerts
                        ? t("scan.showActive", { ns: "alerts" })
                        : t("scan.showResolved", { ns: "alerts" })}
                    </Button>
                  )}
                </div>

                <TabsContent value="alerts" className="m-0">
                  {showResolvedAlerts ? (
                    <ResolvedAlertsList
                      alerts={resolvedAlertsData?.alerts || []}
                      isLoading={resolvedAlertsLoading && !resolvedAlertsData}
                      error={resolvedAlertsError}
                      total={resolvedAlertsData?.total || 0}
                      page={resolvedAlertsPage}
                      pageSize={resolvedAlertsPageSize}
                      onPageChange={(p) => void setFilters({ rp: p })}
                      onPageSizeChange={(s) =>
                        void setFilters({ rps: s, rp: 1 })
                      }
                    />
                  ) : (
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
                      onPageChange={(p) => void setFilters({ ap: p })}
                      onPageSizeChange={(s) =>
                        void setFilters({ aps: s, ap: 1 })
                      }
                    />
                  )}
                </TabsContent>

                <TabsContent value="config" className="m-0 p-4">
                  {currentServerId && (
                    <ConfigFindingsList serverId={currentServerId} />
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </>
        )}
      </FeatureGate>

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
    </PageShell>
  );
};

export default Alerts;
