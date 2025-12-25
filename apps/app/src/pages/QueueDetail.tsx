import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { logger } from "@/lib/logger";

import { AppSidebar } from "@/components/AppSidebar";
import { MessagesRatesChart } from "@/components/MessagesRatesChart";
import { ConsumerDetails } from "@/components/QueueDetail/ConsumerDetails";
import { LoadingSkeleton } from "@/components/QueueDetail/LoadingSkeleton";
import { MessageStatistics } from "@/components/QueueDetail/MessageStatistics";
import { NotFound } from "@/components/QueueDetail/NotFound";
import { QueueBindings } from "@/components/QueueDetail/QueueBindings";
import { QueueConfiguration } from "@/components/QueueDetail/QueueConfiguration";
// Queue Detail Components
import { QueueHeader } from "@/components/QueueDetail/QueueHeader";
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
import { SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

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
  const { queueName } = useParams<{ queueName: string }>();
  const navigate = useNavigate();
  const { selectedServerId } = useServerContext();
  const { selectedVHost } = useVHostContext();
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>("1m");

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
        title: "Success",
        description: `Queue "${queueName}" has been deleted successfully`,
      });

      setDeleteDialogOpen(false);
      navigate("/queues");
    } catch (error) {
      logger.error("Failed to delete queue:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to delete queue",
        variant: "destructive",
      });
    }
  };

  const confirmDeleteQueue = () => {
    setDeleteDialogOpen(true);
  };

  if (!selectedServerId || !queueName) {
    return (
      <SidebarProvider>
        <div className="page-layout">
          <AppSidebar />
          <main className="main-content-scrollable">
            <div className="content-container-large">
              <NotFound
                title="Queue Not Found"
                description="Please select a server and queue to view details."
                onNavigateBack={handleNavigateBack}
              />
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <TooltipProvider>
      <SidebarProvider>
        <div className="page-layout">
          <AppSidebar />
          <main className="main-content-scrollable">
            <div className="content-container-large">
              {/* Header */}
              <QueueHeader
                queueName={queueName}
                selectedServerId={selectedServerId}
                messageCount={queue?.messages || 0}
                consumerCount={queue?.consumers || 0}
                onNavigateBack={handleNavigateBack}
                onRefetch={refetch}
                onDeleteQueue={confirmDeleteQueue}
              />

              {isLoading ? (
                <LoadingSkeleton />
              ) : queue ? (
                <>
                  {/* Status and Quick Stats */}
                  <QueueStats queue={queue} />

                  {/* Detailed Message Statistics */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <MessageStatistics queue={queue} />
                    <QueueConfiguration queue={queue} />
                  </div>

                  {/* Additional Details */}
                  <QueueTiming queue={queue} />

                  {/* Live Rates Chart */}
                  <MessagesRatesChart
                    messagesRates={queueLiveRatesData?.messagesRates}
                    isLoading={liveRatesLoading}
                    error={null}
                    timeRange={timeRange}
                    onTimeRangeChange={setTimeRange}
                  />

                  {/* Queued Messages Chart */}
                  <QueuedMessagesChart
                    queueTotals={queueLiveRatesData?.queueTotals}
                    isLoading={liveRatesLoading}
                    error={null}
                    timeRange={timeRange}
                    onTimeRangeChange={setTimeRange}
                  />

                  {/* Consumer Details Section */}
                  <ConsumerDetails
                    consumersData={consumersData}
                    consumersLoading={consumersLoading}
                  />

                  {/* Queue Bindings Section */}
                  <QueueBindings
                    bindingsData={bindingsData}
                    bindingsLoading={bindingsLoading}
                  />
                </>
              ) : (
                <NotFound
                  title="Queue Not Found"
                  description={`The queue "${queueName}" could not be found.`}
                  onNavigateBack={handleNavigateBack}
                />
              )}
            </div>
          </main>
        </div>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Queue</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete the queue "{queueName}"? This
                action cannot be undone and will permanently remove the queue
                and all its messages.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
                disabled={deleteQueueMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteQueue}
                disabled={deleteQueueMutation.isPending}
              >
                {deleteQueueMutation.isPending ? "Deleting..." : "Delete Queue"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarProvider>
    </TooltipProvider>
  );
};

export default QueueDetail;
