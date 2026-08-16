import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useSearchParams } from "react-router";

import { Settings } from "lucide-react";
import { parseAsStringEnum, useQueryStates } from "nuqs";

import { AlertRulesTab } from "@/components/alerts/notifications/AlertRulesTab";
import { AlertsTab } from "@/components/alerts/notifications/AlertsTab";
import { ConfigScanTab } from "@/components/alerts/notifications/ConfigScanTab";
import {
  NotificationsTabs,
  type NotificationsView,
} from "@/components/alerts/notifications/NotificationsTabs";
import { FirstRunCockpit } from "@/components/cockpit/FirstRunCockpit";
import { FeatureGate } from "@/components/FeatureGate";
import { NotificationSettingsDrawer } from "@/components/notifications/NotificationSettingsDrawer";
import { PageLoader } from "@/components/PageLoader";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";

import { useServerContext } from "@/contexts/ServerContext";
import { useVHostContext } from "@/contexts/VHostContextDefinition";

import {
  useAlertNotificationSettings,
  useRabbitMQAlerts,
} from "@/hooks/queries/useAlerts";
import { useGetFindings } from "@/hooks/queries/useScan";
import { useServer } from "@/hooks/queries/useServer";
import { useIsWorkspaceAdmin } from "@/hooks/queries/useWorkspaceRole";
import { useUser } from "@/hooks/ui/useUser";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";

const Alerts = () => {
  const { t } = useTranslation("alerts");
  const { serverId } = useParams<{ serverId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedServerId, hasServers, setSelectedServerId } =
    useServerContext();
  const { selectedVHost, setSelectedVHost } = useVHostContext();
  const { isLoading: isUserLoading } = useUser();
  const isAdmin = useIsWorkspaceAdmin() === true;
  const { hasFeature: hasAlertingFeature } = useFeatureFlags();
  const [showNotificationSettingsModal, setShowNotificationSettingsModal] =
    useState(false);

  // Deep-link: `?openNotificationSettings=true` auto-opens the modal. We latch
  // it into local state on first detection, then strip the param — deriving it
  // from searchParams would flip back to false once the param is removed.
  useEffect(() => {
    if (isUserLoading || !isAdmin) return;
    if (searchParams.get("openNotificationSettings") !== "true") return;
    // Deep-link latch: opening the modal from a URL param is a one-shot side
    // effect, not derived state — the param is stripped on the next line.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowNotificationSettingsModal(true);
    searchParams.delete("openNotificationSettings");
    setSearchParams(searchParams, { replace: true });
  }, [isAdmin, isUserLoading, searchParams, setSearchParams]);

  const [{ view: viewMode }, setFilters] = useQueryStates(
    {
      view: parseAsStringEnum<NotificationsView>([
        "alerts",
        "config",
        "rules",
      ]).withDefault("alerts"),
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

  // Keep the notification-settings query warm for the modal.
  useAlertNotificationSettings(isAlertingEnabled);

  // Tab badge counts. These share query keys with AlertsTab / ConfigFindingsList
  // so react-query dedupes them — no extra fetch for the badges.
  const { data: alertsData } = useRabbitMQAlerts(
    currentServerId,
    currentVHost,
    {
      limit: 200,
      offset: 0,
      enabled: isAlertingEnabled && !!currentServerId,
    }
  );
  const { data: findingsData } = useGetFindings(currentServerId ?? null, {
    enabled: isAlertingEnabled && !!currentServerId,
  });
  const alertsCount = alertsData?.summary?.total ?? 0;
  const findingsCount = findingsData?.total ?? 0;

  const { data: serverData } = useServer(currentServerId ?? null);
  const serverName = serverData?.server?.name ?? "";

  if (!hasServers) {
    return (
      <PageShell bare>
        <FirstRunCockpit />
      </PageShell>
    );
  }

  if (!currentServerId) {
    return <PageLoader />;
  }

  return (
    <PageShell>
      <FeatureGate feature="alerting" fallback={<PageLoader />}>
        {/* Intent note (prototype `.intent-note`) */}
        <p className="border-l-2 border-border pl-2.5 font-mono text-[11px] leading-relaxed text-muted-foreground">
          <span className="text-primary">// intent — </span>
          {t("intent")}
        </p>

        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex items-center gap-4">
            <SidebarTrigger />
            <div>
              <h1 className="title-page">{t("pageTitle")}</h1>
              <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
            </div>
          </div>
          {isAdmin && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5"
              onClick={() => setShowNotificationSettingsModal(true)}
            >
              <Settings className="h-3.5 w-3.5" />
              {t("notificationSettings")}
            </Button>
          )}
        </div>

        {/* Underline tabs (prototype `.tabs`) */}
        <NotificationsTabs
          view={viewMode}
          alertsCount={alertsCount}
          findingsCount={findingsCount}
          showRules={isAdmin}
          onSelect={(value) => void setFilters({ view: value })}
        />

        <div className="mt-4">
          {viewMode === "alerts" && (
            <AlertsTab
              serverId={currentServerId}
              vhost={currentVHost}
              canManage={isAdmin}
            />
          )}
          {viewMode === "config" && (
            <ConfigScanTab serverId={currentServerId} serverName={serverName} />
          )}
          {viewMode === "rules" && isAdmin && <AlertRulesTab />}
        </div>
      </FeatureGate>

      {/* Notification settings drawer */}
      {isAdmin && (
        <NotificationSettingsDrawer
          isOpen={showNotificationSettingsModal}
          onClose={() => setShowNotificationSettingsModal(false)}
        />
      )}
    </PageShell>
  );
};

export default Alerts;
