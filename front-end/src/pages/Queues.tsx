import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DataStorageWarning } from "@/components/PrivacyNotice";
import { NoServerConfigured } from "@/components/NoServerConfigured";
import { useServerContext } from "@/contexts/ServerContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useQueues, queryKeys, useMonthlyMessageCount } from "@/hooks/useApi";
import logger from "../lib/logger";
import PlanUpgradeModal from "@/components/plans/PlanUpgradeModal";
import { QueueHeader } from "@/components/Queues/QueueHeader";
import { PlanRestrictions } from "@/components/Queues/PlanRestrictions";
import { QueueSearchAndStats } from "@/components/Queues/QueueSearchAndStats";
import { QueueTable } from "@/components/Queues/QueueTable";

const Queues = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    workspacePlan,
    canAddQueue,
    canSendMessages,
    isLoading: workspaceLoading,
  } = useWorkspace();
  const [searchTerm, setSearchTerm] = useState("");
  const [restrictionsDismissed, setRestrictionsDismissed] = useState(false);
  const { selectedServerId, hasServers } = useServerContext();
  const { data: queuesData, isLoading, refetch } = useQueues(selectedServerId);
  const { data: monthlyMessageData, isLoading: messageCountLoading } =
    useMonthlyMessageCount();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const queues = useMemo(() => queuesData?.queues || [], [queuesData?.queues]);
  const queueCount = queues.length;

  // Use real monthly message count from API
  const monthlyMessageCount = monthlyMessageData?.monthlyMessageCount || 0;

  const handleAddQueueClick = () => {
    if (canAddQueue) {
      // Original add queue logic - AddQueueForm will handle this
      return;
    } else {
      // Show upgrade modal for Free plan users
      setShowUpgradeModal(true);
    }
  };

  const handleSendMessageClick = () => {
    if (!canSendMessages) {
      setShowUpgradeModal(true);
    }
    // If canSendMessages is true, the SendMessageDialog will handle it
  };

  // Wrapper for refetch with logging to debug refresh issues
  const handleRefetch = async () => {
    logger.info("Queues page: Refetching queue data...");
    try {
      // Use both methods to ensure refresh works
      await Promise.all([
        refetch(),
        queryClient.invalidateQueries({
          queryKey: queryKeys.queues(selectedServerId),
        }),
      ]);
      logger.info("Queues page: Refetch completed successfully");
    } catch (error) {
      logger.error("Queues page: Refetch failed:", error);
    }
  };

  const filteredQueues = useMemo(() => {
    if (!searchTerm) return queues;
    return queues.filter(
      (queue) =>
        queue.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        queue.vhost.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [queues, searchTerm]);

  if (!hasServers) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-50 to-blue-50">
          <AppSidebar />
          <main className="flex-1 p-6 overflow-auto">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
            </div>
            <NoServerConfigured
              title="Queue Management"
              description="Add a RabbitMQ server connection to view and manage queues across your clusters."
            />
          </main>
        </div>
      </SidebarProvider>
    );
  }

  if (!selectedServerId) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-50 to-blue-50">
          <AppSidebar />
          <main className="flex-1 p-6 overflow-auto">
            <div className="max-w-7xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <SidebarTrigger />
                  <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                      Queue Management
                    </h1>
                    <p className="text-gray-500">
                      Please select a RabbitMQ server to view queues
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-50 to-blue-50">
        <AppSidebar />
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <div className="flex-1">
                <QueueHeader
                  selectedServerId={selectedServerId}
                  workspacePlan={workspacePlan}
                  queueCount={queueCount}
                  monthlyMessageCount={monthlyMessageCount}
                  workspaceLoading={workspaceLoading}
                  canAddQueue={canAddQueue}
                  canSendMessages={canSendMessages}
                  onAddQueueClick={handleAddQueueClick}
                  onSendMessageClick={handleSendMessageClick}
                  onRefetch={handleRefetch}
                />
              </div>
            </div>

            {/* Plan Restrictions */}
            {!restrictionsDismissed && (
              <PlanRestrictions
                workspacePlan={workspacePlan}
                queueCount={queueCount}
                monthlyMessageCount={monthlyMessageCount}
                canAddQueue={canAddQueue}
                canSendMessages={canSendMessages}
                onUpgrade={() => setShowUpgradeModal(true)}
                onDismiss={() => setRestrictionsDismissed(true)}
              />
            )}

            {/* Privacy Notice */}
            <DataStorageWarning
              isActive={false}
              dataTypes={[]}
              retentionDays={0}
              onManageSettings={() => navigate("/privacy-settings")}
            />

            {/* Search and Stats */}
            <QueueSearchAndStats
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              queues={queues}
            />

            {/* Queues Table */}
            <QueueTable
              queues={filteredQueues}
              isLoading={isLoading}
              searchTerm={searchTerm}
              onNavigateToQueue={(queueName) =>
                navigate(`/queues/${queueName}`)
              }
              onRefetch={handleRefetch}
            />

            {/* Plan Upgrade Modal */}
            <PlanUpgradeModal
              isOpen={showUpgradeModal}
              onClose={() => setShowUpgradeModal(false)}
              currentPlan={workspacePlan}
              feature="queue creation"
            />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Queues;
