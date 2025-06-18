import { useParams, useNavigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useServerContext } from "@/contexts/ServerContext";
import { useQueue, useQueueConsumers } from "@/hooks/useApi";

// Queue Detail Components
import { QueueHeader } from "@/components/QueueDetail/QueueHeader";
import { QueueStats } from "@/components/QueueDetail/QueueStats";
import { MessageStatistics } from "@/components/QueueDetail/MessageStatistics";
import { QueueConfiguration } from "@/components/QueueDetail/QueueConfiguration";
import { QueueTiming } from "@/components/QueueDetail/QueueTiming";
import { ConsumerDetails } from "@/components/QueueDetail/ConsumerDetails";
import { NotFound } from "@/components/QueueDetail/NotFound";
import { LoadingSkeleton } from "@/components/QueueDetail/LoadingSkeleton";

const QueueDetail = () => {
  const { queueName } = useParams<{ queueName: string }>();
  const navigate = useNavigate();
  const { selectedServerId } = useServerContext();

  const {
    data: queueData,
    isLoading,
    refetch,
  } = useQueue(selectedServerId, queueName);

  const {
    data: consumersData,
    isLoading: consumersLoading,
    refetch: refetchConsumers,
  } = useQueueConsumers(selectedServerId, queueName);

  const queue = queueData?.queue;

  const handleNavigateBack = () => navigate("/queues");

  if (!selectedServerId || !queueName) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-50 to-blue-50">
          <AppSidebar />
          <main className="flex-1 p-6 overflow-auto">
            <div className="max-w-7xl mx-auto space-y-6">
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
        <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-50 to-blue-50">
          <AppSidebar />
          <main className="flex-1 p-6 overflow-auto">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Header */}
              <QueueHeader
                queueName={queueName}
                selectedServerId={selectedServerId}
                messageCount={queue?.messages || 0}
                onNavigateBack={handleNavigateBack}
                onRefetch={refetch}
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

                  {/* Consumer Details Section */}
                  <ConsumerDetails
                    consumersData={consumersData}
                    consumersLoading={consumersLoading}
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
      </SidebarProvider>
    </TooltipProvider>
  );
};

export default QueueDetail;
