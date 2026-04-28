import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router";

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
import { QueueSpy } from "@/components/QueueDetail/QueueSpy";
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
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === UserRole.ADMIN;
  const { selectedServerId } = useServerContext();
  const { selectedVHost } = useVHostContext();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [timeRange, setTimeRange] = useState<TimeRange>("1m");
  const [histRange, setHistRange] = useState<HistoricalRange>(6);
  const [activeTab, setActiveTab] = useState("health");
  const [spyEnabled, setSpyEnabled] = useState(false);
  const { userPlan } = useUser();
  const isPremium =
    userPlan === UserPlan.DEVELOPER || userPlan === UserPlan.ENTERPRISE;

  const {
    data: queueData,
    isLoading,
    refetch,
  } = useQueue(selectedServerId, queueName, selectedVHost);

  const { data: consumersData, isLoading: consumersLoading } =
    useQueueConsumers(selectedServerId, queueName, selectedVHost);

  const { data: bindingsData, isLoading: bindingsLoading } = useQueueBindings(
    selectedServerId,
    queueName,
    selectedVHost
  );

  const { data: queueLiveRatesData, isLoading: liveRatesLoading } =
    useQueueLiveRates(selectedServerId, queueName, timeRange, selectedVHost);

  const {
    data: historyData,
    isLoading: historyLoading,
    error: historyError,
  } = useQueueHistory({
    serverId: selectedServerId,
    queueName,
    vhost: selectedVHost || "/",
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
        (d) => d.queueName === queueName && d.vhost === (selectedVHost || "/")
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
        vhost: selectedVHost
          ? encodeURIComponent(selectedVHost)
          : encodeURIComponent("/"),
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

            {/* Spy toggle — prominent, lives above tabs */}
            <div className="flex items-center gap-3">
              <Button
                variant={spyEnabled ? "default" : "outline"}
                onClick={() => setSpyEnabled((prev) => !prev)}
                className="rounded-none"
              >
                <span className="relative flex h-2 w-2 mr-2">
                  {spyEnabled ? (
                    <>
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-foreground opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-primary-foreground" />
                    </>
                  ) : (
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-muted-foreground" />
                  )}
                </span>
                {spyEnabled ? t("stopSpy") : t("spyOnQueue")}
              </Button>
              {spyEnabled && (
                <span className="text-xs text-muted-foreground">
                  {t("spyDescription")}
                </span>
              )}
            </div>

            {/* Spy panel — expands when active */}
            {spyEnabled && (
              <QueueSpy
                key={`${selectedServerId}|${queueName}|${selectedVHost || "/"}`}
                serverId={selectedServerId}
                queueName={queueName}
                vhost={selectedVHost || "/"}
              />
            )}

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
                        isPremium={isPremium}
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
