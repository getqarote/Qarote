import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";

import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { UserRole } from "@/lib/api";
import { getUpgradePath } from "@/lib/featureFlags";
import { logger } from "@/lib/logger";

import { ConsumerHistoryChart } from "@/components/ConsumerHistoryChart";
import {
  HistoricalRange,
  HistoricalRangeSelector,
} from "@/components/HistoricalRangeSelector";
import { MessagesRatesChart } from "@/components/MessagesRatesChart";
import { PageShell } from "@/components/PageShell";
import { ConsumerDetails } from "@/components/QueueDetail/ConsumerDetails";
import { LoadingSkeleton } from "@/components/QueueDetail/LoadingSkeleton";
import { MessageStatistics } from "@/components/QueueDetail/MessageStatistics";
import { NotFound } from "@/components/QueueDetail/NotFound";
import { QueueBindings } from "@/components/QueueDetail/QueueBindings";
import { QueueConfiguration } from "@/components/QueueDetail/QueueConfiguration";
import { QueueHeader } from "@/components/QueueDetail/QueueHeader";
import { QueueStats } from "@/components/QueueDetail/QueueStats";
import { QueueTiming } from "@/components/QueueDetail/QueueTiming";
import { QueuedMessagesChart } from "@/components/QueuedMessagesChart";
import { QueueHistoryChart } from "@/components/QueueHistoryChart";
import { TimeRange } from "@/components/TimeRangeSelector";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";

import { useAuth } from "@/contexts/AuthContextDefinition";
import { useServerContext } from "@/contexts/ServerContext";
import { useVHostContext } from "@/contexts/VHostContextDefinition";

import { useDiagnosis } from "@/hooks/queries/useDiagnosis";
import { useCurrentPlan } from "@/hooks/queries/usePlans";
import { useQueueHistory } from "@/hooks/queries/useQueueHistory";
import {
  useDeleteQueue,
  useQueue,
  useQueueBindings,
  useQueueConsumers,
  useQueueLiveRates,
} from "@/hooks/queries/useRabbitMQ";
import { useUser } from "@/hooks/ui/useUser";
import { useWorkspace } from "@/hooks/ui/useWorkspace";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";

import { UserPlan } from "@/types/plans";

const QueueDetail = () => {
  const { t } = useTranslation("queues");
  const { t: tDiagnosis } = useTranslation("diagnosis");
  const { queueName } = useParams<{ queueName: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === UserRole.ADMIN;
  const { selectedServerId } = useServerContext();
  const { selectedVHost } = useVHostContext();
  // When navigating from DiagnosisCard the target vhost is encoded in the
  // query param — takes precedence over the global vhost picker so the user
  // lands on the correct queue even when their picker is set to a different
  // vhost.
  const vhost = searchParams.get("vhost") ?? selectedVHost;
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [timeRange, setTimeRange] = useState<TimeRange>("1m");
  const [histRange, setHistRange] = useState<HistoricalRange>(6);
  const [activeTab, setActiveTab] = useState("health");
  const { userPlan } = useUser();
  const isPremium =
    userPlan === UserPlan.DEVELOPER || userPlan === UserPlan.ENTERPRISE;

  // FREE plan: queryable range is hard-clamped to 6h server-side
  // (`resolve-allowed-range.ts`) regardless of the 24h retention window —
  // mirror that here so the picker can't pretend otherwise.
  //
  // Paid plans use planData's `maxMetricsRetentionHours` once it
  // resolves. While the query is loading, fall back to a tier-correct
  // ceiling derived from `userPlan` (which is already resolved from
  // UserContext): DEVELOPER → 168, ENTERPRISE → 720. A blanket 720
  // fallback was wrong — DEVELOPER users would briefly see 30d as
  // selectable until planData arrived (server clamps anyway, but the
  // picker shouldn't lie). If planData fails permanently, the
  // tier-correct fallback continues to gate correctly.
  const { data: planData } = useCurrentPlan();
  const planFallbackMaxRangeHours =
    userPlan === UserPlan.ENTERPRISE
      ? 720
      : userPlan === UserPlan.DEVELOPER
        ? 168
        : 6;
  const maxRangeHours = isPremium
    ? (planData?.planFeatures.maxMetricsRetentionHours ??
      planFallbackMaxRangeHours)
    : 6;

  const {
    data: queueData,
    isLoading,
    refetch,
  } = useQueue(selectedServerId, queueName, vhost);

  const { data: consumersData, isLoading: consumersLoading } =
    useQueueConsumers(selectedServerId, queueName, vhost);

  const { data: bindingsData, isLoading: bindingsLoading } = useQueueBindings(
    selectedServerId,
    queueName,
    vhost
  );

  const { data: queueLiveRatesData, isLoading: liveRatesLoading } =
    useQueueLiveRates(selectedServerId, queueName, timeRange, vhost);

  const {
    data: historyData,
    isLoading: historyLoading,
    error: historyError,
  } = useQueueHistory({
    serverId: selectedServerId,
    queueName,
    vhost: vhost || "/",
    rangeHours: histRange,
    enabled: activeTab === "history",
  });

  const deleteQueueMutation = useDeleteQueue();
  const { workspace } = useWorkspace();
  const { hasFeature } = useFeatureFlags();
  const isDiagnosisEnabled = hasFeature("incident_diagnosis");

  const { data: diagnosisData } = useDiagnosis(selectedServerId, 120, {
    enabled: isDiagnosisEnabled,
  });

  // Filter diagnoses for this specific queue
  const queueDiagnoses = diagnosisData?.diagnoses
    ? diagnosisData.diagnoses.filter(
        (d) => d.queueName === queueName && d.vhost === (vhost || "/")
      )
    : [];

  const queue = queueData?.queue;

  const handleNavigateBack = () => navigate("/queues");

  const handleDeleteQueue = async () => {
    if (!selectedServerId || !queueName || !workspace?.id) return;

    try {
      await deleteQueueMutation.mutateAsync({
        serverId: selectedServerId,
        workspaceId: workspace.id,
        queueName,
        ifUnused: true,
        ifEmpty: true,
        vhost: vhost ? encodeURIComponent(vhost) : encodeURIComponent("/"),
      });

      toast(t("common:success"), {
        description: t("deleteSuccess", { queueName }),
      });

      setDeleteDialogOpen(false);
      navigate("/queues");
    } catch (error) {
      logger.error("Failed to delete queue:", error);
      toast.error(t("common:error"), {
        description: error instanceof Error ? error.message : t("deleteError"),
      });
    }
  };

  const confirmDeleteQueue = () => {
    setDeleteDialogOpen(true);
  };

  if (!selectedServerId || !queueName) {
    return (
      <PageShell>
        <NotFound
          title={t("queueNotFound")}
          description={t("queueNotFoundDesc")}
          onNavigateBack={handleNavigateBack}
        />
      </PageShell>
    );
  }

  return (
    <TooltipProvider>
      <PageShell>
        <QueueHeader
          queueName={queueName}
          selectedServerId={selectedServerId}
          messageCount={queue?.messages || 0}
          consumerCount={queue?.consumers || 0}
          isAdmin={isAdmin}
          onNavigateBack={handleNavigateBack}
          onRefetch={refetch}
          onDeleteQueue={isAdmin ? confirmDeleteQueue : undefined}
        />

        {isLoading ? (
          <LoadingSkeleton />
        ) : queue ? (
          <>
            {/* Stats — always visible at top */}
            <QueueStats queue={queue} />

            {/* Spy CTA — navigates to Messages page in Live mode, pre-scoped to this queue */}
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() =>
                  navigate(
                    `/messages?mode=live&queue=${encodeURIComponent(queueName)}&vhost=${encodeURIComponent(vhost || "/")}`
                  )
                }
              >
                <span className="relative flex h-2 w-2 mr-2">
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                </span>
                {t("spyOnQueue")}
              </Button>
            </div>

            {/* Diagnosis banner — only when anomalies detected */}
            {isDiagnosisEnabled && queueDiagnoses.length > 0 && (
              <div className="flex items-center gap-3 rounded-md border border-orange-500/30 bg-orange-500/5 px-4 py-3 text-sm">
                <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0" />
                <span className="text-foreground">
                  {tDiagnosis("queueBanner", {
                    count: queueDiagnoses.length,
                  })}
                </span>
                <Link
                  to="/diagnosis"
                  className="ml-auto text-orange-600 hover:text-orange-700 dark:text-orange-400 hover:underline font-medium shrink-0"
                >
                  {tDiagnosis("viewDiagnoses")}
                </Link>
              </div>
            )}

            {/* Tabbed content */}
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="space-y-6"
            >
              <TabsList>
                <TabsTrigger value="health">{t("tabHealth")}</TabsTrigger>
                <TabsTrigger value="history">{t("tabHistory")}</TabsTrigger>
                <TabsTrigger value="configuration">
                  {t("tabConfiguration")}
                </TabsTrigger>
                <TabsTrigger value="bindings">
                  {t("tabBindings")}
                  {bindingsData?.totalBindings ? (
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      {bindingsData.totalBindings}
                    </span>
                  ) : null}
                </TabsTrigger>
              </TabsList>

              {/* Health tab — SRE-first: consumers right after stats */}
              <TabsContent value="health" className="space-y-6 mt-0">
                <ConsumerDetails
                  consumersData={consumersData}
                  consumersLoading={consumersLoading}
                />

                <MessageStatistics queue={queue} />

                <MessagesRatesChart
                  messagesRates={queueLiveRatesData?.rates}
                  ratesMode={queueLiveRatesData?.ratesMode}
                  isLoading={liveRatesLoading}
                  error={null}
                  timeRange={timeRange}
                  onTimeRangeChange={setTimeRange}
                />

                <QueuedMessagesChart
                  queueTotals={queueLiveRatesData?.queueTotals}
                  isLoading={liveRatesLoading}
                  error={null}
                  timeRange={timeRange}
                  onTimeRangeChange={setTimeRange}
                />
              </TabsContent>

              {/* History tab — scheduled snapshots, 5-min resolution */}
              <TabsContent value="history" className="space-y-6 mt-0">
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border">
                    <h2 className="title-section">
                      {t("historyMessageDepth")}
                    </h2>
                    <div className="flex items-center gap-3">
                      {historyData?.wasClamped && (
                        <span className="text-xs text-amber-600 dark:text-amber-400">
                          {t("historyClampedPrefix", {
                            hours: historyData.resolvedHours,
                          })}{" "}
                          <Link
                            to={getUpgradePath()}
                            className="underline hover:no-underline"
                          >
                            {t("historyUpgradeLabel")}
                          </Link>{" "}
                          {t("historyUpgradeSuffix")}
                        </span>
                      )}
                      <HistoricalRangeSelector
                        value={histRange}
                        onValueChange={setHistRange}
                        maxRangeHours={maxRangeHours}
                      />
                    </div>
                  </div>
                  <div className="p-4">
                    <QueueHistoryChart
                      snapshots={historyData?.snapshots}
                      isLoading={historyLoading}
                      error={historyError as Error | null}
                      rangeHours={histRange}
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="px-4 py-3 bg-muted/30 border-b border-border">
                    <h2 className="title-section">
                      {t("historyConsumerCount")}
                    </h2>
                  </div>
                  <div className="p-4">
                    <ConsumerHistoryChart
                      snapshots={historyData?.snapshots}
                      isLoading={historyLoading}
                      error={historyError as Error | null}
                      rangeHours={histRange}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Configuration tab */}
              <TabsContent value="configuration" className="space-y-6 mt-0">
                <QueueConfiguration queue={queue} />
                <QueueTiming queue={queue} />
              </TabsContent>

              {/* Bindings tab */}
              <TabsContent value="bindings" className="mt-0">
                <QueueBindings
                  bindingsData={bindingsData}
                  bindingsLoading={bindingsLoading}
                />
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <NotFound
            title={t("queueNotFound")}
            description={t("notFoundMessage", { queueName })}
            onNavigateBack={handleNavigateBack}
          />
        )}

        <Dialog
          open={deleteDialogOpen}
          onOpenChange={(open) => {
            setDeleteDialogOpen(open);
            if (!open) setDeleteConfirmName("");
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("deleteTitle")}</DialogTitle>
              <DialogDescription>
                {t("deleteDescription", { queueName })}
              </DialogDescription>
            </DialogHeader>

            {/* Context: show current queue state */}
            {queue && (queue.messages > 0 || queue.consumers > 0) && (
              <div className="rounded-md bg-muted/50 p-3 text-sm space-y-1">
                {queue.messages > 0 && (
                  <p className="text-warning font-medium">
                    {t("deleteWarningMessages", {
                      count: queue.messages,
                    })}
                  </p>
                )}
                {queue.consumers > 0 && (
                  <p className="text-warning font-medium">
                    {t("deleteWarningConsumers", {
                      count: queue.consumers,
                    })}
                  </p>
                )}
                <p className="text-muted-foreground">
                  {t("deleteConstraints")}
                </p>
              </div>
            )}

            {/* Type-to-confirm */}
            <div className="space-y-2">
              <label
                htmlFor="delete-confirm"
                className="text-sm text-muted-foreground"
              >
                {t("deleteTypeConfirm", { queueName })}
              </label>
              <input
                id="delete-confirm"
                type="text"
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
                className="flex h-9 w-full rounded-none border border-border bg-background px-3 py-1 text-sm font-mono transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder={queueName}
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteDialogOpen(false);
                  setDeleteConfirmName("");
                }}
                disabled={deleteQueueMutation.isPending}
              >
                {t("common:cancel")}
              </Button>
              <Button
                variant="destructive-outline"
                onClick={handleDeleteQueue}
                disabled={
                  deleteQueueMutation.isPending ||
                  deleteConfirmName !== queueName
                }
              >
                {deleteQueueMutation.isPending
                  ? t("deleting")
                  : t("deleteQueue")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageShell>
    </TooltipProvider>
  );
};

export default QueueDetail;
