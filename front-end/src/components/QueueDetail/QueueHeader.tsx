import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ArrowLeft, Send, Trash2, Lock, Pause, Play } from "lucide-react";
import { PurgeQueueDialog } from "@/components/PurgeQueueDialog";
import { PauseQueueDialog } from "@/components/PauseQueueDialog";
import { SendMessageDialog } from "@/components/SendMessageDialog";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useQueuePauseStatus } from "@/hooks/useApi";
import { useState } from "react";
import { PlanUpgradeModal } from "@/components/plans/PlanUpgradeModal";
import { WorkspacePlan } from "@/types/plans";

interface QueueHeaderProps {
  queueName: string;
  selectedServerId: string;
  messageCount: number;
  consumerCount?: number;
  onNavigateBack: () => void;
  onRefetch: () => void;
  onDeleteQueue?: () => void;
}

export function QueueHeader({
  queueName,
  selectedServerId,
  messageCount,
  consumerCount = 0,
  onNavigateBack,
  onRefetch,
  onDeleteQueue,
}: QueueHeaderProps) {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { canSendMessages, canManageQueues, workspacePlan } = useWorkspace();

  // Get the actual pause status from the backend
  const { data: pauseStatus, refetch: refetchPauseStatus } =
    useQueuePauseStatus(selectedServerId, queueName);

  const handleSendMessageClick = () => {
    if (!canSendMessages) {
      setShowUpgradeModal(true);
    }
  };

  const handleQueueManagementClick = () => {
    if (!canManageQueues) {
      setShowUpgradeModal(true);
    }
  };

  const isPaused = pauseStatus?.pauseState?.isPaused ?? false;

  return (
    <div className="border-b bg-white px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <Button
            variant="ghost"
            size="sm"
            onClick={onNavigateBack}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Queues
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">{queueName}</h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Send Message Button with plan restrictions */}
          {canSendMessages ? (
            <SendMessageDialog
              queueName={queueName}
              serverId={selectedServerId}
              onSuccess={onRefetch}
              trigger={
                <Button
                  variant="outline"
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                >
                  <Send className="w-4 h-4" />
                  Send Message
                </Button>
              }
            />
          ) : (
            <Button
              onClick={handleSendMessageClick}
              disabled={true}
              variant="outline"
              className="flex items-center gap-2 opacity-60 cursor-not-allowed"
              title={
                workspacePlan === WorkspacePlan.FREE
                  ? "Upgrade to Developer or Enterprise plan to send messages"
                  : "Upgrade to send messages"
              }
            >
              <Lock className="w-4 h-4" />
              Send Message
              <span className="ml-1 px-2 py-0.5 text-white text-xs rounded-full font-bold bg-orange-500">
                Pro
              </span>
            </Button>
          )}

          {/* Purge Queue Button with plan restrictions */}
          {canManageQueues ? (
            <PurgeQueueDialog
              queueName={queueName}
              messageCount={messageCount}
              onSuccess={onRefetch}
              trigger={
                <Button
                  variant="outline"
                  className="flex items-center gap-2 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                  Purge Queue
                </Button>
              }
            />
          ) : (
            <Button
              onClick={handleQueueManagementClick}
              disabled={true}
              variant="outline"
              className="flex items-center gap-2 opacity-60 cursor-not-allowed"
              title={
                workspacePlan === WorkspacePlan.FREE
                  ? "Upgrade to Developer or Enterprise plan to manage queues"
                  : "Upgrade to manage queues"
              }
            >
              <Lock className="w-4 h-4" />
              Purge Queue
              <span className="ml-1 px-2 py-0.5 text-white text-xs rounded-full font-bold bg-orange-500">
                Pro
              </span>
            </Button>
          )}

          {/* Pause/Resume Queue Button with plan restrictions */}
          {canManageQueues ? (
            <PauseQueueDialog
              queueName={queueName}
              consumerCount={consumerCount}
              isPaused={isPaused}
              onSuccess={() => {
                onRefetch();
                refetchPauseStatus();
              }}
              trigger={
                <Button
                  variant="outline"
                  className={`flex items-center gap-2 ${
                    isPaused
                      ? "text-green-600 hover:text-green-700"
                      : "text-yellow-600 hover:text-yellow-700"
                  }`}
                >
                  {isPaused ? (
                    <Play className="w-4 h-4" />
                  ) : (
                    <Pause className="w-4 h-4" />
                  )}
                  {isPaused ? "Resume Queue" : "Pause Queue"}
                </Button>
              }
            />
          ) : (
            <Button
              onClick={handleQueueManagementClick}
              disabled={true}
              variant="outline"
              className="flex items-center gap-2 opacity-60 cursor-not-allowed"
              title={
                workspacePlan === WorkspacePlan.FREE
                  ? "Upgrade to Developer or Enterprise plan to pause/resume queues"
                  : "Upgrade to pause/resume queues"
              }
            >
              <Lock className="w-4 h-4" />
              {isPaused ? "Resume Queue" : "Pause Queue"}
              <span className="ml-1 px-2 py-0.5 text-white text-xs rounded-full font-bold bg-orange-500">
                Pro
              </span>
            </Button>
          )}

          {/* Delete Queue Button with plan restrictions */}
          {canManageQueues && onDeleteQueue ? (
            <Button
              onClick={onDeleteQueue}
              variant="outline"
              className="flex items-center gap-2 text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" />
              Delete Queue
            </Button>
          ) : onDeleteQueue ? (
            <Button
              onClick={handleQueueManagementClick}
              disabled={true}
              variant="outline"
              className="flex items-center gap-2 opacity-60 cursor-not-allowed"
              title={
                workspacePlan === WorkspacePlan.FREE
                  ? "Upgrade to Developer or Enterprise plan to delete queues"
                  : "Upgrade to delete queues"
              }
            >
              <Lock className="w-4 h-4" />
              Delete Queue
              <span className="ml-1 px-2 py-0.5 text-white text-xs rounded-full font-bold bg-orange-500">
                Pro
              </span>
            </Button>
          ) : null}
        </div>
      </div>

      {showUpgradeModal && (
        <PlanUpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          currentPlan={workspacePlan}
          feature="queue-management"
        />
      )}
    </div>
  );
}
