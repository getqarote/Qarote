import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router";

import { toast } from "sonner";

import { UserRole } from "@/lib/api";
import { logger } from "@/lib/logger";

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

import {
  useDeleteQueue,
  useQueue,
  useQueueBindings,
  useQueueConsumers,
  useQueueLiveRates,
} from "@/hooks/queries/useRabbitMQ";
import { useWorkspace } from "@/hooks/ui/useWorkspace";

const QueueDetail = () => {
  const { t } = useTranslation("queues");
  const { queueName } = useParams<{ queueName: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === UserRole.ADMIN;
  const { selectedServerId } = useServerContext();
  const { selectedVHost } = useVHostContext();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [timeRange, setTimeRange] = useState<TimeRange>("1m");
  const [spyEnabled, setSpyEnabled] = useState(false);

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

  const deleteQueueMutation = useDeleteQueue();
  const { workspace } = useWorkspace();

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

            {/* Tabbed content */}
            <Tabs defaultValue="health" className="space-y-6">
              <TabsList>
                <TabsTrigger value="health">{t("tabHealth")}</TabsTrigger>
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
