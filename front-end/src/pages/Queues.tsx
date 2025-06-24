import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DataStorageWarning } from "@/components/PrivacyNotice";
import { NoServerConfigured } from "@/components/NoServerConfigured";
import { useServerContext } from "@/contexts/ServerContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useQueues } from "@/hooks/useApi";
import { canUserAddQueue, canUserSendMessages } from "@/lib/plans/planUtils";
import PlanUpgradeModal from "@/components/plans/PlanUpgradeModal";
import { QueueHeader } from "@/components/Queues/QueueHeader";
import { PlanRestrictions } from "@/components/Queues/PlanRestrictions";
import { QueueSearchAndStats } from "@/components/Queues/QueueSearchAndStats";
import { QueueTable } from "@/components/Queues/QueueTable";

const Queues = () => {
  const navigate = useNavigate();
  const { workspacePlan } = useWorkspace();
  const [searchTerm, setSearchTerm] = useState("");
  const { selectedServerId, hasServers } = useServerContext();
  const { data: queuesData, isLoading, refetch } = useQueues(selectedServerId);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Use the actual workspace plan from context
  const canAddQueue = canUserAddQueue(workspacePlan);
  const canSendMessages = canUserSendMessages(workspacePlan);

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

  const queues = useMemo(() => queuesData?.queues || [], [queuesData?.queues]);

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
              subtitle="Connect to a RabbitMQ server to start managing queues"
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
                  canAddQueue={canAddQueue}
                  canSendMessages={canSendMessages}
                  onAddQueueClick={handleAddQueueClick}
                  onSendMessageClick={handleSendMessageClick}
                />
              </div>
            </div>

            {/* Plan Restrictions */}
            <PlanRestrictions
              canAddQueue={canAddQueue}
              canSendMessages={canSendMessages}
              onUpgrade={() => setShowUpgradeModal(true)}
            />

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
              onRefetch={refetch}
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
