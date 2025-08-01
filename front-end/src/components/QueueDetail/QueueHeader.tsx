import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ArrowLeft, Send, Trash2, Lock } from "lucide-react";
import { PurgeQueueDialog } from "@/components/PurgeQueueDialog";
import { PauseQueueDialog } from "@/components/PauseQueueDialog";
import { SendMessageDialog } from "@/components/SendMessageDialog";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useQueuePauseStatus } from "@/hooks/useApi";
import { useState } from "react";
import { PlanUpgradeModal } from "@/components/plans/PlanUpgradeModal";

interface QueueHeaderProps {
  queueName: string;
  selectedServerId: string;
  messageCount: number;
  monthlyMessageCount: number;
  consumerCount?: number;
  onNavigateBack: () => void;
  onRefetch: () => void;
  onDeleteQueue?: () => void;
}

export function QueueHeader({
  queueName,
  selectedServerId,
  messageCount,
  monthlyMessageCount,
  consumerCount = 0,
  onNavigateBack,
  onRefetch,
  onDeleteQueue,
}: QueueHeaderProps) {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { canSendMessages, workspacePlan } = useWorkspace();

  // Get the actual pause status from the backend
  const { data: pauseStatus, refetch: refetchPauseStatus } =
    useQueuePauseStatus(selectedServerId, queueName);

  const handleSendMessageClick = () => {
    if (!canSendMessages) {
      setShowUpgradeModal(true);
    }
  };

  const handlePauseSuccess = () => {
    refetchPauseStatus();
    onRefetch();
  };
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <SidebarTrigger />
        <Button
          variant="ghost"
          size="sm"
          onClick={onNavigateBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <div>
          <h1 className="title-page">{queueName}</h1>
          <p className="text-gray-600 mt-1">Queue details and management</p>
        </div>
      </div>
      <div className="flex gap-3">
        {/* Send Message Button with plan restrictions */}
        {canSendMessages ? (
          <SendMessageDialog
            serverId={selectedServerId}
            queueName={queueName}
            mode="queue"
            onSuccess={onRefetch}
            trigger={
              <Button variant="outline" className="flex items-center gap-2">
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
              workspacePlan === "FREE"
                ? "Upgrade to send messages"
                : workspacePlan === "DEVELOPER"
                  ? `You've reached your monthly message limit (${monthlyMessageCount}/100). Upgrade to send more messages.`
                  : workspacePlan === "STARTUP"
                    ? `You've reached your monthly message limit (${monthlyMessageCount}/1000). Upgrade to send more messages.`
                    : "Upgrade to send messages"
            }
          >
            <Lock className="w-4 h-4" />
            Send Message
            <span
              className={`ml-1 px-2 py-0.5 text-white text-xs rounded-full font-bold ${
                workspacePlan === "FREE"
                  ? "bg-orange-500"
                  : workspacePlan === "DEVELOPER"
                    ? "bg-blue-500"
                    : workspacePlan === "STARTUP"
                      ? "bg-purple-500"
                      : "bg-orange-500"
              }`}
            >
              {workspacePlan === "FREE"
                ? "Pro"
                : workspacePlan === "DEVELOPER"
                  ? `${monthlyMessageCount}/100`
                  : workspacePlan === "STARTUP"
                    ? `${monthlyMessageCount}/1000`
                    : "Pro"}
            </span>
          </Button>
        )}

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

        <PauseQueueDialog
          queueName={queueName}
          consumerCount={consumerCount}
          isPaused={pauseStatus?.pauseState?.isPaused}
          onSuccess={handlePauseSuccess}
        />

        {/* Delete Queue Button */}
        {onDeleteQueue && (
          <Button
            variant="destructive"
            size="sm"
            onClick={onDeleteQueue}
            className="flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete Queue
          </Button>
        )}
      </div>

      {/* Plan Upgrade Modal */}
      <PlanUpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature="queue management"
        currentPlan={workspacePlan}
      />
    </div>
  );
}
