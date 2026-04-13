import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router";

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
// Queue Detail Components
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
import { useToast } from "@/hooks/ui/useToast";
import { useWorkspace } from "@/hooks/ui/useWorkspace";

const QueueDetail = () => {
  const { t } = useTranslation("queues");
  const { queueName } = useParams<{ queueName: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === UserRole.ADMIN;
  const { selectedServerId } = useServerContext();
  const { selectedVHost } = useVHostContext();
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
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

      toast({
        title: t("common:success"),
        description: t("deleteSuccess", { queueName }),
      });

      setDeleteDialogOpen(false);
      navigate("/queues");
    } catch (error) {
      logger.error("Failed to delete queue:", error);
      toast({
        title: t("common:error"),
        description: error instanceof Error ? error.message : t("deleteError"),
        variant: "destructive",
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
          isSpying={spyEnabled}
          onSpyToggle={() => setSpyEnabled((prev) => !prev)}
          onNavigateBack={handleNavigateBack}
          onRefetch={refetch}
          onDeleteQueue={isAdmin ? confirmDeleteQueue : undefined}
        />

        {spyEnabled && (
          <QueueSpy
            key={`${selectedServerId}|${queueName}|${selectedVHost || "/"}`}
            serverId={selectedServerId}
            queueName={queueName}
            vhost={selectedVHost || "/"}
          />
        )}

        {isLoading ? (
          <LoadingSkeleton />
        ) : queue ? (
          <>
            <QueueStats queue={queue} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <MessageStatistics queue={queue} />
              <QueueConfiguration queue={queue} />
            </div>

            <QueueTiming queue={queue} />

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

            <ConsumerDetails
              consumersData={consumersData}
              consumersLoading={consumersLoading}
            />

            <QueueBindings
              bindingsData={bindingsData}
              bindingsLoading={bindingsLoading}
            />
          </>
        ) : (
          <NotFound
            title={t("queueNotFound")}
            description={t("notFoundMessage", { queueName })}
            onNavigateBack={handleNavigateBack}
          />
        )}

        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("deleteTitle")}</DialogTitle>
              <DialogDescription>
                {t("deleteDescription", { queueName })}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
                disabled={deleteQueueMutation.isPending}
              >
                {t("common:cancel")}
              </Button>
              <Button
                variant="destructive-outline"
                onClick={handleDeleteQueue}
                disabled={deleteQueueMutation.isPending}
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
